import { getStoredHistory, getHistoryStats } from "./depthHistoryStore";
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

export async function getOrderbookDepthHistory(
  token: string,
  window: string
): Promise<DepthHistoryPoint[]> {
  const duration = WINDOW_DURATION[window] || WINDOW_DURATION["24h"];

  const realHistory = getStoredHistory(token, duration);

  if (realHistory.length >= 1) {
    return realHistory.map((h) => ({
      ts: h.ts,
      depth50bps: h.depth50bps,
      spreadBps: h.spreadBps,
      depth10bps: h.depth10bps,
      depth25bps: h.depth25bps,
      depth100bps: h.depth100bps,
      depth200bps: h.depth200bps,
      mid: h.mid,
      source: h.source ?? "live",
    }));
  }

  // No stored history yet — try to return a single current-state point
  // so the chart at least shows the live snapshot position.
  const depthCache = getDepthCache();
  const currentDepth = depthCache[token];

  if (currentDepth) {
    const now = Date.now();
    return [
      {
        ts: now,
        depth50bps: currentDepth.bands?.["50bps"]?.totalUSD ?? 0,
        spreadBps: currentDepth.spreadBps ?? 0,
        depth10bps: currentDepth.bands?.["10bps"]?.totalUSD,
        depth25bps: currentDepth.bands?.["25bps"]?.totalUSD,
        mid: currentDepth.mid,
        source: "live",
      },
    ];
  }

  // No live data yet — return empty; the chart will show a collecting state.
  return [];
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
