// client/src/utils/tsleDepth.ts

import { useEffect, useState, useCallback, useRef } from "react";

export type TsleSide = "buy" | "sell";

export interface TsleDepthResponse {
  ok: boolean;
  symbol: string;
  side: TsleSide;
  requestedSize: number;
  estImpactBps: number;
  regime: "Ultra-Tight" | "Tight" | "Neutral" | "Stressed" | "Broken";
  score: number;
  maxSizeAt25bps: number;
  maxSizeAt50bps: number;
  maxSizeAt100bps: number;
  totals: {
    depth10bps: number;
    depth25bps: number;
    depth50bps: number;
    depth100bps: number;
    depth200bps: number;
  };
  venues: {
    venue: string;
    share25bps: number;
    share50bps: number;
    share100bps: number;
  }[];
  asOf?: string;
  source?: string;
}

export async function fetchTsleDepth(
  symbol: string,
  params?: { side?: TsleSide; size?: number }
): Promise<TsleDepthResponse> {
  const side = params?.side || "buy";
  const size = params?.size ?? 100_000;

  const qs = new URLSearchParams({
    symbol: symbol.toUpperCase(),
    side,
    size: String(size),
  });

  const res = await fetch(`/api/tsle/depth?${qs.toString()}`);
  if (!res.ok) {
    throw new Error(`TSLE depth request failed: ${res.status}`);
  }
  return (await res.json()) as TsleDepthResponse;
}

const REFRESH_INTERVAL_MS = 10_000; // 10 seconds for real-time updates

export function useTsleDepth(
  symbol: string,
  options: { side?: TsleSide; size?: number } = {}
) {
  const [data, setData] = useState<TsleDepthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const fetchData = useCallback(async (isInitial: boolean = false) => {
    if (!symbol) return;

    if (isInitial) {
      setLoading(true);
      setError(null);
    }

    try {
      const resp = await fetchTsleDepth(symbol, optionsRef.current);
      setData(resp);
      setLastUpdated(Date.now());
    } catch (err: any) {
      setError(err?.message || "TSLE depth error");
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchData(true);

    intervalRef.current = setInterval(() => {
      fetchData(false);
    }, REFRESH_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData, options.side, options.size]);

  return { data, loading, error, lastUpdated, refetch: () => fetchData(false) };
}

export function formatUSD(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export function getRegimeColor(regime: TsleDepthResponse["regime"]): string {
  switch (regime) {
    case "Ultra-Tight":
      return "text-emerald-400";
    case "Tight":
      return "text-sky-400";
    case "Neutral":
      return "text-slate-400";
    case "Stressed":
      return "text-amber-400";
    case "Broken":
      return "text-red-400";
    default:
      return "text-slate-400";
  }
}

export function getRegimeBadgeColor(regime: TsleDepthResponse["regime"]): string {
  switch (regime) {
    case "Ultra-Tight":
      return "border-emerald-500 text-emerald-400";
    case "Tight":
      return "border-sky-500 text-sky-400";
    case "Neutral":
      return "border-slate-500 text-slate-400";
    case "Stressed":
      return "border-amber-500 text-amber-400";
    case "Broken":
      return "border-red-500 text-red-400";
    default:
      return "border-slate-500 text-slate-400";
  }
}

export function stressCellColor(bucket?: string | null): string {
  const b = (bucket || "").toLowerCase();
  if (b === "calm") return "bg-emerald-500/15";
  if (b === "watch") return "bg-sky-500/15";
  if (b === "caution") return "bg-amber-500/20";
  if (b === "stress") return "bg-orange-500/25";
  if (b === "deleveraging") return "bg-red-500/30";
  return "bg-slate-800/60";
}

export function stressTextColor(bucket?: string | null): string {
  const b = (bucket || "").toLowerCase();
  if (b === "calm") return "text-emerald-300";
  if (b === "watch") return "text-sky-300";
  if (b === "caution") return "text-amber-300";
  if (b === "stress") return "text-orange-300";
  if (b === "deleveraging") return "text-red-300";
  return "text-slate-400";
}

export function stressBadgeColor(bucket?: string | null): string {
  const b = (bucket || "").toLowerCase();
  if (b === "calm") return "bg-emerald-500/10 text-emerald-300 border-emerald-500/30";
  if (b === "watch") return "bg-sky-500/10 text-sky-300 border-sky-500/30";
  if (b === "caution") return "bg-amber-500/10 text-amber-300 border-amber-500/30";
  if (b === "stress") return "bg-orange-500/15 text-orange-300 border-orange-500/35";
  if (b === "deleveraging") return "bg-red-500/20 text-red-300 border-red-500/40";
  return "bg-slate-600/10 text-slate-200 border-slate-500/30";
}

export function getTsleScoreBadgeColor(score: number | null | undefined): string {
  if (score == null) return "bg-slate-600/10 text-slate-200 border-slate-500/30";
  if (score >= 85) return "bg-emerald-500/20 border-emerald-500/40 text-emerald-200";
  if (score >= 70) return "bg-lime-500/20 border-lime-500/40 text-lime-200";
  if (score >= 55) return "bg-sky-500/15 border-sky-500/35 text-sky-200";
  if (score >= 40) return "bg-amber-500/15 border-amber-500/35 text-amber-200";
  if (score >= 25) return "bg-orange-500/15 border-orange-500/40 text-orange-200";
  return "bg-red-500/20 border-red-500/40 text-red-200";
}
