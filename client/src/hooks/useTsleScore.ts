import { useEffect, useState } from "react";

export interface TsleData {
  symbol: string;
  score: number;
  regime: string;
  source: string;
  depthScore?: number;
  fundingScore?: number;
  frictionScore?: number;
  bands?: Array<{
    bps: number;
    bidUsd: number;
    askUsd: number;
    totalUsd: number;
  }>;
}

export function useTsleScore(symbol: string) {
  const [data, setData] = useState<TsleData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!symbol) return;
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/tsle/snapshot?symbol=${symbol}`);
        const json = await res.json();
        if (mounted) setData(json);
      } catch (err) {
        console.warn("[TSLE] failed to fetch", err);
        if (mounted) setData(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    const timer = setInterval(load, 60_000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [symbol]);

  return { data, loading };
}
