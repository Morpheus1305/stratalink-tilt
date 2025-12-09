import { create } from "zustand";
import { computeAllTokens } from "@/engine/tsleEngine";

interface TSLEResult {
  token: string;
  tsle: number;
  regime: string;
  depthScore: number;
  fundingScore: number;
  stabilityScore: number;
  fragmentation: number;
  execIntegrity: number;
  fiveFactor: {
    score: number;
    factors: {
      depthQuality: number;
      executionEfficiency: number;
      liquidityStability: number;
      marketFragmentation: number;
      riskConcentration: number;
    };
  };
  depth: any;
  funding: any;
}

interface LiquidityStore {
  tsleData: Record<string, TSLEResult>;
  refreshTSLE: () => Promise<void>;
}

export const useLiquidityStore = create<LiquidityStore>((set) => ({
  tsleData: {},

  refreshTSLE: async () => {
    const tokens = ["BTC", "ETH", "SOL", "LINK", "NEAR", "AVAX", "DOT", "ADA", "XRP"];
    const results = await computeAllTokens(tokens);
    set({ tsleData: results });
  },
}));
