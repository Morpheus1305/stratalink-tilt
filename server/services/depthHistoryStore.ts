import { getDepthCache, TokenDepth } from "../../analytics/engines/depthEngine";

export type HistoricalDepthPoint = {
  ts: number;
  depth10bps: number;
  depth25bps: number;
  depth50bps: number;
  depth100bps: number;
  depth200bps: number;
  spreadBps: number;
  mid: number;
  source: string;
};

type TokenHistoryStore = {
  points: HistoricalDepthPoint[];
  lastUpdate: number;
};

const MAX_POINTS_PER_TOKEN = 2880;
const STORE: Record<string, TokenHistoryStore> = {};

export function recordDepthSnapshot(): void {
  const cache = getDepthCache();
  const now = Date.now();
  
  for (const [rawSymbol, data] of Object.entries(cache)) {
    const symbol = rawSymbol.toUpperCase();
    
    if (!STORE[symbol]) {
      STORE[symbol] = { points: [], lastUpdate: 0 };
    }
    
    const store = STORE[symbol];
    
    if (now - store.lastUpdate < 60_000) continue;
    
    const point: HistoricalDepthPoint = {
      ts: now,
      depth10bps: data.bands["10bps"]?.totalUSD || 0,
      depth25bps: data.bands["25bps"]?.totalUSD || 0,
      depth50bps: data.bands["50bps"]?.totalUSD || 0,
      depth100bps: data.bands["100bps"]?.totalUSD || 0,
      depth200bps: data.bands["200bps"]?.totalUSD || 0,
      spreadBps: data.spreadBps,
      mid: data.mid,
      source: data.source,
    };
    
    store.points.push(point);
    store.lastUpdate = now;
    
    if (store.points.length > MAX_POINTS_PER_TOKEN) {
      store.points = store.points.slice(-MAX_POINTS_PER_TOKEN);
    }
  }
}

export function getStoredHistory(
  token: string,
  windowMs: number
): HistoricalDepthPoint[] {
  const store = STORE[token.toUpperCase()];
  if (!store || store.points.length === 0) {
    return [];
  }
  
  const cutoff = Date.now() - windowMs;
  return store.points.filter((p) => p.ts >= cutoff);
}

export function getHistoryStats(token: string): {
  pointCount: number;
  oldestTs: number | null;
  newestTs: number | null;
  coverage: string;
} {
  const store = STORE[token.toUpperCase()];
  if (!store || store.points.length === 0) {
    return { pointCount: 0, oldestTs: null, newestTs: null, coverage: "0m" };
  }
  
  const oldest = store.points[0].ts;
  const newest = store.points[store.points.length - 1].ts;
  const durationMs = newest - oldest;
  
  let coverage: string;
  if (durationMs < 60 * 60 * 1000) {
    coverage = `${Math.round(durationMs / 60000)}m`;
  } else if (durationMs < 24 * 60 * 60 * 1000) {
    coverage = `${(durationMs / 3600000).toFixed(1)}h`;
  } else {
    coverage = `${(durationMs / 86400000).toFixed(1)}d`;
  }
  
  return {
    pointCount: store.points.length,
    oldestTs: oldest,
    newestTs: newest,
    coverage,
  };
}

export function getAllTokenStats(): Record<string, ReturnType<typeof getHistoryStats>> {
  const result: Record<string, ReturnType<typeof getHistoryStats>> = {};
  for (const token of Object.keys(STORE)) {
    result[token] = getHistoryStats(token);
  }
  return result;
}
