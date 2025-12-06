import { useEffect, useState } from "react";

export type CommentaryDelta = {
  riskScoreDelta: number | null;
  maxSize25bpsDeltaPct: number | null;
  maxSize50bpsDeltaPct: number | null;
  regimeChange: string | null;
  priorDate: string | null;
};

export type DailyCommentary = {
  symbol: string;
  side: "buy" | "sell";
  dominantFactor: string;
  marketStructureRegime: string;
  executionSummaryBullets: string[];
  executionRiskScore: number;
  slippageRegime: string;
  bestVenue: string;
  maxSize25bps: number;
  maxSize50bps: number;
  generatedAt: number;
  delta: CommentaryDelta | null;
};

interface DailyCommentaryState {
  loading: boolean;
  error: string | null;
  data: DailyCommentary | null;
}

export function useDailyCommentary(symbol: string, side: "buy" | "sell") {
  const [state, setState] = useState<DailyCommentaryState>({
    loading: true,
    error: null,
    data: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const params = new URLSearchParams({ symbol, side });
        const res = await fetch(`/api/commentary/daily?${params}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          setState({ loading: false, error: null, data: json });
        }
      } catch (e: any) {
        if (!cancelled) {
          setState({
            loading: false,
            error: e?.message ?? "Failed to load commentary",
            data: null,
          });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [symbol, side]);

  return state;
}
