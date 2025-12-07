import { useQuery } from "@tanstack/react-query";

export interface LiquidityFactors {
  depthQuality: number;
  execEfficiency: number;
  stability: number;
  fragmentation: number;
  riskConcentration: number;
}

export interface LiquidityFactorsMeta {
  max10bps: number;
  max25bps: number;
  max50bps: number;
  venueCount: number;
  topShare: number;
}

export interface LiquidityFactorsData {
  symbol: string;
  composite: number;
  rating: string;
  factors: LiquidityFactors;
  meta: LiquidityFactorsMeta;
  generatedAt: number;
}

export function useLiquidityFactors(symbol: string, side: "buy" | "sell" = "buy") {
  return useQuery<LiquidityFactorsData>({
    queryKey: ["/api/liquidity/factors", symbol, side],
    queryFn: async () => {
      const res = await fetch(`/api/liquidity/factors/${symbol}?side=${side}`);
      if (!res.ok) throw new Error("Failed to fetch liquidity factors");
      return res.json();
    },
    enabled: !!symbol,
    refetchInterval: 30000,
    staleTime: 15000,
  });
}
