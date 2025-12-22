// client/src/services/lis.ts

export type Venue = "binance" | "coinbase";

export interface LISBand {
  bid_notional?: number;
  ask_notional?: number;
  total_notional?: number;
}

export interface LISResponse {
  venue: Venue;
  symbol: string;
  mid_price: number | null;
  spread_bps: number | null;
  bands: Record<string, LISBand>;
  raw?: any;
}

/**
 * Canonical LIS fetch.
 * Normalizes venue-specific payloads into a stable UI contract.
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

  const midPrice =
    typeof data.mid_price === "number"
      ? data.mid_price
      : typeof data.price === "number"
      ? data.price
      : null;

  const spreadBps =
    typeof data.spread?.bps === "number"
      ? data.spread.bps
      : typeof data.spread_bps === "number"
      ? data.spread_bps
      : null;

  return {
    venue: data.venue,
    symbol: data.symbol,
    mid_price: midPrice,
    spread_bps: spreadBps,
    bands: data.bands ?? {},
    raw: data.raw ?? data
  };
}