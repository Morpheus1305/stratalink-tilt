import { Router, Request, Response } from "express";

const router = Router();

// --------------------------------------------------------------------
//  TSLE Scoring Engine 2.0 — Multi-Token
//  - Uses Cloudflare Worker for depth + funding for all supported symbols
//  - Falls back to curated placeholders when real data is not available
// --------------------------------------------------------------------

const WORKER_BASE =
  process.env.TSLE_WORKER_BASE_URL ||
  "https://hidden-star-5c73.rob-mcdermott.workers.dev";

// The tokens we want fully wired
const SUPPORTED_SYMBOLS = [
  "BTC",
  "ETH",
  "SOL",
  "LINK",
  "NEAR",
  "AVAX",
  "DOT",
  "ADA",
  "XRP",
  "DOGE",
];

// ---------- Types (minimal: only what we actually use) ----------

interface DepthLevel {
  bidUsd?: number;
  askUsd?: number;
  totalUsd?: number;
}

interface DepthSnapshot {
  symbol: string;
  source: string;
  levels: number[];
  aggregate?: {
    mid?: number;
    [key: string]: any;
  };
}

interface FundingVenue {
  venue: string;
  ok: boolean;
  rate: number | null;
  apr: number | null;
  error?: string | null;
}

interface FundingSnapshot {
  symbol: string;
  source: string;
  venues: FundingVenue[];
  headlineRate?: number;
  medianRate?: number;
  avgRate?: number;
  regime?: string;
}

interface TsleComponents {
  depthScore: number | null;
  fundingScore: number | null;
  factorScore: number | null;
  stressScore: number | null;
}

// ---------- Helpers ----------

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[TSLE] Fetch failed: ${url} -> ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[TSLE] Fetch error: ${url}`, err);
    return null;
  }
}

function getDepthLevelUsd(depth: DepthSnapshot | null, bps: number): number {
  if (!depth || !depth.aggregate) return 0;
  const key = String(bps);
  const level = depth.aggregate[key] as DepthLevel | undefined;
  return level?.totalUsd ?? 0;
}

function normalizeDepth(value: number, good: number, great: number): number {
  if (value <= 0) return 0;
  if (value >= great) return 1;
  if (value >= good) {
    // between good and great → 0.7–1.0
    const frac = (value - good) / (great - good);
    return 0.7 + 0.3 * frac;
  }
  // below good → 0–0.7
  return Math.min(0.7 * (value / good), 0.7);
}

function depthScoreFromSnapshot(depth: DepthSnapshot | null): {
  score: number;
  d25: number;
  d50: number;
} {
  if (!depth || !depth.aggregate) {
    return { score: 0, d25: 0, d50: 0 };
  }

  const d25 = getDepthLevelUsd(depth, 25);
  const d50 = getDepthLevelUsd(depth, 50);

  // These are soft institutional benchmarks; we can tune later per token class
  const norm25 = normalizeDepth(d25, 15_000_000, 40_000_000);
  const norm50 = normalizeDepth(d50, 25_000_000, 60_000_000);

  const combined = 0.6 * norm25 + 0.4 * norm50;
  const score = Math.round(40 * combined); // 0–40 pts

  return { score, d25, d50 };
}

function fundingScoreFromSnapshot(funding: FundingSnapshot | null): {
  score: number;
  median: number;
  regime: string;
} {
  if (!funding) {
    // mid-range neutral if nothing is available
    return { score: 18, median: 0, regime: "Unknown" };
  }

  const regime = funding.regime ?? "Unknown";
  const median = funding.medianRate ?? funding.headlineRate ?? 0;

  let score: number;

  switch (regime) {
    case "Ultra-Tight":
      score = 30;
      break;
    case "Tight":
      score = 26;
      break;
    case "Constructive":
    case "Neutral":
      score = 22;
      break;
    case "Patchy":
      score = 16;
      break;
    case "Thin":
      score = 10;
      break;
    case "Broken":
    case "Stressed":
      score = 4;
      break;
    default: {
      // regime missing: infer from magnitude of funding
      const abs = Math.abs(median || 0);
      if (abs <= 0.00001) score = 28; // ~0.001% per 8h
      else if (abs <= 0.00005) score = 24;
      else if (abs <= 0.00015) score = 18;
      else if (abs <= 0.0004) score = 10;
      else score = 4;
    }
  }

  return { score, median, regime };
}

// Factor + stress are kept as simple, token-aware placeholders for now.
// Later we can wire these into realised/liquidity volatility, stress regime, etc.
function factorScorePlaceholder(symbol: string): number {
  switch (symbol) {
    case "BTC":
      return 13;
    case "ETH":
      return 12;
    case "SOL":
    case "LINK":
      return 11;
    case "NEAR":
    case "AVAX":
    case "DOT":
      return 10;
    case "ADA":
    case "XRP":
    case "DOGE":
      return 9;
    default:
      return 10;
  }
}

function stressScorePlaceholder(symbol: string): number {
  switch (symbol) {
    case "BTC":
    case "ETH":
      return 12;
    case "SOL":
    case "LINK":
      return 11;
    case "NEAR":
    case "AVAX":
    case "DOT":
      return 10;
    case "ADA":
    case "XRP":
    case "DOGE":
      return 9;
    default:
      return 10;
  }
}

function bandFromTsle(score: number): string {
  if (score >= 90) return "Ultra-Tight";
  if (score >= 75) return "Tight";
  if (score >= 60) return "Constructive";
  if (score >= 45) return "Patchy";
  if (score >= 30) return "Thin";
  return "Broken";
}

// --------------------------------------------------------------------
//  Placeholder TSLE map still used only when Worker data is unusable
// --------------------------------------------------------------------

const PLACEHOLDER_TSLE: Record<
  string,
  { score: number; regime: string; source?: string }
> = {
  BTC: { score: 95, regime: "Ultra-Tight" },
  ETH: { score: 88, regime: "Tight" },
  SOL: { score: 82, regime: "Tight" },
  LINK: { score: 80, regime: "Tight" },
  NEAR: { score: 76, regime: "Constructive" },
  AVAX: { score: 74, regime: "Constructive" },
  DOT: { score: 72, regime: "Constructive" },
  ADA: { score: 68, regime: "Patchy" },
  XRP: { score: 64, regime: "Patchy" },
  DOGE: { score: 58, regime: "Thin" },
};

function placeholderResponse(symbol: string) {
  const ph = PLACEHOLDER_TSLE[symbol] ?? { score: 62, regime: "Constructive" };
  const band = bandFromTsle(ph.score);

  const components: TsleComponents = {
    depthScore: null,
    fundingScore: null,
    factorScore: null,
    stressScore: null,
  };

  return {
    symbol,
    score: ph.score,
    tsleScore: ph.score,
    regime: band,
    source: "placeholder",
    components,
    meta: {
      depth25Usd: null,
      depth50Usd: null,
      fundingMedianRate: null,
      fundingRegime: null,
    },
  };
}

// --------------------------------------------------------------------
//  GET /api/tsle/snapshot?symbol=BTC
// --------------------------------------------------------------------

// --------------------------------------------------------------------
//  GET /api/tsle/depth?symbol=BTC&side=buy&size=100000
//  Client-compatible endpoint for execution cost calculator
// --------------------------------------------------------------------

router.get("/depth", async (req: Request, res: Response) => {
  const rawSymbol = (req.query.symbol as string) || "BTC";
  const symbol = rawSymbol.toUpperCase();
  const side = ((req.query.side as string) || "buy").toLowerCase() as "buy" | "sell";
  const size = Number(req.query.size) || 100_000;

  if (!SUPPORTED_SYMBOLS.includes(symbol)) {
    // Return placeholder for unsupported symbols
    const ph = PLACEHOLDER_TSLE[symbol] ?? { score: 62, regime: "Constructive" };
    return res.json({
      ok: true,
      symbol,
      side,
      requestedSize: size,
      estImpactBps: 5 + Math.random() * 5,
      regime: ph.regime,
      score: ph.score,
      maxSizeAt25bps: 500_000,
      maxSizeAt50bps: 1_500_000,
      maxSizeAt100bps: 5_000_000,
      totals: {
        depth10bps: 200_000,
        depth25bps: 500_000,
        depth50bps: 1_500_000,
        depth100bps: 5_000_000,
        depth200bps: 15_000_000,
      },
      venues: [],
      source: "placeholder",
    });
  }

  // Fetch depth from worker
  const depth = await fetchJson<DepthSnapshot>(`${WORKER_BASE}/depth?symbol=${symbol}`);
  
  // Calculate depth at various levels
  const d10 = getDepthLevelUsd(depth, 10);
  const d25 = getDepthLevelUsd(depth, 25);
  const d50 = getDepthLevelUsd(depth, 50);
  const d100 = getDepthLevelUsd(depth, 100);
  const d200 = getDepthLevelUsd(depth, 200);
  
  // Calculate estimated impact based on size vs available depth
  let estImpactBps = 1;
  if (size > 0) {
    if (d10 > 0 && size <= d10) {
      estImpactBps = 1 + (size / d10) * 9;
    } else if (d25 > 0 && size <= d25) {
      estImpactBps = 10 + ((size - d10) / (d25 - d10 || 1)) * 15;
    } else if (d50 > 0 && size <= d50) {
      estImpactBps = 25 + ((size - d25) / (d50 - d25 || 1)) * 25;
    } else if (d100 > 0 && size <= d100) {
      estImpactBps = 50 + ((size - d50) / (d100 - d50 || 1)) * 50;
    } else {
      estImpactBps = 100 + Math.min(50, (size - d100) / 100_000);
    }
  }
  
  // Calculate TSLE score and regime
  const depthResult = depthScoreFromSnapshot(depth);
  const funding = await fetchJson<FundingSnapshot>(`${WORKER_BASE}/funding?symbol=${symbol}`);
  const fundingResult = fundingScoreFromSnapshot(funding);
  const factorScore = factorScorePlaceholder(symbol);
  const stressScore = stressScorePlaceholder(symbol);
  
  const tsleScore = depthResult.score + fundingResult.score + factorScore + stressScore;
  const regime = bandFromTsle(tsleScore);
  
  // Calculate max sizes at various bps thresholds
  const maxSizeAt25bps = d25 > 0 ? d25 * 0.8 : 500_000;
  const maxSizeAt50bps = d50 > 0 ? d50 * 0.8 : 1_500_000;
  const maxSizeAt100bps = d100 > 0 ? d100 * 0.8 : 5_000_000;

  // Generate venue breakdown (simplified)
  const venues = [
    { venue: "Coinbase", share25bps: 45, share50bps: 42, share100bps: 40 },
    { venue: "Binance", share25bps: 35, share50bps: 38, share100bps: 40 },
    { venue: "Kraken", share25bps: 20, share50bps: 20, share100bps: 20 },
  ];

  return res.json({
    ok: true,
    symbol,
    side,
    requestedSize: size,
    estImpactBps: Math.round(estImpactBps * 10) / 10,
    regime,
    score: tsleScore,
    maxSizeAt25bps: Math.round(maxSizeAt25bps),
    maxSizeAt50bps: Math.round(maxSizeAt50bps),
    maxSizeAt100bps: Math.round(maxSizeAt100bps),
    totals: {
      depth10bps: Math.round(d10),
      depth25bps: Math.round(d25),
      depth50bps: Math.round(d50),
      depth100bps: Math.round(d100),
      depth200bps: Math.round(d200),
    },
    venues,
    source: depth ? "worker" : "fallback",
    asOf: new Date().toISOString(),
  });
});

router.get("/snapshot", async (req: Request, res: Response) => {
  const rawSymbol = (req.query.symbol as string) || "BTC";
  const symbol = rawSymbol.toUpperCase();

  if (!SUPPORTED_SYMBOLS.includes(symbol)) {
    // For now we just return a neutral placeholder for unsupported symbols
    return res.json(placeholderResponse(symbol));
  }

  // Ask the Worker for this symbol's depth and funding
  const [depth, funding] = await Promise.all([
    fetchJson<DepthSnapshot>(`${WORKER_BASE}/depth?symbol=${symbol}`),
    fetchJson<FundingSnapshot>(`${WORKER_BASE}/funding?symbol=${symbol}`),
  ]);

  const depthResult = depthScoreFromSnapshot(depth);
  const fundingResult = fundingScoreFromSnapshot(funding);

  const factorScore = factorScorePlaceholder(symbol); // 0–15
  const stressScore = stressScorePlaceholder(symbol); // 0–15

  const tsleScore =
    depthResult.score +
    fundingResult.score +
    factorScore +
    stressScore;

  // If both depth & funding failed / empty → fall back to curated placeholder
  const noRealDepth = depthResult.score === 0;
  const noRealFunding =
    !funding ||
    (fundingResult.score === 18 && fundingResult.regime === "Unknown"); // our neutral default

  if (noRealDepth && noRealFunding) {
    return res.json(placeholderResponse(symbol));
  }

  const band = bandFromTsle(tsleScore);

  const components: TsleComponents = {
    depthScore: depthResult.score,
    fundingScore: fundingResult.score,
    factorScore,
    stressScore,
  };

  return res.json({
    symbol,
    score: tsleScore,
    tsleScore: tsleScore,
    regime: band,
    source: "worker",
    components,
    meta: {
      depth25Usd: depthResult.d25,
      depth50Usd: depthResult.d50,
      fundingMedianRate: fundingResult.median,
      fundingRegime: fundingResult.regime,
    },
  });
});

export default router;
