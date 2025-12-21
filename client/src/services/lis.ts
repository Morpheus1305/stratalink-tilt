// client/src/services/lis.ts
// ============================================================================
// LIS Frontend Service (Canonical, with legacy compatibility)
// -----------------------------------------------------------------------------
// Canonical liquidity source for the UI.
// TSLE v1.1 remains untouched.
//
// Canonical endpoints:
//   Binance  → /lis
//   Coinbase → /lis/coinbase
//
// Legacy compatibility:
//   fetchLiquiditySnapshot() → mapped to canonical LIS
// ============================================================================

export type Venue = "binance" | "coinbase";

/* =======================
   LIS + TSLE TYPES
   ======================= */

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

/* =======================
   ENDPOINT RESOLUTION
   ======================= */

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

/* =======================
   CANONICAL FETCH
   ======================= */

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

/* =======================
   LEGACY COMPATIBILITY
   ======================= */

/**
 * Legacy API used by existing UI components.
 * Internally mapped to canonical LIS.
 *
 * DO NOT USE IN NEW CODE.
 */
export async function fetchLiquiditySnapshot(
  symbol: string,
  venue: Venue
): Promise<LISResponse> {
  // Symbol is currently implicit in LIS (BTC default),
  // kept here for interface compatibility.
  return fetchLIS(venue);
}