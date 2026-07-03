import { Router } from "express";
import type { Request, Response } from "express";
import {
  tsleBuffer,
  tsleStateEngine,
  type LISSnapshot,
} from "../services/tsle-buffer";

const router = Router();

// Token addresses on Optimism chain
const TOKEN_MAP: Record<string, { address: string; decimals: number; coingeckoId: string }> = {
  ETH:   { address: "0x4200000000000000000000000000000000000006", decimals: 18, coingeckoId: "ethereum" },
  WETH:  { address: "0x4200000000000000000000000000000000000006", decimals: 18, coingeckoId: "ethereum" },
  USDC:  { address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", decimals: 6,  coingeckoId: "usd-coin" },
  USDT:  { address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", decimals: 6,  coingeckoId: "tether" },
  DAI:   { address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", decimals: 18, coingeckoId: "dai" },
  WBTC:  { address: "0x68f180fcCe6836688e9084f035309E29Bf0A2095", decimals: 8,  coingeckoId: "wrapped-bitcoin" },
  BTC:   { address: "0x68f180fcCe6836688e9084f035309E29Bf0A2095", decimals: 8,  coingeckoId: "wrapped-bitcoin" },
  LINK:  { address: "0x350a791Bfc2C21F9Ed5d10980Dad2e2638ffa7f6", decimals: 18, coingeckoId: "chainlink" },
  AAVE:  { address: "0x76FB31fb4af56892A25e32cFC43De717950c9278", decimals: 18, coingeckoId: "aave" },
  UNI:   { address: "0x6fd9d7AD17242c41f7131d257212c54A0e816691", decimals: 18, coingeckoId: "uniswap" },
  SNX:   { address: "0x8700dAec35aF8Ff88c16BdF0418774CB3D7599B4", decimals: 18, coingeckoId: "havven" },
  OP:    { address: "0x4200000000000000000000000000000000000042", decimals: 18, coingeckoId: "optimism" },
};

const DEFILLAMA_POOLS_URL = "https://yields.llama.fi/pools";

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

function computeDepthBands(
  tvlUSD: number,
  feeTierBps: number
): Record<string, { bid_notional: number; ask_notional: number; total_notional: number }> {
  const halfTVL = tvlUSD / 2;
  const bpsLevels = [0.1, 0.25, 0.5, 1, 2];
  const bands: Record<string, { bid_notional: number; ask_notional: number; total_notional: number }> = {};

  for (const bps of bpsLevels) {
    const fraction = bps / 100;
    const concentrationFactor = Math.min(1, fraction / (feeTierBps / 10_000));
    const bidNotional = halfTVL * concentrationFactor;
    const askNotional = halfTVL * concentrationFactor;
    bands[`pct_${bps}`] = {
      bid_notional: Math.round(bidNotional * 100) / 100,
      ask_notional: Math.round(askNotional * 100) / 100,
      total_notional: Math.round((bidNotional + askNotional) * 100) / 100,
    };
  }
  return bands;
}

async function fetchDefiLlamaTVL(symbol: string): Promise<{ tvlUSD: number; pool: string } | null> {
  try {
    const res = await fetch(DEFILLAMA_POOLS_URL);
    if (!res.ok) return null;
    const data = await res.json();
    const pools: any[] = data?.data ?? [];

    const matches = pools.filter((p: any) =>
      (p.project === "velodrome-v2" || p.project === "velodrome") &&
      p.chain === "Optimism" &&
      p.symbol?.toUpperCase().includes(symbol.toUpperCase())
    );

    if (!matches.length) return null;
    matches.sort((a: any, b: any) => (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0));
    return { tvlUSD: matches[0].tvlUsd ?? 0, pool: matches[0].pool ?? matches[0].symbol };
  } catch {
    return null;
  }
}

async function fetchTokenPrice(coingeckoId: string): Promise<number> {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`
    );
    if (!res.ok) return 0;
    const data = await res.json();
    return data?.[coingeckoId]?.usd ?? 0;
  } catch {
    return 0;
  }
}

router.get("/spot/depth", async (req: Request, res: Response) => {
  if (!authCheck(req, res)) return;

  const rawSymbol = String(req.query.symbol ?? "ETH").toUpperCase();
  const lookupKey = TOKEN_MAP[rawSymbol] ? rawSymbol : `W${rawSymbol}`;
  const tokenInfo = TOKEN_MAP[lookupKey] ?? TOKEN_MAP[rawSymbol];

  if (!tokenInfo) {
    return res.status(400).json({
      ok: false,
      error: `Token ${rawSymbol} not mapped for Velodrome. Available: ${Object.keys(TOKEN_MAP).join(", ")}`,
    });
  }

  try {
    const [llamaPool, price] = await Promise.all([
      fetchDefiLlamaTVL(rawSymbol === "BTC" ? "WBTC" : rawSymbol),
      fetchTokenPrice(tokenInfo.coingeckoId),
    ]);

    if (llamaPool && llamaPool.tvlUSD > 10_000 && price > 0) {
      const feeTierBps = 30;
      const bands = computeDepthBands(llamaPool.tvlUSD, feeTierBps);
      const snapshot: LISSnapshot = {
        venue: "velodrome",
        symbol: rawSymbol,
        timestamp: Date.now(),
        mid_price: price,
        spread: { absolute: price * (feeTierBps / 10_000), bps: feeTierBps },
        bands,
      };
      (snapshot as any).market = "spot";
      (snapshot as any).chain = "optimism";
      (snapshot as any).source = "defillama";
      (snapshot as any).poolInfo = { pool: llamaPool.pool, tvlUSD: llamaPool.tvlUSD };
      (snapshot as any).provenance = {
        sourceVenue: "velodrome",
        transport: "relay",
        engine: "velodrome-relay-v1",
        chain: "optimism",
        dataSource: "defillama+coingecko",
        ts_fetch: Date.now(),
      };

      tsleBuffer.record(snapshot);
      const buffer = tsleBuffer.getHistory("velodrome", rawSymbol);
      const tsle = tsleStateEngine.transition("velodrome", rawSymbol, buffer, snapshot.spread?.bps ?? 0);
      (snapshot as any).tsle = tsle;

      return res.json({ ok: true, ...snapshot });
    }

    // Fallback: synthetic depth from buffer anchor or baseline
    let syntheticPrice = price;

    if (!syntheticPrice) {
      for (const fallbackVenue of ["binance", "coinbase", "kraken", "okx"]) {
        const history = tsleBuffer.getRawHistory(fallbackVenue, rawSymbol);
        if (history && history.length > 0) {
          const last = history[history.length - 1];
          if (last?.mid_price > 0) { syntheticPrice = last.mid_price; break; }
        }
      }
    }

    if (!syntheticPrice) {
      const BASELINE: Record<string, number> = {
        ETH: 1800, BTC: 60000, USDC: 1, USDT: 1, DAI: 1, LINK: 15, AAVE: 90, UNI: 10, SNX: 2.5, OP: 1.5,
      };
      syntheticPrice = BASELINE[rawSymbol] ?? 0;
    }

    if (!syntheticPrice) {
      return res.status(404).json({ ok: false, error: `No Velodrome pool data found for ${rawSymbol}` });
    }

    // Conservative Optimism chain TVL estimates (smaller than Base, Velodrome TVL ~$80M)
    const SYNTHETIC_TVL: Record<string, number> = {
      ETH: 60_000_000, BTC: 15_000_000, USDC: 50_000_000, USDT: 30_000_000, DAI: 10_000_000,
      LINK: 3_000_000, AAVE: 2_500_000, UNI: 2_000_000, SNX: 5_000_000, OP: 8_000_000,
    };
    const syntheticTVL = SYNTHETIC_TVL[rawSymbol] ?? 1_500_000;
    const feeTierBps = 30;
    const bands = computeDepthBands(syntheticTVL, feeTierBps);

    const snapshot: LISSnapshot = {
      venue: "velodrome",
      symbol: rawSymbol,
      timestamp: Date.now(),
      mid_price: syntheticPrice,
      spread: { absolute: syntheticPrice * (feeTierBps / 10_000), bps: feeTierBps },
      bands,
    };
    (snapshot as any).market = "spot";
    (snapshot as any).chain = "optimism";
    (snapshot as any).source = "synthetic";
    (snapshot as any).provenance = {
      sourceVenue: "velodrome",
      transport: "synthetic",
      engine: "velodrome-relay-v1",
      chain: "optimism",
      dataSource: "coingecko-anchored-synthetic",
      ts_fetch: Date.now(),
    };

    tsleBuffer.record(snapshot);
    const buffer = tsleBuffer.getHistory("velodrome", rawSymbol);
    const tsle = tsleStateEngine.transition("velodrome", rawSymbol, buffer, snapshot.spread?.bps ?? 0);
    (snapshot as any).tsle = tsle;

    return res.json({ ok: true, ...snapshot });
  } catch (err: any) {
    console.error("[Velodrome Relay]", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get("/health", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    venue: "velodrome",
    chain: "optimism",
    engine: "velodrome-relay-v1",
    tokens: Object.keys(TOKEN_MAP),
    ts: Date.now(),
  });
});

export default router;
