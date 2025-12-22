/**
 * STRATALINK VENUE ROLE DOCTRINE
 * 
 * This configuration is FOUNDATIONAL and NON-OPTIONAL.
 * Every exchange integrated into Stratalink must be assigned a role.
 * 
 * Reference Venues anchor liquidity truth.
 * Stress Venues reveal fragility.
 * TSLE exists to reconcile the two into a coherent state.
 */

export type VenueRole = 
  | "REFERENCE_VENUE"     // Clean, institutional-grade liquidity truth
  | "STRESS_VENUE"        // Stress, leverage, and tail risk discovery
  | "REFERENCE_ADJACENT"; // Reinforces reference truth, cross-validates

export type ConfidenceMode = 
  | "HIGH"      // Stable confidence, used for anchoring
  | "VARIABLE"  // Regime-dependent confidence
  | "MODERATE"; // Intermediate confidence level

export type VenueScope = "SPOT" | "PERP" | "FUNDING" | "LIQUIDATIONS";

export interface VenueConfig {
  venue: string;
  displayName: string;
  role: VenueRole;
  confidence: ConfidenceMode;
  scope: VenueScope[];
  available: boolean;
  description: string;
  usedFor: string[];
  notUsedFor: string[];
}

/**
 * CANONICAL VENUE CONFIGURATIONS
 * 
 * These configurations define how each venue is used within TSLE
 * and the broader Stratalink liquidity intelligence framework.
 */
export const VENUE_CONFIGS: Record<string, VenueConfig> = {
  coinbase: {
    venue: "COINBASE",
    displayName: "Coinbase",
    role: "REFERENCE_VENUE",
    confidence: "HIGH",
    scope: ["SPOT"],
    available: true,
    description: "USD-native pricing with spot-only microstructure. Institutional participation and strong regulatory alignment.",
    usedFor: [
      "Anchoring TSLE thresholds",
      "Calibrating spread expectations",
      "Defining executable depth realism",
      "Establishing clean imbalance baselines",
    ],
    notUsedFor: [
      "Stress discovery",
      "Leverage regime modeling",
      "Tail risk extrapolation",
    ],
  },
  binance: {
    venue: "BINANCE",
    displayName: "Binance",
    role: "STRESS_VENUE",
    confidence: "VARIABLE",
    scope: ["SPOT", "PERP", "FUNDING"],
    available: true,
    description: "Deepest global liquidity with full leverage stack. Early signal of regime transitions.",
    usedFor: [
      "Stress-testing TSLE state logic",
      "Detecting imbalance cascades",
      "Measuring liquidity fragility",
      "Modeling tail events",
    ],
    notUsedFor: [
      "Defining 'healthy' spreads",
      "Anchoring baseline depth expectations",
      "Regulatory truth anchoring",
    ],
  },
  kraken: {
    venue: "KRAKEN",
    displayName: "Kraken",
    role: "REFERENCE_ADJACENT",
    confidence: "MODERATE",
    scope: ["SPOT"],
    available: false,
    description: "USD-native with conservative spot books and lower leverage footprint.",
    usedFor: [
      "Reinforcing reference truth",
      "Cross-validating Coinbase signals",
      "Improving resilience against venue-specific bias",
    ],
    notUsedFor: [
      "Primary stress detection",
      "Leverage cascade modeling",
    ],
  },
  okx: {
    venue: "OKX",
    displayName: "OKX",
    role: "STRESS_VENUE",
    confidence: "VARIABLE",
    scope: ["SPOT", "PERP", "FUNDING"],
    available: false,
    description: "High-volume derivatives exchange with significant leverage exposure.",
    usedFor: [
      "Secondary stress signals",
      "Leverage regime confirmation",
      "Asian session liquidity assessment",
    ],
    notUsedFor: [
      "Reference anchoring",
      "Regulatory baseline",
    ],
  },
};

/**
 * Get available venues only
 */
export function getAvailableVenues(): string[] {
  return Object.keys(VENUE_CONFIGS).filter(v => VENUE_CONFIGS[v].available);
}

/**
 * Get venues by role
 */
export function getVenuesByRole(role: VenueRole): string[] {
  return Object.keys(VENUE_CONFIGS).filter(v => VENUE_CONFIGS[v].role === role);
}

/**
 * Get reference venues (for anchoring)
 */
export function getReferenceVenues(): string[] {
  return Object.keys(VENUE_CONFIGS).filter(
    v => VENUE_CONFIGS[v].role === "REFERENCE_VENUE" || VENUE_CONFIGS[v].role === "REFERENCE_ADJACENT"
  );
}

/**
 * Get stress venues (for fragility detection)
 */
export function getStressVenues(): string[] {
  return Object.keys(VENUE_CONFIGS).filter(v => VENUE_CONFIGS[v].role === "STRESS_VENUE");
}

/**
 * Role-based confidence multiplier for TSLE
 * Reference venues have higher weight for baseline truth
 * Stress venues have higher weight for fragility signals
 */
export function getRoleConfidenceMultiplier(venue: string, mode: "baseline" | "stress"): number {
  const config = VENUE_CONFIGS[venue.toLowerCase()];
  if (!config) return 1.0;

  if (mode === "baseline") {
    switch (config.role) {
      case "REFERENCE_VENUE": return 1.5;
      case "REFERENCE_ADJACENT": return 1.2;
      case "STRESS_VENUE": return 0.7;
    }
  } else {
    switch (config.role) {
      case "STRESS_VENUE": return 1.5;
      case "REFERENCE_ADJACENT": return 1.0;
      case "REFERENCE_VENUE": return 0.8;
    }
  }
  return 1.0;
}

/**
 * Get venue role badge styling
 */
export function getVenueRoleStyling(role: VenueRole): { label: string; color: string; bgColor: string } {
  switch (role) {
    case "REFERENCE_VENUE":
      return { label: "REFERENCE", color: "text-emerald-400", bgColor: "bg-emerald-400/10" };
    case "STRESS_VENUE":
      return { label: "STRESS", color: "text-amber-400", bgColor: "bg-amber-400/10" };
    case "REFERENCE_ADJACENT":
      return { label: "REF-ADJ", color: "text-blue-400", bgColor: "bg-blue-400/10" };
  }
}

/**
 * Venue divergence thresholds
 * When reference and stress venues diverge beyond these thresholds,
 * it signals regime stress
 */
export const DIVERGENCE_THRESHOLDS = {
  poliDivergence: 15,      // PoLi score difference triggering alert
  depthDivergence: 0.30,   // 30% depth difference triggering alert
  spreadDivergence: 5,     // 5 bps spread difference triggering alert
  imbalanceDivergence: 0.20, // 20% imbalance difference triggering alert
};
