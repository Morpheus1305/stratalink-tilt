import { Router } from "express";
import type { Request, Response } from "express";
import {
  tsleBuffer,
  tsleStateEngine,
  type LISSnapshot,
} from "../services/tsle-buffer";

const router = Router();

const UNISWAP_V3_SUBGRAPH_ID = "5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV";

const TOKEN_MAP: Record<string, { address: string; decimals: number }> = {
  ETH: { address: "0xc02aaa39b223fe8d0a0e5d4e7a29163de4294623", decimals: 18 },
  WETH: { address: "0xc02aaa39b223fe8d0a0e5d4e7a29163de4294623", decimals: 18 },
  USDC: { address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", decimals: 6 },
  USDT: { address: "0xdac17f958d2ee523a2206206994597c13d831ec7", decimals: 6 },
  WBTC: { address: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", decimals: 8 },
  DAI: { address: "0x6b175474e89094c44da98b954eedeac495271d0f", decimals: 18 },
  LINK: { address: "0x514910771af9ca656af840dff83e8264ecf986ca", decimals: 18 },
  UNI: { address: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984", decimals: 18 },
};

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

const TICKS_QUERY = `
  query PoolTicks($pool: String!) {
    ticks(
      first: 100,
      orderBy: tickIdx,
      where: { pool: $pool, liquidityNet_not: "0" }
    ) {
      tickIdx
      liquidityGross
      liquidityNet
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
  pools: any[],
  symbol: string
): {
  midPrice: number;
  spreadBps: number;
  bands: Record<string, { bid_notional: number; ask_notional: number; total_notional: number }>;
} {
  if (!pools.length) {
    return { midPrice: 0, spreadBps: 0, bands: {} };
  }

  const topPool = pools[0];
  const isToken0 = topPool.token0.symbol.toUpperCase() === symbol.toUpperCase() ||
    topPool.token0.symbol.toUpperCase() === `W${symbol.toUpperCase()}`;

  const midPrice = isToken0
    ? parseFloat(topPool.token1Price)
    : parseFloat(topPool.token0Price);

  const tvlUSD = parseFloat(topPool.totalValueLockedUSD) || 0;
  const halfTVL = tvlUSD / 2;

  const feeTierBps = parseInt(topPool.feeTier) / 100;
  const spreadBps = feeTierBps;

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

  return { midPrice, spreadBps, bands };
}

router.get("/spot/depth", async (req: Request, res: Response) => {
  if (!authCheck(req, res)) return;

  const symbol = String(req.query.symbol ?? "ETH").toUpperCase();
  const tokenInfo = TOKEN_MAP[symbol] || TOKEN_MAP[`W${symbol}`];

  if (!tokenInfo) {
    return res.status(400).json({
      ok: false,
      error: `Token ${symbol} not mapped. Available: ${Object.keys(TOKEN_MAP).join(", ")}`,
    });
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

    if (!poolRes.ok) {
      const errText = await poolRes.text();
      return res.status(poolRes.status).json({ ok: false, error: `Graph API: ${errText}` });
    }

    const poolData = await poolRes.json();
    const pools = poolData?.data?.pools ?? [];

    if (!pools.length) {
      return res.status(404).json({ ok: false, error: `No Uniswap V3 pools found for ${symbol}` });
    }

    const { midPrice, spreadBps, bands } = computeDepthBands(pools, symbol);

    const snapshot: LISSnapshot = {
      venue: "uniswap",
      symbol,
      timestamp: Date.now(),
      mid_price: midPrice,
      spread: {
        absolute: midPrice * (spreadBps / 10_000),
        bps: spreadBps,
      },
      bands,
    };

    (snapshot as any).market = "spot";
    (snapshot as any).poolCount = pools.length;
    (snapshot as any).topPool = {
      id: pools[0].id,
      feeTier: pools[0].feeTier,
      tvlUSD: parseFloat(pools[0].totalValueLockedUSD),
      volume24hUSD: parseFloat(pools[0].volumeUSD),
      token0: pools[0].token0.symbol,
      token1: pools[0].token1.symbol,
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
  } catch (err: any) {
    console.error("[Uniswap Relay]", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get("/pools", async (req: Request, res: Response) => {
  if (!authCheck(req, res)) return;

  const symbol = String(req.query.symbol ?? "ETH").toUpperCase();
  const tokenInfo = TOKEN_MAP[symbol] || TOKEN_MAP[`W${symbol}`];

  if (!tokenInfo) {
    return res.status(400).json({ ok: false, error: `Token ${symbol} not mapped` });
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
