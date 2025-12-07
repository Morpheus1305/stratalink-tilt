import { useQuery } from "@tanstack/react-query";

export type FundingSnapshot = {
  symbol: string;
  rate: number;
  apr: number;
  regime: string;
  change24h?: number;
};

async function fetchFundingSnapshot(symbol: string): Promise<FundingSnapshot> {
  const res = await fetch(`/api/funding/snapshot?symbol=${encodeURIComponent(symbol)}`);
  if (!res.ok) {
    throw new Error("Failed to fetch funding snapshot");
  }
  const data = await res.json();

  return {
    symbol: data.symbol ?? symbol,
    rate: typeof data.rate === "number" ? data.rate : 0,
    apr: typeof data.apr === "number" ? data.apr : 0,
    regime: data.regime ?? "Neutral",
    change24h: typeof data.change24h === "number" ? data.change24h : undefined,
  };
}

export function useFundingSnapshot(symbol: string | undefined) {
  const effectiveSymbol = symbol ?? "BTC";

  return useQuery({
    queryKey: ["funding-snapshot", effectiveSymbol],
    queryFn: () => fetchFundingSnapshot(effectiveSymbol),
    staleTime: 30_000,
  });
}
