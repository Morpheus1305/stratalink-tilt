// STATUS: FROZEN — TSLE v1.1 canonical ingestion contract
// ============================================================================
// LIS — Liquidity Ingestion Schema (Canonical Contract)
// Location: server/types/lis.ts
//
// Version: v1.1
// Status: FINAL — TSLE-facing, venue-agnostic
//
// PURPOSE
// -------
// This file defines the ONLY allowed input shape to TSLE.
// All venues (Binance, Coinbase, OKX, Kraken, etc.) MUST normalize
// their liquidity data into this schema before TSLE ingestion.
//
// TSLE INVARIANT
// --------------
// - No price series
// - No returns
// - No volatility
// - No OHLC or candles
// - Liquidity-native inputs only
// ============================================================================

/**
 * LISBand
 *
 * Represents executable liquidity within a symmetric depth band
 * around the mid price (e.g. ±25bps, ±50bps).
 *
 * All notionals should be expressed in USD (or your chosen quote standard).
 */
export interface LISBand {
  bid_notional: number;    // USD notional available on bid side
  ask_notional: number;    // USD notional available on ask side
  total_notional: number;  // bid_notional + ask_notional
}

/**
 * LISSnapshotV1_1
 *
 * Canonical LIS snapshot consumed by TSLE.
 *
 * IMPORTANT:
 * - TSLE MUST ONLY consume this shape
 * - TSLE MUST NOT infer missing fields
 * - TSLE MUST NOT accept venue-specific payloads
 */
export interface LISSnapshotV1_1 {
  // --------------------------------------------------------------------------
  // Contract metadata
  // --------------------------------------------------------------------------
  schema_version: "1.1";

  // --------------------------------------------------------------------------
  // Venue identity
  // --------------------------------------------------------------------------
  venue: string;   // e.g. "binance", "coinbase", "okx", "kraken"
  symbol: string;  // e.g. "BTCUSDT", "BTC-USD"

  // --------------------------------------------------------------------------
  // Time
  // --------------------------------------------------------------------------
  timestamp: number; // epoch milliseconds (snapshot time)

  // --------------------------------------------------------------------------
  // Spread (liquidity-native, NOT price predictive)
  // --------------------------------------------------------------------------
  spread?: {
    absolute?: number; // optional absolute spread (quote units)
    bps?: number;      // spread in basis points
  };

  // --------------------------------------------------------------------------
  // Depth bands
  // --------------------------------------------------------------------------
  // Keys MUST be canonical band identifiers, for example:
  //   "pct_0.10"  → ±10 bps
  //   "pct_0.25"  → ±25 bps
  //   "pct_0.5"   → ±50 bps
  //   "pct_1"     → ±100 bps
  //   "pct_2"     → ±200 bps
  //
  // TSLE currently uses 25bps and 50bps bands, but additional
  // bands may be added without changing the contract.
  bands: Record<string, LISBand>;
}