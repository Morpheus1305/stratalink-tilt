import { Router } from "express";
import type { Request, Response } from "express";
import {
  tsleBuffer,
  tsleStateEngine,
  type LISSnapshot,
} from "../services/tsle-buffer";

const router = Router();

// Token addresses on Base chain
const TOKEN_MAP: Record<string, { address: string; decimals: number; coingeckoId: string }> = {
  ETH:   { address: "0x4200000000000000000000000000000000000006", decimals: 18, coingeckoId: "ethereum" },
  WETH:  { address: "0x4200000000000000000000000000000000000006", decimals: 18, coingeckoId: "ethereum" },
  USDC:  { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6,  coingeckoId: "usd-coin" },
  cbBTC: { address: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf", decimals: 8,  coingeckoId: "coinbase-wrapped-btc" },
  BTC:   { address: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf", decimals: 8,  coingeckoId: "coinbase-wrapped-btc" },
  DAI:   { address: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", decimals: 18, coingeckoId: "dai" },
  AERO:  { address: "0x940181a94A35A4569E4529A3CDfB74e38FD98631", decimals: 18, coingeckoId: "aerodrome-finance" },
  LINK:  { address: "0x2227d2837D21EEF8af307Ea1472e4Ff5e1b79F94", decimals: 18, coingeckoId: "chainlink" },
  AAVE:  { address: "0x191c10Aa4AF7C30e871E70C95dB0E4eb77237530", decimals: 18, coingeckoId: "aave" },
  UNI:   { address: "0xc3De830EA07524a0761646a6a4e4be0e114a3C83", decimals: 18, coingeckoId: "uniswap" },
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

    const aeroPool = pools.filter((p: any) =>
      p.project === "aerodrome-v2" &&
      p.chain === "Base" &&
      p.symbol?.toUpperCase().includes(symbol.toUpperCase())
    );

    if (!aeroPool.length) {
      const fallback = pools.filter((p: any) =>
        p.project === "aerodrome" &&
        p.chain === "Base" &&
        p.symbol?.toUpperCase().includes(symbol.toUpperCase())
      );
      if (!fallback.length) return null;
      fallback.sort((a: any, b: any) => (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0));
      return { tvlUSD: fallback[0].tvlUsd ?? 0, pool: fallback[0].pool ?? fallback[0].symbol };
    }

    aeroPool.sort((a: any, b: any) => (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0));
    return { tvlUSD: aeroPool[0].tvlUsd ?? 0, pool: aeroPool[0].pool ?? aeroPool[0].symbol };
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
  const lookupKey = TOKEN_MAP[rawSymbol] ? rawSymbol : (rawSymbol === "BTC" ? "cbBTC" : `W${rawSymbol}`);
  const tokenInfo = TOKEN_MAP[lookupKey] ?? TOKEN_MAP[rawSymbol];

  if (!tokenInfo) {
    return res.status(400).json({
      ok: false,
      error: `Token ${rawSymbol} not mapped for Aerodrome. Available: ${Object.keys(TOKEN_MAP).join(", ")}`,
    });
  }

  try {
    const [llamaPool, price] = await Promise.all([
      fetchDefiLlamaTVL(rawSymbol === "BTC" ? "cbBTC" : rawSymbol),
      fetchTokenPrice(tokenInfo.coingeckoId),
    ]);

    if (llamaPool && llamaPool.tvlUSD > 10_000 && price > 0) {
      const feeTierBps = 30;
      const bands = computeDepthBands(llamaPool.tvlUSD, feeTierBps);
      const snapshot: LISSnapshot = {
        venue: "aerodrome",
        symbol: rawSymbol,
        timestamp: Date.now(),
        mid_price: price,
        spread: { absolute: price * (feeTierBps / 10_000), bps: feeTierBps },
        bands,
      };
      (snapshot as any).market = "spot";
      (snapshot as any).chain = "base";
      (snapshot as any).source = "defillama";
      (snapshot as any).poolInfo = { pool: llamaPool.pool, tvlUSD: llamaPool.tvlUSD };
      (snapshot as any).provenance = {
        sourceVenue: "aerodrome",
        transport: "relay",
        engine: "aerodrome-relay-v1",
        chain: "base",
        dataSource: "defillama+coingecko",
        ts_fetch: Date.now(),
      };

      tsleBuffer.record(snapshot);
      const buffer = tsleBuffer.getHistory("aerodrome", rawSymbol);
      const tsle = tsleStateEngine.transition("aerodrome", rawSymbol, buffer, snapshot.spread?.bps ?? 0);
      (snapshot as any).tsle = tsle;

      return res.json({ ok: true, ...snapshot });
    }

    // Fallback: CoinGecko price + synthetic TVL anchored from buffer or baseline
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
        ETH: 1800, BTC: 60000, USDC: 1, DAI: 1, LINK: 15, AAVE: 90, UNI: 10,
      };
      syntheticPrice = BASELINE[rawSymbol] ?? 0;
    }

    if (!syntheticPrice) {
      return res.status(404).json({ ok: false, error: `No Aerodrome pool data found for ${rawSymbol}` });
    }

    // Conservative Base chain TVL estimates
    const SYNTHETIC_TVL: Record<string, number> = {
      ETH: 120_000_000, BTC: 40_000_000, USDC: 80_000_000, DAI: 20_000_000,
      LINK: 5_000_000, AAVE: 4_000_000, UNI: 3_000_000,
    };
    const syntheticTVL = SYNTHETIC_TVL[rawSymbol] ?? 2_000_000;
    const feeTierBps = 30;
    const bands = computeDepthBands(syntheticTVL, feeTierBps);

    const snapshot: LISSnapshot = {
      venue: "aerodrome",
      symbol: rawSymbol,
      timestamp: Date.now(),
      mid_price: syntheticPrice,
      spread: { absolute: syntheticPrice * (feeTierBps / 10_000), bps: feeTierBps },
      bands,
    };
    (snapshot as any).market = "spot";
    (snapshot as any).chain = "base";
    (snapshot as any).source = "synthetic";
    (snapshot as any).provenance = {
      sourceVenue: "aerodrome",
      transport: "synthetic",
      engine: "aerodrome-relay-v1",
      chain: "base",
      dataSource: "coingecko-anchored-synthetic",
      ts_fetch: Date.now(),
    };

    tsleBuffer.record(snapshot);
    const buffer = tsleBuffer.getHistory("aerodrome", rawSymbol);
    const tsle = tsleStateEngine.transition("aerodrome", rawSymbol, buffer, snapshot.spread?.bps ?? 0);
    (snapshot as any).tsle = tsle;

    return res.json({ ok: true, ...snapshot });
  } catch (err: any) {
    console.error("[Aerodrome Relay]", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get("/health", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    venue: "aerodrome",
    chain: "base",
    engine: "aerodrome-relay-v1",
    tokens: Object.keys(TOKEN_MAP),
    ts: Date.now(),
  });
});

export default router;
