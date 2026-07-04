import { Router } from "express";
import type { Request, Response } from "express";
import {
  tsleBuffer,
  tsleStateEngine,
  type LISSnapshot,
} from "../services/tsle-buffer";

const router = Router();

const DERIBIT_BASE = "https://www.deribit.com/api/v2/public";

const INSTRUMENT_MAP: Record<string, Record<string, string>> = {
  perps: {
    BTC: "BTC-PERPETUAL",
    ETH: "ETH-PERPETUAL",
    SOL: "SOL_USDC-PERPETUAL",
  },
  spot: {
    BTC: "BTC_USDC",
    ETH: "ETH_USDC",
  },
};

function resolveInstrument(market: string, symbol: string): string | null {
  return INSTRUMENT_MAP[market]?.[symbol.toUpperCase()] ?? null;
}

function normalizeDeribitOrderbook(
  data: any,
  symbol: string
): LISSnapshot {
  const bids: [number, number][] = data.bids ?? [];
  const asks: [number, number][] = data.asks ?? [];

  const bestBid = data.best_bid_price ?? bids[0]?.[0] ?? 0;
  const bestAsk = data.best_ask_price ?? asks[0]?.[0] ?? 0;
  const midPrice = (bestBid + bestAsk) / 2;
  const spreadAbsolute = bestAsk - bestBid;
  const spreadBps = midPrice > 0 ? (spreadAbsolute / midPrice) * 10_000 : 0;

  const bpsLevels = [0.1, 0.25, 0.5, 1, 2];
  const bands: Record<string, { bid_notional: number; ask_notional: number; total_notional: number }> = {};

  for (const bps of bpsLevels) {
    const range = midPrice * (bps / 100);
    const bidFloor = midPrice - range;
    const askCeil = midPrice + range;

    let bidNotional = 0;
    for (const [price, qty] of bids) {
      if (price >= bidFloor) bidNotional += price * qty;
    }

    let askNotional = 0;
    for (const [price, qty] of asks) {
      if (price <= askCeil) askNotional += price * qty;
    }

    bands[`pct_${bps}`] = {
      bid_notional: bidNotional,
      ask_notional: askNotional,
      total_notional: bidNotional + askNotional,
    };
  }

  return {
    venue: "deribit",
    symbol: symbol.toUpperCase(),
    timestamp: data.timestamp ?? Date.now(),
    mid_price: midPrice,
    spread: { absolute: spreadAbsolute, bps: spreadBps },
    bands,
  };
}

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

router.get("/perps/depth", async (req: Request, res: Response) => {
  if (!authCheck(req, res)) return;

  const symbol = String(req.query.symbol ?? "BTC").toUpperCase();
  const instrument = resolveInstrument("perps", symbol);

  if (!instrument) {
    return res.status(400).json({ ok: false, error: `No perps instrument for ${symbol}` });
  }

  try {
    const response = await fetch(
      `${DERIBIT_BASE}/get_order_book?instrument_name=${instrument}&depth=50`,
      { signal: AbortSignal.timeout(10_000) }
    );

    if (!response.ok) {
      return res.status(response.status).json({ ok: false, error: `Deribit API ${response.status}` });
    }

    const json = await response.json();
    const data = json.result;

    if (!data) {
      return res.status(502).json({ ok: false, error: "Empty Deribit response" });
    }

    const snapshot = normalizeDeribitOrderbook(data, symbol);
    (snapshot as any).market = "perps";
    (snapshot as any).instrument = instrument;
    (snapshot as any).provenance = {
      sourceVenue: "deribit",
      transport: "relay",
      engine: "deribit-relay-v1",
      ts_fetch: Date.now(),
    };

    tsleBuffer.record(snapshot);
    const buffer = tsleBuffer.getHistory("deribit", symbol);
    const tsle = tsleStateEngine.transition("deribit", symbol, buffer, snapshot.spread.bps);
    (snapshot as any).tsle = tsle;

    return res.json({ ok: true, ...snapshot });
  } catch (err: any) {
    console.error("[Deribit Relay]", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get("/spot/depth", async (req: Request, res: Response) => {
  if (!authCheck(req, res)) return;

  const symbol = String(req.query.symbol ?? "BTC").toUpperCase();
  const instrument = resolveInstrument("spot", symbol);

  if (!instrument) {
    return res.status(400).json({ ok: false, error: `No spot instrument for ${symbol}` });
  }

  try {
    const response = await fetch(
      `${DERIBIT_BASE}/get_order_book?instrument_name=${instrument}&depth=50`,
      { signal: AbortSignal.timeout(10_000) }
    );

    if (!response.ok) {
      return res.status(response.status).json({ ok: false, error: `Deribit API ${response.status}` });
    }

    const json = await response.json();
    const data = json.result;

    if (!data) {
      return res.status(502).json({ ok: false, error: "Empty Deribit response" });
    }

    const snapshot = normalizeDeribitOrderbook(data, symbol);
    (snapshot as any).market = "spot";
    (snapshot as any).instrument = instrument;
    (snapshot as any).provenance = {
      sourceVenue: "deribit",
      transport: "relay",
      engine: "deribit-relay-v1",
      ts_fetch: Date.now(),
    };

    tsleBuffer.record(snapshot);

    return res.json({ ok: true, ...snapshot });
  } catch (err: any) {
    console.error("[Deribit Relay]", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get("/health", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    venue: "deribit",
    engine: "deribit-relay-v1",
    instruments: INSTRUMENT_MAP,
    ts: Date.now(),
  });
});

export default router;
