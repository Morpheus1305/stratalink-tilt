import { useEffect, useState, useRef } from "react";

export type LiquidityTimeseriesPoint = {
  ts: number;
  depthUsd50bps: number;
  spreadBps: number;
  depth10bps?: number;
  depth25bps?: number;
  depth100bps?: number;
  depth200bps?: number;
  source?: string;
};

export type TimeseriesMetadata = {
  hasRealData: boolean;
  realDataPoints: number;
  coverage: string;
  oldestDataTs: number | null;
};

export type CurrentSnapshot = {
  depth50bps: number;
  depth10bps: number;
  depth25bps: number;
  depth100bps: number;
  spreadBps: number;
  mid: number;
  source: string;
  ts: number;
};

export type LiquidityTimeseriesState = {
  loading: boolean;
  error: string | null;
  points: LiquidityTimeseriesPoint[];
  stabilityScore?: number;
  halfLifeMinutes?: number;
  volatility?: number;
  meanDepth?: number;
  minDepth?: number;
  maxDepth?: number;
  metadata?: TimeseriesMetadata;
  currentSnapshot?: CurrentSnapshot;
  usingFallback?: boolean;
};

function generateFallbackSeries(): {
  points: LiquidityTimeseriesPoint[];
  stabilityScore: number;
  halfLifeMinutes: number;
  volatility: number;
  meanDepth: number;
  minDepth: number;
  maxDepth: number;
} {
  const now = Date.now();
  const points: LiquidityTimeseriesPoint[] = [];
  let depth = 5_000_000;
  let minDepth = Infinity;
  let maxDepth = 0;
  let totalDepth = 0;

  for (let i = 30; i >= 0; i--) {
    const ts = now - i * 15 * 60 * 1000;
    const shock = (Math.random() - 0.5) * 0.12;
    depth = depth * (1 + shock * 0.15);
    const spreadBps = 5 + Math.random() * 5;
    const d = Math.max(depth, 1_000_000);
    
    minDepth = Math.min(minDepth, d);
    maxDepth = Math.max(maxDepth, d);
    totalDepth += d;

    points.push({
      ts,
      depthUsd50bps: d,
      spreadBps,
      source: "fallback",
    });
  }

  const meanDepth = totalDepth / points.length;
  const stabilityScore = 70 + Math.random() * 20;
  const halfLifeMinutes = 15 + Math.random() * 30;
  const volatility = 3 + Math.random() * 5;

  return { points, stabilityScore, halfLifeMinutes, volatility, meanDepth, minDepth, maxDepth };
}

export function useLiquidityTimeseries(
  token: string,
  window: "1h" | "24h" | "7d" | "30d"
): LiquidityTimeseriesState {
  const [state, setState] = useState<LiquidityTimeseriesState>({
    loading: true,
    error: null,
    points: [],
    usingFallback: false,
  });
  
  const lastDataRef = useRef<LiquidityTimeseriesState | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!lastDataRef.current) {
        setState((s) => ({ ...s, loading: true, error: null, usingFallback: false }));
      }

      try {
        const res = await fetch(
          `/api/liquidity/timeseries?token=${encodeURIComponent(
            token
          )}&window=${window}`
        );

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json = await res.json();
        if (cancelled) return;

        const raw = Array.isArray(json.snapshots) ? json.snapshots : [];
        const points: LiquidityTimeseriesPoint[] = raw.map((s: any) => ({
          ts: s.ts,
          depthUsd50bps: s.depthUsd50bps,
          spreadBps: s.spreadBps,
          depth10bps: s.depth10bps,
          depth25bps: s.depth25bps,
          depth100bps: s.depth100bps,
          depth200bps: s.depth200bps,
          source: s.source,
        }));

        if (!points.length) {
          const fallback = generateFallbackSeries();
          const newState = {
            loading: false,
            error: null,
            points: fallback.points,
            stabilityScore: fallback.stabilityScore,
            halfLifeMinutes: fallback.halfLifeMinutes,
            volatility: fallback.volatility,
            meanDepth: fallback.meanDepth,
            minDepth: fallback.minDepth,
            maxDepth: fallback.maxDepth,
            usingFallback: true,
          };
          lastDataRef.current = newState;
          setState(newState);
        } else {
          const newState = {
            loading: false,
            error: null,
            points,
            stabilityScore: json.stability?.stabilityScore,
            halfLifeMinutes: json.stability?.halfLifeMinutes,
            volatility: json.stability?.volatility,
            meanDepth: json.stability?.meanDepth,
            minDepth: json.stability?.minDepth,
            maxDepth: json.stability?.maxDepth,
            metadata: json.metadata,
            currentSnapshot: json.currentSnapshot,
            usingFallback: false,
          };
          lastDataRef.current = newState;
          setState(newState);
        }
      } catch (_e: any) {
        if (cancelled) return;
        const fallback = generateFallbackSeries();
        const newState = {
          loading: false,
          error: null,
          points: fallback.points,
          stabilityScore: fallback.stabilityScore,
          halfLifeMinutes: fallback.halfLifeMinutes,
          volatility: fallback.volatility,
          meanDepth: fallback.meanDepth,
          minDepth: fallback.minDepth,
          maxDepth: fallback.maxDepth,
          usingFallback: true,
        };
        lastDataRef.current = newState;
        setState(newState);
      }
    }

    load();
    
    const intervalId = setInterval(load, 30_000);
    
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [token, window]);

  return state;
}
