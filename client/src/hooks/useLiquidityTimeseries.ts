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
          `/api/liquidity/timeseries?token=${encodeURIComponent(token)}&window=${window}`
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

        const newState: LiquidityTimeseriesState = {
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
      } catch (e: any) {
        if (cancelled) return;
        // On error, preserve last known data if available; otherwise empty state.
        if (lastDataRef.current) {
          setState((s) => ({ ...s, loading: false }));
        } else {
          setState({
            loading: false,
            error: "Live depth history unavailable — waiting for data feed",
            points: [],
            usingFallback: false,
          });
        }
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
