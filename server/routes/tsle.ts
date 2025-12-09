// server/routes/tsle.ts

import express, { Request, Response } from "express";
import { computeTsleDepthSummary, DepthSnapshotInput, VenueDepthBand, Side } from "../../lib/tsle/depthEngine";
import axios from "axios";

const router = express.Router();

const WORKER_BASE =
  process.env.LIQUIDITY_WORKER_BASE ||
  "https://hidden-star-5c73.rob-mcdermott.workers.dev";

// Depth levels for snapshot
type DepthLevelKey = "10" | "25" | "50" | "100" | "200";

interface WorkerDepthResponse {
  symbol: string;
  source: string;
  levels: Record<
    DepthLevelKey,
    {
      mid: number | null;
      aggregate: {
        bidUsd: number;
        askUsd: number;
        totalUsd: number;
      };
    }
  >;
}

interface WorkerFundingResponse {
  symbol: string;
  source: string;
  venues: {
    venue: string;
    ok: boolean;
    rate: number | null;
    apr: number | null;
    error: string | null;
  }[];
  headlineRate: number;
  medianRate: number;
  avgRate: number;
  regime: "Ultra-Tight" | "Tight" | "Neutral" | "Stressed";
}

// ---------------- TSLE v2 HELPERS ----------------

type DepthBands = {
  "10": number;
  "25": number;
  "50": number;
  "100": number;
  "200": number;
};

type FundingSnapshot = {
  headlineRate: number;
  medianRate?: number;
  avgRate?: number;
  regime: string;
};

type TsleSnapshot = {
  symbol: string;
  depthBands: DepthBands;
  depthScore: number;
  fundingScore: number;
  tsleScore: number;
  regime: string;
  stressBucket: string;
  notes: string;
};

// Normalize worker depth JSON into bands
function normalizeDepthBands(workerDepth: any): DepthBands {
  const zero: DepthBands = { "10": 0, "25": 0, "50": 0, "100": 0, "200": 0 };
  if (!workerDepth) return zero;

  // New format: aggregate.levels.XX.totalUsd
  const aggLevels = workerDepth.aggregate?.levels;
  if (aggLevels) {
    const out: DepthBands = { ...zero };
    for (const key of Object.keys(out) as (keyof DepthBands)[]) {
      out[key] = aggLevels[key]?.totalUsd ?? 0;
    }
    return out;
  }

  // Fallback: levels.XX.totalUsd
  if (workerDepth.levels) {
    const out: DepthBands = { ...zero };
    for (const key of Object.keys(out) as (keyof DepthBands)[]) {
      const lv = workerDepth.levels[key];
      const val = lv?.totalUsd ?? lv?.usd ?? lv?.notional ?? 0;
      out[key] = typeof val === "number" ? val : Number(val ?? 0);
    }
    return out;
  }

  return zero;
}

// v2 depth score: emphasise 25bps depth + shape of curve
function scoreDepthBands(bands: DepthBands): number {
  const d10 = bands["10"];
  const d25 = bands["25"];
  const d50 = bands["50"];
  const d100 = bands["100"];
  const d200 = bands["200"];

  // Base score from 25bps depth (USD)
  let base = 0;
  if (d25 >= 50_000_000) base = 80;
  else if (d25 >= 25_000_000) base = 72;
  else if (d25 >= 10_000_000) base = 63;
  else if (d25 >= 5_000_000) base = 52;
  else if (d25 >= 1_000_000) base = 38;
  else if (d25 >= 250_000) base = 26;
  else base = 12;

  // Shape bonuses / penalties
  const tightRatio = d25 > 0 ? d10 / d25 : 0;
  const tailRatio = d25 > 0 ? d100 / d25 : 0;

  // Good: plenty of size near mid
  if (tightRatio >= 0.6) base += 4;
  else if (tightRatio < 0.3) base -= 4;

  // Good: curve builds out with size at the tail
  if (tailRatio >= 1.5) base += 4;
  else if (tailRatio < 1.0) base -= 4;

  // Slight reward for 200bps capacity (true block size)
  if (d200 >= 20_000_000) base += 4;
  else if (d200 < 1_000_000) base -= 2;

  return Math.max(0, Math.min(90, Math.round(base)));
}

// Funding score: penalise extreme positive/negative funding
function scoreFunding(f: FundingSnapshot): number {
  if (!f) return 0;
  const rate = f.headlineRate ?? 0;
  const absBps = Math.abs(rate * 10_000); // rate → bps

  let score = 0;
  if (absBps <= 2) score = 20;
  else if (absBps <= 5) score = 16;
  else if (absBps <= 10) score = 12;
  else if (absBps <= 25) score = 6;
  else score = 2;

  // small bonus / penalty from funding "regime"
  const regime = (f.regime || "").toLowerCase();
  if (regime.includes("ultra")) score += 2;
  else if (regime.includes("tight")) score += 1;
  else if (regime.includes("stressed")) score -= 4;

  return Math.max(0, Math.min(22, Math.round(score)));
}

// Map combined score → regime label
function classifyTsleRegime(tsleScore: number): string {
  if (tsleScore >= 85) return "Ultra-Tight";
  if (tsleScore >= 70) return "Tight";
  if (tsleScore >= 55) return "Constructive";
  if (tsleScore >= 40) return "Patchy";
  if (tsleScore >= 25) return "Thin";
  return "Broken";
}

// Intraday stress bucket for heatmaps / alerts
function classifyStressBucket(
  tsleScore: number,
  funding: FundingSnapshot,
  depthScore: number,
  prevTsleScore?: number | null
): string {
  const rate = funding?.headlineRate ?? 0;
  const absBps = Math.abs(rate * 10_000);
  const delta = prevTsleScore != null ? tsleScore - prevTsleScore : 0;

  // Deleveraging / crisis
  if (tsleScore < 25 || absBps > 30 || depthScore < 25) {
    return "Deleveraging";
  }
  // High stress
  if (tsleScore < 40 || absBps > 15 || delta <= -15) {
    return "Stress";
  }
  // Caution
  if (tsleScore < 55 || absBps > 8 || delta <= -8) {
    return "Caution";
  }
  // Watch
  if (tsleScore < 70 || absBps > 4 || delta <= -4) {
    return "Watch";
  }
  // Calm / rotation
  return "Calm";
}

function buildTsleNotes(regime: string, stress: string): string {
  const r = regime.toLowerCase();
  const s = stress.toLowerCase();

  if (r.includes("ultra") && s === "calm") {
    return "Orderbook is ultra-tight with deep size; execute aggressively with minimal market impact.";
  }
  if (r === "tight" && (s === "calm" || s === "watch")) {
    return "Tight liquidity with good depth across bands; standard VWAP / TWAP execution is appropriate.";
  }
  if (r === "constructive") {
    return "Constructive conditions: reasonable depth but monitor funding and intraday shifts, especially for larger clips.";
  }
  if (r === "patchy" || s === "caution") {
    return "Patchy liquidity: avoid large single-clip trades; slice orders and use passive / time-weighted execution.";
  }
  if (r === "thin" || s === "stress") {
    return "Thin market: expect slippage at 25–50bps; prioritise venues with the best depth and consider internalisation.";
  }
  return "Impaired conditions: liquidity is fragile or stressed; minimise risk-on flow and tighten risk limits.";
}

function fmtUsd(n: number): string {
  if (!isFinite(n) || n <= 0) return "$0";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

router.get("/snapshot", async (req: Request, res: Response) => {
  const symbol = (req.query.symbol as string) || "BTC";

  try {
    // 1) Fetch depth from Cloudflare Worker
    const depthRes = await fetch(
      `${WORKER_BASE}/depth?symbol=${encodeURIComponent(symbol)}`
    );
    if (!depthRes.ok) {
      throw new Error(`Depth worker error ${depthRes.status}`);
    }
    const depthJson = await depthRes.json();

    // 2) Fetch funding snapshot
    const fundingRes = await fetch(
      `${WORKER_BASE}/funding?symbol=${encodeURIComponent(symbol)}`
    );
    if (!fundingRes.ok) {
      throw new Error(`Funding worker error ${fundingRes.status}`);
    }
    const fundingJson = (await fundingRes.json()) as WorkerFundingResponse;

    // Normalize depth bands
    const depthBands = normalizeDepthBands(depthJson);

    // Build funding snapshot for scoring
    const funding: FundingSnapshot = {
      headlineRate: fundingJson.headlineRate ?? 0,
      medianRate: fundingJson.medianRate,
      avgRate: fundingJson.avgRate,
      regime: fundingJson.regime || "Neutral",
    };

    // Optional: previous TSLE reading (undefined for now)
    const prevTsleScore = undefined;

    // 3) Compute v2 scores
    const depthScore = scoreDepthBands(depthBands);
    const fundingScore = scoreFunding(funding);
    const tsleScore = Math.max(0, Math.min(100, Math.round(depthScore + fundingScore)));

    const regime = classifyTsleRegime(tsleScore);
    const stressBucket = classifyStressBucket(tsleScore, funding, depthScore, prevTsleScore);
    const notes = buildTsleNotes(regime, stressBucket);

    // 4) Build response
    const snapshot: TsleSnapshot = {
      symbol,
      depthBands,
      depthScore,
      fundingScore,
      tsleScore,
      regime,
      stressBucket,
      notes,
    };

    res.json(snapshot);
  } catch (err: any) {
    res.status(500).json({
      error: "TSLE_SNAPSHOT_ERROR",
      message: err.message ?? "Unknown error",
    });
  }
});

/**
 * GET /api/tsle/depth?symbol=BTC&side=buy&size=100000
 *
 * This endpoint:
 *  - Calls your existing depth snapshot route (/api/depth/snapshot) at multiple bps levels
 *  - Normalises the result into DepthSnapshotInput
 *  - Feeds it to the TSLE engine
 *  - Returns a TSLE summary object for the UI
 */

interface DepthVenue {
  venue: string;
  bid: number;
  ask: number;
  ok: boolean;
}

interface DepthResponse {
  symbol: string;
  bps: number;
  venues: DepthVenue[];
  totalBid: number;
  totalAsk: number;
  timestamp: number;
  source: string;
}

router.get("/depth", async (req: Request, res: Response) => {
  try {
    const symbol = (req.query.symbol as string || "BTC").toUpperCase();
    const side = ((req.query.side as string) || "buy").toLowerCase() as Side;
    const requestedSize = parseFloat((req.query.size as string) || "100000");

    const baseUrl =
      process.env.DEPTH_INTERNAL_URL ||
      `http://127.0.0.1:${process.env.PORT || 5000}`;

    // Fetch depth at all required bps levels in parallel
    const bpsLevels = [10, 25, 50, 100, 200];
    const depthPromises = bpsLevels.map(bps =>
      axios.get<DepthResponse>(`${baseUrl}/api/depth/snapshot?symbol=${encodeURIComponent(symbol)}&bps=${bps}`, { timeout: 8000 })
        .then(r => ({ bps, data: r.data }))
        .catch(() => ({ bps, data: null }))
    );

    const depthResults = await Promise.all(depthPromises);

    // Build venue depth bands from the fetched data
    const venueMap = new Map<string, VenueDepthBand>();

    for (const result of depthResults) {
      if (!result.data?.venues) continue;
      
      for (const v of result.data.venues) {
        if (!v.ok) continue;
        
        const existing = venueMap.get(v.venue) || {
          venue: v.venue,
          depth10bps: 0,
          depth25bps: 0,
          depth50bps: 0,
          depth100bps: 0,
          depth200bps: 0,
        };

        // Use ask depth for buy side, bid depth for sell side
        const depth = side === "buy" ? v.ask : v.bid;

        switch (result.bps) {
          case 10: existing.depth10bps = depth; break;
          case 25: existing.depth25bps = depth; break;
          case 50: existing.depth50bps = depth; break;
          case 100: existing.depth100bps = depth; break;
          case 200: existing.depth200bps = depth; break;
        }

        venueMap.set(v.venue, existing);
      }
    }

    const venues = Array.from(venueMap.values());
    const asOf = depthResults.find(r => r.data)?.data?.timestamp 
      ? new Date(depthResults.find(r => r.data)!.data!.timestamp).toISOString() 
      : new Date().toISOString();

    const snapshotInput: DepthSnapshotInput = {
      symbol,
      asOf,
      venues,
    };

    const summary = computeTsleDepthSummary(snapshotInput, {
      side,
      requestedSize,
    });

    res.json({
      ok: true,
      symbol: summary.symbol,
      side: summary.side,
      requestedSize: summary.requestedSize,
      estImpactBps: summary.estImpactBps,
      regime: summary.regime,
      score: summary.score,
      maxSizeAt25bps: summary.maxSizeAt25bps,
      maxSizeAt50bps: summary.maxSizeAt50bps,
      maxSizeAt100bps: summary.maxSizeAt100bps,
      totals: {
        depth10bps: summary.totalDepth10bps,
        depth25bps: summary.totalDepth25bps,
        depth50bps: summary.totalDepth50bps,
        depth100bps: summary.totalDepth100bps,
        depth200bps: summary.totalDepth200bps,
      },
      venues: summary.venues,
      asOf: snapshotInput.asOf,
      source: "tsle-depth-engine",
    });
  } catch (err: any) {
    console.error("[TSLE] depth error:", err?.message || err);

    res.status(500).json({
      ok: false,
      error: "TSLE_DEPTH_ERROR",
      message:
        err?.message ||
        "Failed to compute TSLE depth. Check server logs for details.",
    });
  }
});

export default router;
