import { Router, Request, Response } from "express";
import { tsleBuffer, tsleStateEngine, type LISSnapshot } from "../services/tsle-buffer";

const router = Router();
const CURVE_API = "https://api.curve.fi/api";
const TIMEOUT_MS = 5000;

// 3pool address (USDC/USDT/DAI): 0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7
const POOL_REGISTRY: Record<string, { address: string; api: string }> = {
  BTC:  { address: "0xd51a44d3fae010294c616388b506acda1bfaae46", api: `${CURVE_API}/getPools/ethereum/crypto` },
  ETH:  { address: "0xdc24316b9ae028f1497c275eb9192a3ea0f67022", api: `${CURVE_API}/getPools/ethereum/crypto` },
  // ILU-20 stablecoins — all live in Curve 3pool
  USDC: { address: "0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7", api: `${CURVE_API}/getPools/ethereum/main`   },
  USDT: { address: "0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7", api: `${CURVE_API}/getPools/ethereum/main`   },
  DAI:  { address: "0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7", api: `${CURVE_API}/getPools/ethereum/main`   },
};

const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin", ETH: "ethereum",
  USDC: "usd-coin", USDT: "tether", DAI: "dai",
};
const HARDCODED_FALLBACK: Record<string, number> = {
  BTC: 65000, ETH: 1900,
  USDC: 1.0, USDT: 1.0, DAI: 1.0,
};
const FALLBACK_POOL_USD: Record<string, number> = {
  BTC: 180_000_000, ETH: 320_000_000,
  USDC: 250_000_000, USDT: 250_000_000, DAI: 250_000_000,
};

let refPriceCache: Record<string, { price: number; ts: number }> = {};

async function getRefPrice(symbol: string): Promise<number> {
  if (symbol === "USDC") return 1.0;
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

async function curveFetch(url: string): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "StrataLink-LIS/1.0", Accept: "application/json" } });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`Curve API HTTP ${resp.status}`);
    return resp.json();
  } catch (e: any) {
    clearTimeout(timer);
    throw new Error(e.name === "AbortError" ? `Timeout after ${TIMEOUT_MS}ms` : e.message);
  }
}

function buildSnapshot(symbol: string, midPrice: number, poolUsdTotal: number): LISSnapshot {
  const bpsLevels = [0.1, 0.25, 0.5, 1, 2];
  const bands: Record<string, { bid_notional: number; ask_notional: number; total_notional: number }> = {};
  for (const bps of bpsLevels) {
    const half = poolUsdTotal * (bps / 100) * 0.5;
    bands[`pct_${bps}`] = { bid_notional: Math.round(half), ask_notional: Math.round(half), total_notional: Math.round(half * 2) };
  }
  const spreadBps = symbol === "USDC" ? 0.02 : 0.04;
  return { venue: "curve", symbol: symbol.toUpperCase(), timestamp: Date.now(), mid_price: midPrice, spread: { absolute: midPrice * (spreadBps / 10_000), bps: spreadBps }, bands };
}

async function fetchCurveDepth(symbol: string): Promise<{ snapshot: LISSnapshot; synthetic: boolean }> {
  const pool = POOL_REGISTRY[symbol];
  let liveError = "";
  try {
    const data = await curveFetch(pool.api);
    const pools: any[] = data?.data?.poolData ?? [];
    const match = pools.find((p: any) => p.address?.toLowerCase() === pool.address.toLowerCase());
    if (match) {
      const usdTotal = parseFloat(match.usdTotal ?? match.tvl ?? "0");
      const refPrice = await getRefPrice(symbol);
      const midPrice = symbol === "USDC" ? 1.0 : refPrice;
      if (usdTotal > 0 && midPrice > 0) return { snapshot: buildSnapshot(symbol, midPrice, usdTotal), synthetic: false };
      liveError = "usdTotal=0";
    } else { liveError = `Pool ${pool.address} not found`; }
  } catch (e: any) { liveError = e.message; }
  console.log(`[Curve] Live unavailable (${liveError}), synthetic fallback for ${symbol}`);
  const refPrice = await getRefPrice(symbol);
  return { snapshot: buildSnapshot(symbol, refPrice, FALLBACK_POOL_USD[symbol] ?? 100_000_000), synthetic: true };
}

router.get("/spot/depth", async (req: Request, res: Response) => {
  if (!authCheck(req, res)) return;
  const symbol = ((req.query.symbol as string) || "ETH").toUpperCase();
  if (!POOL_REGISTRY[symbol]) return res.status(400).json({ ok: false, error: `Symbol ${symbol} not in Curve pool registry. Supported: ${Object.keys(POOL_REGISTRY).join(", ")}` });
  try {
    const { snapshot, synthetic } = await fetchCurveDepth(symbol);
    tsleBuffer.record(snapshot);
    const tsle = tsleStateEngine.transition("curve", symbol, tsleBuffer.getHistory("curve", symbol), snapshot.spread.bps);
    (snapshot as any).tsle = tsle;
    (snapshot as any).provenance = { sourceVenue: "curve", transport: synthetic ? "synthetic" : "relay", scope: "spot", synthetic };
    return res.json({ ok: true, ...snapshot });
  } catch (e: any) { return res.status(502).json({ ok: false, error: e.message }); }
});

router.get("/health", async (_req: Request, res: Response) => {
  try {
    const data = await curveFetch(`${CURVE_API}/getPools/ethereum/crypto`);
    res.json({ ok: true, venue: "curve", poolCount: data?.data?.poolData?.length ?? 0, ts: Date.now() });
  } catch (e: any) { res.json({ ok: false, venue: "curve", error: e.message }); }
});

export default router;
