// server/PoLi/composePoLiFromTSLE.ts
import {
  POLI_CONTRACT_VERSION,
  type PoLiSnapshot,
  type PoLiContext,
  type PoLiStatus,
  clampScore,
  clamp01,
  poliRatingFromScore,
  riskBandFromScore,
  makeDefaultVerify,
  makePillar,
  type PoLiFlag,
} from "../../shared/poli";

/**
 * Minimal TSLE shape PoLi depends on (keep local, do NOT import TSLE route types).
 * This prevents coupling PoLi contract to TSLE schema churn.
 */
export type TsleForPoLi = {
  ok?: boolean;
  score?: number;
  regime?: string;
  estImpactBps?: number;
  maxSizeAt25bps?: number;
  maxSizeAt50bps?: number;
  maxSizeAt100bps?: number;
  source?: "live" | "fallback" | string;
  asOf?: string;
  evidence?: {
    sufficient?: boolean;
    rationale?: string;
  };
};

/**
 * Phase 1.1 rule:
 * - status="ok" ONLY when TSLE evidence is LIVE + sufficient
 * - otherwise status="insufficient" with empty pillars (contract-compliant)
 */
export function composePoLiFromTSLE(args: {
  context: PoLiContext;
  tsle: TsleForPoLi;
}): PoLiSnapshot {
  const { context, tsle } = args;

  const source = String(tsle.source ?? "unknown").toLowerCase();
  const sufficient = Boolean(tsle.evidence?.sufficient);
  const rationale = String(tsle.evidence?.rationale ?? "No TSLE evidence available");
  const regimeRaw = String(tsle.regime ?? "unknown");

  const shouldBeOk = source === "live" && sufficient;

  // ---------- Phase 1.1: if not sufficient, return "insufficient" + explanation flag ----------
  if (!shouldBeOk) {
    const flags: PoLiFlag[] = [
      {
        id: "INSUFFICIENT_EVIDENCE",
        severity: "info",
        message: "Liquidity assessment withheld due to insufficient live depth evidence.",
        meta: { source, rationale, regime: regimeRaw },
      },
    ];

    return {
      version: POLI_CONTRACT_VERSION,
      status: "insufficient",
      context,

      score: 0,
      rating: poliRatingFromScore(0),
      band: riskBandFromScore(0),

      delta: { score: 0, direction: "unknown" },

      confidence: {
        score: 0,
        rationale: `Insufficient evidence: ${source === "fallback" ? "Fallback source" : rationale}`,
      },

      pillars: {},

      flags,

      summary: "PoLi scaffold live. Waiting for sufficient TSLE/LIS evidence.",

      verify: makeDefaultVerify(["VERIFY:PARTIAL", "SOURCE:TSLE"]),
    };
  }

  // ---------- OK path ----------
  const score = clampScore(Number(tsle.score ?? 0));
  const rating = poliRatingFromScore(score);
  const band = riskBandFromScore(score);

  // Conservative: TSLE-only wiring (no LIS history yet)
  const confidenceScore = clamp01(0.6);

  // Drivers for DEPTH pillar
  const depthDrivers = [
    {
      metricId: "TSLE_MAX_SIZE_25BPS",
      label: "Max size @ 25 bps",
      value: Number.isFinite(Number(tsle.maxSizeAt25bps)) ? Number(tsle.maxSizeAt25bps) : null,
      unit: "USD",
      direction: "unknown" as const,
    },
    {
      metricId: "TSLE_MAX_SIZE_50BPS",
      label: "Max size @ 50 bps",
      value: Number.isFinite(Number(tsle.maxSizeAt50bps)) ? Number(tsle.maxSizeAt50bps) : null,
      unit: "USD",
      direction: "unknown" as const,
    },
    {
      metricId: "TSLE_MAX_SIZE_100BPS",
      label: "Max size @ 100 bps",
      value: Number.isFinite(Number(tsle.maxSizeAt100bps)) ? Number(tsle.maxSizeAt100bps) : null,
      unit: "USD",
      direction: "unknown" as const,
    },
    {
      metricId: "TSLE_EST_IMPACT_BPS",
      label: "Estimated impact",
      value: Number.isFinite(Number(tsle.estImpactBps)) ? Number(tsle.estImpactBps) : null,
      unit: "bps",
      direction: "unknown" as const,
    },
  ];

  const depthFlags: PoLiFlag[] = [];
  const estImpactBps = Number(tsle.estImpactBps);
  if (Number.isFinite(estImpactBps) && estImpactBps >= 100) {
    depthFlags.push({
      id: "IMPACT_HIGH",
      severity: "risk",
      message: "Estimated impact exceeds 100 bps for the requested size.",
      meta: { estImpactBps },
    });
  }

  const depthPillar = makePillar({
    id: "DEPTH",
    name: "Depth",
    score,
    confidence: { score: confidenceScore, rationale: "Derived from TSLE evidence (Phase 1)" },
    drivers: depthDrivers,
    flags: depthFlags,
    verifyTags: ["VERIFY:PARTIAL", "SOURCE:TSLE"],
  });

  // RESILIENCE pillar: simple regime-derived adjustment
  const regime = regimeRaw.toLowerCase();
  const resilienceScore =
    regime.includes("thin") ? clampScore(score - 8) :
    regime.includes("stressed") ? clampScore(score - 12) :
    clampScore(score - 2);

  const resiliencePillar = makePillar({
    id: "RESILIENCE",
    name: "Resilience",
    score: resilienceScore,
    confidence: { score: confidenceScore, rationale: "Regime-derived (Phase 1)" },
    drivers: [
      { metricId: "TSLE_REGIME", label: "Regime", value: regimeRaw },
      { metricId: "TSLE_SOURCE", label: "Source", value: source },
    ],
    flags: [],
    verifyTags: ["VERIFY:PARTIAL", "SOURCE:TSLE"],
  });

  const status: PoLiStatus = "ok";

  return {
    version: POLI_CONTRACT_VERSION,
    status,
    context,

    score,
    rating,
    band,

    delta: { score: 0, direction: "unknown" },

    confidence: {
      score: confidenceScore,
      rationale: "Phase 1 TSLE wiring (no LIS/history yet)",
    },

    pillars: {
      DEPTH: depthPillar,
      RESILIENCE: resiliencePillar,
    },

    flags: [],

    summary: "PoLi computed from TSLE (Phase 1).",

    verify: makeDefaultVerify(["VERIFY:PARTIAL", "SOURCE:TSLE"]),
  };
}

export default composePoLiFromTSLE;