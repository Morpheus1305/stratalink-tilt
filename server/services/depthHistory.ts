import { getStoredHistory, HistoricalDepthPoint, getHistoryStats } from "./depthHistoryStore";
import { getDepthCache } from "../../analytics/engines/depthEngine";

type DepthHistoryPoint = {
  ts: number;
  depth50bps: number;
  spreadBps: number;
  depth10bps?: number;
  depth25bps?: number;
  depth100bps?: number;
  depth200bps?: number;
  mid?: number;
  source?: string;
};

const WINDOW_DURATION: Record<string, number> = {
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

const TOKEN_DEPTH_BASE: Record<string, number> = {
  BTC: 8_000_000,
  ETH: 5_000_000,
  SOL: 2_500_000,
  XRP: 1_500_000,
  ADA: 1_200_000,
  AVAX: 1_000_000,
  LINK: 900_000,
  DOT: 800_000,
  NEAR: 600_000,
  MATIC: 500_000,
};

const TOKEN_SPREAD_BASE: Record<string, number> = {
  BTC: 1.5,
  ETH: 2.0,
  SOL: 3.0,
  XRP: 2.5,
  ADA: 4.0,
  AVAX: 5.0,
  LINK: 3.5,
  DOT: 4.5,
  NEAR: 5.5,
  MATIC: 6.0,
};

function generateSyntheticHistory(
  token: string,
  startTs: number,
  endTs: number,
  intervalMs: number,
  baseDepth: number,
  baseSpread: number
): DepthHistoryPoint[] {
  const points: DepthHistoryPoint[] = [];
  let depth = baseDepth;
  
  for (let ts = startTs; ts <= endTs; ts += intervalMs) {
    const depthShock = (Math.random() - 0.5) * 0.08;
    depth = depth * (1 + depthShock);
    depth = Math.max(depth, baseDepth * 0.5);
    depth = Math.min(depth, baseDepth * 1.8);

    const spreadNoise = (Math.random() - 0.5) * 2;
    const spreadBps = Math.max(0.5, baseSpread + spreadNoise);

    points.push({
      ts: Math.floor(ts),
      depth50bps: Math.round(depth),
      spreadBps: Number(spreadBps.toFixed(2)),
      source: "synthetic",
    });
  }
  
  return points;
}

export async function getOrderbookDepthHistory(
  token: string,
  window: string
): Promise<DepthHistoryPoint[]> {
  const duration = WINDOW_DURATION[window] || WINDOW_DURATION["24h"];
  const now = Date.now();
  
  const numPoints = window === "1h" ? 30 : window === "24h" ? 48 : window === "7d" ? 84 : 60;
  const interval = duration / numPoints;
  
  const baseDepth = TOKEN_DEPTH_BASE[token] || 1_000_000;
  const baseSpread = TOKEN_SPREAD_BASE[token] || 4.0;
  
  const realHistory = getStoredHistory(token, duration);
  
  if (realHistory.length >= 1) {
    const points: DepthHistoryPoint[] = realHistory.map((h) => ({
      ts: h.ts,
      depth50bps: h.depth50bps,
      spreadBps: h.spreadBps,
      depth10bps: h.depth10bps,
      depth25bps: h.depth25bps,
      depth100bps: h.depth100bps,
      depth200bps: h.depth200bps,
      mid: h.mid,
      source: h.source,
    }));
    
    if (realHistory.length < numPoints) {
      const oldestRealTs = realHistory[0].ts;
      const syntheticStartTs = now - duration;
      const syntheticEndTs = oldestRealTs - interval;
      
      if (syntheticEndTs > syntheticStartTs) {
        const syntheticPoints = generateSyntheticHistory(
          token,
          syntheticStartTs,
          syntheticEndTs,
          interval,
          realHistory[0].depth50bps || baseDepth,
          realHistory[0].spreadBps || baseSpread
        );
        
        return [...syntheticPoints, ...points];
      }
    }
    
    return points;
  }
  
  const depthCache = getDepthCache();
  const currentDepth = depthCache[token];
  
  let currentBaseDepth = baseDepth;
  let currentBaseSpread = baseSpread;
  
  if (currentDepth) {
    currentBaseDepth = currentDepth.bands["50bps"]?.totalUSD || baseDepth;
    currentBaseSpread = currentDepth.spreadBps || baseSpread;
  }
  
  const syntheticStartTs = now - duration;
  return generateSyntheticHistory(
    token,
    syntheticStartTs,
    now,
    interval,
    currentBaseDepth,
    currentBaseSpread
  );
}

export function getTimeseriesMetadata(token: string): {
  hasRealData: boolean;
  realDataPoints: number;
  coverage: string;
  oldestDataTs: number | null;
} {
  const stats = getHistoryStats(token);
  return {
    hasRealData: stats.pointCount > 0,
    realDataPoints: stats.pointCount,
    coverage: stats.coverage,
    oldestDataTs: stats.oldestTs,
  };
}
