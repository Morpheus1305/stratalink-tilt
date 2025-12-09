export type ExecutionRegime = "Ultra-Tight" | "Tight" | "Constructive" | "Stressed" | "Block-Only";

export type RiskFlag = "green" | "amber" | "red";

export type TsleRegime = "Ultra-Tight" | "Tight" | "Constructive" | "Patchy" | "Thin" | "Broken";

export type StressBucket = "Calm" | "Watch" | "Caution" | "Stress" | "Deleveraging";

export const BUCKET_ORDER: readonly StressBucket[] = ["Calm", "Watch", "Caution", "Stress", "Deleveraging"] as const;

export interface StressPoint {
  symbol: string;
  tsleScore?: number | null;
  stressBucket?: StressBucket | null;
}

export interface TokenLiquiditySummary {
  symbol: string;
  name?: string;
  factorScore: number;
  poliScore?: number;
  execRegime: ExecutionRegime;
  max25bps: number;
  max50bps: number;
  bestVenue: string;
  depth10: number;
  depth10Change24h: number;
  riskFlag: RiskFlag;
  tsleScore?: number | null;
  tsleRegime?: TsleRegime | null;
  tsleStress?: StressBucket | null;
}
