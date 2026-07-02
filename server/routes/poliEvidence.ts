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
 * - Mounts L3 cross-venue divergence evidence (if wired in poliVenueEvidence)
 * - ✅ Mounts L4 market integrity evidence + applies aggregate gating override
 *
 * Notes:
 * - Diagnostics endpoint; does NOT change PoLi scoring.
 * - Safe to call frequently (reads from in-memory buffers/state).
 */

import { Router } from "express";
import type { Request, Response } from "express";

// ✅ Prefer DEFAULT import to avoid named-vs-default export mismatch issues
import lisStateToEvidenceBundle from "../services/lisToPoLiEvidence";

import { buildVenueEvidenceReport } from "../services/poliVenueEvidence";

// ✅ Canonical LiquidityState getter (includes latest TSLE point)
import { getLiquidityState } from "../services/getLiquidityState";

// ✅ L4 Market Integrity (Phase 1)
import {
  buildMarketIntegrityEvidence,
  type MarketIntegrityEvidence,
} from "../services/poliMarketIntegrityEvidence";

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

function safeNum(x: unknown, fallback: number): number {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

router.get("/", async (req: Request, res: Response) => {
  const token = String(req.query.token ?? "BTC").toUpperCase();
  const symbol = String(req.query.symbol ?? token).toUpperCase();

  const venuesParam = parseVenuesParam(req.query.venues);
  const venues = (venuesParam.length ? venuesParam : DEFAULT_VENUES).map((v) => v.toLowerCase());

  const debug = String(req.query.debug ?? "0") === "1";

  // Optional tuning knobs (L2/L3 aggregation)
  const maxAgeMsTSLE = safeNum(req.query.maxAgeMsTSLE, 30_000);
  const maxAgeMsDepth = safeNum(req.query.maxAgeMsDepth, 15_000);
  const minOkVenues = safeNum(req.query.minOkVenues, 2);

  // L4 knobs
  const maxAgeMsIntegrity = safeNum(req.query.maxAgeMsIntegrity, 60_000);
  const integrityWindowPoints = safeNum(req.query.integrityWindowPoints, 12);
  const integrityMinPoints = safeNum(req.query.integrityMinPoints, 3);

  try {
    // -----------------------------
    // Build evidence bundles per venue (L1/L2/L3)
    // -----------------------------
    const bundles = venues.map((venue) => {
      // 🔧 Canonical LiquidityState matches /api/lis/state (includes latest TSLE point)
      const liquidityState = getLiquidityState(venue, symbol);

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

    const report: any = buildVenueEvidenceReport({
      symbol,
      bundles,
      opts: {
        maxAgeMsTSLE: Number.isFinite(maxAgeMsTSLE) ? maxAgeMsTSLE : 30_000,
        maxAgeMsDepth: Number.isFinite(maxAgeMsDepth) ? maxAgeMsDepth : 15_000,
        requireDepthBands: ["pct_0.25", "pct_0.5"],
        minOkVenues: Number.isFinite(minOkVenues) ? minOkVenues : 2,
      },
    });

    // -----------------------------
    // ✅ L4: Market Integrity Evidence (per venue) + aggregate override
    // -----------------------------
    const l4PerVenue: MarketIntegrityEvidence[] = venues.map((venue) =>
      buildMarketIntegrityEvidence({
        venue,
        symbol,
        maxAgeMs: maxAgeMsIntegrity,
        windowPoints: integrityWindowPoints,
        minPoints: integrityMinPoints,
        // Phase 1: conservative gating defaults (can tune via query params later if needed)
        policy: {
          failOn: "HIGH",
          minFailConfidence: 0.65,
        },
      })
    );

    const l4OkCount = l4PerVenue.filter((e) => e?.ok).length;
    const l4GatingOkCount = l4PerVenue.filter((e) => e?.gatingOk).length;

    // Aggregate policy:
    // - We consider L4 "computable" if at least minOkVenues are ok (fresh + sufficient TSLE points).
    // - We consider L4 "passing" if at least minOkVenues are gatingOk.
    const l4Aggregate = {
      ok: l4OkCount >= minOkVenues,
      gatingOk: l4GatingOkCount >= minOkVenues,
      minOkVenues,
      okVenues: l4OkCount,
      gatingOkVenues: l4GatingOkCount,
      verdict:
        l4GatingOkCount >= minOkVenues
          ? "PASS"
          : l4OkCount >= minOkVenues
          ? "FAIL"
          : "INSUFFICIENT",
      reasons: [] as string[],
      timestamp: Date.now(),
    };

    if (!l4Aggregate.ok) {
      l4Aggregate.reasons.push(
        `L4 integrity insufficient: only ${l4OkCount}/${venues.length} venues have fresh/sufficient evidence (minOkVenues=${minOkVenues}).`
      );
    }
    if (l4Aggregate.ok && !l4Aggregate.gatingOk) {
      l4Aggregate.reasons.push(
        `L4 integrity gating failed: only ${l4GatingOkCount}/${venues.length} venues are gatingOk (minOkVenues=${minOkVenues}).`
      );
    }

    // ✅ Aggregate override: if L4 fails gating, force overall ok/gatingOk false.
    // (We keep the original report as-is, but apply a final override at the end.)
    const originalOk = Boolean(report?.ok ?? true);
    const originalGatingOk = Boolean(report?.gatingOk ?? report?.ok ?? true);

    const finalOk = originalOk && l4Aggregate.ok && l4Aggregate.gatingOk;
    const finalGatingOk = originalGatingOk && l4Aggregate.ok && l4Aggregate.gatingOk;

    report.ok = finalOk;
    report.gatingOk = finalGatingOk;

    // Provide a clear machine-readable “final override” descriptor
    report.overrides = {
      ...(report.overrides ?? {}),
      L4_INTEGRITY: {
        applied: l4Aggregate.ok && !l4Aggregate.gatingOk,
        note:
          l4Aggregate.ok && !l4Aggregate.gatingOk
            ? "L4 integrity computed but failed gating; overriding aggregate ok/gatingOk."
            : !l4Aggregate.ok
            ? "L4 integrity insufficient; aggregate ok/gatingOk require L4 computable + pass."
            : "L4 integrity passed.",
        l4Aggregate,
      },
    };

    // -----------------------------
    // Response
    // -----------------------------
    return res.json({
      token,
      symbol,
      venues,

      // Existing debug view
      ...(debug ? { bundlesMeta } : {}),

      // Existing venue evidence report (L0 - L3 aggregation)
      ...report,

      // ✅ L4 output mounted explicitly (per-venue + aggregate)
      L4: {
        type: "MARKET_INTEGRITY",
        perVenue: l4PerVenue,
        aggregate: l4Aggregate,
      },
    });
  } catch (err) {
    console.error("[POLI EVIDENCE] route error:", err);
    return res.status(500).json({
      ok: false,
      gatingOk: false,
      error: "PoLi evidence endpoint failed. See server logs.",
      token,
      symbol,
      venues,
      timestamp: Date.now(),
    });
  }
});

export default router;