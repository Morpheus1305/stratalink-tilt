import { useQuery } from "@tanstack/react-query";

export interface LiquidityFactorResult {
  symbol: string;
  composite: number;
  rating: string;
  factors: {
    depthQuality: number;
    execEfficiency: number;
    stability: number;
    fragmentation: number;
    riskConcentration: number;
  };
  meta: {
    max10bps: number;
    max25bps: number;
    max50bps: number;
    venueCount: number;
    topShare: number;
  };
  generatedAt: number;
}

export type BatchFactorsResult = Record<string, LiquidityFactorResult>;

export default function useLiquidityFactorsBatch(symbols: string[]) {
  const symbolList = symbols.join(",");

  const { data, isLoading, error } = useQuery<BatchFactorsResult>({
    queryKey: ["/api/liquidity/factors/batch", symbolList],
    queryFn: async () => {
      if (!symbols.length) return {};
      const res = await fetch(`/api/liquidity/factors/batch?symbols=${encodeURIComponent(symbolList)}`);
      if (!res.ok) throw new Error("Failed to fetch batch factors");
      return res.json();
    },
    enabled: symbols.length > 0,
    refetchInterval: 30000,
    staleTime: 15000,
  });

  return { data, loading: isLoading, error };
}
