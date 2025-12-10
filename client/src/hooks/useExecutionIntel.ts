import { useEffect, useState, useCallback, useRef } from "react";

export interface ExecutionIntel {
  symbol: string;
  side: "buy" | "sell";
  maxSizeSignals: {
    bps10: number;
    bps25: number;
    bps50: number;
    bps100: number;
  };
  slippageRegime: "Ultra-Tight" | "Tight" | "Normal" | "Wide" | "Broken";
  bestVenue: string;
  venueSummary: string;
  executionRiskScore: number;
  commentary: string;
  generatedAt: number;
}

interface ExecutionIntelState {
  loading: boolean;
  error: string | null;
  intel: ExecutionIntel | null;
  lastUpdated: number | null;
}

const REFRESH_INTERVAL_MS = 10_000; // 10 seconds for real-time updates

export function useExecutionIntel(symbol: string, side: "buy" | "sell") {
  const [state, setState] = useState<ExecutionIntelState>({
    loading: true,
    error: null,
    intel: null,
    lastUpdated: null,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async (isInitial: boolean = false) => {
    if (isInitial) {
      setState((s) => ({ ...s, loading: true, error: null }));
    }

    try {
      const params = new URLSearchParams({ symbol, side });
      const res = await fetch(`/api/intel/execution?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setState({
        loading: false,
        error: null,
        intel: json,
        lastUpdated: Date.now(),
      });
    } catch (err: any) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err.message,
      }));
    }
  }, [symbol, side]);

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
  }, [fetchData]);

  return { ...state, refetch: () => fetchData(false) };
}
