// client/src/services/lis.ts
// ============================================================================
// Canonical LIS client adapter
// -----------------------------------------------------------------------------
// Maps UI → backend → relay correctly per venue.
// Backend contract:
//   GET /api/lis/:venue/depth?symbol=BTC
// ============================================================================

export type Venue = "binance" | "coinbase" | "okx" | "kraken";

export interface LISBand {
  bid_notional: number;
  ask_notional: number;
  total_notional: number;
}

export interface LISSnapshot {
  venue: Venue;
  symbol: string;
  spread?: {
    absolute?: number;
    bps?: number;
  };
  bands: Record<string, LISBand>;
}

export interface TSLEOutput {
  tsle_state?: string;
  confidence?: number;
  poli?: number;
}

export interface LISResponse {
  lis: LISSnapshot;
  tsle?: TSLEOutput;
  stability?: any;
}

// -----------------------------------------------------------------------------
// Canonical fetch — THIS IS THE ONLY PLACE VENUE IS RESOLVED
// -----------------------------------------------------------------------------
async function fetchFromBackend(
  symbol: string,
  venue: Venue
): Promise<LISResponse> {
  const res = await fetch(
    `/api/lis/${venue}/depth?symbol=${encodeURIComponent(symbol)}`
  );

  if (!res.ok) {
    throw new Error(
      `LIS backend error (${venue}): ${res.status}`
    );
  }

  const json = await res.json();

  // Normalize to canonical LISResponse shape
  return {
    lis: json,
    tsle: json.tsle,
  };
}

// -----------------------------------------------------------------------------
// Public API used by UI
// -----------------------------------------------------------------------------
export async function fetchLiquiditySnapshot(
  symbol: string,
  venue: Venue
): Promise<LISResponse> {
  return fetchFromBackend(symbol, venue);
}