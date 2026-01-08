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
} from "../../shared/poli";

const router = Router();
router.get("/health", (_req, res) => {
  return res.json({ ok: true, contract: POLI_CONTRACT_VERSION });
});

/**
 * GET /api/poli?token=BTC&venue=coinbase&scope=spot
 *
 * Contract-first endpoint:
 * - Always returns a PoLiSnapshot matching shared/poli.ts
 * - Initially returns "empty but valid" snapshot until TSLE wiring is complete
 * - Optional mock mode for UI dev: ?mock=1
 */
router.get("/", (req: Request, res: Response) => {
  try {
    console.log("[POLI] HIT /api/poli", req.query);

    const token = String(req.query.token ?? "BTC").toUpperCase();
    const venue = String(req.query.venue ?? "coinbase").toLowerCase();
    const symbol = req.query.symbol ? String(req.query.symbol) : token;

    const scope = (req.query.scope
      ? String(req.query.scope)
      : "spot") as PoLiContext["scope"];

    const mock = String(req.query.mock ?? "0") === "1";

    // ✅ Phase 1: return valid snapshot (empty or mock)
    if (!mock) {
      const snapshot = makeEmptyPoLiSnapshot({
        token,
        venue,
        symbol,
        scope,
        status: "insufficient",
        summary: "PoLi scaffold live. Waiting for TSLE/LIS wiring.",
      });

      return res.json(snapshot);
    }

    // ✅ Mock mode (UI development only) — still contract-compliant
    const score = clampScore(70 + Math.round((Math.random() - 0.5) * 10));
    const rating = poliRatingFromScore(score);
    const band = riskBandFromScore(score);

    const snapshot: PoLiSnapshot = {
      version: POLI_CONTRACT_VERSION,
      status: "ok" as PoLiStatus,
      context: {
        token,
        venue,
        symbol,
        scope,
        timestamp: Date.now(),
      },
      score,
      rating,
      band,
      delta: {
        score: Math.round((Math.random() - 0.5) * 6),
        direction: "unknown",
      },
      confidence: { score: 0.6, rationale: "Mock mode" },
      pillars: {
        DEPTH: {
          id: "DEPTH",
          name: "Depth",
          score: clampScore(score + 3),
          rating: poliRatingFromScore(clampScore(score + 3)),
          band: riskBandFromScore(clampScore(score + 3)),
          confidence: { score: 0.6, rationale: "Mock mode" },
          drivers: [
            {
              metricId: "DEPTH_USD_25BPS",
              label: "Depth @ 25 bps",
              value: 9.4,
              unit: "m",
              direction: "flat",
            },
            { metricId: "SPREAD_BPS", label: "Spread", value: 1.2, unit: "bps", direction: "flat" },
          ],
          flags: [],
          verify: { source: "VERIFY_v3.0", locked: false, tags: ["VERIFY:PARTIAL"] },
        },
        RESILIENCE: {
          id: "RESILIENCE",
          name: "Resilience",
          score: clampScore(score - 2),
          rating: poliRatingFromScore(clampScore(score - 2)),
          band: riskBandFromScore(clampScore(score - 2)),
          confidence: { score: 0.55, rationale: "Mock mode" },
          drivers: [{ metricId: "SPREAD_STABILITY", label: "Spread stability", value: 0.7, unit: "idx" }],
          flags: [],
          verify: { source: "VERIFY_v3.0", locked: false, tags: ["VERIFY:PARTIAL"] },
        },
        CONTINUITY: {
          id: "CONTINUITY",
          name: "Continuity",
          score: clampScore(score + 1),
          rating: poliRatingFromScore(clampScore(score + 1)),
          band: riskBandFromScore(clampScore(score + 1)),
          confidence: { score: 0.7, rationale: "Mock mode" },
          drivers: [{ metricId: "FEED_HEALTH", label: "Feed health", value: "OK" }],
          flags: [],
          verify: { source: "VERIFY_v3.0", locked: false, tags: ["VERIFY:PARTIAL"] },
        },
        FRAGMENTATION: {
          id: "FRAGMENTATION",
          name: "Fragmentation",
          score: clampScore(score - 4),
          rating: poliRatingFromScore(clampScore(score - 4)),
          band: riskBandFromScore(clampScore(score - 4)),
          confidence: { score: 0.5, rationale: "Mock mode" },
          drivers: [{ metricId: "CROSS_VENUE_DIVERGENCE", label: "Cross-venue divergence", value: 32, unit: "%" }],
          flags: [],
          verify: { source: "VERIFY_v3.0", locked: false, tags: ["VERIFY:PARTIAL"] },
        },
        INTEGRITY: {
          id: "INTEGRITY",
          name: "Integrity",
          score: clampScore(score - 1),
          rating: poliRatingFromScore(clampScore(score - 1)),
          band: riskBandFromScore(clampScore(score - 1)),
          confidence: { score: 0.45, rationale: "Mock mode" },
          drivers: [{ metricId: "WASH_TRADING_RISK", label: "Wash trading risk", value: 0.2, unit: "idx" }],
          flags: [],
          verify: { source: "VERIFY_v3.0", locked: false, tags: ["VERIFY:PARTIAL"] },
        },
      },
      flags: [],
      summary: "Mock PoLi snapshot (contract-compliant).",
      verify: { source: "VERIFY_v3.0", locked: false, tags: ["VERIFY:PARTIAL"] },
    };

    return res.json(snapshot);
  } catch (err) {
    console.error("PoLi route error:", err);
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