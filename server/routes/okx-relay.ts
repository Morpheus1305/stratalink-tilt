import { Router } from "express";
import type { Request, Response } from "express";
import {
  tsleBuffer,
  tsleStateEngine,
  type LISSnapshot,
} from "../services/tsle-buffer";

const router = Router();

const OKX_BASE = "https://www.okx.com/api/v5";

const INSTRUMENT_MAP: Record<string, Record<string, string>> = {
  spot: {
    BTC: "BTC-USDT",
    ETH: "ETH-USDT",
    SOL: "SOL-USDT",
    LINK: "LINK-USDT",
    AVAX: "AVAX-USDT",
    XRP: "XRP-USDT",
    ADA: "ADA-USDT",
    DOT: "DOT-USDT",
    NEAR: "NEAR-USDT",
    UNI: "UNI-USDT",
  },
  perps: {
    BTC: "BTC-USDT-SWAP",
    ETH: "ETH-USDT-SWAP",
    SOL: "SOL-USDT-SWAP",
    LINK: "LINK-USDT-SWAP",
    AVAX: "AVAX-USDT-SWAP",
    XRP: "XRP-USDT-SWAP",
    ADA: "ADA-USDT-SWAP",
    DOT: "DOT-USDT-SWAP",
    NEAR: "NEAR-USDT-SWAP",
  },
};

function resolveInstrument(market: string, symbol: string): string | null {
  return INSTRUMENT_MAP[market]?.[symbol.toUpperCase()] ?? null;
}

function normalizeOKXOrderbook(
  data: any,
  symbol: string
): LISSnapshot {
  const bids: [string, string, string, string][] = data?.bids ?? [];
  const asks: [string, string, string, string][] = data?.asks ?? [];

  const bestBid = bids[0] ? parseFloat(bids[0][0]) : 0;
  const bestAsk = asks[0] ? parseFloat(asks[0][0]) : 0;
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
    for (const [priceStr, qtyStr] of bids) {
      const price = parseFloat(priceStr);
      const qty = parseFloat(qtyStr);
      if (price >= bidFloor) bidNotional += price * qty;
    }

    let askNotional = 0;
    for (const [priceStr, qtyStr] of asks) {
      const price = parseFloat(priceStr);
      const qty = parseFloat(qtyStr);
      if (price <= askCeil) askNotional += price * qty;
    }

    bands[`pct_${bps}`] = {
      bid_notional: bidNotional,
      ask_notional: askNotional,
      total_notional: bidNotional + askNotional,
    };
  }

  return {
    venue: "okx",
    symbol: symbol.toUpperCase(),
    timestamp: data?.ts ? parseInt(data.ts) : Date.now(),
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

async function fetchOKXOrderbook(instId: string, sz?: string): Promise<any> {
  const url = `${OKX_BASE}/market/books?instId=${encodeURIComponent(instId)}&sz=${sz || "50"}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`OKX API ${response.status}`);
  }

  const json = await response.json();

  if (json.code !== "0" || !json.data?.length) {
    throw new Error(json.msg || "Empty OKX response");
  }

  return json.data[0];
}

router.get("/spot/depth", async (req: Request, res: Response) => {
  if (!authCheck(req, res)) return;

  const symbol = String(req.query.symbol ?? "BTC").toUpperCase();
  const instrument = resolveInstrument("spot", symbol);

  if (!instrument) {
    return res.status(400).json({ ok: false, error: `No spot instrument for ${symbol}` });
  }

  try {
    const data = await fetchOKXOrderbook(instrument);
    const snapshot = normalizeOKXOrderbook(data, symbol);
    (snapshot as any).market = "spot";
    (snapshot as any).instrument = instrument;
    (snapshot as any).provenance = {
      sourceVenue: "okx",
      transport: "relay",
      engine: "okx-relay-v1",
      ts_fetch: Date.now(),
    };

    tsleBuffer.record(snapshot);
    const buffer = tsleBuffer.getHistory("okx", symbol);
    const tsle = tsleStateEngine.transition("okx", symbol, buffer, snapshot.spread.bps);
    (snapshot as any).tsle = tsle;

    return res.json({ ok: true, ...snapshot });
  } catch (err: any) {
    console.error("[OKX Relay]", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get("/perps/depth", async (req: Request, res: Response) => {
  if (!authCheck(req, res)) return;

  const symbol = String(req.query.symbol ?? "BTC").toUpperCase();
  const instrument = resolveInstrument("perps", symbol);

  if (!instrument) {
    return res.status(400).json({ ok: false, error: `No perps instrument for ${symbol}` });
  }

  try {
    const data = await fetchOKXOrderbook(instrument);
    const snapshot = normalizeOKXOrderbook(data, symbol);
    (snapshot as any).market = "perps";
    (snapshot as any).instrument = instrument;
    (snapshot as any).provenance = {
      sourceVenue: "okx",
      transport: "relay",
      engine: "okx-relay-v1",
      ts_fetch: Date.now(),
    };

    tsleBuffer.record(snapshot);
    const buffer = tsleBuffer.getHistory("okx", symbol);
    const tsle = tsleStateEngine.transition("okx", symbol, buffer, snapshot.spread.bps);
    (snapshot as any).tsle = tsle;

    return res.json({ ok: true, ...snapshot });
  } catch (err: any) {
    console.error("[OKX Relay]", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get("/funding", async (req: Request, res: Response) => {
  if (!authCheck(req, res)) return;

  const symbol = String(req.query.symbol ?? "BTC").toUpperCase();
  const instrument = resolveInstrument("perps", symbol);

  if (!instrument) {
    return res.status(400).json({ ok: false, error: `No perps instrument for ${symbol}` });
  }

  try {
    const response = await fetch(
      `${OKX_BASE}/public/funding-rate?instId=${encodeURIComponent(instrument)}`
    );

    if (!response.ok) {
      throw new Error(`OKX funding API ${response.status}`);
    }

    const json = await response.json();
    const data = json.data?.[0];

    return res.json({
      ok: true,
      venue: "okx",
      symbol,
      instrument,
      fundingRate: data?.fundingRate ? parseFloat(data.fundingRate) : null,
      nextFundingRate: data?.nextFundingRate ? parseFloat(data.nextFundingRate) : null,
      fundingTime: data?.fundingTime ? parseInt(data.fundingTime) : null,
      ts: Date.now(),
    });
  } catch (err: any) {
    console.error("[OKX Relay]", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get("/health", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    venue: "okx",
    engine: "okx-relay-v1",
    instruments: INSTRUMENT_MAP,
    ts: Date.now(),
  });
});

export default router;
