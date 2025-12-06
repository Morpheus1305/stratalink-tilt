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

function buildFallbackResult(query: ExecutionCostQuery) {
  const bpsBase =
    query.sizeUsd <= 100_000
      ? 8
      : query.sizeUsd <= 1_000_000
      ? 18
      : 35;

  const venues = ["binance", "coinbase", "kraken"];

  const quotes = venues.map((venue, idx) => {
    const jitter = (Math.random() - 0.5) * 4;
    const slippageBps = bpsBase + jitter + idx * 2;
    const slippageUsd = (slippageBps / 10_000) * query.sizeUsd;
    const depthUtilizationPct = 20 + idx * 20 + Math.random() * 10;
    return {
      venue,
      sizeUsd: query.sizeUsd,
      expectedSlippageBps: slippageBps,
      expectedSlippageUsd: slippageUsd,
      effectivePrice: 1,
      depthUtilizationPct,
    };
  });

  quotes.sort((a, b) => a.expectedSlippageBps - b.expectedSlippageBps);
  const best = quotes[0];

  return {
    token: query.token,
    side: query.side,
    sizeUsd: query.sizeUsd,
    bestVenue: best.venue,
    bestTotalSlippageBps: best.expectedSlippageBps,
    bestTotalSlippageUsd: best.expectedSlippageUsd,
    quotes,
  };
}

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
      } catch (_e: any) {
        if (cancelled) return;
        const fallback = buildFallbackResult(currentQuery);
        setState({
          loading: false,
          error: null,
          result: fallback,
          usingFallback: true,
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
