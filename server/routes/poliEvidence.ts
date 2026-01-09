// server/routes/poliEvidence.ts
/**
 * PoLi Evidence Debug / Explainability Endpoint
 *
 * GET /api/poli/evidence?token=BTC&venues=coinbase,binance,kraken
 * Optional: &debug=1  → includes bundlesMeta (block types per venue)
 *
 * - Builds LIS LiquidityState per venue (same canonical builder as /api/lis/state)
 * - Standardizes LIS → PoLi evidence bundles
 * - Produces a venue-by-venue evidence breakdown + aggregate sufficiency report
 *
 * Notes:
 * - Diagnostics endpoint; does NOT change PoLi scoring.
 * - Safe to call frequently (reads from in-memory buffers/state).
 */

import { Router } from "express";
import type { Request, Response } from "express";

import { tsleBuffer, tsleStateEngine, buildLiquidityState } from "../services/tsle-buffer";

// ✅ Prefer DEFAULT import to avoid named-vs-default export mismatch issues
import lisStateToEvidenceBundle from "../services/lisToPoLiEvidence";

import { buildVenueEvidenceReport } from "../services/poliVenueEvidence";

const router = Router();

const DEFAULT_VENUES = ["coinbase", "binance", "kraken"];

/**
 * Parse venues query param:
 * - venues=coinbase,binance
 * - venues=coinbase&venues=binance (rare)
 */
function parseVenuesParam(q: unknown): string[] {
  if (Array.isArray(q)) {
    return q.map(String).map((v) => v.toLowerCase()).filter(Boolean);
  }
  if (typeof q === "string" && q.trim().length) {
    return q
      .split(",")
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean);
  }
  return [];
}

router.get("/", async (req: Request, res: Response) => {
  const token = String(req.query.token ?? "BTC").toUpperCase();
  const symbol = String(req.query.symbol ?? token).toUpperCase();

  const venuesParam = parseVenuesParam(req.query.venues);
  const venues = (venuesParam.length ? venuesParam : DEFAULT_VENUES).map((v) => v.toLowerCase());

  const debug = String(req.query.debug ?? "0") === "1";

  // Optional tuning knobs
  const maxAgeMsTSLE = req.query.maxAgeMsTSLE ? Number(req.query.maxAgeMsTSLE) : 30_000;
  const maxAgeMsDepth = req.query.maxAgeMsDepth ? Number(req.query.maxAgeMsDepth) : 15_000;
  const minOkVenues = req.query.minOkVenues ? Number(req.query.minOkVenues) : 2;

  try {
    // Build evidence bundles per venue
    const bundles = venues.map((venue) => {
      const buffer = tsleBuffer.getHistory(venue, symbol);
      const stateSnapshot = tsleStateEngine.getState(venue, symbol);
      const trend = tsleBuffer.getTrend(venue, symbol);
      const signals = tsleBuffer.getSignals(venue, symbol);

      const liquidityState = buildLiquidityState(venue, symbol, buffer, stateSnapshot, trend, signals);

      // Standardize LIS → PoLi evidence bundle
      const evidenceBundle: any = lisStateToEvidenceBundle(liquidityState);

      // Ensure venue/symbol fields are set predictably (defensive)
      evidenceBundle.venue = evidenceBundle.venue ?? venue;
      evidenceBundle.symbol = evidenceBundle.symbol ?? symbol;

      return evidenceBundle;
    });

    // Debug meta: show block types and counts so we can verify TSLE_STATE exists
    const bundlesMeta = bundles.map((b: any) => ({
      venue: b?.venue,
      symbol: b?.symbol,
      hasBlocks: Array.isArray(b?.blocks),
      blockCount: Array.isArray(b?.blocks) ? b.blocks.length : 0,
      blocks: Array.isArray(b?.blocks) ? b.blocks.map((x: any) => x?.type) : null,
    }));

    const report = buildVenueEvidenceReport({
      symbol,
      bundles,
      opts: {
        maxAgeMsTSLE: Number.isFinite(maxAgeMsTSLE) ? maxAgeMsTSLE : 30_000,
        maxAgeMsDepth: Number.isFinite(maxAgeMsDepth) ? maxAgeMsDepth : 15_000,
        requireDepthBands: ["pct_0.25", "pct_0.5"],
        minOkVenues: Number.isFinite(minOkVenues) ? minOkVenues : 2,
      },
    });

    return res.json({
      token,
      symbol,
      venues,
      ...(debug ? { bundlesMeta } : {}),
      ...report,
    });
  } catch (err) {
    console.error("[POLI EVIDENCE] route error:", err);
    return res.status(500).json({
      ok: false,
      error: "PoLi evidence endpoint failed. See server logs.",
      token,
      symbol,
      venues,
      timestamp: Date.now(),
    });
  }
});

export default router;