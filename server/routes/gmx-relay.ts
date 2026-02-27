import { Router, Request, Response } from "express";
import {
  tsleBuffer,
  tsleStateEngine,
  type LISSnapshot,
} from "../services/tsle-buffer";

const router = Router();

const GMX_API = "https://arbitrum-api.gmxinfra.io";
const GMX_STATS_API = "https://synthetics-stats.gmx.io";
const TIMEOUT_MS = 6000;

interface GmxMarket {
  tokenAddress: string;
  marketAddress: string;
  tokenDecimals: number;
  poolDepthUsd: number;
}

const GMX_MARKETS: Record<string, GmxMarket> = {
  BTC: {
    tokenAddress: "0x47904963fc8b2340414262125aF798B9655E58Cd",
    marketAddress: "0x47c031236e19d024b42f8AE6780E44A573170703",
    tokenDecimals: 8,
    poolDepthUsd: 80_000_000,
  },
  ETH: {
    tokenAddress: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    marketAddress: "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336",
    tokenDecimals: 18,
    poolDepthUsd: 150_000_000,
  },
  SOL: {
    tokenAddress: "0x2BCc6D6CdBbDC0a4071e48bb3B969b06B3330c07",
    marketAddress: "0x09400D9DB990D5ed3f35D7be61DfAEB900Af03C9",
    tokenDecimals: 9,
    poolDepthUsd: 30_000_000,
  },
  ARB: {
    tokenAddress: "0x912CE59144191C1204E64559FE8253a0e49E6548",
    marketAddress: "0xC25cEf6061Cf5dE5eb761b50E4743c1F5D7E5407",
    tokenDecimals: 18,
    poolDepthUsd: 20_000_000,
  },
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

async function gmxFetch(url: string): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
  } catch (e: any) {
    clearTimeout(timer);
    throw new Error(e.name === "AbortError" ? `Timeout after ${TIMEOUT_MS}ms` : e.message);
  }
}

function parseGmxOraclePrice(rawStr: string, tokenDecimals: number): number {
  const exponent = 30 - tokenDecimals;
  const raw = rawStr.replace(/[^0-9]/g, "").padStart(exponent + 1, "0");
  const splitPoint = raw.length - exponent;
  const intPart = raw.slice(0, splitPoint) || "0";
  const fracPart = raw.slice(splitPoint);
  return parseFloat(intPart + (fracPart ? "." + fracPart : ""));
}

async function getOraclePrice(symbol: string): Promise<number> {
  const market = GMX_MARKETS[symbol];
  if (!market) throw new Error(`Symbol ${symbol} not in GMX v2 registry`);

  const tickers = (await gmxFetch(`${GMX_API}/prices/tickers`)) as any[];
  const ticker = tickers.find(
    (t: any) => t.tokenSymbol?.toUpperCase() === symbol.toUpperCase() ||
      t.tokenAddress?.toLowerCase() === market.tokenAddress.toLowerCase()
  );
  if (!ticker) throw new Error(`Token ${symbol} not found in GMX price feed`);

  const minP = parseGmxOraclePrice(String(ticker.minPrice), market.tokenDecimals);
  const maxP = parseGmxOraclePrice(String(ticker.maxPrice), market.tokenDecimals);
  if (!minP || !maxP || minP <= 0 || maxP <= 0)
    throw new Error(`Invalid oracle price for ${symbol}: min=${ticker.minPrice} max=${ticker.maxPrice}`);

  return (minP + maxP) / 2;
}

function buildSyntheticBook(mid: number, poolDepthUsd: number, symbol: string): LISSnapshot {
  const weights = [0.25, 0.20, 0.15, 0.12, 0.10, 0.07, 0.05, 0.03, 0.02, 0.01];
  const bpStep = 5;

  const rawBids: [number, number][] = [];
  const rawAsks: [number, number][] = [];
  for (let i = 0; i < weights.length; i++) {
    const bps = (i + 1) * bpStep;
    const bidPrice = mid * (1 - bps / 10000);
    const askPrice = mid * (1 + bps / 10000);
    const depthUsd = poolDepthUsd * weights[i];
    rawBids.push([bidPrice, depthUsd / bidPrice]);
    rawAsks.push([askPrice, depthUsd / askPrice]);
  }

  const spreadBps = 3 + Math.random() * 2;
  const halfSpread = mid * (spreadBps / 20_000);
  const spreadAbsolute = halfSpread * 2;

  const bpsLevels = [0.1, 0.25, 0.5, 1, 2];
  const bands: Record<string, { bid_notional: number; ask_notional: number; total_notional: number }> = {};

  for (const bps of bpsLevels) {
    const range = mid * (bps / 100);
    const bidFloor = mid - range;
    const askCeil = mid + range;

    let bidNotional = 0;
    for (const [price, qty] of rawBids) {
      if (price >= bidFloor) bidNotional += price * qty;
    }

    let askNotional = 0;
    for (const [price, qty] of rawAsks) {
      if (price <= askCeil) askNotional += price * qty;
    }

    bands[`pct_${bps}`] = {
      bid_notional: bidNotional,
      ask_notional: askNotional,
      total_notional: bidNotional + askNotional,
    };
  }

  return {
    venue: "gmx",
    symbol: symbol.toUpperCase(),
    timestamp: Date.now(),
    mid_price: mid,
    spread: { absolute: spreadAbsolute, bps: spreadBps },
    bands,
  };
}

router.get("/perps/depth", async (req: Request, res: Response) => {
  if (!authCheck(req, res)) return;
  const symbol = ((req.query.symbol as string) || "BTC").toUpperCase();
  const market = GMX_MARKETS[symbol];
  if (!market)
    return res.status(400).json({ ok: false, error: `Symbol ${symbol} not in GMX v2 registry` });

  try {
    const mid = await getOraclePrice(symbol);
    const snapshot = buildSyntheticBook(mid, market.poolDepthUsd, symbol);

    tsleBuffer.record(snapshot);
    const buffer = tsleBuffer.getHistory("gmx", symbol);
    const tsle = tsleStateEngine.transition("gmx", symbol, buffer, snapshot.spread.bps);
    (snapshot as any).tsle = tsle;
    (snapshot as any).provenance = {
      sourceVenue: "gmx",
      transport: "synthetic",
      scope: "perps",
      synthetic: true,
      note: "Pool-based DEX — orderbook synthesized from oracle price + pool depth",
    };

    return res.json({ ok: true, ...snapshot });
  } catch (e: any) {
    return res.status(502).json({ ok: false, error: e.message });
  }
});

router.get("/perps/funding", async (req: Request, res: Response) => {
  if (!authCheck(req, res)) return;
  const symbol = ((req.query.symbol as string) || "BTC").toUpperCase();
  const market = GMX_MARKETS[symbol];
  if (!market)
    return res.json({ ok: false, venue: "gmx", fundingRate: null, fundingPeriodHours: 1, error: `Symbol ${symbol} not in GMX v2 registry` });

  try {
    const data = (await gmxFetch(`${GMX_STATS_API}/markets?chainId=42161`)) as any;
    const mkts: any[] = data?.markets ?? data ?? [];
    const m = mkts.find(
      (x: any) => x.marketTokenAddress?.toLowerCase() === market.marketAddress.toLowerCase()
    );

    if (!m) {
      return res.json({
        ok: true,
        venue: "gmx",
        fundingRate: 0,
        fundingPeriodHours: 1,
        note: "GMX v2 uses asymmetric borrow fees; stats unavailable",
        error: null,
      });
    }

    const longPerSec = parseFloat(m.longBorrowingFactorPerSecond ?? m.borrowingFactorPerSecondForLongs ?? "0");
    const shortPerSec = parseFloat(m.shortBorrowingFactorPerSecond ?? m.borrowingFactorPerSecondForShorts ?? "0");
    const netPerHour = (longPerSec - shortPerSec) * 3600;

    res.json({
      ok: true,
      venue: "gmx",
      fundingRate: netPerHour,
      fundingPeriodHours: 1,
      note: "Net borrow fee (longs - shorts) normalised to 1h",
      error: null,
    });
  } catch (e: any) {
    res.json({
      ok: true,
      venue: "gmx",
      fundingRate: 0,
      fundingPeriodHours: 1,
      note: `GMX v2 borrow fee unavailable: ${e.message}`,
      error: null,
    });
  }
});

router.get("/perps/oi", async (req: Request, res: Response) => {
  if (!authCheck(req, res)) return;
  const symbol = ((req.query.symbol as string) || "BTC").toUpperCase();
  const market = GMX_MARKETS[symbol];
  if (!market)
    return res.json({ ok: false, venue: "gmx", oi: null, error: `Symbol ${symbol} not in GMX v2 registry` });

  try {
    const data = (await gmxFetch(`${GMX_STATS_API}/markets?chainId=42161`)) as any;
    const mkts: any[] = data?.markets ?? data ?? [];
    const m = mkts.find(
      (x: any) => x.marketTokenAddress?.toLowerCase() === market.marketAddress.toLowerCase()
    );
    if (!m) return res.json({ ok: false, venue: "gmx", oi: null, error: `Market ${symbol} not found in GMX stats` });

    const PRECISION = 30;
    const scale = Math.pow(10, PRECISION);
    const longOI = parseFloat(m.longOpenInterestUsd ?? "0") / scale;
    const shortOI = parseFloat(m.shortOpenInterestUsd ?? "0") / scale;

    res.json({ ok: true, venue: "gmx", oi: longOI + shortOI, error: null });
  } catch (e: any) {
    res.json({ ok: false, venue: "gmx", oi: null, error: e.message });
  }
});

router.get("/health", async (_req: Request, res: Response) => {
  try {
    const tickers = (await gmxFetch(`${GMX_API}/prices/tickers`)) as any[];
    res.json({
      ok: Array.isArray(tickers) && tickers.length > 0,
      venue: "gmx",
      tickerCount: tickers?.length ?? 0,
      ts: Date.now(),
    });
  } catch (e: any) {
    res.json({ ok: false, venue: "gmx", error: e.message });
  }
});

export default router;
