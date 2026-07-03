import { Router } from "express";
import type { Request, Response } from "express";
import {
  tsleBuffer,
  tsleStateEngine,
  type LISSnapshot,
} from "../services/tsle-buffer";

const router = Router();

// Token addresses on World Chain (OP Stack L2)
const TOKEN_MAP: Record<string, { address: string; decimals: number; coingeckoId: string }> = {
  ETH:  { address: "0x4200000000000000000000000000000000000006", decimals: 18, coingeckoId: "ethereum" },
  WETH: { address: "0x4200000000000000000000000000000000000006", decimals: 18, coingeckoId: "ethereum" },
  WLD:  { address: "0x2cFc85d8E48F8EAB294be644d9E25C3030863003", decimals: 18, coingeckoId: "worldcoin-wld" },
  USDC: { address: "0x79A02482A880bCE3F13e09Da970dC34db4CD24d1", decimals: 6,  coingeckoId: "usd-coin" },
  USDT: { address: "0x05D032ac25d322df992303dCa074EE7392C117b9", decimals: 6,  coingeckoId: "tether" },
  DAI:  { address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", decimals: 18, coingeckoId: "dai" },
  WBTC: { address: "0x03C7054BCB39f7b2e5B2c7AcB37583e32D70Cfa3", decimals: 8,  coingeckoId: "wrapped-bitcoin" },
  BTC:  { address: "0x03C7054BCB39f7b2e5B2c7AcB37583e32D70Cfa3", decimals: 8,  coingeckoId: "wrapped-bitcoin" },
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
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(DEFILLAMA_POOLS_URL, { signal: ctrl.signal });
    if (!res.ok) return null;
    const data = await res.json();
    const pools: any[] = data?.data ?? [];

    for (const projectId of ["uniswap-v3", "uniswap"]) {
      const matched = pools.filter((p: any) =>
        p.project === projectId &&
        (p.chain === "World" || p.chain?.toLowerCase() === "worldchain") &&
        p.symbol?.toUpperCase().includes(symbol.toUpperCase())
      );
      if (matched.length) {
        matched.sort((a: any, b: any) => (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0));
        return { tvlUSD: matched[0].tvlUsd ?? 0, pool: matched[0].pool ?? matched[0].symbol };
      }
    }
    return null;
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
  const tokenInfo = TOKEN_MAP[rawSymbol] ?? TOKEN_MAP[`W${rawSymbol}`];

  if (!tokenInfo) {
    return res.status(400).json({
      ok: false,
      error: `Token ${rawSymbol} not mapped for Uniswap (World Chain). Available: ${Object.keys(TOKEN_MAP).join(", ")}`,
    });
  }

  try {
    const [llamaPool, price] = await Promise.all([
      fetchDefiLlamaTVL(rawSymbol),
      fetchTokenPrice(tokenInfo.coingeckoId),
    ]);

    if (llamaPool && llamaPool.tvlUSD > 10_000 && price > 0) {
      const feeTierBps = 30;
      const bands = computeDepthBands(llamaPool.tvlUSD, feeTierBps);
      const snapshot: LISSnapshot = {
        venue: "uniswap-worldchain",
        symbol: rawSymbol,
        timestamp: Date.now(),
        mid_price: price,
        spread: { absolute: price * (feeTierBps / 10_000), bps: feeTierBps },
        bands,
      };
      (snapshot as any).market = "spot";
      (snapshot as any).chain = "worldchain";
      (snapshot as any).source = "defillama";
      (snapshot as any).poolInfo = { pool: llamaPool.pool, tvlUSD: llamaPool.tvlUSD };
      (snapshot as any).provenance = {
        sourceVenue: "uniswap-worldchain",
        transport: "relay",
        engine: "uniswap-worldchain-relay-v1",
        chain: "worldchain",
        dataSource: "defillama+coingecko",
        ts_fetch: Date.now(),
      };
      tsleBuffer.record(snapshot);
      const buffer = tsleBuffer.getHistory("uniswap-worldchain", rawSymbol);
      const tsle = tsleStateEngine.transition("uniswap-worldchain", rawSymbol, buffer, snapshot.spread?.bps ?? 0);
      (snapshot as any).tsle = tsle;
      return res.json({ ok: true, ...snapshot });
    }

    // Fallback: CoinGecko price + conservative synthetic TVL
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
        ETH: 1800, BTC: 60000, USDC: 1, DAI: 1, WBTC: 60000, USDT: 1,
      };
      syntheticPrice = BASELINE[rawSymbol] ?? 0;
    }
    if (!syntheticPrice) {
      return res.status(404).json({ ok: false, error: `No World Chain pool data found for ${rawSymbol}` });
    }

    // Conservative World Chain TVL estimates (smaller L2, newer ecosystem)
    const SYNTHETIC_TVL: Record<string, number> = {
      ETH: 30_000_000, BTC: 8_000_000, USDC: 20_000_000, USDT: 15_000_000,
      DAI: 5_000_000, WBTC: 8_000_000, WLD: 10_000_000,
    };
    const syntheticTVL = SYNTHETIC_TVL[rawSymbol] ?? 1_000_000;
    const feeTierBps = 30;
    const bands = computeDepthBands(syntheticTVL, feeTierBps);

    const snapshot: LISSnapshot = {
      venue: "uniswap-worldchain",
      symbol: rawSymbol,
      timestamp: Date.now(),
      mid_price: syntheticPrice,
      spread: { absolute: syntheticPrice * (feeTierBps / 10_000), bps: feeTierBps },
      bands,
    };
    (snapshot as any).market = "spot";
    (snapshot as any).chain = "worldchain";
    (snapshot as any).source = "synthetic";
    (snapshot as any).provenance = {
      sourceVenue: "uniswap-worldchain",
      transport: "synthetic",
      engine: "uniswap-worldchain-relay-v1",
      chain: "worldchain",
      dataSource: "coingecko-anchored-synthetic",
      ts_fetch: Date.now(),
    };
    tsleBuffer.record(snapshot);
    const buffer = tsleBuffer.getHistory("uniswap-worldchain", rawSymbol);
    const tsle = tsleStateEngine.transition("uniswap-worldchain", rawSymbol, buffer, snapshot.spread?.bps ?? 0);
    (snapshot as any).tsle = tsle;
    return res.json({ ok: true, ...snapshot });
  } catch (err: any) {
    console.error("[Uniswap WorldChain Relay]", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get("/health", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    venue: "uniswap-worldchain",
    chain: "worldchain",
    engine: "uniswap-worldchain-relay-v1",
    tokens: Object.keys(TOKEN_MAP),
    ts: Date.now(),
  });
});

export default router;
