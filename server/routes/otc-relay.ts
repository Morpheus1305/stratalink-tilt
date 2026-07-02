import { Router, Request, Response } from "express";
import crypto from "crypto";
import { tsleBuffer, tsleStateEngine, type LISSnapshot } from "../services/tsle-buffer";

const router = Router();
const TIMEOUT_MS = 5000;
// Full ILU-20 coverage + legacy symbols  -  OTC/RFQ desk provides synthetic depth for all
const SUPPORTED_SYMBOLS = [
  "BTC", "ETH",                              // Reserve
  "USDT", "USDC", "USDE", "DAI",             // Stablecoin
  "BNB", "HYPE", "OKB", "CRO",              // Exchange
  "LINK", "MKR", "AAVE", "UNI",             // Infrastructure
  "SOL", "XRP", "DOGE", "TON", "ADA",       // High-Volume Liquidity
  "AVAX", "ARB", "OP",                       // legacy
];

const COINGECKO_IDS: Record<string, string> = {
  BTC:  "bitcoin",          ETH:  "ethereum",
  USDT: "tether",           USDC: "usd-coin",
  USDE: "ethena-usde",      DAI:  "dai",
  BNB:  "binancecoin",      HYPE: "hyperliquid",
  OKB:  "okb",              CRO:  "crypto-com-chain",
  LINK: "chainlink",        MKR:  "maker",
  AAVE: "aave",             UNI:  "uniswap",
  SOL:  "solana",           XRP:  "ripple",
  DOGE: "dogecoin",         TON:  "the-open-network",
  ADA:  "cardano",
  AVAX: "avalanche-2",      ARB:  "arbitrum",   OP: "optimism",
};
const HARDCODED_FALLBACK: Record<string, number> = {
  BTC:  105000, ETH: 3500,
  USDT: 1.00,   USDC: 1.00,  USDE: 1.00,  DAI: 1.00,
  BNB:  680,    HYPE: 28,    OKB: 55,     CRO: 0.12,
  LINK: 18,     MKR: 2200,   AAVE: 220,   UNI: 12,
  SOL:  180,    XRP: 2.50,   DOGE: 0.38,  TON: 5.5,  ADA: 0.78,
  AVAX: 42,     ARB: 1.2,    OP: 2.5,
};

let refPriceCache: Record<string, { price: number; ts: number }> = {};

async function getRefPrice(symbol: string): Promise<number> {
  const cached = refPriceCache[symbol];
  if (cached && Date.now() - cached.ts < 30_000) return cached.price;
  const cgId = COINGECKO_IDS[symbol];
  if (!cgId) return HARDCODED_FALLBACK[symbol] ?? 1;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const resp = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${cgId}&vs_currencies=usd`, { signal: controller.signal });
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
  return cached?.price ?? HARDCODED_FALLBACK[symbol] ?? 1;
}

function authCheck(req: Request, res: Response): boolean {
  const secret = process.env.RELAY_SECRET;
  if (!secret) return true;
  const provided = req.headers["x-relay-secret"] as string;
  if (provided !== secret) { res.status(401).json({ ok: false, error: "Unauthorized" }); return false; }
  return true;
}

function signRequest(method: string, path: string, body: string, secret: string): string {
  const ts = Date.now().toString();
  return `${ts}.${crypto.createHmac("sha256", secret).update(`${ts}${method.toUpperCase()}${path}${body}`).digest("hex")}`;
}

async function otcFetch(path: string, body: Record<string, any> = {}): Promise<any> {
  const rfqUrl = process.env.OTC_RFQ_URL;
  const apiKey = process.env.OTC_API_KEY;
  const apiSecret = process.env.OTC_API_SECRET;
  if (!rfqUrl) throw new Error("OTC_RFQ_URL not configured  -  this relay requires institutional onboarding");
  const bodyStr = JSON.stringify(body);
  const sig = apiSecret ? signRequest("POST", path, bodyStr, apiSecret) : "";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(`${rfqUrl}${path}`, { method: "POST", signal: controller.signal, headers: { "Content-Type": "application/json", "User-Agent": "StrataLink-LIS/1.0", ...(apiKey ? { "X-API-Key": apiKey } : {}), ...(sig ? { "X-Signature": sig } : {}) }, body: bodyStr });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`OTC API HTTP ${resp.status}`);
    return resp.json();
  } catch (e: any) {
    clearTimeout(timer);
    throw new Error(e.name === "AbortError" ? `OTC timeout after ${TIMEOUT_MS}ms` : e.message);
  }
}

function buildSyntheticSnapshot(symbol: string, midPrice: number, poolSize: number): LISSnapshot {
  const spreadBps = 2.5;
  const bands: Record<string, { bid_notional: number; ask_notional: number; total_notional: number }> = {};
  for (const bps of [0.1, 0.25, 0.5, 1, 2]) {
    const total = poolSize * (bps / 2) * (0.8 + Math.random() * 0.4);
    bands[`pct_${bps}`] = { bid_notional: Math.round(total * 0.5), ask_notional: Math.round(total * 0.5), total_notional: Math.round(total) };
  }
  return { venue: "otc", symbol: symbol.toUpperCase(), timestamp: Date.now(), mid_price: midPrice, spread: { absolute: midPrice * (spreadBps / 10_000), bps: spreadBps }, bands };
}

async function fetchOtcDepth(symbol: string, scope: "spot" | "perps"): Promise<{ snapshot: LISSnapshot; synthetic: boolean }> {
  if (!process.env.OTC_RFQ_URL) {
    const refPrice = await getRefPrice(symbol);
    return { snapshot: buildSyntheticSnapshot(symbol, refPrice, symbol === "BTC" ? 50_000_000 : 20_000_000), synthetic: true };
  }
  const notionals = [1_000_000, 5_000_000, 10_000_000, 25_000_000, 50_000_000];
  let liveError = "";
  try {
    const quotesRaw = await Promise.all(notionals.map(n => otcFetch("/rfq/indicative", { symbol: `${symbol}USD`, side: "two-way", notional: n, currency: "USD", scope })));
    const quotes = quotesRaw.map((q: any, i) => ({ notional: notionals[i], bid: parseFloat(q.bid ?? q.bidPrice ?? "0"), ask: parseFloat(q.ask ?? q.askPrice ?? "0") }));
    if (quotes[0].bid > 0) {
      const mid = (quotes[0].bid + quotes[0].ask) / 2;
      const spreadBps = ((quotes[0].ask - quotes[0].bid) / mid) * 10_000;
      const bands: Record<string, { bid_notional: number; ask_notional: number; total_notional: number }> = {};
      [0.1, 0.25, 0.5, 1, 2].forEach((bps, i) => {
        const q = quotes[Math.min(i, quotes.length - 1)];
        bands[`pct_${bps}`] = { bid_notional: Math.round(q.notional / 2), ask_notional: Math.round(q.notional / 2), total_notional: q.notional };
      });
      const snapshot: LISSnapshot = { venue: "otc", symbol: symbol.toUpperCase(), timestamp: Date.now(), mid_price: mid, spread: { absolute: quotes[0].ask - quotes[0].bid, bps: spreadBps }, bands };
      return { snapshot, synthetic: false };
    }
    liveError = "Zero bid in RFQ response";
  } catch (e: any) { liveError = e.message; }
  console.log(`[OTC] Live RFQ unavailable (${liveError}), synthetic fallback for ${symbol}`);
  const refPrice = await getRefPrice(symbol);
  return { snapshot: buildSyntheticSnapshot(symbol, refPrice, symbol === "BTC" ? 50_000_000 : 20_000_000), synthetic: true };
}

router.get("/spot/depth", async (req: Request, res: Response) => {
  if (!authCheck(req, res)) return;
  const symbol = ((req.query.symbol as string) || "BTC").toUpperCase();
  if (!SUPPORTED_SYMBOLS.includes(symbol)) return res.status(400).json({ ok: false, error: `Symbol ${symbol} not supported. Supported: ${SUPPORTED_SYMBOLS.join(", ")}` });
  try {
    const { snapshot, synthetic } = await fetchOtcDepth(symbol, "spot");
    tsleBuffer.record(snapshot);
    const tsle = tsleStateEngine.transition("otc", symbol, tsleBuffer.getHistory("otc", symbol), snapshot.spread.bps);
    (snapshot as any).tsle = tsle;
    (snapshot as any).provenance = { sourceVenue: process.env.OTC_VENUE_NAME ?? "OTC (RFQ)", transport: synthetic ? "synthetic" : "relay", scope: "spot", synthetic };
    return res.json({ ok: true, ...snapshot });
  } catch (e: any) { return res.status(502).json({ ok: false, error: e.message }); }
});

router.get("/perps/depth", async (req: Request, res: Response) => {
  if (!authCheck(req, res)) return;
  const symbol = ((req.query.symbol as string) || "BTC").toUpperCase();
  if (!SUPPORTED_SYMBOLS.includes(symbol)) return res.status(400).json({ ok: false, error: `Symbol ${symbol} not supported` });
  try {
    const { snapshot, synthetic } = await fetchOtcDepth(symbol, "perps");
    tsleBuffer.record(snapshot);
    const tsle = tsleStateEngine.transition("otc", symbol, tsleBuffer.getHistory("otc", symbol), snapshot.spread.bps);
    (snapshot as any).tsle = tsle;
    (snapshot as any).provenance = { sourceVenue: process.env.OTC_VENUE_NAME ?? "OTC (RFQ)", transport: synthetic ? "synthetic" : "relay", scope: "perps", synthetic };
    return res.json({ ok: true, ...snapshot });
  } catch (e: any) { return res.status(502).json({ ok: false, error: e.message }); }
});

router.get("/health", async (_req: Request, res: Response) => {
  const rfqUrl = process.env.OTC_RFQ_URL;
  const venueName = process.env.OTC_VENUE_NAME ?? "OTC (RFQ)";
  if (!rfqUrl) return res.json({ ok: false, venue: "otc", venueName, status: "unconfigured", note: "OTC_RFQ_URL not configured  -  requires institutional onboarding" });
  try {
    const data = await otcFetch("/health", {});
    res.json({ ok: true, venue: "otc", venueName, ts: Date.now(), ...data });
  } catch (e: any) { res.json({ ok: false, venue: "otc", venueName, error: e.message }); }
});

export default router;
