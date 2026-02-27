// client/src/services/lis.ts

export type Venue = "binance" | "coinbase" | "kraken" | "deribit" | "hyperliquid" | "uniswap" | "okx" | "bybit" | "dydx" | "bitget" | "gmx";

export interface LISBand {
  bid_notional?: number;
  ask_notional?: number;
  total_notional?: number;
}

export interface LISResponse {
  venue: string;
  symbol: string;
  timestamp: number;
  mid_price: number;
  spread: {
    absolute: number;
    bps: number;
  };
  spread_bps: number;
  bands: Record<string, LISBand>;
  raw?: any;
  tsle?: {
    tsle_state: string;
    reason: string;
    confidence: number;
  };
}

/**
 * Canonical LIS fetch.
 * Normalizes venue-specific payloads into a stable UI contract.
 * Returns a unified shape regardless of venue differences.
 */
export async function fetchLiquiditySnapshot(
  symbol: string,
  venue: Venue
): Promise<LISResponse> {
  const res = await fetch(`/api/lis/${venue}/depth?symbol=${symbol}`);

  if (!res.ok) {
    throw new Error(`LIS ${venue} fetch failed (${res.status})`);
  }

  const data = await res.json();

  // ---- SAFE NORMALIZATION ----
  // Handle multiple possible response formats from different venues

  const midPrice =
    typeof data.mid_price === "number"
      ? data.mid_price
      : typeof data.price === "number"
      ? data.price
      : 0;

  const spreadAbsolute =
    typeof data.spread?.absolute === "number"
      ? data.spread.absolute
      : 0;

  const spreadBps =
    typeof data.spread?.bps === "number"
      ? data.spread.bps
      : typeof data.spread_bps === "number"
      ? data.spread_bps
      : 0;

  const timestamp =
    typeof data.timestamp === "number"
      ? data.timestamp
      : typeof data.ts === "number"
      ? data.ts
      : Date.now();

  return {
    venue: data.venue ?? venue,
    symbol: data.symbol ?? symbol,
    timestamp,
    mid_price: midPrice,
    spread: {
      absolute: spreadAbsolute,
      bps: spreadBps,
    },
    spread_bps: spreadBps,
    bands: data.bands ?? {},
    raw: data.raw ?? data,
    tsle: data.tsle,
  };
}
