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
};

export function useLiquidityTimeseries(
  token: string,
  window: "1h" | "24h" | "7d" | "30d"
): LiquidityTimeseriesState {
  const [state, setState] = useState<LiquidityTimeseriesState>({
    loading: true,
    error: null,
    points: [],
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState((s) => ({ ...s, loading: true, error: null }));
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

        const points =
          (json.snapshots || []).map((s: any) => ({
            ts: s.ts,
            depthUsd50bps: s.depthUsd50bps,
            spreadBps: s.spreadBps,
          })) ?? [];

        setState({
          loading: false,
          error: null,
          points,
          stabilityScore: json.stability?.stabilityScore,
          halfLifeMinutes: json.stability?.halfLifeMinutes,
        });
      } catch (e: any) {
        if (cancelled) return;
        setState({
          loading: false,
          error:
            e?.message ??
            "Error loading liquidity timeseries (endpoint may not be implemented yet)",
          points: [],
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
