// shared/liquidityTape.ts
export type LiquidityVenue =
  | "binance"
  | "coinbase"
  | "kraken"
  | "okx"
  | "bybit"
  | "dydx"
  | "bitget"
  | "gmx"
  | "dex"
  | "unknown";

export type LiquidityTapeEventType =
  | "DEPTH_UPDATE"
  | "SPREAD_UPDATE"
  | "FUNDING_RATE"
  | "IMBALANCE"
  | "MARK_PRICE";

export type DepthPayload = {
  side: "bid" | "ask";
  price: number;
  size: number;
  notionalUsd?: number;
  spreadBps?: number;
  depthUsd?: number;
  bps?: number;
};

export type SpreadPayload = {
  spreadBps: number;
  bid?: number;
  ask?: number;
  mid?: number;
};

export type FundingPayload = {
  fundingRate: number;
  apr?: number;
};

export type ImbalancePayload = {
  imbalancePct: number;
  totalUsd?: number;
};

export type MarkPricePayload = {
  price: number;
};

export type LiquidityTapePayload =
  | DepthPayload
  | SpreadPayload
  | FundingPayload
  | ImbalancePayload
  | MarkPricePayload;

export type LiquidityTapeEvent = {
  id: string;
  ts: number;
  type: LiquidityTapeEventType;
  venue: LiquidityVenue;
  symbol: string;
  payload: LiquidityTapePayload;
};

export type LiquidityTapeLatestResponse = {
  ok: true;
  count: number;
  events: LiquidityTapeEvent[];
};
