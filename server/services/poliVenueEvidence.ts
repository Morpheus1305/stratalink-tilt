// server/services/poliVenueEvidence.ts
/**
 * Venue-by-venue PoLi evidence breakdown (Phase 2 visibility layer)
 *
 * Purpose:
 * - Take one or more PoLiEvidenceBundle objects (typically one per venue)
 * - Evaluate the Evidence Ladder per venue (freshness + sufficiency)
 * - Return an aggregate report for UI / debugging / institutional explainability
 *
 * Notes:
 * - This module is deliberately defensive: it tolerates missing fields and mixed payload shapes.
 * - It does NOT fetch data. It only evaluates already-built evidence bundles.
 */

import { evaluateEvidenceLadder } from "./poliEvidenceGate";

/** ---------- Types (kept local to avoid tight coupling) ---------- */

export type EvidenceLevel =
  | "L0_NONE"
  | "L1_TSLE"
  | "L2_DEPTH"
  | "L3_CROSS_VENUE"
  | "L4_SUSTAINED";

export type VenueEvidenceStatus = {
  venue: string;
  ok: boolean;
  ladderLevel: EvidenceLevel;

  freshnessMs: {
    TSLE?: number;
    DEPTH?: number;
    POLI?: number;
    DIVERGENCE?: number;
  };

  depth: {
    pct_0_25?: number; // total notional at 25bps
    pct_0_5?: number;  // total notional at 50bps
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

export type VenueEvidenceReport = {
  symbol: string;
  timestamp: number;
  venues: VenueEvidenceStatus[];
  aggregate: {
    ok: boolean;
    ladderLevel: EvidenceLevel;
    reasons: string[];
    okVenues: string[];
    requiredOkVenues: number;
  };
};

export type VenueEvidenceGateOpts = {
  /** Freshness thresholds used by evaluateEvidenceLadder */
  maxAgeMsTSLE?: number;
  maxAgeMsDepth?: number;

  /**
   * Required depth bands in the evidence payload (keys you map in lisStateToEvidenceBundle)
   * Default aligns with your current LIS → PoLi mapping (pct_0.25, pct_0.5).
   */
  requireDepthBands?: Array<"pct_0.25" | "pct_0.5">;

  /** Aggregate requirement: how many venues must individually pass the ladder to call aggregate ok */
  minOkVenues?: number;
};

type AnyEvidenceBlock = {
  type?: string;
  venue?: string;
  symbol?: string;
  ts?: number;
  quality?: number;
  payload?: any;
  venuePair?: string;
};

/** ---------- Helpers ---------- */

const LEVEL_RANK: Record<EvidenceLevel, number> = {
  L0_NONE: 0,
  L1_TSLE: 1,
  L2_DEPTH: 2,
  L3_CROSS_VENUE: 3,
  L4_SUSTAINED: 4,
};

function toLevel(x: any): EvidenceLevel {
  const s = String(x ?? "").toUpperCase();
  if (s.includes("L4")) return "L4_SUSTAINED";
  if (s.includes("L3")) return "L3_CROSS_VENUE";
  if (s.includes("L2")) return "L2_DEPTH";
  if (s.includes("L1")) return "L1_TSLE";
  if (s.includes("L0")) return "L0_NONE";
  // Fallback
  return "L0_NONE";
}

function maxLevel(levels: EvidenceLevel[]): EvidenceLevel {
  let best: EvidenceLevel = "L0_NONE";
  for (const l of levels) {
    if (LEVEL_RANK[l] > LEVEL_RANK[best]) best = l;
  }
  return best;
}

function getBlocks(bundle: any): AnyEvidenceBlock[] {
  const blocks = bundle?.blocks;
  return Array.isArray(blocks) ? (blocks as AnyEvidenceBlock[]) : [];
}

function findBlock(bundle: any, type: string): AnyEvidenceBlock | undefined {
  return getBlocks(bundle).find((b) => String(b?.type ?? "").toUpperCase() === type.toUpperCase());
}

function ageMs(ts?: number, now = Date.now()): number | undefined {
  if (!Number.isFinite(ts)) return undefined;
  return Math.max(0, now - Number(ts));
}

/**
 * Extract depth bands from the evidence bundle in a tolerant way.
 * Prefers DEPTH_BANDS payload.bands, falls back to POLI_POINT payload depth25/depth50.
 */
function extractDepth(bundle: any): { pct_0_25?: number; pct_0_5?: number; sufficient: boolean } {
  const depthBlock = findBlock(bundle, "DEPTH_BANDS");
  const poliBlock = findBlock(bundle, "POLI_POINT");

  // Primary: DEPTH_BANDS payload
  const bands = depthBlock?.payload?.bands ?? depthBlock?.payload?.BANDS ?? null;

  let d25: number | undefined;
  let d50: number | undefined;

  if (bands && typeof bands === "object") {
    const v25 = bands["pct_0.25"]?.total_notional ?? bands["pct_0.25"]?.total ?? bands["pct_0.25"];
    const v50 = bands["pct_0.5"]?.total_notional ?? bands["pct_0.5"]?.total ?? bands["pct_0.5"];

    if (Number.isFinite(v25)) d25 = Number(v25);
    if (Number.isFinite(v50)) d50 = Number(v50);
  }

  // Fallback: POLI_POINT style (depth25/depth50)
  if (!Number.isFinite(d25)) {
    const v = poliBlock?.payload?.depth25 ?? poliBlock?.payload?.DEPTH25;
    if (Number.isFinite(v)) d25 = Number(v);
  }
  if (!Number.isFinite(d50)) {
    const v = poliBlock?.payload?.depth50 ?? poliBlock?.payload?.DEPTH50;
    if (Number.isFinite(v)) d50 = Number(v);
  }

  const sufficient =
    (Number.isFinite(d25) ? (d25 as number) > 0 : false) &&
    (Number.isFinite(d50) ? (d50 as number) > 0 : false);

  return { pct_0_25: d25, pct_0_5: d50, sufficient };
}

/**
 * Extract TSLE state/ confidence in a tolerant way.
 */
function extractTSLE(bundle: any): { state?: string; confidence?: number } {
  const tsleBlock = findBlock(bundle, "TSLE_STATE");
  const p = tsleBlock?.payload ?? {};
  const state =
    p?.state ??
    p?.currentState ??
    p?.tsleState ??
    p?.stateSnapshot?.state ??
    undefined;

  const confidence =
    Number.isFinite(p?.confidence) ? Number(p.confidence) :
    Number.isFinite(p?.score) ? Number(p.score) :
    undefined;

  return { state: state ? String(state) : undefined, confidence };
}

function normalizeGateResult(gate: any): { ok: boolean; level: EvidenceLevel; reasons: string[]; verifyTags: string[] } {
  const ok = Boolean(gate?.ok);

  // gate may return .level or .ladderLevel
  const level = toLevel(gate?.level ?? gate?.ladderLevel);

  const reasons: string[] = Array.isArray(gate?.reasons) ? gate.reasons.map(String) : [];

  // gate may return .verifyTags or .verifyFlags or .verify (array)
  const tagsRaw =
    gate?.verifyTags ??
    gate?.verifyFlags ??
    gate?.verify ??
    [];

  const verifyTags = Array.isArray(tagsRaw) ? tagsRaw.map(String) : [];

  return { ok, level, reasons, verifyTags };
}

/** ---------- Main API ---------- */

/**
 * Build a venue-by-venue evidence report from one or more evidence bundles.
 *
 * Typical usage:
 * - Call lisStateToEvidenceBundle() per venue (coinbase/binance/kraken)
 * - Pass the resulting bundles array into this function
 * - Render report. Use report.aggregate.ok to explain overall PoLi gate
 */
export function buildVenueEvidenceReport(params: {
  symbol: string;
  bundles: any[];
  opts?: VenueEvidenceGateOpts;
}): VenueEvidenceReport {
  const now = Date.now();

  const {
    symbol,
    bundles,
    opts,
  } = params;

  const maxAgeMsTSLE = opts?.maxAgeMsTSLE ?? 30_000;
  const maxAgeMsDepth = opts?.maxAgeMsDepth ?? 15_000;
  const requireDepthBands = opts?.requireDepthBands ?? ["pct_0.25", "pct_0.5"];
  const minOkVenues = opts?.minOkVenues ?? 2; // institutional default for cross-venue confidence

  const venues: VenueEvidenceStatus[] = (Array.isArray(bundles) ? bundles : []).map((bundle) => {
    const venue = String(bundle?.venue ?? bundle?.context?.venue ?? "unknown").toLowerCase();

    // Evaluate ladder (per venue)
    const gateRaw = evaluateEvidenceLadder(bundle, {
      maxAgeMsTSLE,
      maxAgeMsDepth,
      requireDepthBands,
    } as any);

    const gate = normalizeGateResult(gateRaw);

    // Freshness breakdown
    const tsleBlock = findBlock(bundle, "TSLE_STATE");
    const depthBlock = findBlock(bundle, "DEPTH_BANDS");
    const poliBlock = findBlock(bundle, "POLI_POINT");
    const divBlock = findBlock(bundle, "DIVERGENCE");

    const freshness = {
      TSLE: ageMs(tsleBlock?.ts, now),
      DEPTH: ageMs(depthBlock?.ts, now),
      POLI: ageMs(poliBlock?.ts, now),
      DIVERGENCE: ageMs(divBlock?.ts, now),
    };

    // Extract key values for UI
    const depth = extractDepth(bundle);
    const tsle = extractTSLE(bundle);

    const tsleFresh = typeof freshness.TSLE === "number" ? freshness.TSLE <= maxAgeMsTSLE : false;

    return {
      venue,
      ok: gate.ok,
      ladderLevel: gate.level,
      freshnessMs: freshness,
      depth,
      tsle: {
        state: tsle.state,
        confidence: tsle.confidence,
        fresh: tsleFresh,
      },
      reasons: gate.reasons,
      verifyTags: gate.verifyTags,
    };
  });

  // Aggregate: require >= minOkVenues venues to pass individually
  const okVenues = venues.filter(v => v.ok).map(v => v.venue);
  const aggregateOk = okVenues.length >= minOkVenues;

  const levels = venues.map(v => v.ladderLevel);
  const aggregateLevel = maxLevel(levels);

  const aggregateReasons: string[] = [];
  if (!aggregateOk) {
    aggregateReasons.push(
      `Only ${okVenues.length} venue(s) meet evidence sufficiency; require ${minOkVenues}.`
    );

    // Add top failure reasons from non-ok venues (useful for UI)
    const blockers = venues
      .filter(v => !v.ok)
      .flatMap(v => (v.reasons?.length ? v.reasons.map(r => `${v.venue}: ${r}`) : [`${v.venue}: insufficient evidence`]))
      .slice(0, 10);

    aggregateReasons.push(...blockers);
  }

  return {
    symbol,
    timestamp: now,
    venues,
    aggregate: {
      ok: aggregateOk,
      ladderLevel: aggregateLevel,
      reasons: aggregateReasons,
      okVenues,
      requiredOkVenues: minOkVenues,
    },
  };
}