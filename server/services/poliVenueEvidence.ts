// server/services/poliVenueEvidence.ts
/**
 * PoLi Venue-by-Venue Evidence Report + Aggregate Ladder (L0→L3)
 *
 * This module takes standardized LIS→PoLi evidence bundles (per venue),
 * computes per-venue sufficiency + freshness, and produces an aggregate
 * evidence ladder status.
 *
 * IMPORTANT:
 * - L2 = single-venue depth sufficiency across N venues
 * - L3 = cross-venue divergence block
 * - L3 override semantics:
 *     if crossVenue.gatingOk === false  => aggregate.ok MUST be false
 */

import { buildCrossVenueEvidence, type CrossVenueEvidence } from "./poliCrossVenueEvidence";

type LadderLevel = "L0_NONE" | "L1_TSLE" | "L2_DEPTH" | "L3_DIVERGENCE";

type VenueEvidenceRow = {
  venue: string;
  ok: boolean;
  ladderLevel: LadderLevel;
  freshnessMs: {
    TSLE?: number | null;
    DEPTH?: number | null;
    POLI?: number | null;
  };
  depth: {
    pct_0_25?: number | null;
    pct_0_5?: number | null;
    sufficient: boolean;
  };
  tsle: {
    state?: string;
    confidence?: number;
    fresh: boolean;
  };
  reasons: string[];
  verifyTags: string[];
};

type EvidenceBundle = {
  venue?: string;
  symbol?: string;
  blocks?: any[];
};

export type VenueEvidenceReport = {
  symbol: string;
  venues: VenueEvidenceRow[];
  timestamp: number;
  aggregate: {
    ok: boolean;
    ladderLevel: LadderLevel;
    reasons: string[];
    okVenues: string[];
    requiredOkVenues: number;
    // optional L3
    crossVenue?: CrossVenueEvidence & {
      // allow extra fields without fighting TS
      [k: string]: any;
    };
  };
};

function nowMs() {
  return Date.now();
}

function normVenue(v: unknown) {
  return String(v ?? "").toLowerCase().trim();
}

function normSymbol(s: unknown) {
  return String(s ?? "").toUpperCase().trim();
}

function safeNum(x: any): number | null {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function getBlock(bundle: EvidenceBundle, type: string): any | null {
  const blocks = Array.isArray(bundle?.blocks) ? bundle.blocks : [];
  return blocks.find((b: any) => String(b?.type ?? b?.kind ?? "").toUpperCase() === type.toUpperCase()) ?? null;
}

function getBlockTs(block: any): number | null {
  // tolerate different shapes
  const ts =
    block?.ts ??
    block?.timestamp ??
    block?.t ??
    block?.meta?.ts ??
    block?.meta?.timestamp ??
    block?.payload?.ts ??
    block?.payload?.timestamp;

  const n = Number(ts);
  return Number.isFinite(n) ? n : null;
}

function getDepthFromBlock(depthBlock: any) {
  // tolerate different shapes
  const p = depthBlock?.payload ?? depthBlock?.data ?? depthBlock ?? {};
  const b025 =
    p?.pct_0_25?.total_notional ??
    p?.pct_0_25?.total ??
    p?.pct_0_25 ??
    p?.bands?.pct_0_25?.total_notional ??
    null;

  const b05 =
    p?.pct_0_5?.total_notional ??
    p?.pct_0_5?.total ??
    p?.pct_0_5 ??
    p?.bands?.pct_0_5?.total_notional ??
    null;

  return {
    pct_0_25: safeNum(b025),
    pct_0_5: safeNum(b05),
  };
}

function getTSLEFromBlock(tsleBlock: any) {
  const p = tsleBlock?.payload ?? tsleBlock?.data ?? tsleBlock ?? {};
  return {
    state: String(p?.state ?? p?.tsle_state ?? p?.tsleState ?? "UNKNOWN"),
    confidence: safeNum(p?.confidence ?? p?.conf ?? 0) ?? 0,
  };
}

export function buildVenueEvidenceReport(args: {
  symbol: string;
  bundles: EvidenceBundle[];
  opts: {
    maxAgeMsTSLE?: number; // default 30s
    maxAgeMsDepth?: number; // default 15s
    requireDepthBands?: Array<"pct_0.25" | "pct_0.5">; // default ["pct_0.25","pct_0.5"]
    minOkVenues?: number; // default 2

    // L3 (optional)
    maxAgeMsCrossVenue?: number; // default 60s
    referenceVenue?: string; // default "coinbase"
    stressVenue?: string; // default "binance"
  };
}): VenueEvidenceReport {
  const t = nowMs();

  const symbol = normSymbol(args.symbol || "BTC");
  const bundles = Array.isArray(args.bundles) ? args.bundles : [];

  const maxAgeMsTSLE = Number.isFinite(args.opts?.maxAgeMsTSLE) ? Number(args.opts.maxAgeMsTSLE) : 30_000;
  const maxAgeMsDepth = Number.isFinite(args.opts?.maxAgeMsDepth) ? Number(args.opts.maxAgeMsDepth) : 15_000;
  const minOkVenues = Number.isFinite(args.opts?.minOkVenues) ? Number(args.opts.minOkVenues) : 2;

  const requiredBands = args.opts?.requireDepthBands?.length
    ? args.opts.requireDepthBands
    : (["pct_0.25", "pct_0.5"] as const);

  const venues: VenueEvidenceRow[] = bundles.map((bundle) => {
    const venue = normVenue(bundle?.venue);
    const reasons: string[] = [];
    const verifyTags: string[] = [];

    // Pull blocks
    const tsleBlock = getBlock(bundle, "TSLE_STATE");
    const poliBlock = getBlock(bundle, "POLI_POINT");
    const depthBlock = getBlock(bundle, "DEPTH_BANDS");

    // Freshness
    const tsleAge = tsleBlock ? (t - (getBlockTs(tsleBlock) ?? t)) : null;
    const poliAge = poliBlock ? (t - (getBlockTs(poliBlock) ?? t)) : null;
    const depthAge = depthBlock ? (t - (getBlockTs(depthBlock) ?? t)) : null;

    // TSLE interpret
    const tsle = tsleBlock ? getTSLEFromBlock(tsleBlock) : { state: "UNKNOWN", confidence: 0 };
    const tsleFresh = tsleAge !== null ? tsleAge <= maxAgeMsTSLE : false;

    // Depth interpret
    const depthVals = depthBlock ? getDepthFromBlock(depthBlock) : { pct_0_25: null, pct_0_5: null };

    const has025 = depthVals.pct_0_25 !== null && depthVals.pct_0_25 > 0;
    const has05 = depthVals.pct_0_5 !== null && depthVals.pct_0_5 > 0;

    // Required bands present?
    const require025 = requiredBands.includes("pct_0.25");
    const require05 = requiredBands.includes("pct_0.5");
    const depthSufficient = (!require025 || has025) && (!require05 || has05);

    // Freshness gating on depth
    const depthFresh = depthAge !== null ? depthAge <= maxAgeMsDepth : false;

    // Ladder logic per venue
    let ladderLevel: LadderLevel = "L0_NONE";
    let ok = false;

    // L0: must have a venue + blocks
    if (!venue) {
      reasons.push("Missing venue on evidence bundle.");
      verifyTags.push("VERIFY_INSUFFICIENT");
      return {
        venue: venue || "unknown",
        ok: false,
        ladderLevel,
        freshnessMs: { TSLE: tsleAge, DEPTH: depthAge, POLI: poliAge },
        depth: { ...depthVals, sufficient: false },
        tsle: { ...tsle, fresh: false },
        reasons,
        verifyTags,
      };
    }

    // L1: TSLE must exist and be fresh
    if (!tsleBlock) {
      ladderLevel = "L0_NONE";
      reasons.push("Missing TSLE evidence.");
      verifyTags.push("VERIFY_INSUFFICIENT");
      return {
        venue,
        ok: false,
        ladderLevel,
        freshnessMs: { TSLE: tsleAge, DEPTH: depthAge, POLI: poliAge },
        depth: { ...depthVals, sufficient: false },
        tsle: { ...tsle, fresh: false },
        reasons,
        verifyTags,
      };
    }

    if (!tsleFresh) {
      ladderLevel = "L1_TSLE";
      reasons.push(`TSLE evidence stale (${tsleAge}ms).`);
      verifyTags.push("VERIFY_STALE");
      return {
        venue,
        ok: false,
        ladderLevel,
        freshnessMs: { TSLE: tsleAge, DEPTH: depthAge, POLI: poliAge },
        depth: { ...depthVals, sufficient: false },
        tsle: { ...tsle, fresh: false },
        reasons,
        verifyTags,
      };
    }

    // If we are here, L1 passed
    ladderLevel = "L1_TSLE";

    // L2: depth must exist, be fresh, and sufficient
    if (!depthBlock) {
      reasons.push("Missing Depth evidence.");
      verifyTags.push("VERIFY_INSUFFICIENT");
      return {
        venue,
        ok: false,
        ladderLevel: "L1_TSLE",
        freshnessMs: { TSLE: tsleAge, DEPTH: depthAge, POLI: poliAge },
        depth: { ...depthVals, sufficient: false },
        tsle: { ...tsle, fresh: true },
        reasons,
        verifyTags,
      };
    }

    if (!depthFresh) {
      reasons.push(`Depth evidence stale (${depthAge}ms).`);
      verifyTags.push("VERIFY_STALE");
      return {
        venue,
        ok: false,
        ladderLevel: "L2_DEPTH",
        freshnessMs: { TSLE: tsleAge, DEPTH: depthAge, POLI: poliAge },
        depth: { ...depthVals, sufficient: depthSufficient },
        tsle: { ...tsle, fresh: true },
        reasons,
        verifyTags,
      };
    }

    if (!depthSufficient) {
      reasons.push("Depth evidence insufficient (missing required bands).");
      verifyTags.push("VERIFY_INSUFFICIENT");
      return {
        venue,
        ok: false,
        ladderLevel: "L2_DEPTH",
        freshnessMs: { TSLE: tsleAge, DEPTH: depthAge, POLI: poliAge },
        depth: { ...depthVals, sufficient: false },
        tsle: { ...tsle, fresh: true },
        reasons,
        verifyTags,
      };
    }

    // Venue passes L2
    ok = true;
    ladderLevel = "L2_DEPTH";
    verifyTags.push("VERIFY_OK");

    return {
      venue,
      ok,
      ladderLevel,
      freshnessMs: { TSLE: tsleAge, DEPTH: depthAge, POLI: poliAge },
      depth: { ...depthVals, sufficient: true },
      tsle: { ...tsle, fresh: true },
      reasons,
      verifyTags,
    };
  });

  const okVenues = venues.filter((v) => v.ok).map((v) => v.venue);
  const aggregateReasons: string[] = [];

  // Aggregate baseline (L2)
  let aggregateOk = okVenues.length >= minOkVenues;
  let aggregateLevel: LadderLevel = aggregateOk ? "L2_DEPTH" : "L0_NONE";

  if (!aggregateOk) {
    aggregateReasons.push(`Only ${okVenues.length} venue(s) meet evidence sufficiency; require ${minOkVenues}.`);
    for (const v of venues) {
      if (!v.ok) aggregateReasons.push(`${v.venue}: ${v.reasons[0] ?? "Insufficient evidence."}`);
    }
  }

  // Build L3 cross-venue block if requested (we compute it regardless of L2 ok  -  it’s diagnostic)
  const referenceVenue = normVenue(args.opts?.referenceVenue || "coinbase") || "coinbase";
  const stressVenue = normVenue(args.opts?.stressVenue || "binance") || "binance";
  const maxAgeMsCrossVenue = Number.isFinite(args.opts?.maxAgeMsCrossVenue) ? Number(args.opts.maxAgeMsCrossVenue) : 60_000;

  const crossVenue = buildCrossVenueEvidence({
    symbol,
    referenceVenue,
    stressVenue,
    maxAgeMs: maxAgeMsCrossVenue,
  });

  // If we have cross-venue evidence, overall ladder is at least L3 (even if failing)
  aggregateLevel = "L3_DIVERGENCE";

  // -------------------------------
  // ✅ L3 OVERRIDE (THE IMPORTANT BIT)
  // -------------------------------
  // If L3 says "do not gate", aggregate.ok MUST be false.
  if ((crossVenue as any)?.gatingOk === false) {
    aggregateOk = false;

    // Preserve ladderLevel at L3 (we failed at L3, not L2)
    aggregateLevel = "L3_DIVERGENCE";

    // Merge reasons so it’s visible at aggregate
    const l3Reasons = Array.isArray(crossVenue.reasons) ? crossVenue.reasons : [];
    for (const r of l3Reasons) aggregateReasons.push(r);

    // If you want: ensure we always have a leading reason
    if (!l3Reasons.length) aggregateReasons.push("L3 cross-venue gating failed.");
  }

  return {
    symbol,
    venues,
    timestamp: t,
    aggregate: {
      ok: aggregateOk,
      ladderLevel: aggregateLevel,
      reasons: aggregateReasons,
      okVenues,
      requiredOkVenues: minOkVenues,
      crossVenue,
    },
  };
}