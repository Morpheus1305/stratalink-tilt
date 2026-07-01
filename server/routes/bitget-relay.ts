import { Router, Request, Response } from "express";
import {
  tsleBuffer,
  tsleStateEngine,
  type LISSnapshot,
} from "../services/tsle-buffer";

const router = Router();

const BITGET_API = "https://api.bitget.com";
const TIMEOUT_MS = 5000;
const PRODUCT_TYPE = "USDT-FUTURES";

const SYMBOL_MAP: Record<string, string> = {
  // ILU-20 — Reserve
  BTC:  "BTCUSDT",
  ETH:  "ETHUSDT",
  // ILU-20 — Stablecoin Infrastructure
  USDC: "USDCUSDT",
  DAI:  "DAIUSDT",
  // ILU-20 — Exchange & Trading Infrastructure
  BNB:  "BNBUSDT",
  CRO:  "CROUSDT",
  OKB:  "OKBUSDT",
  UNI:  "UNIUSDT",
  CAKE: "CAKEUSDT",
  // ILU-20 — Financial Infrastructure
  LINK: "LINKUSDT",
  AAVE: "AAVEUSDT",
  MKR:  "MKRUSDT",
  SNX:  "SNXUSDT",
  COMP: "COMPUSDT",
  // ILU-20 — High-Volume Liquidity
  SOL:  "SOLUSDT",
  XRP:  "XRPUSDT",
  DOGE: "DOGEUSDT",
  ADA:  "ADAUSDT",
  AVAX: "AVAXUSDT",
  // legacy
  ARB:  "ARBUSDT",
  OP:   "OPUSDT",
  SUI:  "SUIUSDT",
  DOT:  "DOTUSDT",
  NEAR: "NEARUSDT",
  TON:  "TONUSDT",
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

async function bitgetFetch(path: string): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(`${BITGET_API}${path}`, { signal: controller.signal });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = (await resp.json()) as any;
    if (json.code !== "00000") throw new Error(`Bitget error ${json.code}: ${json.msg}`);
    return json.data;
  } catch (e: any) {
    clearTimeout(timer);
    throw new Error(e.name === "AbortError" ? `Timeout after ${TIMEOUT_MS}ms` : e.message);
  }
}

function normalizeBitgetOrderbook(data: any, symbol: string): LISSnapshot {
  const rawBids: (string | number)[][] = data.bids ?? [];
  const rawAsks: (string | number)[][] = data.asks ?? [];

  if (!rawBids.length || !rawAsks.length) {
    throw new Error("Empty orderbook");
  }

  const bestBid = Number(rawBids[0][0]);
  const bestAsk = Number(rawAsks[0][0]);
  if (bestBid <= 0 || bestAsk <= 0 || bestBid >= bestAsk) {
    throw new Error(`BBO sanity failed bid=${bestBid} ask=${bestAsk}`);
  }

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
    for (const row of rawBids) {
      const price = Number(row[0]);
      const qty = Number(row[1]);
      if (price >= bidFloor) bidNotional += price * qty;
    }

    let askNotional = 0;
    for (const row of rawAsks) {
      const price = Number(row[0]);
      const qty = Number(row[1]);
      if (price <= askCeil) askNotional += price * qty;
    }

    bands[`pct_${bps}`] = {
      bid_notional: bidNotional,
      ask_notional: askNotional,
      total_notional: bidNotional + askNotional,
    };
  }

  return {
    venue: "bitget",
    symbol: symbol.toUpperCase(),
    timestamp: Date.now(),
    mid_price: midPrice,
    spread: { absolute: spreadAbsolute, bps: spreadBps },
    bands,
  };
}

router.get("/spot/depth", async (req: Request, res: Response) => {
  if (!authCheck(req, res)) return;
  const symbol = ((req.query.symbol as string) || "BTC").toUpperCase();
  const native = SYMBOL_MAP[symbol];
  if (!native)
    return res.status(400).json({ ok: false, error: `Symbol ${symbol} not in Bitget spot registry` });

  try {
    const data = await bitgetFetch(`/api/v2/spot/market/orderbook?symbol=${native}&type=step0&limit=50`);
    const snapshot = normalizeBitgetOrderbook(data, symbol);

    tsleBuffer.record(snapshot);
    const buffer = tsleBuffer.getHistory("bitget", symbol);
    const tsle = tsleStateEngine.transition("bitget", symbol, buffer, snapshot.spread.bps);
    (snapshot as any).tsle = tsle;
    (snapshot as any).provenance = {
      sourceVenue: "bitget",
      transport: "relay",
      scope: "spot",
      synthetic: false,
    };

    return res.json({ ok: true, ...snapshot });
  } catch (e: any) {
    return res.status(502).json({ ok: false, error: e.message });
  }
});

router.get("/perps/depth", async (req: Request, res: Response) => {
  if (!authCheck(req, res)) return;
  const symbol = ((req.query.symbol as string) || "BTC").toUpperCase();
  const native = SYMBOL_MAP[symbol];
  if (!native)
    return res.status(400).json({ ok: false, error: `Symbol ${symbol} not in Bitget perps registry` });

  try {
    const data = await bitgetFetch(
      `/api/v2/mix/market/merge-depth?symbol=${native}&productType=${PRODUCT_TYPE}&limit=50`
    );
    const snapshot = normalizeBitgetOrderbook(data, symbol);

    tsleBuffer.record(snapshot);
    const buffer = tsleBuffer.getHistory("bitget", symbol);
    const tsle = tsleStateEngine.transition("bitget", symbol, buffer, snapshot.spread.bps);
    (snapshot as any).tsle = tsle;
    (snapshot as any).provenance = {
      sourceVenue: "bitget",
      transport: "relay",
      scope: "perps",
      synthetic: false,
    };

    return res.json({ ok: true, ...snapshot });
  } catch (e: any) {
    return res.status(502).json({ ok: false, error: e.message });
  }
});

router.get("/perps/funding", async (req: Request, res: Response) => {
  if (!authCheck(req, res)) return;
  const symbol = ((req.query.symbol as string) || "BTC").toUpperCase();
  const native = SYMBOL_MAP[symbol];
  if (!native)
    return res.json({ ok: false, venue: "bitget", fundingRate: null, fundingPeriodHours: 8, error: `Symbol ${symbol} not in Bitget perps registry` });

  try {
    const data = await bitgetFetch(
      `/api/v2/mix/market/current-fund-rate?symbol=${native}&productType=${PRODUCT_TYPE}`
    );
    const item = Array.isArray(data) ? data[0] : data;
    if (!item) return res.json({ ok: false, venue: "bitget", fundingRate: null, fundingPeriodHours: 8, error: "No funding rate data" });
    res.json({
      ok: true,
      venue: "bitget",
      fundingRate: parseFloat(item.fundingRate ?? "0"),
      fundingPeriodHours: 8,
      error: null,
    });
  } catch (e: any) {
    res.json({ ok: false, venue: "bitget", fundingRate: null, fundingPeriodHours: 8, error: e.message });
  }
});

router.get("/perps/oi", async (req: Request, res: Response) => {
  if (!authCheck(req, res)) return;
  const symbol = ((req.query.symbol as string) || "BTC").toUpperCase();
  const native = SYMBOL_MAP[symbol];
  if (!native)
    return res.json({ ok: false, venue: "bitget", oi: null, error: `Symbol ${symbol} not in Bitget perps registry` });

  try {
    const data = await bitgetFetch(
      `/api/v2/mix/market/open-interest?symbol=${native}&productType=${PRODUCT_TYPE}`
    );
    const oi = parseFloat(data?.amount ?? data?.size ?? "0");
    res.json({ ok: true, venue: "bitget", oi, error: null });
  } catch (e: any) {
    res.json({ ok: false, venue: "bitget", oi: null, error: e.message });
  }
});

router.get("/health", async (_req: Request, res: Response) => {
  try {
    await bitgetFetch("/api/v2/public/time");
    res.json({ ok: true, venue: "bitget", ts: Date.now() });
  } catch (e: any) {
    res.json({ ok: false, venue: "bitget", error: e.message });
  }
});

export default router;
