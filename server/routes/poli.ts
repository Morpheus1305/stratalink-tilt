// server/routes/poli.ts
/**
 * PoLi Phase 1 → Phase 2 (LIS-gated) implementation
 * Spec: docs/poli/PHASE_1.md (+ Phase 2 gating)
 *
 * Rules:
 * - status flips to "ok" ONLY when LIS/TSLE evidence is live + sufficient (Evidence Ladder)
 * - otherwise return contract-compliant "insufficient" (not an error)
 */
import { Router } from "express";
import type { Request, Response } from "express";

import {
  POLI_CONTRACT_VERSION,
  type PoLiSnapshot,
  type PoLiContext,
  clampScore,
  poliRatingFromScore,
  riskBandFromScore,
  makeEmptyPoLiSnapshot,
  makeDefaultVerify,
  makePillar,
} from "../../shared/poli";

/**
 * ✅ Step 1: Use extracted composer (single source of truth for PoLi-from-TSLE mapping)
 */
import composePoLiFromTSLE from "../PoLi/composePoLiFromTSLE";

/**
 * ✅ Real TSLE compute (direct call, no internal HTTP)
 */
import { computeTSLE } from "../services/tsleCompute";

/**
 * ✅ LIS canonical state builder pieces (reused from /api/lis/state logic)
 */
import { tsleBuffer, tsleStateEngine, buildLiquidityState } from "../services/tsle-buffer";

/**
 * ✅ Phase 2: LIS → PoLi evidence standardization + evidence ladder gate
 */
import { lisStateToEvidenceBundle } from "../services/lisToPoLiEvidence";
import { evaluateEvidenceLadder } from "../services/poliEvidenceGate";

const router = Router();

/**
 * Health endpoint for contract verification.
 * GET /api/poli/health
 */
router.get("/health", (_req: Request, res: Response) => {
  return res.json({ ok: true, contract: POLI_CONTRACT_VERSION });
});

/**
 * GET /api/poli?token=BTC&venue=coinbase&scope=spot&mock=1
 *
 * Contract-first endpoint:
 * - Always returns a PoLiSnapshot matching shared/poli.ts
 * - "insufficient" is a valid state (not an error)
 * - mock mode for UI dev: ?mock=1
 */
router.get("/", async (req: Request, res: Response) => {
  // Define these up-front so the catch block can always reference them.
  const token = String(req.query.token ?? "BTC").toUpperCase();
  const venue = String(req.query.venue ?? "coinbase").toLowerCase();
  const symbol = req.query.symbol ? String(req.query.symbol) : token;
  const scope = (req.query.scope ? String(req.query.scope) : "spot") as PoLiContext["scope"];
  const mock = String(req.query.mock ?? "0") === "1";

  try {
    // Normalized contract context
    const context: PoLiContext = {
      token,
      venue,
      symbol,
      scope,
      timestamp: Date.now(),
    };

    // -----------------------------
    // ✅ MOCK MODE (UI dev only)
    // -----------------------------
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

    // -----------------------------------------
    // ✅ REAL MODE: compute TSLE + build LIS state
    // -----------------------------------------
    const side = ((req.query.side as string | undefined) ?? "buy") as "buy" | "sell";
    const requestedSize = req.query.size ? Number(req.query.size) : undefined;

    // 1) Compute TSLE (pricing/microstructure view used for scoring)
    const tsle = await computeTSLE({
      token,
      venue,
      symbol,
      side,
      requestedSize,
    });

    // 2) Build canonical LIS LiquidityState (evidence source-of-truth)
    // NOTE: This mirrors /api/lis/state but does not use internal HTTP.
    const buffer = tsleBuffer.getHistory(venue, symbol);
    const stateSnapshot = tsleStateEngine.getState(venue, symbol);
    const trend = tsleBuffer.getTrend(venue, symbol);
    const signals = tsleBuffer.getSignals(venue, symbol);

    const liquidityState = buildLiquidityState(
      venue,
      symbol,
      buffer,
      stateSnapshot,
      trend,
      signals
    );

    // 3) Standardize LIS → PoLi evidence bundle
    const evidenceBundle = lisStateToEvidenceBundle(liquidityState);

    // 4) Evidence ladder gating (Phase 2)
    const gate = evaluateEvidenceLadder(evidenceBundle, {
      maxAgeMsTSLE: 30_000,
      maxAgeMsDepth: 15_000,
      requireDepthBands: ["pct_0.25", "pct_0.5"],
    });

    const mergedVerifyTags = Array.from(
      new Set([
        ...(gate.verifyTags ?? []),
        "SOURCE:LIS",
        "SOURCE:TSLE",
      ])
    );

    // If TSLE compute fails, keep contract compliant
    // (Even if LIS evidence exists, we treat scoring as unavailable.)
    if (!tsle?.ok) {
      const snapshot = makeEmptyPoLiSnapshot({
        token,
        venue,
        symbol,
        scope,
        status: "insufficient",
        summary:
          gate?.reasons?.length
            ? `PoLi scaffold live. Evidence gate not satisfied: ${gate.reasons.join(" ")}`
            : "PoLi scaffold live. Waiting for sufficient LIS/TSLE evidence.",
        verifyTags: mergedVerifyTags.length ? mergedVerifyTags : ["VERIFY:PARTIAL", "SOURCE:TSLE", "SOURCE:LIS"],
      });
      return res.json(snapshot);
    }

    /**
     * ✅ Compose snapshot from TSLE (single source of truth for scoring/pillars)
     */
    const snapshotFromTSLE = composePoLiFromTSLE({ context, tsle });

    /**
     * ✅ Phase 2 gate: override status + verify to enforce evidence ladder
     * - even if composePoLiFromTSLE returns "ok", we only allow "ok" when gate.ok === true
     */
    const gatedStatus: PoLiSnapshot["status"] = gate?.ok ? "ok" : "insufficient";

    const snapshot: PoLiSnapshot = {
      ...snapshotFromTSLE,
      status: gatedStatus,
      // Keep the existing verify structure, but replace tags with merged tags (contract-safe)
      verify: makeDefaultVerify(
        Array.from(
          new Set([
            ...(snapshotFromTSLE.verify?.tags ?? []),
            ...mergedVerifyTags,
            ...(gatedStatus === "ok" ? ["VERIFY:OK"] : ["VERIFY:INSUFFICIENT"]),
          ])
        )
      ),
      // Optional: tighten summary messaging
      summary:
        gatedStatus === "ok"
          ? snapshotFromTSLE.summary
          : gate?.reasons?.length
            ? `Insufficient evidence for PoLi OK-status: ${gate.reasons.join(" ")}`
            : snapshotFromTSLE.summary,
    };

    return res.json(snapshot);
  } catch (err) {
    console.error("[POLI] route error:", err);

    const snapshot = makeEmptyPoLiSnapshot({
      token,
      venue,
      symbol,
      scope,
      status: "error",
      summary: "PoLi endpoint error. See server logs.",
      verifyTags: ["VERIFY:PARTIAL", "ERROR"],
    });

    return res.status(500).json(snapshot);
  }
});

export default router;