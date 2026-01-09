// server/routes/poli.ts
/**
 * PoLi Phase 1 implementation
 * Spec: docs/poli/PHASE_1.md
 *
 * Rules:
 * - status flips to "ok" ONLY when TSLE evidence is live + sufficient
 * - otherwise return contract-compliant "insufficient"
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
    // ✅ REAL MODE (Phase 1): direct TSLE compute
    // -----------------------------------------
    const side = ((req.query.side as string | undefined) ?? "buy") as "buy" | "sell";
    const requestedSize = req.query.size ? Number(req.query.size) : undefined;

    const tsle = await computeTSLE({
      token,
      venue,
      symbol,
      side,
      requestedSize,
    });

    // If TSLE compute fails, keep contract compliant
    if (!tsle?.ok) {
      const snapshot = makeEmptyPoLiSnapshot({
        token,
        venue,
        symbol,
        scope,
        status: "insufficient",
        summary: "PoLi scaffold live. Waiting for sufficient TSLE/LIS evidence.",
        verifyTags: ["VERIFY:PARTIAL", "SOURCE:TSLE"],
      });
      return res.json(snapshot);
    }

    /**
     * ✅ Step 2: Use extracted composePoLiFromTSLE() as the ONLY path
     * (this is where the evidence-gated flip happens)
     */
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