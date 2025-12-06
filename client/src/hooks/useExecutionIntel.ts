import { useEffect, useState } from "react";

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
}

export function useExecutionIntel(symbol: string, side: "buy" | "sell") {
  const [state, setState] = useState<ExecutionIntelState>({
    loading: true,
    error: null,
    intel: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const params = new URLSearchParams({ symbol, side });
        const res = await fetch(`/api/intel/execution?${params}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) setState({ loading: false, error: null, intel: json });
      } catch (err: any) {
        if (!cancelled)
          setState({ loading: false, error: err.message, intel: null });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [symbol, side]);

  return state;
}
