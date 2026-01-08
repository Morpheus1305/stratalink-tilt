// server/routes/poli.ts
import { Router } from "express";
import type { Request, Response } from "express";

import {
  POLI_CONTRACT_VERSION,
  type PoLiSnapshot,
  type PoLiContext,
  type PoLiStatus,
  clampScore,
  clamp01,
  poliRatingFromScore,
  riskBandFromScore,
  makeEmptyPoLiSnapshot,
  makeDefaultVerify,
  makePillar,
} from "../../shared/poli";

import { computeTSLE } from "../services/tsleCompute";

const router = Router();

/**
 * Health endpoint for contract verification.
 * GET /api/poli/health
 */
router.get("/health", (_req: Request, res: Response) => {
  return res.json({ ok: true, contract: POLI_CONTRACT_VERSION });
});

/**
 * Compose a PoLiSnapshot from TSLE output (Phase 1).
 *
 * Rules:
 * - Keep PoLi contract stable (do NOT leak TSLE schema).
 * - Phase 1 pillars: DEPTH + RESILIENCE (minimal wiring).
 * - Other pillars remain empty until LIS/history is wired.
 */
function composePoLiFromTSLE(args: {
  context: PoLiContext;
  tsle: Awaited<ReturnType<typeof computeTSLE>>;
}): PoLiSnapshot {
  const { context, tsle } = args;

  // Debug logging
  console.log("[POLI] tsle.source:", tsle?.source);
  console.log("[POLI] tsle.evidence.sufficient:", tsle?.evidence?.sufficient);
  console.log("[POLI] tsle.evidence.rationale:", tsle?.evidence?.rationale);

  // ACCEPTANCE CRITERIA:
  // - status="ok" ONLY when source="live" AND evidence.sufficient=true
  // - otherwise status="insufficient" with pillars={}
  const isLiveSource = tsle?.source === "live";
  const hasEvidence = Boolean(tsle?.evidence?.sufficient);
  const sufficient = isLiveSource && hasEvidence;
  const status: PoLiStatus = sufficient ? "ok" : "insufficient";

  // If insufficient, keep score conservative for now (contract-first semantics)
  const headlineScore = sufficient ? clampScore(Number(tsle.score ?? 0)) : 0;

  const rating = poliRatingFromScore(headlineScore);
  const band = riskBandFromScore(headlineScore);

  // Conservative confidence for Phase 1 (no LIS/history yet)
  const confidenceScore = clamp01(
    sufficient ? 0.6 : 0.0
  );

  // DEPTH pillar drivers from TSLE
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
    score: headlineScore, // Phase 1: DEPTH ~= TSLE score when sufficient
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

  // RESILIENCE: basic regime-derived adjustment
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

/**
 * GET /api/poli?token=BTC&venue=coinbase&scope=spot&mock=1
 *
 * Contract-first endpoint:
 * - Always returns a PoLiSnapshot matching shared/poli.ts
 * - "insufficient" is a valid state (not an error)
 * - mock mode for UI dev: ?mock=1
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const token = String(req.query.token ?? "BTC").toUpperCase();
    const venue = String(req.query.venue ?? "coinbase").toLowerCase();
    const symbol = req.query.symbol ? String(req.query.symbol) : token;
    const scope = (req.query.scope ? String(req.query.scope) : "spot") as PoLiContext["scope"];
    const mock = String(req.query.mock ?? "0") === "1";

    // Normalized contract context
    const context: PoLiContext = {
      token,
      venue,
      symbol,
      scope,
      timestamp: Date.now(),
    };

    // ✅ MOCK MODE
    if (mock) {
      const score = clampScore(70 + Math.round((Math.random() - 0.5) * 10));
      const rating = poliRatingFromScore(score);
      const band = riskBandFromScore(score);

      const snapshot: PoLiSnapshot = {
        version: POLI_CONTRACT_VERSION,
        status: "ok",
        context,
        score,
        rating,
        band,
        delta: { score: Math.round((Math.random() - 0.5) * 6), direction: "unknown" },
        confidence: { score: 0.6, rationale: "Mock mode" },
        pillars: {
          DEPTH: makePillar({
            id: "DEPTH",
            name: "Depth",
            score: clampScore(score + 3),
            confidence: { score: 0.6, rationale: "Mock mode" },
            drivers: [
              { metricId: "DEPTH_USD_25BPS", label: "Depth @ 25 bps", value: 9.4, unit: "m", direction: "flat" },
              { metricId: "SPREAD_BPS", label: "Spread", value: 1.2, unit: "bps", direction: "flat" },
            ],
            flags: [],
            verifyTags: ["VERIFY:PARTIAL"],
          }),
          RESILIENCE: makePillar({
            id: "RESILIENCE",
            name: "Resilience",
            score: clampScore(score - 2),
            confidence: { score: 0.55, rationale: "Mock mode" },
            drivers: [{ metricId: "SPREAD_STABILITY", label: "Spread stability", value: 0.7, unit: "idx" }],
            flags: [],
            verifyTags: ["VERIFY:PARTIAL"],
          }),
          CONTINUITY: makePillar({
            id: "CONTINUITY",
            name: "Continuity",
            score: clampScore(score + 1),
            confidence: { score: 0.7, rationale: "Mock mode" },
            drivers: [{ metricId: "FEED_HEALTH", label: "Feed health", value: "OK" }],
            flags: [],
            verifyTags: ["VERIFY:PARTIAL"],
          }),
          FRAGMENTATION: makePillar({
            id: "FRAGMENTATION",
            name: "Fragmentation",
            score: clampScore(score - 4),
            confidence: { score: 0.5, rationale: "Mock mode" },
            drivers: [{ metricId: "CROSS_VENUE_DIVERGENCE", label: "Cross-venue divergence", value: 32, unit: "%" }],
            flags: [],
            verifyTags: ["VERIFY:PARTIAL"],
          }),
          INTEGRITY: makePillar({
            id: "INTEGRITY",
            name: "Integrity",
            score: clampScore(score - 1),
            confidence: { score: 0.45, rationale: "Mock mode" },
            drivers: [{ metricId: "WASH_TRADING_RISK", label: "Wash trading risk", value: 0.2, unit: "idx" }],
            flags: [],
            verifyTags: ["VERIFY:PARTIAL"],
          }),
        },
        flags: [],
        summary: "Mock PoLi snapshot (contract-compliant).",
        verify: makeDefaultVerify(["VERIFY:PARTIAL"]),
      };

      return res.json(snapshot);
    }

    // ✅ REAL MODE (Phase 1): direct compute call (no internal HTTP)
    const tsle = await computeTSLE({
      token,
      venue,
      symbol,
      side: (req.query.side as "buy" | "sell" | undefined) ?? "buy",
      requestedSize: req.query.size ? Number(req.query.size) : undefined,
    });

    // If TSLE compute fails, keep contract compliant
    if (!tsle?.ok) {
      const snapshot = makeEmptyPoLiSnapshot({
        token,
        venue,
        symbol,
        scope,
        status: "insufficient",
        summary: "PoLi scaffold live. Waiting for TSLE/LIS wiring.",
        verifyTags: ["VERIFY:PARTIAL"],
      });
      return res.json(snapshot);
    }

    // Compose PoLi from TSLE
    const snapshot = composePoLiFromTSLE({ context, tsle });
    return res.json(snapshot);
  } catch (err) {
    console.error("[POLI] route error:", err);

    const snapshot = makeEmptyPoLiSnapshot({
      token: String(req.query.token ?? "BTC"),
      venue: String(req.query.venue ?? "coinbase"),
      status: "error",
      summary: "PoLi endpoint error. See server logs.",
      verifyTags: ["VERIFY:PARTIAL", "ERROR"],
    });

    return res.status(500).json(snapshot);
  }
});

export default router;