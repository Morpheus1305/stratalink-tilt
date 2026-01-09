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
} from "../../shared/poli";

import type { TSLEComputeResult } from "../services/tsleCompute";

export default function composePoLiFromTSLE(args: {
  context: PoLiContext;
  tsle: TSLEComputeResult;
}): PoLiSnapshot {
  const { context, tsle } = args;

  console.log("[POLI] tsle.source:", tsle?.source);
  console.log("[POLI] tsle.evidence.sufficient:", tsle?.evidence?.sufficient);
  console.log("[POLI] tsle.evidence.rationale:", tsle?.evidence?.rationale);

  const isLiveSource = tsle?.source === "live";
  const hasEvidence = Boolean(tsle?.evidence?.sufficient);
  const sufficient = isLiveSource && hasEvidence;
  const status: PoLiStatus = sufficient ? "ok" : "insufficient";

  const headlineScore = sufficient ? clampScore(Number(tsle.score ?? 0)) : 0;

  const rating = poliRatingFromScore(headlineScore);
  const band = riskBandFromScore(headlineScore);

  const confidenceScore = clamp01(sufficient ? 0.6 : 0.0);

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

  const depthFlags: Array<any> = [];
  if (Number.isFinite(Number(tsle.estImpactBps)) && Number(tsle.estImpactBps) >= 100) {
    depthFlags.push({
      id: "IMPACT_HIGH",
      severity: "risk" as const,
      message: "Estimated impact exceeds 100 bps for the requested size.",
      meta: { estImpactBps: tsle.estImpactBps },
    });
  }

  const depthPillar = makePillar({
    id: "DEPTH",
    name: "Depth",
    score: headlineScore,
    confidence: {
      score: confidenceScore,
      rationale: sufficient
        ? "Derived from TSLE evidence (Phase 1)"
        : `Insufficient TSLE evidence (${tsle?.evidence?.rationale ?? "unknown"})`,
    },
    drivers: depthDrivers,
    flags: depthFlags,
    verifyTags: ["VERIFY:PARTIAL", "SOURCE:TSLE"],
  });

  const regime = String(tsle.regime ?? "").toLowerCase();
  const resilienceScore = sufficient
    ? (
        regime.includes("thin") ? clampScore(headlineScore - 8) :
        regime.includes("stressed") ? clampScore(headlineScore - 12) :
        clampScore(headlineScore - 2)
      )
    : 0;

  const resiliencePillar = makePillar({
    id: "RESILIENCE",
    name: "Resilience",
    score: resilienceScore,
    confidence: {
      score: confidenceScore,
      rationale: sufficient ? "Regime-derived (Phase 1)" : "No evidence",
    },
    drivers: [
      { metricId: "TSLE_REGIME", label: "Regime", value: tsle.regime ?? "unknown" },
      { metricId: "TSLE_SOURCE", label: "Source", value: tsle.source ?? "unknown" },
    ],
    flags: [],
    verifyTags: ["VERIFY:PARTIAL", "SOURCE:TSLE"],
  });

  return {
    version: POLI_CONTRACT_VERSION,
    status,
    context,

    score: headlineScore,
    rating,
    band,

    delta: { score: 0, direction: "unknown" },

    confidence: {
      score: confidenceScore,
      rationale: sufficient
        ? "Phase 1 TSLE wiring (no LIS/history yet)"
        : `Insufficient evidence: ${!isLiveSource ? "Fallback source" : (tsle?.evidence?.rationale ?? "unknown")}`,
    },

    pillars: sufficient
      ? { DEPTH: depthPillar, RESILIENCE: resiliencePillar }
      : {},

    flags: [],

    summary: sufficient
      ? "PoLi computed from TSLE (Phase 1)."
      : "PoLi scaffold live. Waiting for sufficient TSLE/LIS evidence.",

    verify: makeDefaultVerify(["VERIFY:PARTIAL", "SOURCE:TSLE"]),
  };
}
