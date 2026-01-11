/**
 * ============================================================
 *  PoLi CONTRACT — FROZEN INTERFACE
 * ============================================================
 *
 * This file defines the canonical PoLi (Proof of Liquidity)
 * snapshot contract shared across:
 *
 *  - Server (API producers)
 *  - Client (UI consumers)
 *  - Analytics engines (TSLE / LIS)
 *  - External / regulatory integrations (future)
 *
 * ⚠️ CONTRACT RULES
 * ------------------------------------------------------------
 * 1. Do NOT change field names, nesting, or semantics.
 * 2. Do NOT remove fields.
 * 3. Do NOT repurpose fields.
 *
 * Allowed changes WITHOUT version bump:
 *  - Comments
 *  - Documentation
 *  - Internal helper implementations
 *
 * Required for ANY structural change:
 *  - Increment POLI_CONTRACT_VERSION
 *  - Add a migration note
 *  - Update all producers & consumers
 *
 * This contract is intentionally stable.
 *
 * ============================================================
 */

/**
 * shared/poli.ts
 *
 * PoLi (Proof of Liquidity) Contract — Canonical Type + Helper Library
 * -------------------------------------------------------------------
 * This file is the single source of truth for the PoLiSnapshot contract
 * returned by GET /api/poli and consumed by the client UI.
 *
 * Design principles:
 * 1) Contract-first: Always return a PoLiSnapshot, even if data is missing.
 * 2) Stable semantics: "insufficient" is NOT an error; it means "not enough evidence yet".
 * 3) Forward-compatible: Pillars and drivers may be partial and evolve over time.
 * 4) Non-breaking additions: Add fields as optional first; avoid removing/renaming.
 *
 * Versioning rules (POLI_CONTRACT_VERSION):
 * - Patch: safe additions, new optional fields, new pillar ids supported
 * - Minor: new required fields OR meaningfully expanded semantics (coordinate UI bump)
 * - Major: breaking changes (avoid)
 */

export const POLI_CONTRACT_VERSION = "1.0.0" as const;

/** Score bounds. PoLi is always normalized to [0..100]. */
export const POLI_SCORE_MIN = 0 as const;
export const POLI_SCORE_MAX = 100 as const;

export type PoLiStatus =
  | "ok" // computed successfully with adequate evidence
  | "insufficient" // computed shape returned, but insufficient evidence to score fully
  | "stale" // evidence exists but is stale / outdated
  | "error"; // server-side failure; still return a contract-compliant snapshot

/**
 * A/B/C/D/F rating ladder for headline PoLi score.
 * (Keep conservative and intuitive for institutional audiences.)
 */
export type PoLiRating = "A" | "B" | "C" | "D" | "F";

/**
 * Risk band for UI + alerting semantics.
 * - low: healthy conditions
 * - medium: caution (watch)
 * - high: stressed (risk)
 * - critical: severe degradation / inability to execute at reasonable size
 */
export type RiskBand = "low" | "medium" | "high" | "critical";

/**
 * Scope encodes market context and venue class.
 * Keep as a small, controlled set.
 */
export type PoLiScope = "spot" | "perp" | "options" | "dex" | "rfq" | "otc";

/**
 * Core request context.
 * - token: top-level asset (BTC, ETH, etc.)
 * - venue: canonical venue id (binance, coinbase, kraken, uniswap, etc.)
 * - symbol: actual market symbol if different (e.g. BTC-USD)
 * - scope: market structure scope
 * - timestamp: epoch ms
 */
export type PoLiContext = {
  token: string;
  venue: string;
  symbol: string;
  scope: PoLiScope;
  timestamp: number;
};

/**
 * Generic "verify" block: designed to support a future PoLi verification / attestation pipeline.
 * - source: versioned verification system identifier
 * - locked: if true, snapshot is immutable & signed/anchored
 * - tags: freeform tags used by governance / audit trails (e.g. VERIFY:PARTIAL)
 */
export type PoLiVerify = {
  source: string; // e.g. "VERIFY_v3.0"
  locked: boolean;
  tags: string[];
};

/**
 * Confidence score in [0..1].
 * - rationale is human-readable and intended for UI tooltips / audit.
 */
export type PoLiConfidence = {
  score: number; // 0..1
  rationale: string;
};

/**
 * Optional direction semantics for deltas and metrics.
 * Keep as "flat/up/down/unknown" for now.
 */
export type Direction = "up" | "down" | "flat" | "unknown";

/**
 * Delta is for short-term change on headline score (or pillar score).
 * direction can be derived, but is included for UI simplicity.
 */
export type PoLiDelta = {
  score: number; // typically -100..100 but realistically small (e.g. -10..+10)
  direction: Direction;
};

/**
 * A Driver is the "why" behind a pillar score.
 * This is intentionally flexible: value may be number or string.
 * - metricId: stable identifier used for wiring to TSLE/LIS later
 * - label: UI label
 * - value + unit: display values
 * - direction: optional local direction
 */
export type PoLiDriver = {
  metricId: string;
  label: string;
  value: number | string | boolean | null;
  unit?: string;
  direction?: Direction;
};

/**
 * A Flag is a structured alert about a condition.
 * - id: stable identifier
 * - severity: used for sorting and UI emphasis
 * - message: short explanation
 * - meta: optional machine-readable payload
 */
export type PoLiFlag = {
  id: string;
  severity: "info" | "warning" | "risk" | "critical";
  message: string;
  meta?: Record<string, unknown>;
};

/**
 * PoLi Pillars: these are the strategic dimensions for liquidity judgement.
 * Keep this list stable. You may add new pillars later, but do not rename existing ids.
 */
export type PoLiPillarId = "DEPTH" | "RESILIENCE" | "CONTINUITY" | "FRAGMENTATION" | "INTEGRITY";

/**
 * One pillar's evaluation.
 * Note: drivers and flags may be empty.
 */
export type PoLiPillar = {
  id: PoLiPillarId;
  name: string;

  score: number; // 0..100
  rating: PoLiRating;
  band: RiskBand;

  confidence: PoLiConfidence;

  drivers: PoLiDriver[];
  flags: PoLiFlag[];

  verify: PoLiVerify;
};

/**
 * Pillars dictionary:
 * - can be partial while wiring is incomplete (e.g. only DEPTH initially)
 * - should converge toward full set over time
 */
export type PoLiPillars = Partial<Record<PoLiPillarId, PoLiPillar>>;

/**
 * The top-level PoLi snapshot contract.
 *
 * IMPORTANT invariants:
 * - Always return this shape from /api/poli.
 * - If no evidence: status="insufficient" and pillars may be {}.
 * - On errors: status="error" but still return a valid snapshot with context + summary.
 */
export type PoLiSnapshot = {
  version: typeof POLI_CONTRACT_VERSION;

  status: PoLiStatus;
  context: PoLiContext;

  score: number; // 0..100
  rating: PoLiRating;
  band: RiskBand;

  delta: PoLiDelta;
  confidence: PoLiConfidence;

  pillars: PoLiPillars;

  flags: PoLiFlag[];

  summary: string;

  verify: PoLiVerify;
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(POLI_SCORE_MIN, Math.min(POLI_SCORE_MAX, Math.round(n)));
}

export function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/**
 * Rating ladder mapping.
 * Tune thresholds later if you want a tighter institutional standard.
 */
export function poliRatingFromScore(score: number): PoLiRating {
  const s = clampScore(score);
  if (s >= 85) return "A";
  if (s >= 70) return "B";
  if (s >= 55) return "C";
  if (s >= 40) return "D";
  return "F";
}

/**
 * Risk band mapping from score.
 * Conservative cutoffs by design.
 */
export function riskBandFromScore(score: number): RiskBand {
  const s = clampScore(score);
  if (s >= 80) return "low";
  if (s >= 60) return "medium";
  if (s >= 40) return "high";
  return "critical";
}

/**
 * Default verify block for early scaffolding.
 */
export function makeDefaultVerify(tags: string[] = ["VERIFY:PARTIAL"]): PoLiVerify {
  return {
    source: "VERIFY_v3.0",
    locked: false,
    tags,
  };
}

/**
 * Canonical context builder with normalization.
 */
export function makePoLiContext(input: Partial<PoLiContext> & Pick<PoLiContext, "token" | "venue">): PoLiContext {
  const token = String(input.token ?? "BTC").toUpperCase();
  const venue = String(input.venue ?? "coinbase").toLowerCase();
  const symbol = String(input.symbol ?? token);
  const scope = (input.scope ?? "spot") as PoLiScope;
  const timestamp = Number.isFinite(input.timestamp) ? Number(input.timestamp) : Date.now();

  return {
    token,
    venue,
    symbol,
    scope,
    timestamp,
  };
}

/**
 * Create a contract-compliant empty snapshot.
 * Use this whenever:
 * - you are not yet wired to TSLE/LIS
 * - evidence is missing
 * - you want to return an error but keep contract stable
 *
 * NOTE: This signature is intentionally stable and used by server/routes/poli.ts.
 */
export function makeEmptyPoLiSnapshot(
  overrides: Partial<PoLiContext> & {
    status?: PoLiStatus;
    summary?: string;
  }
): PoLiSnapshot {
  const context = makePoLiContext({
    token: String(overrides.token ?? "BTC"),
    venue: String(overrides.venue ?? "coinbase"),
    symbol: overrides.symbol,
    scope: overrides.scope,
    timestamp: overrides.timestamp,
  });

  const status: PoLiStatus = overrides.status ?? "insufficient";
  const summary =
    overrides.summary ??
    (status === "error"
      ? "PoLi endpoint error."
      : "PoLi scaffold live. Waiting for TSLE/LIS wiring.");

  // In insufficient/error states we keep score conservative.
  const score = 0;
  const rating = poliRatingFromScore(score);
  const band = riskBandFromScore(score);

  return {
    version: POLI_CONTRACT_VERSION,
    status,
    context,

    score,
    rating,
    band,

    delta: { score: 0, direction: "unknown" },

    confidence: {
      score: 0,
      rationale: status === "ok" ? "Computed" : "No data",
    },

    pillars: {},

    flags: [],

    summary,

    verify: makeDefaultVerify([]),
  };
}

/**
 * Optional utility: create a pillar with canonical formatting.
 * Use later when you compute pillars from TSLE/LIS data.
 */
export function makePillar(params: {
  id: PoLiPillarId;
  name: string;
  score: number;
  confidence?: Partial<PoLiConfidence>;
  drivers?: PoLiDriver[];
  flags?: PoLiFlag[];
  verifyTags?: string[];
}): PoLiPillar {
  const score = clampScore(params.score);
  const rating = poliRatingFromScore(score);
  const band = riskBandFromScore(score);

  return {
    id: params.id,
    name: params.name,
    score,
    rating,
    band,
    confidence: {
      score: clamp01(params.confidence?.score ?? 0.5),
      rationale: params.confidence?.rationale ?? "Partial evidence",
    },
    drivers: params.drivers ?? [],
    flags: params.flags ?? [],
    verify: makeDefaultVerify(params.verifyTags ?? ["VERIFY:PARTIAL"]),
  };

  /* ------------------------------------------------------------------ */
  /* UI Compatibility Types (non-contract)                               */
  /* ------------------------------------------------------------------ */
  /**
   * These types exist ONLY to support client components that were built
   * against an earlier PoLi UI model (PillarPanel / PillarSummaryBars).
   *
   * They DO NOT change the PoLiSnapshot contract above.
   * Keep additive only.
   */

  export type RagStatus = "GREEN" | "AMBER" | "ORANGE" | "RED";
  export type VerifyState = "VALID" | "PASS" | "WARNING" | "INVALID" | "FAIL";

  export type PillarKey = "DEPTH" | "RESILIENCE" | "CONTINUITY" | "FRAGMENTATION" | "INTEGRITY";

  export type PillarMetric = {
    key: string;
    label: string;
    value: number | string | boolean | null;
    unit?: string;
    benchmark?: string;
    delta?: number;
    rag?: RagStatus;
  };

  export type PillarInputData = {
    score: number;
    state: VerifyState;
    highlights?: string[];
    metrics?: PillarMetric[];
  };

  export type PillarData = {
    score: number;
    rag: RagStatus;
    summary: string;
    inputs: Record<string, PillarInputData>;
  };

  export type PoLiPayload = {
    version: typeof POLI_CONTRACT_VERSION;
    token: string;
    venue: string;
    updatedAt: number;

    // UI panels
    pillars: Partial<Record<PillarKey, PillarData>>;

    // Optional top-level summary hooks for UI
    headline?: string;
    flags?: PoLiFlag[];
  };
}