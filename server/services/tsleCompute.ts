// server/services/tsleCompute.ts
import type { Request } from "express";

export type TSLEComputeResult = {
  ok: boolean;
  token: string;
  venue: string;
  symbol: string;
  side: "buy" | "sell";
  requestedSize: number;

  estImpactBps: number;
  regime: string;
  score: number; // 0..100

  maxSizeAt25bps: number;
  maxSizeAt50bps: number;
  maxSizeAt100bps: number;

  totals: {
    depth10bps: number;
    depth25bps: number;
    depth50bps: number;
    depth100bps: number;
    depth200bps: number;
  };

  venues: Array<{
    venue: string;
    share25bps: number;
    share50bps: number;
    share100bps: number;
  }>;

  source: "live" | "fallback";
  asOf: string;

  evidence: {
    sufficient: boolean;
    rationale: string;
  };
};

// ---- tiny helpers ----
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const num = (x: unknown, d = 0) => (Number.isFinite(Number(x)) ? Number(x) : d);
const round0 = (n: number) => Math.round(n);
const isoNow = () => new Date().toISOString();

type DepthResponse = {
  symbol?: string;
  bps?: number;
  venues?: Array<{ venue: string; bid: number; ask: number; ok?: boolean }>;
  totalBid?: number;
  totalAsk?: number;
  symmetry?: number;
  timestamp?: number;
  source?: "live" | "fallback" | string;
};

function computeEvidence(result: Omit<TSLEComputeResult, "evidence">): TSLEComputeResult["evidence"] {
  const hasSomeDepth =
    result.totals.depth25bps > 0 ||
    result.totals.depth50bps > 0 ||
    result.totals.depth100bps > 0 ||
    result.maxSizeAt25bps > 0 ||
    result.maxSizeAt50bps > 0 ||
    result.maxSizeAt100bps > 0;

  if (result.source === "fallback") {
    return { sufficient: false, rationale: "Fallback source" };
  }
  if (!hasSomeDepth) {
    return { sufficient: false, rationale: "No executable depth evidence" };
  }
  return { sufficient: true, rationale: "Live depth evidence present" };
}

async function fetchDepth(params: {
  token: string;
  venue: string;
  bps: number;
}): Promise<DepthResponse | null> {
  try {
    const port = process.env.PORT ?? "5000";
    const url = `http://127.0.0.1:${port}/api/depth?token=${encodeURIComponent(
      params.token
    )}&venue=${encodeURIComponent(params.venue)}&bps=${encodeURIComponent(String(params.bps))}`;

    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (!r.ok) return null;

    const ct = r.headers.get("content-type") || "";
    if (!ct.includes("application/json")) return null;

    return (await r.json()) as DepthResponse;
  } catch {
    return null;
  }
}

// Basic “impact” model:
// - If maxSizeAt25bps is the notional you can do within 25bps,
//   then impact for requestedSize scales linearly beyond it.
function estimateImpactBps(requestedSize: number, maxSizeAt25bps: number): number {
  if (maxSizeAt25bps <= 0) return 500; // effectively “cannot execute”
  const ratio = requestedSize / maxSizeAt25bps; // 1.0 => ~25bps
  return clamp(round0(ratio * 25), 0, 500);
}

function scoreFromImpact(impactBps: number): number {
  // 0bps => 100, 250bps => 50, 500bps => 0 (linear)
  const s = 100 - (impactBps / 500) * 100;
  return clamp(round0(s), 0, 100);
}

function regimeFromImpact(impactBps: number): string {
  if (impactBps <= 25) return "Deep";
  if (impactBps <= 75) return "Normal";
  if (impactBps <= 150) return "Thin";
  return "Stressed";
}

/**
 * ✅ TSLE compute backed by /api/depth (Phase 1)
 *
 * Later:
 * - Replace fetchDepth calls with direct depth engine calls
 * - Expand venue share logic using real multi-venue depth
 */
export async function computeTSLE(input: {
  token?: string;
  venue?: string;
  symbol?: string;
  side?: "buy" | "sell";
  requestedSize?: number;
}): Promise<TSLEComputeResult> {
  const token = String(input.token ?? "BTC").toUpperCase();
  const venue = String(input.venue ?? "coinbase").toLowerCase();
  const symbol = String(input.symbol ?? token);
  const side = (input.side ?? "buy") as "buy" | "sell";
  const requestedSize = clamp(num(input.requestedSize, 100000), 1000, 100000000);

  // Pull depth at multiple bps levels
  const [d10, d25, d50, d100, d200] = await Promise.all([
    fetchDepth({ token, venue, bps: 10 }),
    fetchDepth({ token, venue, bps: 25 }),
    fetchDepth({ token, venue, bps: 50 }),
    fetchDepth({ token, venue, bps: 100 }),
    fetchDepth({ token, venue, bps: 200 }),
  ]);

  // If we can’t get any depth, fall back gracefully
  const any = d25 ?? d10 ?? d50 ?? d100 ?? d200;
  if (!any) {
    const base: Omit<TSLEComputeResult, "evidence"> = {
      ok: false,
      token,
      venue,
      symbol,
      side,
      requestedSize,
      estImpactBps: 500,
      regime: "Unknown",
      score: 0,
      maxSizeAt25bps: 0,
      maxSizeAt50bps: 0,
      maxSizeAt100bps: 0,
      totals: { depth10bps: 0, depth25bps: 0, depth50bps: 0, depth100bps: 0, depth200bps: 0 },
      venues: [],
      source: "fallback",
      asOf: isoNow(),
    };
    return { ...base, evidence: computeEvidence(base) };
  }

  // Side-aware executable depth:
  // buy uses asks, sell uses bids
  const depthAt = (dr: DepthResponse | null) => {
    if (!dr) return 0;
    const bid = num(dr.totalBid, 0);
    const ask = num(dr.totalAsk, 0);
    return side === "buy" ? ask : bid;
  };

  const depth10 = depthAt(d10);
  const depth25 = depthAt(d25);
  const depth50 = depthAt(d50);
  const depth100 = depthAt(d100);
  const depth200 = depthAt(d200);

  // Conservative: max sizes are just executable depth at that band
  const maxSizeAt25bps = depth25;
  const maxSizeAt50bps = depth50 || Math.max(depth25, 0) * 1.5;
  const maxSizeAt100bps = depth100 || Math.max(depth50, depth25, 0) * 2;

  const estImpactBps = estimateImpactBps(requestedSize, maxSizeAt25bps);
  const score = scoreFromImpact(estImpactBps);
  const regime = regimeFromImpact(estImpactBps);

  // Consider “live” only if depth itself is live
  const depthSource = String(any.source ?? "fallback").toLowerCase();
  const source: "live" | "fallback" = depthSource === "live" ? "live" : "fallback";

  const resultBase: Omit<TSLEComputeResult, "evidence"> = {
    ok: true,
    token,
    venue,
    symbol,
    side,
    requestedSize,

    estImpactBps,
    regime,
    score,

    maxSizeAt25bps: round0(maxSizeAt25bps),
    maxSizeAt50bps: round0(maxSizeAt50bps),
    maxSizeAt100bps: round0(maxSizeAt100bps),

    totals: {
      depth10bps: round0(depth10),
      depth25bps: round0(depth25),
      depth50bps: round0(depth50),
      depth100bps: round0(depth100),
      depth200bps: round0(depth200),
    },

    // Placeholder until multi-venue depth is real (keep stable)
    venues: [
      { venue: "Coinbase", share25bps: 45, share50bps: 42, share100bps: 40 },
      { venue: "Binance", share25bps: 35, share50bps: 38, share100bps: 40 },
      { venue: "Kraken", share25bps: 20, share50bps: 20, share100bps: 20 },
    ],

    source,
    asOf: isoNow(),
  };

  const evidence = computeEvidence(resultBase);

  return { ...resultBase, evidence };
}

export async function computeTSLEFromReq(req: Request): Promise<TSLEComputeResult> {
  const token = req.query.token as string | undefined;
  const venue = req.query.venue as string | undefined;
  const symbol = req.query.symbol as string | undefined;
  const side = (req.query.side as "buy" | "sell" | undefined) ?? "buy";
  const requestedSize = req.query.size ? Number(req.query.size) : undefined;

  return computeTSLE({ token, venue, symbol, side, requestedSize });
}