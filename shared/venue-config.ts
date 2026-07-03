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
  | "DERIVATIVES_SPECIALIST" // Options/futures specialist, institutional derivatives
  | "DEX_LIQUIDITY";        // Decentralized exchange pool-based liquidity

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
    available: true,
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
  dydx: {
    venue: "DYDX",
    displayName: "dYdX",
    role: "DERIVATIVES_SPECIALIST",
    confidence: "HIGH",
    scope: ["PERP", "FUNDING"],
    available: true,
    description: "Decentralized perpetuals exchange built on Cosmos appchain (v4). Fully on-chain orderbook with transparent funding rates and open interest data.",
    usedFor: [
      "On-chain perpetuals depth analysis",
      "Decentralized derivatives liquidity",
      "Transparent funding rate signals",
      "Cross-venue CEX/DEX perps divergence",
    ],
    notUsedFor: [
      "Spot liquidity baseline",
      "Reference anchoring",
      "Options flow analysis",
    ],
  },
  bitget: {
    venue: "BITGET",
    displayName: "Bitget",
    role: "STRESS_VENUE",
    confidence: "HIGH",
    scope: ["SPOT", "PERP", "FUNDING"],
    available: true,
    description: "Major centralized exchange with deep spot and USDT-margined perpetuals markets. Provides live orderbook depth and funding rate data via public API v2.",
    usedFor: [
      "Cross-venue depth divergence",
      "Stress venue liquidity signals",
      "Perpetuals funding rate comparison",
      "Multi-venue spread analysis",
    ],
    notUsedFor: [
      "Reference anchoring (use Coinbase)",
      "Options flow analysis",
      "DeFi liquidity fragmentation",
    ],
  },
  gmx: {
    venue: "GMX",
    displayName: "GMX v2",
    role: "DEX_LIQUIDITY",
    confidence: "MODERATE",
    scope: ["PERP", "FUNDING"],
    available: true,
    description: "Decentralized perpetuals exchange on Arbitrum (v2). Pool-based liquidity with oracle pricing. Depth is synthesized from pool TVL and oracle mid price.",
    usedFor: [
      "On-chain perpetuals depth analysis",
      "DEX vs CEX liquidity divergence",
      "DeFi derivatives regime classification",
      "Pool-based liquidity fragmentation signals",
    ],
    notUsedFor: [
      "Spot liquidity baseline",
      "Reference anchoring",
      "CLOB orderbook analysis (pool-based)",
    ],
  },
  curve: {
    venue: "CURVE",
    displayName: "Curve Finance",
    role: "DEX_LIQUIDITY",
    confidence: "MODERATE",
    scope: ["SPOT"],
    available: true,
    description: "Decentralized exchange optimized for stablecoin and pegged-asset swaps on Ethereum. Pool-based AMM with deep stablecoin liquidity and low-slippage swaps.",
    usedFor: [
      "Stablecoin liquidity depth analysis",
      "CEX/DEX liquidity ratio computation",
      "DeFi liquidity fragmentation signals",
      "Pegged-asset spread analysis",
    ],
    notUsedFor: [
      "Derivatives analysis",
      "Leverage regime modeling",
      "Reference anchoring",
    ],
  },
  otc: {
    venue: "OTC",
    displayName: "OTC (RFQ)",
    role: "REFERENCE_ADJACENT",
    confidence: "MODERATE",
    scope: ["SPOT", "PERP"],
    available: true,
    description: "Bilateral OTC dark liquidity via institutional RFQ (Request for Quote) desks. Provides indicative two-way quotes at institutional notional sizes. Requires institutional onboarding (OTC_RFQ_URL).",
    usedFor: [
      "Institutional dark pool depth estimation",
      "Large-block liquidity assessment",
      "Cross-venue depth comparison (lit vs dark)",
      "Whale-tier execution quality signals",
    ],
    notUsedFor: [
      "Retail-tier depth analysis",
      "High-frequency spread signals",
      "DeFi liquidity fragmentation",
    ],
  },
  aerodrome: {
    venue: "AERODROME",
    displayName: "Aerodrome",
    role: "DEX_LIQUIDITY",
    confidence: "MODERATE",
    scope: ["SPOT"],
    available: true,
    description: "Dominant DEX on Base (Coinbase's Ethereum L2). ve(3,3) AMM with concentrated liquidity (Slipstream) and classic vAMM/sAMM pools. $1.3B TVL. 60%+ of Base DEX volume. ADGM-relevant: Coinbase operates Base; $238M active RWA market cap on chain.",
    usedFor: [
      "Base chain DEX liquidity assessment",
      "EVM L2 liquidity fragmentation signals",
      "CEX/DEX liquidity ratio (L2 layer)",
      "Cross-chain depth comparison",
    ],
    notUsedFor: [
      "Derivatives analysis",
      "Reference anchoring",
      "Stress venue signals",
    ],
  },
  velodrome: {
    venue: "VELODROME",
    displayName: "Velodrome",
    role: "DEX_LIQUIDITY",
    confidence: "MODERATE",
    scope: ["SPOT"],
    available: true,
    description: "Dominant DEX on Optimism (third-largest Ethereum L2, $5.6B TVL). Same codebase and team as Aerodrome. Canonical liquidity layer for the Superchain ecosystem (Base, Optimism, World Chain, Mode). Merging with Aerodrome into unified Aero DEX during 2026.",
    usedFor: [
      "Optimism chain DEX liquidity assessment",
      "Superchain liquidity fragmentation signals",
      "EVM L2 cross-chain depth comparison",
      "Synthetix ecosystem liquidity monitoring",
    ],
    notUsedFor: [
      "Derivatives analysis",
      "Reference anchoring",
      "Stress venue signals",
    ],
  },
  pancakeswap: {
    venue: "PANCAKESWAP",
    displayName: "PancakeSwap",
    role: "DEX_LIQUIDITY",
    confidence: "MODERATE",
    scope: ["SPOT"],
    available: true,
    description: "Dominant DEX on BNB Chain. Uniswap V3 fork with concentrated liquidity. $903M 24h volume (12.5% of global DEX volume). Broadest single-venue token coverage of any DEX: BTC, ETH, BNB, SOL, XRP, ADA, DOGE, LINK, AVAX, and 10+ more. ADGM-relevant: BNB explicitly named by ADGM/FSRA director.",
    usedFor: [
      "BNB Chain DEX liquidity assessment",
      "Broad token DEX depth coverage",
      "EVM-compatible chain liquidity comparison",
      "CEX/DEX liquidity ratio across BNB ecosystem",
    ],
    notUsedFor: [
      "Derivatives analysis",
      "Reference anchoring",
      "Stress venue signals",
    ],
  },
  "uniswap-worldchain": {
    venue: "UNISWAP-WORLDCHAIN",
    displayName: "Uniswap (World Chain)",
    role: "DEX_LIQUIDITY",
    confidence: "MODERATE",
    scope: ["SPOT"],
    available: true,
    description: "Uniswap V3 deployed on World Chain — an OP Stack L2 ($1.8B TVL) backed by Tools for Humanity. Provides concentrated liquidity for ETH, USDC, and WLD pairs. ADGM-relevant: World Chain's identity-gated architecture aligns with ADGM digital asset access controls.",
    usedFor: [
      "World Chain DEX liquidity assessment",
      "OP Stack L2 cross-chain depth comparison",
      "WLD token liquidity monitoring",
      "Identity-gated DeFi market structure analysis",
    ],
    notUsedFor: [
      "Derivatives analysis",
      "Reference anchoring",
      "Stress venue signals",
    ],
  },
  syncswap: {
    venue: "SYNCSWAP",
    displayName: "SyncSwap",
    role: "DEX_LIQUIDITY",
    confidence: "MODERATE",
    scope: ["SPOT"],
    available: true,
    description: "Dominant DEX on zkSync Era — a zkEVM L2 ($4.1B TVL) using zero-knowledge proofs for Ethereum settlement. SyncSwap operates Classic Pools (constant-product AMM) and Stable Pools (StableSwap invariant). 0.1% volatile pool fees, 0.05% stable pool fees. Largest L2 DEX not on Optimism or Arbitrum stack.",
    usedFor: [
      "zkSync Era DEX liquidity assessment",
      "zkEVM chain depth monitoring",
      "ZK-proof settled DeFi coverage",
      "L2 DEX fragmentation analysis",
    ],
    notUsedFor: [
      "Derivatives analysis",
      "Reference anchoring",
      "Stress venue signals",
    ],
  },
  "linea-dex": {
    venue: "LINEA-DEX",
    displayName: "Linea DEX",
    role: "DEX_LIQUIDITY",
    confidence: "MODERATE",
    scope: ["SPOT"],
    available: true,
    description: "Highest-TVL DEX on Linea — a ConsenSys-built zkEVM L2 ($3.4B TVL) with deep MetaMask integration. Linea uses the highest-TVL DEX at connection time (Lynex or equivalent Uniswap V3 fork). ConsenSys institutional heritage makes Linea ADGM-salient for regulated entity DeFi access.",
    usedFor: [
      "Linea DEX liquidity assessment",
      "ConsenSys ecosystem depth monitoring",
      "zkEVM L2 cross-chain comparison",
      "MetaMask-integrated DeFi market structure",
    ],
    notUsedFor: [
      "Derivatives analysis",
      "Reference anchoring",
      "Stress venue signals",
    ],
  },
  "scroll-dex": {
    venue: "SCROLL-DEX",
    displayName: "Scroll DEX",
    role: "DEX_LIQUIDITY",
    confidence: "MODERATE",
    scope: ["SPOT"],
    available: true,
    description: "Highest-TVL DEX on Scroll — the most bytecode-equivalent zkEVM ($2.1B TVL), enabling Ethereum contracts to deploy without modification. Ambient Finance (CrocSwap) is the dominant DEX, using a combined single-contract AMM model. Scroll's EVM equivalence makes it the reference implementation for ZK-native institutional DeFi.",
    usedFor: [
      "Scroll DEX liquidity assessment",
      "ZK-native EVM depth monitoring",
      "Bytecode-equivalent chain liquidity coverage",
      "Institutional zkEVM DeFi analysis",
    ],
    notUsedFor: [
      "Derivatives analysis",
      "Reference anchoring",
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
      case "DERIVATIVES_SPECIALIST": return 0.9;
      case "DEX_LIQUIDITY": return 0.8;
    }
  } else {
    switch (config.role) {
      case "STRESS_VENUE": return 1.5;
      case "REFERENCE_ADJACENT": return 1.0;
      case "REFERENCE_VENUE": return 0.8;
      case "DERIVATIVES_SPECIALIST": return 1.3;
      case "DEX_LIQUIDITY": return 1.1;
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
    case "DEX_LIQUIDITY":
      return { label: "DEX-LIQ", color: "text-cyan-400", bgColor: "bg-cyan-400/10" };
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
