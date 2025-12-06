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
};

export function useExecutionCost(
  query: ExecutionCostQuery | null
): ExecutionCostState {
  const [state, setState] = useState<ExecutionCostState>({
    loading: false,
    error: null,
    result: null,
  });

  useEffect(() => {
    if (!query) return;

    let cancelled = false;

    async function run() {
      setState({ loading: true, error: null, result: null });

      try {
        const res = await fetch("/api/execution/cost", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(query),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json = await res.json();
        if (cancelled) return;

        setState({ loading: false, error: null, result: json });
      } catch (e: any) {
        if (cancelled) return;
        setState({
          loading: false,
          error:
            e?.message ??
            "Error computing execution cost (endpoint may not be implemented yet)",
          result: null,
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
