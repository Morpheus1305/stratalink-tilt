/**
 * dYdX v4 Relay — server/routes/dydx-relay.ts
 * SRIS v1.0-compliant relay for dYdX v4 (Cosmos appchain, CLOB perps).
 * Uses the public dYdX Indexer REST API — no authentication required.
 * Normalizes orderbook data to LISSnapshot format with depth bands.
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
import {
  tsleBuffer,
  tsleStateEngine,
  type LISSnapshot,
} from "../services/tsle-buffer";

const router = Router();

const DYDX_INDEXER = "https://indexer.dydx.trade/v4";
const TIMEOUT_MS = 5000;

const SYMBOL_MAP: Record<string, string> = {
  // ILU-20 — Reserve
  BTC:  "BTC-USD",
  ETH:  "ETH-USD",
  // ILU-20 — Exchange & Trading Infrastructure
  BNB:  "BNB-USD",
  UNI:  "UNI-USD",
  // ILU-20 — Financial Infrastructure
  LINK: "LINK-USD",
  AAVE: "AAVE-USD",
  MKR:  "MKR-USD",
  SNX:  "SNX-USD",
  COMP: "COMP-USD",
  // ILU-20 — High-Volume Liquidity
  SOL:  "SOL-USD",
  XRP:  "XRP-USD",
  DOGE: "DOGE-USD",
  ADA:  "ADA-USD",
  AVAX: "AVAX-USD",
  // extended
  TON:  "TON-USD",
  // legacy
  ARB:  "ARB-USD",
  OP:   "OP-USD",
  MATIC:"MATIC-USD",
  SUI:  "SUI-USD",
  DOT:  "DOT-USD",
  NEAR: "NEAR-USD",
};

function authCheck(req: Request, res: Response): boolean {
  const secret = process.env.RELAY_SECRET;
  if (!secret) return true;
  const provided = req.headers["x-relay-secret"] as string;
  if (provided !== secret) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return false;
  }
  return true;
}

async function dydxFetch(path: string): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(`${DYDX_INDEXER}${path}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
  } catch (e: any) {
    clearTimeout(timer);
    throw new Error(
      e.name === "AbortError" ? `Timeout after ${TIMEOUT_MS}ms` : e.message
    );
  }
}

function normalizeDydxOrderbook(
  data: any,
  symbol: string
): LISSnapshot {
  const rawBids = (data?.bids ?? []) as Array<{
    price: string;
    size: string;
  }>;
  const rawAsks = (data?.asks ?? []) as Array<{
    price: string;
    size: string;
  }>;

  const bestBid = rawBids[0] ? parseFloat(rawBids[0].price) : 0;
  const bestAsk = rawAsks[0] ? parseFloat(rawAsks[0].price) : 0;
  const midPrice = (bestBid + bestAsk) / 2;
  const spreadAbsolute = bestAsk - bestBid;
  const spreadBps =
    midPrice > 0 ? (spreadAbsolute / midPrice) * 10_000 : 0;

  const bpsLevels = [0.1, 0.25, 0.5, 1, 2];
  const bands: Record<
    string,
    { bid_notional: number; ask_notional: number; total_notional: number }
  > = {};

  for (const bps of bpsLevels) {
    const range = midPrice * (bps / 100);
    const bidFloor = midPrice - range;
    const askCeil = midPrice + range;

    let bidNotional = 0;
    for (const level of rawBids) {
      const price = parseFloat(level.price);
      const qty = parseFloat(level.size);
      if (price >= bidFloor) bidNotional += price * qty;
    }

    let askNotional = 0;
    for (const level of rawAsks) {
      const price = parseFloat(level.price);
      const qty = parseFloat(level.size);
      if (price <= askCeil) askNotional += price * qty;
    }

    bands[`pct_${bps}`] = {
      bid_notional: bidNotional,
      ask_notional: askNotional,
      total_notional: bidNotional + askNotional,
    };
  }

  return {
    venue: "dydx",
    symbol: symbol.toUpperCase(),
    timestamp: Date.now(),
    mid_price: midPrice,
    spread: { absolute: spreadAbsolute, bps: spreadBps },
    bands,
  };
}

router.get("/perps/depth", async (req: Request, res: Response) => {
  if (!authCheck(req, res)) return;
  const symbol = ((req.query.symbol as string) || "BTC").toUpperCase();
  const ticker = SYMBOL_MAP[symbol];
  if (!ticker)
    return res
      .status(400)
      .json({ ok: false, error: `Symbol ${symbol} not in dYdX v4 registry` });
  try {
    const data = await dydxFetch(
      `/orderbooks/perpetualMarket/${ticker}`
    );

    const snapshot = normalizeDydxOrderbook(data, symbol);

    if (snapshot.mid_price <= 0) {
      return res
        .status(502)
        .json({ ok: false, error: "Empty orderbook from dYdX" });
    }

    tsleBuffer.record(snapshot);
    const buffer = tsleBuffer.getHistory("dydx", symbol);
    const tsle = tsleStateEngine.transition(
      "dydx",
      symbol,
      buffer,
      snapshot.spread.bps
    );
    (snapshot as any).tsle = tsle;
    (snapshot as any).provenance = {
      sourceVenue: "dydx",
      transport: "relay",
      scope: "perps",
    };

    return res.json({ ok: true, ...snapshot });
  } catch (e: any) {
    return res.status(502).json({ ok: false, error: e.message });
  }
});

router.get("/perps/funding", async (req: Request, res: Response) => {
  if (!authCheck(req, res)) return;
  const symbol = ((req.query.symbol as string) || "BTC").toUpperCase();
  const ticker = SYMBOL_MAP[symbol];
  if (!ticker)
    return res
      .status(400)
      .json({
        ok: false,
        error: `Symbol ${symbol} not in dYdX v4 registry`,
      });
  try {
    const data = await dydxFetch(
      `/perpetualMarkets?limit=1&ticker=${ticker}`
    );
    const market = data?.markets?.[ticker];
    if (!market)
      return res
        .status(502)
        .json({ ok: false, error: `Market ${ticker} not found` });
    res.json({
      venue: "dydx",
      ok: true,
      fundingRate: parseFloat(market.nextFundingRate ?? "0"),
      fundingPeriodHours: 1,
      error: null,
    });
  } catch (e: any) {
    res.status(502).json({ ok: false, error: e.message });
  }
});

router.get("/perps/oi", async (req: Request, res: Response) => {
  if (!authCheck(req, res)) return;
  const symbol = ((req.query.symbol as string) || "BTC").toUpperCase();
  const ticker = SYMBOL_MAP[symbol];
  if (!ticker)
    return res
      .status(400)
      .json({ ok: false, error: `Symbol ${symbol} not in dYdX v4 registry` });
  try {
    const data = await dydxFetch(
      `/perpetualMarkets?limit=1&ticker=${ticker}`
    );
    const market = data?.markets?.[ticker];
    if (!market)
      return res
        .status(502)
        .json({ ok: false, error: `Market ${ticker} not found` });
    const oi =
      parseFloat(market.openInterest ?? "0") *
      parseFloat(market.oraclePrice ?? "0");
    res.json({ venue: "dydx", ok: true, oi, error: null });
  } catch (e: any) {
    res.status(502).json({ ok: false, error: e.message });
  }
});

router.get("/health", async (_req: Request, res: Response) => {
  try {
    const data = (await dydxFetch("/height")) as any;
    res.json({
      ok: true,
      venue: "dydx",
      indexerHeight: data?.height,
      ts: Date.now(),
    });
  } catch (e: any) {
    res.json({ ok: false, venue: "dydx", error: e.message });
  }
});

export default router;
