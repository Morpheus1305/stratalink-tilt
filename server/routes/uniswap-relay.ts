import { Router } from "express";
import type { Request, Response } from "express";
import {
  tsleBuffer,
  tsleStateEngine,
  type LISSnapshot,
} from "../services/tsle-buffer";

const router = Router();

const UNISWAP_V3_SUBGRAPH_ID = "5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV";

const TOKEN_MAP: Record<string, { address: string; decimals: number; coingeckoId: string }> = {
  ETH: { address: "0xc02aaa39b223fe8d0a0e5d4e7a29163de4294623", decimals: 18, coingeckoId: "ethereum" },
  WETH: { address: "0xc02aaa39b223fe8d0a0e5d4e7a29163de4294623", decimals: 18, coingeckoId: "ethereum" },
  USDC: { address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", decimals: 6, coingeckoId: "usd-coin" },
  USDT: { address: "0xdac17f958d2ee523a2206206994597c13d831ec7", decimals: 6, coingeckoId: "tether" },
  WBTC: { address: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", decimals: 8, coingeckoId: "wrapped-bitcoin" },
  BTC: { address: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", decimals: 8, coingeckoId: "wrapped-bitcoin" },
  DAI: { address: "0x6b175474e89094c44da98b954eedeac495271d0f", decimals: 18, coingeckoId: "dai" },
  LINK: { address: "0x514910771af9ca656af840dff83e8264ecf986ca", decimals: 18, coingeckoId: "chainlink" },
  UNI: { address: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984", decimals: 18, coingeckoId: "uniswap" },
};

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
      totalValueLockedToken0
      totalValueLockedToken1
      volumeUSD
      token0Price
      token1Price
    }
  }
`;

function buildGraphUrl(): string | null {
  const apiKey = process.env.GRAPH_API_KEY;
  if (!apiKey) return null;
  return `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/${UNISWAP_V3_SUBGRAPH_ID}`;
}

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

async function fetchGraphPools(tokenAddress: string): Promise<any[] | null> {
  const graphUrl = buildGraphUrl();
  if (!graphUrl) return null;

  try {
    const poolRes = await fetch(graphUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: POOL_QUERY,
        variables: { token: tokenAddress },
      }),
    });

    if (!poolRes.ok) return null;

    const poolData = await poolRes.json();
    const pools = poolData?.data?.pools ?? [];

    const validPools = pools.filter((p: any) => {
      const tvl = parseFloat(p.totalValueLockedUSD);
      return tvl > 10_000 && tvl < 100_000_000_000;
    });

    return validPools.length > 0 ? validPools : null;
  } catch {
    return null;
  }
}

async function fetchDefiLlamaPool(symbol: string): Promise<{
  tvlUSD: number;
  apy: number;
  pool: string;
} | null> {
  try {
    const res = await fetch(DEFILLAMA_POOLS_URL);
    if (!res.ok) return null;

    const data = await res.json();
    const pools: any[] = data?.data ?? [];

    const uniPools = pools.filter((p: any) =>
      p.project === "uniswap-v3" &&
      p.chain === "Ethereum" &&
      p.symbol?.toUpperCase().includes(symbol.toUpperCase())
    );

    uniPools.sort((a: any, b: any) => (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0));

    if (!uniPools.length) return null;

    return {
      tvlUSD: uniPools[0].tvlUsd ?? 0,
      apy: uniPools[0].apy ?? 0,
      pool: uniPools[0].pool ?? uniPools[0].symbol,
    };
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
  const symbol = rawSymbol;
  const lookupKey = TOKEN_MAP[rawSymbol] ? rawSymbol : `W${rawSymbol}`;
  const tokenInfo = TOKEN_MAP[lookupKey];

  if (!tokenInfo) {
    return res.status(400).json({
      ok: false,
      error: `Token ${rawSymbol} not mapped. Available: ${Object.keys(TOKEN_MAP).join(", ")}`,
    });
  }

  try {
    const graphPools = await fetchGraphPools(tokenInfo.address);

    if (graphPools && graphPools.length > 0) {
      const topPool = graphPools[0];
      const isToken0 = topPool.token0.symbol.toUpperCase() === symbol.toUpperCase() ||
        topPool.token0.symbol.toUpperCase() === `W${symbol.toUpperCase()}`;

      const midPrice = isToken0
        ? parseFloat(topPool.token1Price)
        : parseFloat(topPool.token0Price);

      const tvlUSD = parseFloat(topPool.totalValueLockedUSD) || 0;
      const feeTierBps = parseInt(topPool.feeTier) / 100;
      const bands = computeDepthBands(tvlUSD, feeTierBps);

      const snapshot: LISSnapshot = {
        venue: "uniswap",
        symbol,
        timestamp: Date.now(),
        mid_price: midPrice,
        spread: { absolute: midPrice * (feeTierBps / 10_000), bps: feeTierBps },
        bands,
      };

      (snapshot as any).market = "spot";
      (snapshot as any).source = "thegraph";
      (snapshot as any).poolCount = graphPools.length;
      (snapshot as any).topPool = {
        id: topPool.id,
        feeTier: topPool.feeTier,
        tvlUSD,
        volume24hUSD: parseFloat(topPool.volumeUSD),
        token0: topPool.token0.symbol,
        token1: topPool.token1.symbol,
      };
      (snapshot as any).provenance = {
        sourceVenue: "uniswap",
        transport: "relay",
        engine: "uniswap-relay-v1",
        subgraph: UNISWAP_V3_SUBGRAPH_ID,
        ts_fetch: Date.now(),
      };

      tsleBuffer.record(snapshot);
      const buffer = tsleBuffer.getHistory("uniswap", symbol);
      const tsle = tsleStateEngine.transition("uniswap", symbol, buffer, snapshot.spread.bps);
      (snapshot as any).tsle = tsle;

      return res.json({ ok: true, ...snapshot });
    }

    console.log(`[Uniswap Relay] Graph returned no valid pools for ${symbol}, trying DeFiLlama...`);

    const [llamaPool, price] = await Promise.all([
      fetchDefiLlamaPool(symbol === "BTC" ? "WBTC" : symbol === "ETH" ? "WETH" : symbol),
      fetchTokenPrice(tokenInfo.coingeckoId),
    ]);

    if (!llamaPool || !price) {
      return res.status(404).json({
        ok: false,
        error: `No Uniswap V3 pool data found for ${symbol} from any source`,
      });
    }

    const feeTierBps = 30;
    const bands = computeDepthBands(llamaPool.tvlUSD, feeTierBps);

    const snapshot: LISSnapshot = {
      venue: "uniswap",
      symbol,
      timestamp: Date.now(),
      mid_price: price,
      spread: { absolute: price * (feeTierBps / 10_000), bps: feeTierBps },
      bands,
    };

    (snapshot as any).market = "spot";
    (snapshot as any).source = "defillama";
    (snapshot as any).poolInfo = {
      pool: llamaPool.pool,
      tvlUSD: llamaPool.tvlUSD,
      apy: llamaPool.apy,
    };
    (snapshot as any).provenance = {
      sourceVenue: "uniswap",
      transport: "relay",
      engine: "uniswap-relay-v1",
      dataSource: "defillama+coingecko",
      ts_fetch: Date.now(),
    };

    tsleBuffer.record(snapshot);
    const buffer = tsleBuffer.getHistory("uniswap", symbol);
    const tsle = tsleStateEngine.transition("uniswap", symbol, buffer, snapshot.spread.bps);
    (snapshot as any).tsle = tsle;

    return res.json({ ok: true, ...snapshot });
  } catch (err: any) {
    console.error("[Uniswap Relay]", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get("/pools", async (req: Request, res: Response) => {
  if (!authCheck(req, res)) return;

  const rawSymbol = String(req.query.symbol ?? "ETH").toUpperCase();
  const lookupKey = TOKEN_MAP[rawSymbol] ? rawSymbol : `W${rawSymbol}`;
  const tokenInfo = TOKEN_MAP[lookupKey];

  if (!tokenInfo) {
    return res.status(400).json({ ok: false, error: `Token ${rawSymbol} not mapped` });
  }

  const graphUrl = buildGraphUrl();
  if (!graphUrl) {
    return res.status(500).json({ ok: false, error: "GRAPH_API_KEY not configured" });
  }

  try {
    const poolRes = await fetch(graphUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: POOL_QUERY,
        variables: { token: tokenInfo.address },
      }),
    });

    const poolData = await poolRes.json();
    return res.json({ ok: true, pools: poolData?.data?.pools ?? [] });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get("/health", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    venue: "uniswap",
    engine: "uniswap-relay-v1",
    subgraph: UNISWAP_V3_SUBGRAPH_ID,
    tokens: Object.keys(TOKEN_MAP),
    ts: Date.now(),
  });
});

export default router;
