import type { LiquidityVenue } from "./liquidityTape";

export type TokenId = 
  | "BTC" | "ETH" | "SOL" | "ADA" | "AVAX" | "NEAR"
  | "LINK" | "MATIC" | "DOT" | "XRP";

export type VenueSymbolMap = Record<TokenId, Partial<Record<LiquidityVenue, string>>>;

export const VENUE_SYMBOL_MAP: VenueSymbolMap = {
  BTC: { coinbase: "BTC-USD", binance: "BTCUSDT", kraken: "XBTUSDT" },
  ETH: { coinbase: "ETH-USD", binance: "ETHUSDT", kraken: "ETHUSDT" },
  SOL: { coinbase: "SOL-USD", binance: "SOLUSDT", kraken: "SOLUSDT" },
  ADA: { coinbase: "ADA-USD", binance: "ADAUSDT", kraken: "ADAUSDT" },
  AVAX: { coinbase: "AVAX-USD", binance: "AVAXUSDT", kraken: "AVAXUSDT" },
  NEAR: { coinbase: "NEAR-USD", binance: "NEARUSDT", kraken: "NEARUSDT" },
  LINK: { coinbase: "LINK-USD", binance: "LINKUSDT", kraken: "LINKUSDT" },
  MATIC: { coinbase: "MATIC-USD", binance: "MATICUSDT", kraken: "MATICUSDT" },
  DOT: { coinbase: "DOT-USD", binance: "DOTUSDT", kraken: "DOTUSDT" },
  XRP: { coinbase: "XRP-USD", binance: "XRPUSDT", kraken: "XRPUSDT" },
};

export const TOKEN_LIST: TokenId[] = Object.keys(VENUE_SYMBOL_MAP) as TokenId[];

export function resolveSymbolsForToken(
  token: TokenId | string,
  venues: LiquidityVenue[]
): { venue: LiquidityVenue; symbol: string }[] {
  const mapping = VENUE_SYMBOL_MAP[token as TokenId];
  if (!mapping) return [];
  
  const result: { venue: LiquidityVenue; symbol: string }[] = [];
  for (const v of venues) {
    const sym = mapping[v];
    if (sym) {
      result.push({ venue: v, symbol: sym });
    }
  }
  return result;
}

export function getSymbolForVenue(
  token: TokenId | string,
  venue: LiquidityVenue
): string | null {
  const mapping = VENUE_SYMBOL_MAP[token as TokenId];
  if (!mapping) return null;
  return mapping[venue] ?? null;
}

export function isValidToken(token: string): token is TokenId {
  return token in VENUE_SYMBOL_MAP;
}
