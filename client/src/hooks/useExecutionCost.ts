import { useEffect, useState } from "react";

export type ExecutionCostQuery = {
  token: string;
  side: "buy" | "sell";
  sizeUsd: number;
};

export type ExecutionCostState = {
  loading: boolean;
  error: string | null;
  result: any | null;
  usingFallback?: boolean;
};

export function useExecutionCost(
  query: ExecutionCostQuery | null
): ExecutionCostState {
  const [state, setState] = useState<ExecutionCostState>({
    loading: false,
    error: null,
    result: null,
    usingFallback: false,
  });

  useEffect(() => {
    if (!query) return;

    const currentQuery = query;
    let cancelled = false;

    async function run() {
      setState({ loading: true, error: null, result: null, usingFallback: false });

      try {
        const res = await fetch("/api/execution/cost", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(currentQuery),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json = await res.json();
        if (cancelled) return;

        setState({ loading: false, error: null, result: json, usingFallback: false });
      } catch (e: any) {
        if (cancelled) return;
        setState({
          loading: false,
          error: "Live execution cost data unavailable — check venue connectivity",
          result: null,
          usingFallback: false,
        });
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [query?.token, query?.side, query?.sizeUsd]);

  return state;
}
