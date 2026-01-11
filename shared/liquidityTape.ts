// shared/liquidityTape.ts
// Liquidity Tape v0.1 — Architecture (Locked)

export type LiquidityTapeVenue = "binance" | "coinbase" | "kraken";

export type LiquidityTapeMode = "live" | "test" | "mock";

export type LiquidityTapeEventType =
  | "DEPTH_UPDATE"
  | "TRADE"
  | "LIQUIDATION"
  | "FUNDING"
  | "SPREAD_CHANGE";

export interface LiquidityTapeEvent {
  id: string;
  ts: number;
  type: LiquidityTapeEventType;
  venue: LiquidityTapeVenue;
  symbol: string;
  payload: {
    side?: "bid" | "ask";
    price?: number;
    size?: number;
    notionalUSD?: number;
    spreadBps?: number;
    fundingRate?: number;
    [key: string]: unknown;
  };
}

export interface TapeQuery {
  symbol?: string;
  venue?: LiquidityTapeVenue;
  type?: LiquidityTapeEventType;
  since?: number;
  limit?: number;
}
