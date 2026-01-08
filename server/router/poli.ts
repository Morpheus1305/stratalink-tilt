// server/routes/poli.ts
import { Router } from "express";
import type { Request, Response } from "express";
import {
  POLI_CONTRACT_VERSION,
  type PoLiSnapshot,
  type PoLiContext,
  type PoLiStatus,
  clampScore,
  poliRatingFromScore,
  riskBandFromScore,
  makeEmptyPoLiSnapshot,
  makePillar,
} from "../../shared/poli";

import { computeTSLE } from "../services/tsleCompute";

const router = Router();

/**
 * GET /api/poli/health
 * Simple health endpoint for contract verification.
 */
router.get("/health", (_req: Request, res: Response) => {
  return res.json({ ok: true, contract: POLI_CONTRACT_VERSION });
});

/**
 * GET /api/poli?token=BTC&venue=coinbase&scope=spot
 *
 * Contract-first endpoint:
 * - Always returns a PoLiSnapshot matching shared/poli.ts
 * - real path (mock=0) is now wired to TSLE compute
 * - mock mode for UI dev: ?mock=1
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const token = String(req.query.token ?? "BTC").toUpperCase();
    const venue = String(req.query.venue ?? "coinbase").toLowerCase();
    const symbol = req.query.symbol ? String(req.query.symbol) : token;
    const scope = (req.query.scope ? String(req.query.scope) : "spot") as PoLiContext["scope"];
    const mock = String(req.query.mock ?? "0") === "1";

    // -----------------------------
    // ✅ MOCK MODE
    // -----------------------------
    if (mock) {
      const score = clampScore(70 + Math.round((Math.random() - 0.5) * 10));
      const rating = poliRatingFromScore(score);
      const band = riskBandFromScore(score);

      const snapshot: PoLiSnapshot = {
        version: POLI_CONTRACT_VERSION,
        status: "ok" as PoLiStatus,
        context: { token, venue, symbol, scope, timestamp: Date.now() },

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
          }),
        },

        flags: [],
        summary: "Mock PoLi snapshot (contract-compliant).",
        verify: { source: "VERIFY_v3.0", locked: false, tags: ["VERIFY:PARTIAL"] },
      };

      return res.json(snapshot);
    }

    // -----------------------------
    // ✅ REAL PATH (wired to TSLE)
    // -----------------------------
    const tsle = await computeTSLE({
      token,
      venue,
      symbol,
      side: "buy",
      requestedSize: 100000, // default; later accept query param if you want
    });

    const status: PoLiStatus = tsle.evidence.sufficient ? "ok" : "insufficient";

    // For now: headline PoLi score == TSLE score (0..100)
    // Later: blend TSLE + LIS + cross-venue fragmentation + integrity.
    const headlineScore = clampScore(tsle.score);

    const snapshot: PoLiSnapshot = {
      version: POLI_CONTRACT_VERSION,
      status,
      context: { token, venue, symbol, scope, timestamp: Date.now() },

      score: headlineScore,
      rating: poliRatingFromScore(headlineScore),
      band: riskBandFromScore(headlineScore),

      delta: { score: 0, direction: "unknown" },

      confidence: {
        score: tsle.evidence.sufficient ? 0.7 : 0.2,
        rationale: tsle.evidence.sufficient ? "TSLE evidence present" : tsle.evidence.rationale,
      },

      pillars: {
        DEPTH: makePillar({
          id: "DEPTH",
          name: "Depth",
          score: headlineScore,
          confidence: {
            score: tsle.evidence.sufficient ? 0.7 : 0.2,
            rationale: tsle.evidence.sufficient ? "Computed from TSLE" : tsle.evidence.rationale,
          },
          drivers: [
            { metricId: "TSLE_EST_IMPACT_BPS", label: "Est. impact @ size", value: tsle.estImpactBps, unit: "bps" },
            { metricId: "TSLE_REGIME", label: "Regime", value: tsle.regime },
            { metricId: "TSLE_MAX_SIZE_25BPS", label: "Max size @ 25 bps", value: tsle.maxSizeAt25bps, unit: "USD" },
            { metricId: "TSLE_MAX_SIZE_50BPS", label: "Max size @ 50 bps", value: tsle.maxSizeAt50bps, unit: "USD" },
            { metricId: "TSLE_MAX_SIZE_100BPS", label: "Max size @ 100 bps", value: tsle.maxSizeAt100bps, unit: "USD" },
            { metricId: "TSLE_SOURCE", label: "Source", value: tsle.source },
          ],
          verifyTags: tsle.evidence.sufficient ? ["VERIFY:TSLE"] : ["VERIFY:PARTIAL"],
        }),
      },

      flags: [],

      summary:
        status === "ok"
          ? "PoLi computed from TSLE (Depth pillar wired)."
          : `PoLi scaffold live. TSLE not sufficient yet (${tsle.evidence.rationale}).`,

      verify: {
        source: "VERIFY_v3.0",
        locked: false,
        tags: status === "ok" ? ["VERIFY:TSLE"] : ["VERIFY:PARTIAL"],
      },
    };

    return res.json(snapshot);
  } catch (err) {
    console.error("[POLI] route error:", err);
    const snapshot = makeEmptyPoLiSnapshot({
      token: String(req.query.token ?? "BTC"),
      venue: String(req.query.venue ?? "coinbase"),
      status: "error",
      summary: "PoLi endpoint error. See server logs.",
    });
    return res.status(500).json(snapshot);
  }
});

export default router;