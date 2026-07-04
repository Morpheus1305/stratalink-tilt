import { Router } from "express";
import type { Request, Response } from "express";
import {
  tsleBuffer,
  tsleStateEngine,
  type LISSnapshot,
} from "../services/tsle-buffer";
import { getDefiLlamaPools } from "../services/defillama-cache";

const router = Router();

// Token addresses on Linea
const TOKEN_MAP: Record<string, { address: string; decimals: number; coingeckoId: string }> = {
  ETH:  { address: "0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f", decimals: 18, coingeckoId: "ethereum" },
  WETH: { address: "0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f", decimals: 18, coingeckoId: "ethereum" },
  USDC: { address: "0x176211869cA2b568f2A7D4EE941E073a821EE1ff", decimals: 6,  coingeckoId: "usd-coin" },
  USDT: { address: "0xA219439258ca9da29E9Cc4cE5596924745e12B93", decimals: 6,  coingeckoId: "tether" },
  DAI:  { address: "0x4AF15ec2A0BD43Db75dd04E62FAA3B8EF36b00d5", decimals: 18, coingeckoId: "dai" },
  WBTC: { address: "0x3aAB2285ddcDdaD8edf438C1bAB47e1a9D05a9b4", decimals: 8,  coingeckoId: "wrapped-bitcoin" },
  BTC:  { address: "0x3aAB2285ddcDdaD8edf438C1bAB47e1a9D05a9b4", decimals: 8,  coingeckoId: "wrapped-bitcoin" },
  LINK: { address: "0x5B16228B96B5B625Af6b4Dc788EF82D0E05Fc9E4", decimals: 18, coingeckoId: "chainlink" },
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
    const pools = await getDefiLlamaPools();

    // Try highest-TVL DEX projects on Linea in priority order
    for (const projectId of ["lynex", "nile-exchange", "uniswap-v3", "izumi-finance", "pancakeswap-v3"]) {
      const matched = pools.filter((p: any) =>
        p.project === projectId &&
        p.chain?.toLowerCase() === "linea" &&
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
      error: `Token ${rawSymbol} not mapped for Linea DEX. Available: ${Object.keys(TOKEN_MAP).join(", ")}`,
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
        venue: "linea-dex",
        symbol: rawSymbol,
        timestamp: Date.now(),
        mid_price: price,
        spread: { absolute: price * (feeTierBps / 10_000), bps: feeTierBps },
        bands,
      };
      (snapshot as any).market = "spot";
      (snapshot as any).chain = "linea";
      (snapshot as any).source = "defillama";
      (snapshot as any).poolInfo = { pool: llamaPool.pool, tvlUSD: llamaPool.tvlUSD };
      (snapshot as any).provenance = {
        sourceVenue: "linea-dex",
        transport: "relay",
        engine: "linea-dex-relay-v1",
        chain: "linea",
        dataSource: "defillama+coingecko",
        ts_fetch: Date.now(),
      };
      tsleBuffer.record(snapshot);
      const buffer = tsleBuffer.getHistory("linea-dex", rawSymbol);
      const tsle = tsleStateEngine.transition("linea-dex", rawSymbol, buffer, snapshot.spread?.bps ?? 0);
      (snapshot as any).tsle = tsle;
      return res.json({ ok: true, ...snapshot });
    }

    // Fallback: CoinGecko price + synthetic TVL
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
        ETH: 1800, BTC: 60000, USDC: 1, DAI: 1, WBTC: 60000, USDT: 1, LINK: 15,
      };
      syntheticPrice = BASELINE[rawSymbol] ?? 0;
    }
    if (!syntheticPrice) {
      return res.status(404).json({ ok: false, error: `No Linea DEX pool data found for ${rawSymbol}` });
    }

    // Conservative Linea TVL estimates ($3.4B chain TVL)
    const SYNTHETIC_TVL: Record<string, number> = {
      ETH: 50_000_000, BTC: 12_000_000, USDC: 40_000_000, USDT: 25_000_000,
      DAI: 8_000_000, WBTC: 12_000_000, LINK: 2_000_000,
    };
    const syntheticTVL = SYNTHETIC_TVL[rawSymbol] ?? 1_500_000;
    const feeTierBps = 30;
    const bands = computeDepthBands(syntheticTVL, feeTierBps);

    const snapshot: LISSnapshot = {
      venue: "linea-dex",
      symbol: rawSymbol,
      timestamp: Date.now(),
      mid_price: syntheticPrice,
      spread: { absolute: syntheticPrice * (feeTierBps / 10_000), bps: feeTierBps },
      bands,
    };
    (snapshot as any).market = "spot";
    (snapshot as any).chain = "linea";
    (snapshot as any).source = "synthetic";
    (snapshot as any).provenance = {
      sourceVenue: "linea-dex",
      transport: "synthetic",
      engine: "linea-dex-relay-v1",
      chain: "linea",
      dataSource: "coingecko-anchored-synthetic",
      ts_fetch: Date.now(),
    };
    tsleBuffer.record(snapshot);
    const buffer = tsleBuffer.getHistory("linea-dex", rawSymbol);
    const tsle = tsleStateEngine.transition("linea-dex", rawSymbol, buffer, snapshot.spread?.bps ?? 0);
    (snapshot as any).tsle = tsle;
    return res.json({ ok: true, ...snapshot });
  } catch (err: any) {
    console.error("[Linea DEX Relay]", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get("/health", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    venue: "linea-dex",
    chain: "linea",
    engine: "linea-dex-relay-v1",
    tokens: Object.keys(TOKEN_MAP),
    ts: Date.now(),
  });
});

export default router;
