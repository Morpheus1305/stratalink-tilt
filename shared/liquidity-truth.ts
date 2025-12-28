/**
 * ============================================================================
 * STRATALINK LIQUIDITY TRUTH CONSOLE — CANONICAL DEFINITIONS
 * ============================================================================
 * 
 * This module defines the Liquidity Truth Console (LTC) as the single upstream
 * source for all Stratalink liquidity intelligence products.
 * 
 * TSLE DEFINITION (PERMANENT):
 * "TSLE measures the intensity, resilience, and continuity of executable
 *  liquidity across venues, independent of price."
 * 
 * CORE INVARIANT:
 * TSLE must not change due to price-only movements.
 * 
 * ============================================================================
 */

// ============================================================================
// TSLE INVARIANTS — NON-NEGOTIABLE
// ============================================================================

export const TSLE_DEFINITION = 
  "TSLE measures the intensity, resilience, and continuity of executable liquidity across venues, independent of price.";

export const TSLE_ALLOWED_INPUTS = [
  "depth25",        // Executable depth at 25 bps
  "depth50",        // Executable depth at 50 bps
  "imbalance2550",  // Bid/ask imbalance across 25-50 bps
  "poli",           // Proof of Liquidity score
  "spread",         // Spread integrity (bps)
  "regime",         // Liquidity regime flags
  "fragmentation",  // Cross-venue fragmentation score
] as const;

export const TSLE_FORBIDDEN_INPUTS = [
  "price",          // Spot, mid, mark, index
  "returns",        // Price changes
  "volatility",     // Any volatility metric
  "ohlc",           // Candlestick data
  "volume",         // Trade volume (price-weighted)
  "vwap",           // Volume-weighted average price
] as const;

export type TSLEAllowedInput = typeof TSLE_ALLOWED_INPUTS[number];
export type TSLEForbiddenInput = typeof TSLE_FORBIDDEN_INPUTS[number];

// ============================================================================
// LIQUIDITY HORIZONS — MEMORY WINDOWS
// ============================================================================

export type LiquidityHorizon = "now" | "session" | "baseline";

export interface HorizonDefinition {
  horizon: LiquidityHorizon;
  label: string;
  description: string;
  windowMinutes: number;
  purpose: string;
}

export const LIQUIDITY_HORIZONS: Record<LiquidityHorizon, HorizonDefinition> = {
  now: {
    horizon: "now",
    label: "Now",
    description: "Real-time liquidity snapshot (last 5 seconds to 1 minute)",
    windowMinutes: 1,
    purpose: "Immediate execution quality assessment",
  },
  session: {
    horizon: "session",
    label: "Session",
    description: "Intraday liquidity drift (last 15-60 minutes)",
    windowMinutes: 60,
    purpose: "Session-level regime tracking and trend detection",
  },
  baseline: {
    horizon: "baseline",
    label: "Baseline",
    description: "Rolling average liquidity conditions (last 4-24 hours)",
    windowMinutes: 1440,
    purpose: "Benchmark for normal vs abnormal liquidity conditions",
  },
};

// ============================================================================
// PoLi — PROOF OF LIQUIDITY
// ============================================================================

export type PoLiRating = "AAA" | "AA" | "A" | "BBB" | "BB" | "B" | "CCC" | "D";

export interface PoLiScore {
  value: number;          // 0-100 numeric score
  rating: PoLiRating;     // Letter rating band
  isReal: boolean;        // Core question: "Is liquidity real?"
  components: {
    depthScore: number;   // 0-40 points from depth quality
    balanceScore: number; // 0-35 points from bid/ask balance
    spreadScore: number;  // 0-25 points from spread integrity
  };
  interpretation: string; // Human-readable assessment
}

export function computePoLiRating(score: number): PoLiRating {
  if (score >= 90) return "AAA";
  if (score >= 80) return "AA";
  if (score >= 70) return "A";
  if (score >= 60) return "BBB";
  if (score >= 50) return "BB";
  if (score >= 40) return "B";
  if (score >= 25) return "CCC";
  return "D";
}

export function isLiquidityReal(score: number): boolean {
  return score >= 40;
}

export function getPoLiInterpretation(score: number): string {
  if (score >= 90) return "Exceptional liquidity — deep, balanced, institutional-grade";
  if (score >= 80) return "Strong liquidity — reliable execution at size";
  if (score >= 70) return "Good liquidity — adequate for most institutional needs";
  if (score >= 60) return "Fair liquidity — serviceable with some execution risk";
  if (score >= 50) return "Marginal liquidity — elevated execution risk";
  if (score >= 40) return "Thin liquidity — significant execution risk";
  if (score >= 25) return "Distressed liquidity — extreme caution required";
  return "Dislocated — liquidity effectively absent";
}

// ============================================================================
// LIQUIDITY REGIMES
// ============================================================================

export type LiquidityRegime = "NORMAL" | "THIN" | "STRESSED";

export interface RegimeClassification {
  regime: LiquidityRegime;
  confidence: number;     // 0-100
  description: string;
  signals: string[];      // Contributing factors
}

export function classifyRegime(
  poli: number,
  depthTrend: "improving" | "stable" | "declining",
  imbalance: number,
  consecutiveDeclines: number
): RegimeClassification {
  const signals: string[] = [];
  let regime: LiquidityRegime = "NORMAL";
  let confidence = 50;

  if (poli < 40) {
    signals.push(`PoLi critically low (${poli})`);
    regime = "STRESSED";
    confidence = 90;
  } else if (poli < 55) {
    signals.push(`PoLi below threshold (${poli})`);
    regime = "THIN";
    confidence = 70;
  }

  if (consecutiveDeclines >= 3) {
    signals.push(`Depth declining (${consecutiveDeclines} consecutive)`);
    if (regime === "NORMAL") regime = "THIN";
    if (regime === "THIN" && consecutiveDeclines >= 5) regime = "STRESSED";
    confidence = Math.min(95, confidence + 10);
  }

  if (Math.abs(imbalance) > 0.4) {
    signals.push(`Severe imbalance (${(imbalance * 100).toFixed(0)}%)`);
    if (regime === "NORMAL") regime = "THIN";
    confidence = Math.min(95, confidence + 5);
  }

  if (depthTrend === "declining") {
    signals.push("Depth trend declining");
    confidence = Math.min(95, confidence + 5);
  }

  const descriptions: Record<LiquidityRegime, string> = {
    NORMAL: "Liquidity conditions are normal — depth stable, balanced, executable",
    THIN: "Liquidity is thin — reduced depth, elevated imbalance, exercise caution",
    STRESSED: "Liquidity is stressed — significant execution risk, consider delaying",
  };

  return {
    regime,
    confidence,
    description: descriptions[regime],
    signals: signals.length > 0 ? signals : ["All metrics within normal bounds"],
  };
}

// ============================================================================
// FRAGMENTATION
// ============================================================================

export interface FragmentationScore {
  score: number;            // 0-100 (0 = highly fragmented, 100 = unified)
  level: "LOW" | "MODERATE" | "HIGH" | "SEVERE";
  venueCount: number;
  dominantVenue: string;
  dominantShare: number;    // 0-1
  description: string;
}

export function classifyFragmentation(score: number): FragmentationScore["level"] {
  if (score >= 80) return "LOW";
  if (score >= 60) return "MODERATE";
  if (score >= 40) return "HIGH";
  return "SEVERE";
}

// ============================================================================
// UNIFIED LIQUIDITY STATE
// ============================================================================

export interface TSLESnapshot {
  ts: number;
  depth25: number;
  depth50: number;
  imbalance2550: number;
  poli: number;
}

export interface TSLEState {
  state: "STABLE" | "THINNING" | "FRAGILE" | "DISLOCATED";
  since: number;
  confidence: number;
  reason: string;
}

export interface HorizonTSLE {
  horizon: LiquidityHorizon;
  poli: PoLiScore;
  state: TSLEState;
  trend: {
    direction: "rising" | "falling" | "stable";
    velocity: number;
    momentum: "accelerating" | "decelerating" | "neutral";
  };
  dataPoints: number;
}

export interface LiquidityState {
  symbol: string;
  venue: string;
  timestamp: number;

  poli: PoLiScore;

  regime: RegimeClassification;

  tsle: {
    definition: string;
    state: TSLEState;
    horizons: {
      now: HorizonTSLE | null;
      session: HorizonTSLE | null;
      baseline: HorizonTSLE | null;
    };
  };

  fragmentation: FragmentationScore | null;

  signals: {
    type: string;
    severity: "low" | "medium" | "high";
    message: string;
  }[];

  invariants: {
    priceIndependent: boolean;
    forbiddenInputsUsed: string[];
  };
}

export function validateInvariants(state: LiquidityState): boolean {
  if (!state.invariants.priceIndependent) {
    console.error("[LTC INVARIANT VIOLATION] Price-dependent input detected");
    return false;
  }
  if (state.invariants.forbiddenInputsUsed.length > 0) {
    console.error(
      "[LTC INVARIANT VIOLATION] Forbidden inputs used:",
      state.invariants.forbiddenInputsUsed
    );
    return false;
  }
  return true;
}

export function createEmptyLiquidityState(
  venue: string,
  symbol: string
): LiquidityState {
  return {
    symbol,
    venue,
    timestamp: Date.now(),
    poli: {
      value: 0,
      rating: "D",
      isReal: false,
      components: { depthScore: 0, balanceScore: 0, spreadScore: 0 },
      interpretation: "No data available",
    },
    regime: {
      regime: "NORMAL",
      confidence: 0,
      description: "Awaiting data",
      signals: [],
    },
    tsle: {
      definition: TSLE_DEFINITION,
      state: {
        state: "STABLE",
        since: Date.now(),
        confidence: 0,
        reason: "Awaiting data",
      },
      horizons: {
        now: null,
        session: null,
        baseline: null,
      },
    },
    fragmentation: null,
    signals: [],
    invariants: {
      priceIndependent: true,
      forbiddenInputsUsed: [],
    },
  };
}

// ============================================================================
// CONSOLE CONSTRAINTS
// ============================================================================

export const LTC_PRINCIPLES = {
  purpose: "Liquidity Truth Console is the canonical source of liquidity truth",
  invariant: "TSLE must not change due to price-only movements",
  question: "Is liquidity real? Is it fragmenting? Is it resilient?",
  guarantee: "All outputs derivable without seeing or inferring price",
};

export function assertPriceIndependence<T extends Record<string, unknown>>(
  inputs: T,
  context: string
): void {
  const forbiddenKeys = TSLE_FORBIDDEN_INPUTS as readonly string[];
  const violations = Object.keys(inputs).filter(k => 
    forbiddenKeys.some(f => k.toLowerCase().includes(f))
  );
  
  if (violations.length > 0) {
    throw new Error(
      `[LTC INVARIANT VIOLATION] ${context}: Forbidden inputs detected: ${violations.join(", ")}`
    );
  }
}
