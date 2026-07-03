/**
 * Bybit Relay  -  server/routes/bybit-relay.ts
 * SRIS v1.0-compliant relay for Bybit Spot + Linear Perpetuals.
 * Normalizes orderbook data to LISSnapshot format with depth bands.
 *
 * Routes (mounted at /bybit in routes.ts):
 *   GET /spot/depth?symbol=BTC      → Bybit spot orderbook
 *   GET /perps/depth?symbol=BTC     → Bybit linear perps orderbook
 *   GET /perps/funding?symbol=BTC   → Current funding rate (8h period)
 *   GET /perps/oi?symbol=BTC        → Open interest in USD notional
 *   GET /health                     → Connectivity check
 */

import { Router, Request, Response } from "express";
import {
  tsleBuffer,
  tsleStateEngine,
  type LISSnapshot,
} from "../services/tsle-buffer";

const router = Router();

const BYBIT_API = "https://api.bybit.com";
const TIMEOUT_MS = 5000;

const SYMBOL_MAP: Record<string, string> = {
  // ILU-20  -  Reserve
  BTC:  "BTCUSDT",
  ETH:  "ETHUSDT",
  // ILU-20  -  Stablecoin Infrastructure
  USDT: "USDTUSDC",
  USDC: "USDCUSDT",
  DAI:  "DAIUSDT",
  // ILU-20  -  Exchange & Trading Infrastructure
  BNB:  "BNBUSDT",
  CRO:  "CROUSDT",
  OKB:  "OKBUSDT",
  UNI:  "UNIUSDT",
  CAKE: "CAKEUSDT",
  // ILU-20  -  Financial Infrastructure
  LINK: "LINKUSDT",
  AAVE: "AAVEUSDT",
  MKR:  "MKRUSDT",
  SNX:  "SNXUSDT",
  COMP: "COMPUSDT",
  // ILU-20  -  High-Volume Liquidity
  SOL:  "SOLUSDT",
  XRP:  "XRPUSDT",
  DOGE: "DOGEUSDT",
  ADA:  "ADAUSDT",
  AVAX: "AVAXUSDT",
  // legacy / other
  TON:  "TONUSDT",
  HYPE: "HYPEUSDT",
  USDE: "USDEUSDT",
  ARB:  "ARBUSDT",
  OP:   "OPUSDT",
  SUI:  "SUIUSDT",
  DOT:  "DOTUSDT",
  NEAR: "NEARUSDT",
  // Digital Securities & RWA
  PAXG: "PAXGUSDT",
  XAUT: "XAUTUSDT",
  ONDO: "ONDOUSDT",
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

const COINGECKO_IDS: Record<string, string> = {
  BTC:  "bitcoin",
  ETH:  "ethereum",
  SOL:  "solana",
  XRP:  "ripple",
  DOGE: "dogecoin",
  BNB:  "binancecoin",
  ADA:  "cardano",
  TON:  "the-open-network",
  LINK: "chainlink",
  MKR:  "maker",
  AAVE: "aave",
  UNI:  "uniswap",
  HYPE: "hyperliquid",
  OKB:  "okb",
  CRO:  "crypto-com-chain",
  USDT: "tether",
  USDC: "usd-coin",
  USDE: "ethena-usde",
  DAI:  "dai",
  // ILU-20 additions
  AVAX: "avalanche-2",
  COMP: "compound-governance-token",
  SNX:  "havven",
  CAKE: "pancakeswap-token",
  // legacy
  ARB:  "arbitrum",
  OP:   "optimism",
  SUI:  "sui",
  DOT:  "polkadot",
  NEAR: "near",
  // Digital Securities & RWA
  PAXG: "pax-gold",
  XAUT: "tether-gold",
  ONDO: "ondo-finance",
};

let refPriceCache: Record<string, { price: number; ts: number }> = {};

async function getRefPrice(symbol: string): Promise<number> {
  const cached = refPriceCache[symbol];
  if (cached && Date.now() - cached.ts < 30_000) return cached.price;

  const cgId = COINGECKO_IDS[symbol];
  if (!cgId) return symbol === "BTC" ? 65000 : 0;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const resp = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${cgId}&vs_currencies=usd`,
      { signal: controller.signal }
    );
    clearTimeout(timer);
    if (resp.ok) {
      const data = (await resp.json()) as any;
      const price = data?.[cgId]?.usd ?? 0;
      if (price > 0) {
        refPriceCache[symbol] = { price, ts: Date.now() };
        return price;
      }
    }
  } catch {}
  return cached?.price ?? (symbol === "BTC" ? 65000 : symbol === "ETH" ? 3200 : symbol === "SOL" ? 150 : 10);
}

function generateSyntheticDepth(
  midPrice: number,
  symbol: string,
  scope: string
): LISSnapshot {
  const spreadBps = 2.5; // deterministic synthetic spread when Bybit API is geo-blocked
  const halfSpread = midPrice * (spreadBps / 20_000);
  const spreadAbsolute = halfSpread * 2;

  const bpsLevels = [0.1, 0.25, 0.5, 1, 2];
  const depthScale = symbol === "BTC" ? 1_500_000 : symbol === "ETH" ? 800_000 : 200_000;
  const bands: Record<string, { bid_notional: number; ask_notional: number; total_notional: number }> = {};

  for (const bps of bpsLevels) {
    const scale = bps * depthScale;
    const bidRatio = 0.5; // symmetric book assumption for synthetic fallback
    const bidNotional = scale * bidRatio;
    const askNotional = scale * (1 - bidRatio);
    bands[`pct_${bps}`] = {
      bid_notional: Math.round(bidNotional),
      ask_notional: Math.round(askNotional),
      total_notional: Math.round(bidNotional + askNotional),
    };
  }

  return {
    venue: "bybit",
    symbol: symbol.toUpperCase(),
    timestamp: Date.now(),
    mid_price: midPrice,
    spread: { absolute: spreadAbsolute, bps: spreadBps },
    bands,
  };
}

async function bybitFetch(path: string): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(`${BYBIT_API}${path}`, {
      signal: controller.signal,
      headers: {
        "User-Agent": "StrataLink-LIS/1.0",
        "Accept": "application/json",
      },
    });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = (await resp.json()) as any;
    if (json.retCode !== 0)
      throw new Error(`Bybit error ${json.retCode}: ${json.retMsg}`);
    return json.result;
  } catch (e: any) {
    clearTimeout(timer);
    throw new Error(
      e.name === "AbortError" ? `Timeout after ${TIMEOUT_MS}ms` : e.message
    );
  }
}

function normalizeBybitOrderbook(
  result: any,
  symbol: string
): LISSnapshot {
  const rawBids: string[][] = result?.b ?? [];
  const rawAsks: string[][] = result?.a ?? [];

  const bestBid = rawBids[0] ? parseFloat(rawBids[0][0]) : 0;
  const bestAsk = rawAsks[0] ? parseFloat(rawAsks[0][0]) : 0;
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
    for (const [priceStr, qtyStr] of rawBids) {
      const price = parseFloat(priceStr);
      const qty = parseFloat(qtyStr);
      if (price >= bidFloor) bidNotional += price * qty;
    }

    let askNotional = 0;
    for (const [priceStr, qtyStr] of rawAsks) {
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
    venue: "bybit",
    symbol: symbol.toUpperCase(),
    timestamp: result?.ts ? parseInt(result.ts) : Date.now(),
    mid_price: midPrice,
    spread: { absolute: spreadAbsolute, bps: spreadBps },
    bands,
  };
}

async function fetchBybitDepth(
  symbol: string,
  native: string,
  scope: "spot" | "perps"
): Promise<{ snapshot: LISSnapshot; synthetic: boolean }> {
  const category = scope === "spot" ? "spot" : "linear";
  let liveError = "";
  try {
    const result = await bybitFetch(
      `/v5/market/orderbook?category=${category}&symbol=${native}&limit=50`
    );
    const snapshot = normalizeBybitOrderbook(result, symbol);
    if (snapshot.mid_price > 0) {
      return { snapshot, synthetic: false };
    }
    liveError = "Empty orderbook (mid_price=0)";
  } catch (e: any) {
    liveError = e.message ?? "Unknown error";
  }

  console.log(`[Bybit] Live API unavailable (${liveError}), using synthetic depth for ${symbol}`);
  const refPrice = await getRefPrice(symbol);
  if (refPrice <= 0) throw new Error(`No reference price available for ${symbol}`);
  return { snapshot: generateSyntheticDepth(refPrice, symbol, scope), synthetic: true };
}

router.get("/spot/depth", async (req: Request, res: Response) => {
  if (!authCheck(req, res)) return;
  const symbol = ((req.query.symbol as string) || "BTC").toUpperCase();
  const native = SYMBOL_MAP[symbol];
  if (!native)
    return res
      .status(400)
      .json({ ok: false, error: `Symbol ${symbol} not in Bybit spot registry` });
  try {
    const { snapshot, synthetic } = await fetchBybitDepth(symbol, native, "spot");

    tsleBuffer.record(snapshot);
    const buffer = tsleBuffer.getHistory("bybit", symbol);
    const tsle = tsleStateEngine.transition(
      "bybit",
      symbol,
      buffer,
      snapshot.spread.bps
    );
    (snapshot as any).tsle = tsle;
    (snapshot as any).provenance = {
      sourceVenue: "bybit",
      transport: synthetic ? "synthetic" : "relay",
      scope: "spot",
      synthetic,
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
    return res
      .status(400)
      .json({
        ok: false,
        error: `Symbol ${symbol} not in Bybit perps registry`,
      });
  try {
    const { snapshot, synthetic } = await fetchBybitDepth(symbol, native, "perps");

    tsleBuffer.record(snapshot);
    const buffer = tsleBuffer.getHistory("bybit", symbol);
    const tsle = tsleStateEngine.transition(
      "bybit",
      symbol,
      buffer,
      snapshot.spread.bps
    );
    (snapshot as any).tsle = tsle;
    (snapshot as any).provenance = {
      sourceVenue: "bybit",
      transport: synthetic ? "synthetic" : "relay",
      scope: "perps",
      synthetic,
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
    return res
      .status(400)
      .json({
        ok: false,
        error: `Symbol ${symbol} not in Bybit perps registry`,
      });
  try {
    const result = await bybitFetch(
      `/v5/market/tickers?category=linear&symbol=${native}`
    );
    const ticker = result?.list?.[0];
    if (!ticker)
      return res
        .status(502)
        .json({ ok: false, error: "No ticker data returned" });
    res.json({
      venue: "bybit",
      ok: true,
      fundingRate: parseFloat(ticker.fundingRate ?? "0"),
      fundingPeriodHours: 8,
      error: null,
    });
  } catch (e: any) {
    res.status(502).json({ ok: false, error: e.message });
  }
});

router.get("/perps/oi", async (req: Request, res: Response) => {
  if (!authCheck(req, res)) return;
  const symbol = ((req.query.symbol as string) || "BTC").toUpperCase();
  const native = SYMBOL_MAP[symbol];
  if (!native)
    return res
      .status(400)
      .json({
        ok: false,
        error: `Symbol ${symbol} not in Bybit perps registry`,
      });
  try {
    const result = await bybitFetch(
      `/v5/market/tickers?category=linear&symbol=${native}`
    );
    const ticker = result?.list?.[0];
    if (!ticker)
      return res
        .status(502)
        .json({ ok: false, error: "No ticker data returned" });
    const oi =
      parseFloat(ticker.openInterest ?? "0") *
      parseFloat(ticker.lastPrice ?? "0");
    res.json({ venue: "bybit", ok: true, oi, error: null });
  } catch (e: any) {
    res.status(502).json({ ok: false, error: e.message });
  }
});

router.get("/health", async (_req: Request, res: Response) => {
  try {
    const result = await bybitFetch("/v5/market/time");
    res.json({
      ok: true,
      venue: "bybit",
      serverTime: result?.timeSecond,
      ts: Date.now(),
    });
  } catch (e: any) {
    res.json({ ok: false, venue: "bybit", error: e.message });
  }
});

export default router;
