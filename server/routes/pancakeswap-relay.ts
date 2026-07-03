import { Router } from "express";
import type { Request, Response } from "express";
import {
  tsleBuffer,
  tsleStateEngine,
  type LISSnapshot,
} from "../services/tsle-buffer";

const router = Router();

// Token addresses on BNB Chain (BEP-20)
const TOKEN_MAP: Record<string, { address: string; decimals: number; coingeckoId: string }> = {
  WBNB:  { address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", decimals: 18, coingeckoId: "binancecoin" },
  BNB:   { address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", decimals: 18, coingeckoId: "binancecoin" },
  USDT:  { address: "0x55d398326f99059fF775485246999027B3197955", decimals: 18, coingeckoId: "tether" },
  USDC:  { address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", decimals: 18, coingeckoId: "usd-coin" },
  ETH:   { address: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8", decimals: 18, coingeckoId: "ethereum" },
  BTCB:  { address: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", decimals: 18, coingeckoId: "bitcoin-bep2" },
  BTC:   { address: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", decimals: 18, coingeckoId: "bitcoin-bep2" },
  DAI:   { address: "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3", decimals: 18, coingeckoId: "dai" },
  CAKE:  { address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82", decimals: 18, coingeckoId: "pancakeswap-token" },
  LINK:  { address: "0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD", decimals: 18, coingeckoId: "chainlink" },
  XRP:   { address: "0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE", decimals: 18, coingeckoId: "ripple" },
  ADA:   { address: "0x3EE2200Efb3400faBB9AacF31297cBdD1d435D47", decimals: 18, coingeckoId: "cardano" },
  DOGE:  { address: "0xbA2aE424d960c26247Dd6c32edC70B295c744C43", decimals: 8,  coingeckoId: "dogecoin" },
  SOL:   { address: "0x570A5D26f7765Ecb712C0924E4De545B89fD43dF", decimals: 18, coingeckoId: "solana" },
  AVAX:  { address: "0x1CE0c2827e2eF14D5C4f29a091d735A204794041", decimals: 18, coingeckoId: "avalanche-2" },
  DOT:   { address: "0x7083609fce4d1d8Dc0C979AAb8c869Ea2C873402", decimals: 18, coingeckoId: "polkadot" },
  AAVE:  { address: "0xfb6115445Bff7b52FeB98650C87f44907E58f802", decimals: 18, coingeckoId: "aave" },
  UNI:   { address: "0xBf5140A22578168FD562DCcF235E5D43A02ce9B1", decimals: 18, coingeckoId: "uniswap" },
};

const PANCAKESWAP_SUBGRAPH = "https://api.thegraph.com/subgraphs/name/pancakeswap/exchange-v3-bsc";
const DEFILLAMA_POOLS_URL = "https://yields.llama.fi/pools";

const POOL_QUERY = `
  query TopPools($token: String!) {
    pools(
      first: 5,
      orderBy: totalValueLockedUSD,
      orderDirection: desc,
      where: { or: [{ token0: $token }, { token1: $token }] }
    ) {
      id
      token0 { symbol decimals id }
      token1 { symbol decimals id }
      feeTier
      liquidity
      sqrtPrice
      tick
      totalValueLockedUSD
      token0Price
      token1Price
    }
  }
`;

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

async function fetchSubgraphPools(tokenAddress: string): Promise<any[] | null> {
  try {
    const res = await fetch(PANCAKESWAP_SUBGRAPH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: POOL_QUERY,
        variables: { token: tokenAddress.toLowerCase() },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const pools: any[] = data?.data?.pools ?? [];
    const valid = pools.filter((p: any) => {
      const tvl = parseFloat(p.totalValueLockedUSD);
      return tvl > 10_000 && tvl < 100_000_000_000;
    });
    return valid.length > 0 ? valid : null;
  } catch {
    return null;
  }
}

async function fetchDefiLlamaTVL(symbol: string): Promise<{ tvlUSD: number; pool: string } | null> {
  try {
    const res = await fetch(DEFILLAMA_POOLS_URL);
    if (!res.ok) return null;
    const data = await res.json();
    const pools: any[] = data?.data ?? [];

    const matches = pools.filter((p: any) =>
      (p.project === "pancakeswap-v3" || p.project === "pancakeswap") &&
      p.chain === "BSC" &&
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

  const rawSymbol = String(req.query.symbol ?? "BNB").toUpperCase();
  const lookupKey = TOKEN_MAP[rawSymbol] ? rawSymbol : (rawSymbol === "BTC" ? "BTCB" : `W${rawSymbol}`);
  const tokenInfo = TOKEN_MAP[lookupKey] ?? TOKEN_MAP[rawSymbol];

  if (!tokenInfo) {
    return res.status(400).json({
      ok: false,
      error: `Token ${rawSymbol} not mapped for PancakeSwap. Available: ${Object.keys(TOKEN_MAP).join(", ")}`,
    });
  }

  try {
    // Try PancakeSwap subgraph first (Uniswap V3 fork - identical query structure)
    const subgraphPools = await fetchSubgraphPools(tokenInfo.address);

    if (subgraphPools && subgraphPools.length > 0) {
      const topPool = subgraphPools[0];
      const sym = rawSymbol === "BTC" ? "BTCB" : rawSymbol;
      const isToken0 = topPool.token0.symbol.toUpperCase() === sym ||
        topPool.token0.symbol.toUpperCase() === `W${sym}`;

      const midPrice = isToken0
        ? parseFloat(topPool.token1Price)
        : parseFloat(topPool.token0Price);

      const tvlUSD = parseFloat(topPool.totalValueLockedUSD) || 0;
      const feeTierBps = parseInt(topPool.feeTier) / 100;
      const bands = computeDepthBands(tvlUSD, feeTierBps);

      const snapshot: LISSnapshot = {
        venue: "pancakeswap",
        symbol: rawSymbol,
        timestamp: Date.now(),
        mid_price: midPrice,
        spread: { absolute: midPrice * (feeTierBps / 10_000), bps: feeTierBps },
        bands,
      };
      (snapshot as any).market = "spot";
      (snapshot as any).chain = "bnb";
      (snapshot as any).source = "subgraph";
      (snapshot as any).topPool = {
        id: topPool.id,
        feeTier: topPool.feeTier,
        tvlUSD,
        token0: topPool.token0.symbol,
        token1: topPool.token1.symbol,
      };
      (snapshot as any).provenance = {
        sourceVenue: "pancakeswap",
        transport: "relay",
        engine: "pancakeswap-relay-v1",
        chain: "bnb",
        dataSource: "subgraph-v3",
        ts_fetch: Date.now(),
      };

      tsleBuffer.record(snapshot);
      const buffer = tsleBuffer.getHistory("pancakeswap", rawSymbol);
      const tsle = tsleStateEngine.transition("pancakeswap", rawSymbol, buffer, snapshot.spread?.bps ?? 0);
      (snapshot as any).tsle = tsle;

      return res.json({ ok: true, ...snapshot });
    }

    console.log(`[PancakeSwap Relay] Subgraph returned no pools for ${rawSymbol}, trying DeFiLlama...`);

    // DeFiLlama fallback
    const [llamaPool, price] = await Promise.all([
      fetchDefiLlamaTVL(rawSymbol === "BTC" ? "BTCB" : rawSymbol),
      fetchTokenPrice(tokenInfo.coingeckoId),
    ]);

    if (llamaPool && llamaPool.tvlUSD > 10_000 && price > 0) {
      const feeTierBps = 25;
      const bands = computeDepthBands(llamaPool.tvlUSD, feeTierBps);
      const snapshot: LISSnapshot = {
        venue: "pancakeswap",
        symbol: rawSymbol,
        timestamp: Date.now(),
        mid_price: price,
        spread: { absolute: price * (feeTierBps / 10_000), bps: feeTierBps },
        bands,
      };
      (snapshot as any).market = "spot";
      (snapshot as any).chain = "bnb";
      (snapshot as any).source = "defillama";
      (snapshot as any).poolInfo = { pool: llamaPool.pool, tvlUSD: llamaPool.tvlUSD };
      (snapshot as any).provenance = {
        sourceVenue: "pancakeswap",
        transport: "relay",
        engine: "pancakeswap-relay-v1",
        chain: "bnb",
        dataSource: "defillama+coingecko",
        ts_fetch: Date.now(),
      };

      tsleBuffer.record(snapshot);
      const buffer = tsleBuffer.getHistory("pancakeswap", rawSymbol);
      const tsle = tsleStateEngine.transition("pancakeswap", rawSymbol, buffer, snapshot.spread?.bps ?? 0);
      (snapshot as any).tsle = tsle;

      return res.json({ ok: true, ...snapshot });
    }

    console.log(`[PancakeSwap Relay] DeFiLlama also failed for ${rawSymbol}, using synthetic depth`);

    // Final fallback: synthetic from CEX buffer or baseline
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
        BNB: 300, ETH: 1800, BTC: 60000, USDT: 1, USDC: 1, DAI: 1,
        LINK: 15, XRP: 0.5, ADA: 0.5, DOGE: 0.15, SOL: 100,
        AVAX: 25, DOT: 8, AAVE: 90, UNI: 10,
      };
      syntheticPrice = BASELINE[rawSymbol] ?? 0;
    }

    if (!syntheticPrice) {
      return res.status(404).json({ ok: false, error: `No PancakeSwap pool data found for ${rawSymbol}` });
    }

    // Conservative BNB chain TVL estimates (PancakeSwap is the dominant DEX, high TVL)
    const SYNTHETIC_TVL: Record<string, number> = {
      BNB:  400_000_000, ETH: 150_000_000, BTC: 80_000_000,
      USDT: 300_000_000, USDC: 100_000_000, DAI: 30_000_000,
      LINK: 8_000_000,   XRP: 10_000_000,  ADA: 6_000_000,
      DOGE: 5_000_000,   SOL: 20_000_000,  AVAX: 7_000_000,
      DOT:  5_000_000,   AAVE: 4_000_000,  UNI: 6_000_000,
    };
    const syntheticTVL = SYNTHETIC_TVL[rawSymbol] ?? 3_000_000;
    const feeTierBps = 25;
    const bands = computeDepthBands(syntheticTVL, feeTierBps);

    const snapshot: LISSnapshot = {
      venue: "pancakeswap",
      symbol: rawSymbol,
      timestamp: Date.now(),
      mid_price: syntheticPrice,
      spread: { absolute: syntheticPrice * (feeTierBps / 10_000), bps: feeTierBps },
      bands,
    };
    (snapshot as any).market = "spot";
    (snapshot as any).chain = "bnb";
    (snapshot as any).source = "synthetic";
    (snapshot as any).provenance = {
      sourceVenue: "pancakeswap",
      transport: "synthetic",
      engine: "pancakeswap-relay-v1",
      chain: "bnb",
      dataSource: "coingecko-anchored-synthetic",
      ts_fetch: Date.now(),
    };

    tsleBuffer.record(snapshot);
    const buffer = tsleBuffer.getHistory("pancakeswap", rawSymbol);
    const tsle = tsleStateEngine.transition("pancakeswap", rawSymbol, buffer, snapshot.spread?.bps ?? 0);
    (snapshot as any).tsle = tsle;

    return res.json({ ok: true, ...snapshot });
  } catch (err: any) {
    console.error("[PancakeSwap Relay]", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get("/health", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    venue: "pancakeswap",
    chain: "bnb",
    engine: "pancakeswap-relay-v1",
    tokens: Object.keys(TOKEN_MAP),
    ts: Date.now(),
  });
});

export default router;
