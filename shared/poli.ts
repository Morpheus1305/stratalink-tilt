/**
 * ============================================================
 *  PoLi CONTRACT — CANONICAL + UI COMPAT LAYER (DROP-IN)
 * ============================================================
 *
 * This file exposes:
 * 1) Canonical PoLiSnapshot contract (server truth / regulatory)
 * 2) UI-compatible dashboard model (client legacy)
 * 3) Legacy aliases expected by existing client code
 *
 * IMPORTANT:
 * - Do NOT remove exports without grepping client usage.
 */

export const POLI_CONTRACT_VERSION = "1.0.0" as const;

/** Score bounds. PoLi is always normalized to [0..100]. */
export const POLI_SCORE_MIN = 0 as const;
export const POLI_SCORE_MAX = 100 as const;

export type PoLiStatus = "ok" | "insufficient" | "stale" | "error";

/** A/B/C/D/F rating ladder for headline PoLi score. */
export type PoLiRating = "A" | "B" | "C" | "D" | "F";

/** Risk band for UI + alerting semantics. */
export type RiskBand = "low" | "medium" | "high" | "critical";

/** Optional direction semantics for deltas and metrics. */
export type Direction = "up" | "down" | "flat" | "unknown";

/** Scope encodes market context and venue class. */
export type PoLiScope = "spot" | "perp" | "options" | "dex" | "rfq" | "otc";

/** Core request context. */
export type PoLiContext = {
  token: string;
  venue: string;
  symbol: string;
  scope: PoLiScope;
  timestamp: number;
};

/** Generic "verify" block. */
export type PoLiVerify = {
  source: string;
  locked: boolean;
  tags: string[];
};

/** Confidence score in [0..1]. */
export type PoLiConfidence = {
  score: number;
  rationale: string;
};

/** Delta is for short-term change on headline score (or pillar score). */
export type PoLiDelta = {
  score: number;
  direction: Direction;
};

/** A Driver is the "why" behind a pillar score. */
export type PoLiDriver = {
  metricId: string;
  label: string;
  value: number | string | boolean | null;
  unit?: string;
  direction?: Direction;
};

/** A Flag is a structured alert about a condition. */
export type PoLiFlag = {
  id: string;
  severity: "info" | "warning" | "risk" | "critical";
  message: string;
  meta?: Record<string, unknown>;
};

/** PoLi Pillars: strategic dimensions for liquidity judgement. */
export type PoLiPillarId =
  | "DEPTH"
  | "RESILIENCE"
  | "CONTINUITY"
  | "FRAGMENTATION"
  | "INTEGRITY";

/** One pillar's evaluation. */
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

/** Pillars dictionary: can be partial early. */
export type PoLiPillars = Partial<Record<PoLiPillarId, PoLiPillar>>;

/** The top-level PoLi snapshot contract. */
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
/* Canonical helpers (server expects these)                             */
/* ------------------------------------------------------------------ */

export function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(POLI_SCORE_MIN, Math.min(POLI_SCORE_MAX, Math.round(n)));
}

export function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export function poliRatingFromScore(score: number): PoLiRating {
  const s = clampScore(score);
  if (s >= 85) return "A";
  if (s >= 70) return "B";
  if (s >= 55) return "C";
  if (s >= 40) return "D";
  return "F";
}

export function riskBandFromScore(score: number): RiskBand {
  const s = clampScore(score);
  if (s >= 80) return "low";
  if (s >= 60) return "medium";
  if (s >= 40) return "high";
  return "critical";
}

export function makeDefaultVerify(tags: string[] = ["VERIFY:PARTIAL"]): PoLiVerify {
  return { source: "VERIFY_v3.0", locked: false, tags };
}

export function makePoLiContext(
  input: Partial<PoLiContext> & Pick<PoLiContext, "token" | "venue">,
): PoLiContext {
  const token = String(input.token ?? "BTC").toUpperCase();
  const venue = String(input.venue ?? "coinbase").toLowerCase();
  const symbol = String(input.symbol ?? token);
  const scope = (input.scope ?? "spot") as PoLiScope;
  const timestamp = Number.isFinite(input.timestamp) ? Number(input.timestamp) : Date.now();

  return { token, venue, symbol, scope, timestamp };
}

export function makeEmptyPoLiSnapshot(
  overrides: Partial<PoLiContext> & { status?: PoLiStatus; summary?: string },
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
    confidence: { score: 0, rationale: status === "ok" ? "Computed" : "No data" },
    pillars: {},
    flags: [],
    summary,
    verify: makeDefaultVerify([]),
  };
}

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
}

/* ============================================================
 * UI COMPATIBILITY LAYER (client legacy expects these)
 * ============================================================ */

export type RagStatus = "GREEN" | "AMBER" | "ORANGE" | "RED";
export type VerifyState = "PASS" | "VALID" | "WARNING" | "FAIL" | "INVALID";

export type PillarKey = PoLiPillarId;

export type PillarMetric = {
  key: string;
  label: string;
  value: string | number;
  unit?: string;
  delta?: number;
};

export type PillarInput = {
  score: number;
  state: VerifyState;
  highlights?: string[];
  metrics?: PillarMetric[];
};

export type PillarData = {
  rag: RagStatus;
  score: number;
  summary: string;
  inputs: Record<string, PillarInput>;
};

export type PoLiOverall = {
  rag: RagStatus;
  score: number;
  confidence: number;
  trend: { delta_7d: number };
  coverage: {
    venues_observed: string[];
    venues_expected: string[];
    regimes_observed: string[];
  };
};

export type PoLiMeta = {
  versions: {
    poli: string;
    verify: string;
    tsle?: string;
  };
};

export const PILLAR_LABELS: Record<PillarKey, string> = {
  DEPTH: "Depth",
  RESILIENCE: "Resilience",
  CONTINUITY: "Continuity",
  FRAGMENTATION: "Fragmentation",
  INTEGRITY: "Integrity",
};

/* ============================================================
 * Legacy aliases (fix current client import errors)
 * ============================================================ */

/** Client code imports PoLiMetric — alias to PillarMetric */
export type PoLiMetric = PillarMetric;

/**
 * Client code imports PoLiPayload — provide a stable dashboard payload.
 * This is intentionally separate from PoLiSnapshot (canonical).
 */
export type PoLiPayload = {
  overall: PoLiOverall;
  meta: PoLiMeta;
  pillars: Partial<Record<PillarKey, PillarData>>;
  snapshot?: PoLiSnapshot; // optional bridge if you want to expose canonical too
};