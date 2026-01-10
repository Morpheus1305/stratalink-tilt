// server/routes/poliEvidence.ts
/**
 * PoLi Evidence Debug / Explainability Endpoint
 *
 * GET /api/poli/evidence?token=BTC&venues=coinbase,binance
 * Optional:
 *  - &debug=1                 → includes bundlesMeta
 *  - &maxAgeMsTSLE=30000
 *  - &maxAgeMsDepth=60000
 *  - &maxAgeMsCrossVenue=60000
 *  - &maxAgeMsIntegrity=60000
 *  - &minOkVenues=2
 *  - &referenceVenue=coinbase
 *  - &stressVenue=binance
 *
 * Notes:
 * - Diagnostics endpoint; does NOT change PoLi scoring.
 * - Reads from in-memory buffers/state.
 */

import { Router } from "express";
import type { Request, Response } from "express";

// ✅ Canonical per-venue LiquidityState builder (matches /api/lis/state)
import { getLiquidityState } from "../services/getLiquidityState";

// ✅ Prefer DEFAULT import to avoid named-vs-default export mismatch issues
import lisStateToEvidenceBundle from "../services/lisToPoLiEvidence";

import { buildVenueEvidenceReport } from "../services/poliVenueEvidence";

// L3 + L4
import { buildCrossVenueEvidence } from "../services/poliCrossVenueEvidence";
import { buildMarketIntegrityEvidence } from "../services/poliMarketIntegrityEvidence";

const router = Router();

const DEFAULT_VENUES = ["coinbase", "binance", "kraken"] as const;

export type EvidenceLevel = "L0_NONE" | "L1_TSLE" | "L2_DEPTH" | "L3_DIVERGENCE" | "L4_INTEGRITY";

function parseVenuesParam(q: unknown): string[] {
  if (Array.isArray(q)) return q.map(String).map((v) => v.toLowerCase()).filter(Boolean);
  if (typeof q === "string" && q.trim().length) {
    return q
      .split(",")
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean);
  }
  return [];
}

function asNum(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

router.get("/", async (req: Request, res: Response) => {
  const token = String(req.query.token ?? "BTC").toUpperCase();
  const symbol = String(req.query.symbol ?? token).toUpperCase();

  const venuesParam = parseVenuesParam(req.query.venues);
  const venues = (venuesParam.length ? venuesParam : Array.from(DEFAULT_VENUES)).map((v) => v.toLowerCase());

  const debug = String(req.query.debug ?? "0") === "1";

  // Tuning knobs
  const maxAgeMsTSLE = asNum(req.query.maxAgeMsTSLE, 30_000);
  const maxAgeMsDepth = asNum(req.query.maxAgeMsDepth, 60_000);
  const minOkVenues = asNum(req.query.minOkVenues, 2);

  const maxAgeMsCrossVenue = asNum(req.query.maxAgeMsCrossVenue, 60_000);
  const referenceVenue = String(req.query.referenceVenue ?? venues[0] ?? "coinbase").toLowerCase();
  const stressVenue = String(req.query.stressVenue ?? venues[1] ?? "binance").toLowerCase();

  const maxAgeMsIntegrity = asNum(req.query.maxAgeMsIntegrity, 60_000);

  try {
    // -----------------------------
    // 1) Build evidence bundles per venue (via LiquidityState)
    // -----------------------------
    const bundles = venues.map((venue) => {
      // ✅ This is the critical fix: do NOT build state at top-level.
      const liquidityState = getLiquidityState(venue, symbol);

      // Standardize LIS → PoLi evidence bundle (blocks: TSLE_STATE, POLI_POINT, DEPTH_BANDS, etc.)
      const evidenceBundle: any = lisStateToEvidenceBundle(liquidityState);

      // Defensive normalization
      evidenceBundle.venue = evidenceBundle.venue ?? venue;
      evidenceBundle.symbol = evidenceBundle.symbol ?? symbol;
      evidenceBundle.timestamp = evidenceBundle.timestamp ?? Date.now();
      evidenceBundle.blocks = Array.isArray(evidenceBundle.blocks) ? evidenceBundle.blocks : [];

      return evidenceBundle;
    });

    // Debug meta: show block types and counts so we can verify TSLE_STATE / DEPTH_BANDS exist
    const bundlesMeta = bundles.map((b: any) => ({
      venue: b?.venue,
      symbol: b?.symbol,
      hasBlocks: Array.isArray(b?.blocks),
      blockCount: Array.isArray(b?.blocks) ? b.blocks.length : 0,
      blocks: Array.isArray(b?.blocks) ? b.blocks.map((x: any) => x?.type) : null,
    }));

    // -----------------------------
    // 2) Per-venue + base aggregate sufficiency (L2)
    // -----------------------------
    const report = buildVenueEvidenceReport({
      symbol,
      bundles,
      opts: {
        maxAgeMsTSLE,
        maxAgeMsDepth,
        requireDepthBands: ["pct_0.25", "pct_0.5"],
        minOkVenues,
      },
    });

    // -----------------------------
    // 3) L3 cross-venue divergence block (mounted under aggregate)
    // -----------------------------
    const crossVenue = buildCrossVenueEvidence({
      symbol,
      referenceVenue,
      stressVenue,
      maxAgeMs: maxAgeMsCrossVenue,
    });

    // -----------------------------
    // 4) L4 market integrity (per-venue) + aggregate integrity
    // -----------------------------
    const integrityByVenue = venues.map((venue) =>
      buildMarketIntegrityEvidence({
        venue,
        symbol,
        maxAgeMs: maxAgeMsIntegrity,
      })
    );

    // Simple L4 aggregate policy (Phase 1):
    // - ok iff at least minOkVenues have integrity.ok=true (computable)
    // - gatingOk iff ok AND all those venues have gatingOk=true
    const integrityOkVenues = integrityByVenue.filter((x) => x?.ok).map((x) => x.venue);
    const integrityOkCount = integrityOkVenues.length;

    const integrityAggregate = {
      ok: integrityOkCount >= minOkVenues,
      gatingOk: integrityOkCount >= minOkVenues && integrityByVenue.filter((x) => x?.ok).every((x) => x.gatingOk),
      minOkVenues,
      okVenues: integrityOkVenues,
      verdict:
        integrityOkCount < minOkVenues
          ? "INSUFFICIENT"
          : integrityByVenue.filter((x) => x?.ok).some((x) => x.verdict === "FAIL")
          ? "FAIL"
          : integrityByVenue.filter((x) => x?.ok).some((x) => x.verdict === "WARN")
          ? "WARN"
          : "PASS",
      reasons:
        integrityOkCount < minOkVenues
          ? [`L4 integrity insufficient: only ${integrityOkCount}/${minOkVenues} venues computable.`]
          : [],
      timestamp: Date.now(),
    };

    // -----------------------------
    // 5) FINAL aggregation override (clean end-of-aggregation patch)
    // -----------------------------
    const aggregate: any = {
      ...report.aggregate,
      crossVenue,
      integrity: {
        aggregate: integrityAggregate,
        perVenue: integrityByVenue,
      },
      overrides: [] as any[],
    };

    // L3 override: if crossVenue.gatingOk is false, aggregate must fail
    if (crossVenue && crossVenue.ok && crossVenue.gatingOk === false) {
      aggregate.ok = false;
      aggregate.overrides.push({
        applied: true,
        level: "L3_DIVERGENCE",
        note: "L3 gating blocked aggregate.ok",
        verdict: crossVenue.verdict,
        severity: crossVenue.severity,
        timestamp: Date.now(),
      });
    }

    // L4 override: require L4 computable + gatingOk=true to pass the ladder (Phase 1 policy)
    if (integrityAggregate.ok === false || integrityAggregate.gatingOk === false) {
      aggregate.ok = false;
      aggregate.overrides.push({
        applied: true,
        level: "L4_INTEGRITY",
        note: "L4 integrity insufficient or gating blocked aggregate.ok",
        verdict: integrityAggregate.verdict,
        timestamp: Date.now(),
      });

      // Make the “why” obvious even if upstream aggregate reasons were empty
      if (Array.isArray(aggregate.reasons)) {
        aggregate.reasons = Array.from(new Set([...(aggregate.reasons || []), ...(integrityAggregate.reasons || [])]));
      } else {
        aggregate.reasons = integrityAggregate.reasons || [];
      }
    }

    return res.json({
      token,
      symbol,
      venues: report.venues,
      ...(debug ? { bundlesMeta } : {}),
      timestamp: report.timestamp,
      aggregate,
    });
  } catch (err) {
    console.error("[POLI EVIDENCE] route error:", err);
    return res.status(500).json({
      ok: false,
      error: "PoLi evidence endpoint failed. See server logs.",
      token,
      symbol,
      venues: venuesParam,
      timestamp: Date.now(),
    });
  }
});

export default router;