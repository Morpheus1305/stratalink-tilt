/**
 * Bybit Relay — server/routes/bybit-relay.ts
 * ─────────────────────────────────────────────────────────────────────────
 * SRIS v1.0-compliant relay for Bybit Spot + Linear Perpetuals.
 * Drop this file into server/routes/ and register in routes.ts.
 *
 * Routes (mounted at /bybit in routes.ts):
 *   GET /spot/depth?symbol=BTC      → Bybit spot orderbook
 *   GET /perps/depth?symbol=BTC     → Bybit linear perps orderbook
 *   GET /perps/funding?symbol=BTC   → Current funding rate (8h period)
 *   GET /perps/oi?symbol=BTC        → Open interest in USD notional
 *   GET /health                     → Connectivity check
 */

import { Router, Request, Response } from "express";

const router = Router();

const BYBIT_API  = "https://api.bybit.com";
const TIMEOUT_MS = 5000;

// ── Symbol map ────────────────────────────────────────────────────────────────

const SYMBOL_MAP: Record<string, string> = {
  BTC:  "BTCUSDT",
  ETH:  "ETHUSDT",
  SOL:  "SOLUSDT",
  XRP:  "XRPUSDT",
  DOGE: "DOGEUSDT",
  BNB:  "BNBUSDT",
  AVAX: "AVAXUSDT",
  ARB:  "ARBUSDT",
  OP:   "OPUSDT",
  SUI:  "SUIUSDT",
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
  return { venue: "Bybit", ok: false, mid: null, bids: [], asks: [], levels: {}, error: msg };
}

function errFunding(msg: string): FundingResponse {
  return { venue: "Bybit", ok: false, fundingRate: null, fundingPeriodHours: 8, error: msg };
}

function errOI(msg: string): OIResponse {
  return { venue: "Bybit", ok: false, oi: null, error: msg };
}

async function bybitFetch(path: string): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(`${BYBIT_API}${path}`, { signal: controller.signal });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json() as any;
    if (json.retCode !== 0) throw new Error(`Bybit error ${json.retCode}: ${json.retMsg}`);
    return json.result;
  } catch (e: any) {
    clearTimeout(timer);
    throw new Error(e.name === "AbortError" ? `Timeout after ${TIMEOUT_MS}ms` : e.message);
  }
}

function buildBook(result: any): DepthResponse {
  const rawBids: string[][] = result.b ?? [];
  const rawAsks: string[][] = result.a ?? [];
  if (!rawBids.length || !rawAsks.length) return errDepth("Empty orderbook");

  const bestBid = parseFloat(rawBids[0][0]);
  const bestAsk = parseFloat(rawAsks[0][0]);
  if (bestBid <= 0 || bestAsk <= 0 || bestBid >= bestAsk)
    return errDepth(`BBO sanity failed bid=${bestBid} ask=${bestAsk}`);

  const mid  = (bestBid + bestAsk) / 2;
  const bids = rawBids.map(([p, q]) => [parseFloat(p), parseFloat(q)] as [number, number]);
  const asks = rawAsks.map(([p, q]) => [parseFloat(p), parseFloat(q)] as [number, number]);
  return { venue: "Bybit", ok: true, mid, bids, asks, levels: {}, error: null };
}

// ── Route handlers ────────────────────────────────────────────────────────────

router.get("/spot/depth", async (req: Request, res: Response) => {
  const symbol = ((req.query.symbol as string) || "BTC").toUpperCase();
  const native = SYMBOL_MAP[symbol];
  if (!native) return res.json(errDepth(`Symbol ${symbol} not in Bybit spot registry`));
  try {
    const result = await bybitFetch(`/v5/market/orderbook?category=spot&symbol=${native}&limit=50`);
    res.json(buildBook(result));
  } catch (e: any) {
    res.json(errDepth(e.message));
  }
});

router.get("/perps/depth", async (req: Request, res: Response) => {
  const symbol = ((req.query.symbol as string) || "BTC").toUpperCase();
  const native = SYMBOL_MAP[symbol];
  if (!native) return res.json(errDepth(`Symbol ${symbol} not in Bybit perps registry`));
  try {
    const result = await bybitFetch(`/v5/market/orderbook?category=linear&symbol=${native}&limit=50`);
    res.json(buildBook(result));
  } catch (e: any) {
    res.json(errDepth(e.message));
  }
});

router.get("/perps/funding", async (req: Request, res: Response) => {
  const symbol = ((req.query.symbol as string) || "BTC").toUpperCase();
  const native = SYMBOL_MAP[symbol];
  if (!native) return res.json(errFunding(`Symbol ${symbol} not in Bybit perps registry`));
  try {
    const result = await bybitFetch(`/v5/market/tickers?category=linear&symbol=${native}`);
    const ticker = result?.list?.[0];
    if (!ticker) return res.json(errFunding("No ticker data returned"));
    res.json({
      venue: "Bybit",
      ok: true,
      fundingRate: parseFloat(ticker.fundingRate ?? "0"),
      fundingPeriodHours: 8,
      error: null,
    });
  } catch (e: any) {
    res.json(errFunding(e.message));
  }
});

router.get("/perps/oi", async (req: Request, res: Response) => {
  const symbol = ((req.query.symbol as string) || "BTC").toUpperCase();
  const native = SYMBOL_MAP[symbol];
  if (!native) return res.json(errOI(`Symbol ${symbol} not in Bybit perps registry`));
  try {
    // openInterestValue is already denominated in USD by Bybit
    const result = await bybitFetch(`/v5/market/tickers?category=linear&symbol=${native}`);
    const ticker = result?.list?.[0];
    if (!ticker) return res.json(errOI("No ticker data returned"));
    res.json({
      venue: "Bybit",
      ok: true,
      oi: parseFloat(ticker.openInterestValue ?? "0"),
      error: null,
    });
  } catch (e: any) {
    res.json(errOI(e.message));
  }
});

router.get("/health", async (_req: Request, res: Response) => {
  try {
    const resp = await fetch(`${BYBIT_API}/v5/market/time`);
    const json = await resp.json() as any;
    res.json({ ok: json.retCode === 0, venue: "Bybit", ts: Date.now() });
  } catch (e: any) {
    res.json({ ok: false, venue: "Bybit", error: e.message });
  }
});

export default router;