import { useEffect, useState } from "react";

export type LiquidityTimeseriesPoint = {
  ts: number;
  depthUsd50bps: number;
  spreadBps: number;
};

export type LiquidityTimeseriesState = {
  loading: boolean;
  error: string | null;
  points: LiquidityTimeseriesPoint[];
  stabilityScore?: number;
  halfLifeMinutes?: number;
  usingFallback?: boolean;
};

function generateFallbackSeries(): {
  points: LiquidityTimeseriesPoint[];
  stabilityScore: number;
  halfLifeMinutes: number;
} {
  const now = Date.now();
  const points: LiquidityTimeseriesPoint[] = [];
  let depth = 5_000_000;

  for (let i = 30; i >= 0; i--) {
    const ts = now - i * 15 * 60 * 1000;
    const shock = (Math.random() - 0.5) * 0.12;
    depth = depth * (1 + shock * 0.15);
    const spreadBps = 5 + Math.random() * 5;

    points.push({
      ts,
      depthUsd50bps: Math.max(depth, 1_000_000),
      spreadBps,
    });
  }

  const stabilityScore = 70 + Math.random() * 20;
  const halfLifeMinutes = 15 + Math.random() * 30;

  return { points, stabilityScore, halfLifeMinutes };
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

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState((s) => ({ ...s, loading: true, error: null, usingFallback: false }));

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
        }));

        if (!points.length) {
          const fallback = generateFallbackSeries();
          setState({
            loading: false,
            error: null,
            points: fallback.points,
            stabilityScore: fallback.stabilityScore,
            halfLifeMinutes: fallback.halfLifeMinutes,
            usingFallback: true,
          });
        } else {
          setState({
            loading: false,
            error: null,
            points,
            stabilityScore: json.stability?.stabilityScore,
            halfLifeMinutes: json.stability?.halfLifeMinutes,
            usingFallback: false,
          });
        }
      } catch (_e: any) {
        if (cancelled) return;
        const fallback = generateFallbackSeries();
        setState({
          loading: false,
          error: null,
          points: fallback.points,
          stabilityScore: fallback.stabilityScore,
          halfLifeMinutes: fallback.halfLifeMinutes,
          usingFallback: true,
        });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [token, window]);

  return state;
}
