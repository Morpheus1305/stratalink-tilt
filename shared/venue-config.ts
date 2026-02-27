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
  | "REFERENCE_VENUE"       // Clean, institutional-grade liquidity truth
  | "STRESS_VENUE"          // Stress, leverage, and tail risk discovery
  | "REFERENCE_ADJACENT"    // Reinforces reference truth, cross-validates
  | "DERIVATIVES_SPECIALIST"; // Options/futures specialist, institutional derivatives

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
    available: true,
    description: "USD/EUR-native pricing with conservative spot books and lower leverage footprint. Strong regulatory posture.",
    usedFor: [
      "Reinforcing reference truth",
      "Cross-validating Coinbase signals",
      "Improving resilience against venue-specific bias",
      "EUR-pair liquidity assessment",
    ],
    notUsedFor: [
      "Primary stress detection",
      "Leverage cascade modeling",
      "Derivatives regime analysis",
    ],
  },
  okx: {
    venue: "OKX",
    displayName: "OKX",
    role: "STRESS_VENUE",
    confidence: "VARIABLE",
    scope: ["SPOT", "PERP", "FUNDING", "LIQUIDATIONS"],
    available: true,
    description: "High-volume derivatives with unified margin. Key stress venue for Asian session liquidity and leverage cascade detection.",
    usedFor: [
      "Unified margin stress signals",
      "Leverage regime confirmation",
      "Asian session liquidity assessment",
      "Cross-margin liquidation cascades",
    ],
    notUsedFor: [
      "Reference anchoring",
      "Regulatory baseline",
      "Clean spread calibration",
    ],
  },
  bybit: {
    venue: "BYBIT",
    displayName: "Bybit",
    role: "STRESS_VENUE",
    confidence: "VARIABLE",
    scope: ["SPOT", "PERP", "FUNDING", "LIQUIDATIONS"],
    available: false,
    description: "Derivatives-first exchange with high leverage exposure. Primary signal for retail leverage stress and liquidation cascades.",
    usedFor: [
      "Retail leverage stress detection",
      "Liquidation cascade signals",
      "High-frequency funding rate analysis",
      "Perp-spot basis divergence",
    ],
    notUsedFor: [
      "Reference anchoring",
      "Institutional baseline",
      "Regulatory truth",
    ],
  },
  deribit: {
    venue: "DERIBIT",
    displayName: "Deribit",
    role: "DERIVATIVES_SPECIALIST",
    confidence: "HIGH",
    scope: ["PERP", "FUNDING"],
    available: true,
    description: "Options and futures specialist with institutional derivatives focus. Primary source for volatility surface and options flow intelligence.",
    usedFor: [
      "Options flow analysis",
      "Volatility surface calibration",
      "Institutional derivatives positioning",
      "Term structure analysis",
    ],
    notUsedFor: [
      "Spot liquidity baseline",
      "Reference anchoring",
      "Retail flow analysis",
    ],
  },
  hyperliquid: {
    venue: "HYPERLIQUID",
    displayName: "Hyperliquid",
    role: "DERIVATIVES_SPECIALIST",
    confidence: "HIGH",
    scope: ["PERP", "FUNDING"],
    available: true,
    description: "On-chain perpetuals DEX with fully transparent L2 order book. Key source for decentralized derivatives liquidity and transparent funding rate data.",
    usedFor: [
      "DEX perpetuals depth analysis",
      "On-chain funding rate signals",
      "Transparent orderbook liquidity",
      "Cross-venue CEX/DEX divergence",
    ],
    notUsedFor: [
      "Spot reference anchoring",
      "Regulatory baseline",
      "Traditional exchange flow",
    ],
  },
  uniswap: {
    venue: "UNISWAP",
    displayName: "Uniswap",
    role: "REFERENCE_ADJACENT",
    confidence: "MODERATE",
    scope: ["SPOT"],
    available: true,
    description: "Leading Ethereum DEX with concentrated liquidity (V3). TVL-based depth bands derived from on-chain pool data via The Graph and DeFiLlama.",
    usedFor: [
      "DEX spot liquidity assessment",
      "On-chain TVL depth analysis",
      "CEX/DEX liquidity ratio computation",
      "DeFi liquidity fragmentation signals",
    ],
    notUsedFor: [
      "Derivatives analysis",
      "Leverage regime modeling",
      "Stress venue signals",
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
 * Get derivatives specialist venues
 */
export function getDerivativesVenues(): string[] {
  return Object.keys(VENUE_CONFIGS).filter(v => VENUE_CONFIGS[v].role === "DERIVATIVES_SPECIALIST");
}

/**
 * Get all venues (including unavailable)
 */
export function getAllVenues(): string[] {
  return Object.keys(VENUE_CONFIGS);
}

/**
 * Role-based confidence multiplier for TSLE
 * Reference venues have higher weight for baseline truth
 * Stress venues have higher weight for fragility signals
 * Derivatives specialists have high confidence for their specialized domain
 */
export function getRoleConfidenceMultiplier(venue: string, mode: "baseline" | "stress"): number {
  const config = VENUE_CONFIGS[venue.toLowerCase()];
  if (!config) return 1.0;

  if (mode === "baseline") {
    switch (config.role) {
      case "REFERENCE_VENUE": return 1.5;
      case "REFERENCE_ADJACENT": return 1.2;
      case "STRESS_VENUE": return 0.7;
      case "DERIVATIVES_SPECIALIST": return 0.9; // Moderate baseline, specialized domain
    }
  } else {
    switch (config.role) {
      case "STRESS_VENUE": return 1.5;
      case "REFERENCE_ADJACENT": return 1.0;
      case "REFERENCE_VENUE": return 0.8;
      case "DERIVATIVES_SPECIALIST": return 1.3; // High for derivatives stress signals
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
    case "DERIVATIVES_SPECIALIST":
      return { label: "DERIV-SPEC", color: "text-purple-400", bgColor: "bg-purple-400/10" };
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
