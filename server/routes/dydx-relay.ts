/**
 * dYdX v4 Relay — server/routes/dydx-relay.ts
 * ─────────────────────────────────────────────────────────────────────────
 * SRIS v1.0-compliant relay for dYdX v4 (Cosmos appchain, CLOB perps).
 * Uses the public dYdX Indexer REST API — no authentication required.
 * Drop this file into server/routes/ and register in routes.ts.
 *
 * Routes (mounted at /dydx in routes.ts):
 *   GET /perps/depth?symbol=BTC     → dYdX perps orderbook
 *   GET /perps/funding?symbol=BTC   → Next funding rate (1h epoch)
 *   GET /perps/oi?symbol=BTC        → Open interest in USD notional
 *   GET /health                     → Indexer connectivity check
 *
 * Note: dYdX v4 funding epoch = 1h (not 8h).
 *       SRIS §9.1 normalises to 8h before averaging across venues.
 */

import { Router, Request, Response } from "express";

const router = Router();

const DYDX_INDEXER = "https://indexer.dydx.trade/v4";
const TIMEOUT_MS   = 5000;

// ── Symbol map ────────────────────────────────────────────────────────────────

const SYMBOL_MAP: Record<string, string> = {
  BTC:  "BTC-USD",
  ETH:  "ETH-USD",
  SOL:  "SOL-USD",
  XRP:  "XRP-USD",
  DOGE: "DOGE-USD",
  AVAX: "AVAX-USD",
  BNB:  "BNB-USD",
  ARB:  "ARB-USD",
  OP:   "OP-USD",
  MATIC:"MATIC-USD",
  SUI:  "SUI-USD",
  LINK: "LINK-USD",
};

// ── Response types ────────────────────────────────────────────────────────────

interface DepthResponse {
  venue: string;
  ok: boolean;
  mid: number | null;
  bids: [number, number][];
  asks: [number, number][];
  levels: Record<string, unknown>;
  error: string | null;
}

interface FundingResponse {
  venue: string;
  ok: boolean;
  fundingRate: number | null;
  fundingPeriodHours: number;
  error: string | null;
}

interface OIResponse {
  venue: string;
  ok: boolean;
  oi: number | null;
  error: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function errDepth(msg: string): DepthResponse {
  return { venue: "dYdX v4", ok: false, mid: null, bids: [], asks: [], levels: {}, error: msg };
}

function errFunding(msg: string): FundingResponse {
  return { venue: "dYdX v4", ok: false, fundingRate: null, fundingPeriodHours: 1, error: msg };
}

function errOI(msg: string): OIResponse {
  return { venue: "dYdX v4", ok: false, oi: null, error: msg };
}

async function dydxFetch(path: string): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(`${DYDX_INDEXER}${path}`, {
      signal: controller.signal,
      headers: { "Accept": "application/json" },
    });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
  } catch (e: any) {
    clearTimeout(timer);
    throw new Error(e.name === "AbortError" ? `Timeout after ${TIMEOUT_MS}ms` : e.message);
  }
}

// ── Route handlers ────────────────────────────────────────────────────────────

router.get("/perps/depth", async (req: Request, res: Response) => {
  const symbol = ((req.query.symbol as string) || "BTC").toUpperCase();
  const ticker = SYMBOL_MAP[symbol];
  if (!ticker) return res.json(errDepth(`Symbol ${symbol} not in dYdX v4 registry`));
  try {
    const data    = await dydxFetch(`/orderbooks/perpetualMarket/${ticker}`);
    const rawBids = (data?.bids ?? []) as Array<{ price: string; size: string }>;
    const rawAsks = (data?.asks ?? []) as Array<{ price: string; size: string }>;
    if (!rawBids.length || !rawAsks.length)
      return res.json(errDepth("Empty orderbook returned by dYdX Indexer"));

    const bestBid = parseFloat(rawBids[0].price);
    const bestAsk = parseFloat(rawAsks[0].price);
    if (bestBid <= 0 || bestAsk <= 0 || bestBid >= bestAsk)
      return res.json(errDepth(`BBO sanity failed bid=${bestBid} ask=${bestAsk}`));

    const mid  = (bestBid + bestAsk) / 2;
    const bids = rawBids.map(l => [parseFloat(l.price), parseFloat(l.size)] as [number, number]);
    const asks = rawAsks.map(l => [parseFloat(l.price), parseFloat(l.size)] as [number, number]);
    res.json({ venue: "dYdX v4", ok: true, mid, bids, asks, levels: {}, error: null });
  } catch (e: any) {
    res.json(errDepth(e.message));
  }
});

router.get("/perps/funding", async (req: Request, res: Response) => {
  const symbol = ((req.query.symbol as string) || "BTC").toUpperCase();
  const ticker = SYMBOL_MAP[symbol];
  if (!ticker) return res.json(errFunding(`Symbol ${symbol} not in dYdX v4 registry`));
  try {
    const data   = await dydxFetch(`/perpetualMarkets?limit=1&ticker=${ticker}`);
    const market = data?.markets?.[ticker];
    if (!market) return res.json(errFunding(`Market ${ticker} not found`));
    // Epoch = 1h; SRIS §9.1 will normalise ×8 before cross-venue averaging
    res.json({
      venue: "dYdX v4",
      ok: true,
      fundingRate: parseFloat(market.nextFundingRate ?? "0"),
      fundingPeriodHours: 1,
      error: null,
    });
  } catch (e: any) {
    res.json(errFunding(e.message));
  }
});

router.get("/perps/oi", async (req: Request, res: Response) => {
  const symbol = ((req.query.symbol as string) || "BTC").toUpperCase();
  const ticker = SYMBOL_MAP[symbol];
  if (!ticker) return res.json(errOI(`Symbol ${symbol} not in dYdX v4 registry`));
  try {
    const data   = await dydxFetch(`/perpetualMarkets?limit=1&ticker=${ticker}`);
    const market = data?.markets?.[ticker];
    if (!market) return res.json(errOI(`Market ${ticker} not found`));
    // openInterest is in base asset units; multiply by oraclePrice for USD notional
    const oi = parseFloat(market.openInterest ?? "0") * parseFloat(market.oraclePrice ?? "0");
    res.json({ venue: "dYdX v4", ok: true, oi, error: null });
  } catch (e: any) {
    res.json(errOI(e.message));
  }
});

router.get("/health", async (_req: Request, res: Response) => {
  try {
    const data = await dydxFetch("/height") as any;
    res.json({ ok: true, venue: "dYdX v4", indexerHeight: data?.height, ts: Date.now() });
  } catch (e: any) {
    res.json({ ok: false, venue: "dYdX v4", error: e.message });
  }
});

export default router;