// client/src/services/lis.ts
// ============================================================================
// LIS Frontend Service (Canonical)
// -----------------------------------------------------------------------------
// Source of truth for liquidity data in the UI.
// Uses canonical LIS → TSLE endpoints.
//
// Binance  → /lis
// Coinbase → /lis/coinbase
// ============================================================================

export type Venue = "binance" | "coinbase";

export interface LISBand {
  bid_notional: number;
  ask_notional: number;
  total_notional: number;
}

export interface LISSnapshot {
  schema_version: string;
  venue: Venue;
  symbol: string;
  timestamp: number;
  spread?: {
    bps?: number;
  };
  bands: Record<string, LISBand>;
}

export interface TSLEPoint {
  ts: number;
  depth25: number;
  depth50: number;
  imbalance2550: number;
  poli: number;
}

export interface StabilityStats {
  stabilityScore: number;
  halfLifeMinutes: number;
  volatility: number;
  meanDepth: number;
  minDepth: number;
  maxDepth: number;
}

export interface LISResponse {
  lis: LISSnapshot;
  tsle: TSLEPoint;
  stability: StabilityStats;
}

/**
 * Resolve the correct LIS endpoint for a venue.
 */
function resolveEndpoint(venue: Venue): string {
  switch (venue) {
    case "binance":
      return "/lis";
    case "coinbase":
      return "/lis/coinbase";
    default:
      throw new Error(`Unsupported venue: ${venue}`);
  }
}

/**
 * Fetch canonical LIS + TSLE data.
 *
 * This is the ONLY liquidity data source the UI should use.
 */
export async function fetchLIS(
  venue: Venue
): Promise<LISResponse> {
  const endpoint = resolveEndpoint(venue);

  const res = await fetch(endpoint, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `LIS fetch failed (${venue}): ${res.status} ${text}`
    );
  }

  return res.json();
}