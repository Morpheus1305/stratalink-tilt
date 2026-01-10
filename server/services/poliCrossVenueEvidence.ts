// server/services/poliCrossVenueEvidence.ts
import { tsleBuffer, tsleStateEngine } from "./tsle-buffer";
import {
  detectDivergence,
  generateDivergenceReport,
  type VenueSnapshot,
} from "./divergence-detector";

/**
 * L3 Cross-Venue Divergence Evidence
 *
 * Purpose:
 * - Produce a PoLi-grade evidence block for cross-venue divergence
 * - Add machine-readable failure taxonomy fields:
 *   - verdict / severity / gatingOk
 *   - failureClass / actionHint
 *   - metrics / thresholds
 *
 * Semantics:
 * - ok: "we were able to compute the block on fresh data"
 * - gatingOk: "this block permits upstream aggregate.ok to remain true"
 *   (i.e. gatingOk=false means L3 blocks aggregate even if L2 passes)
 */

export type CrossVenueVerdict = "PASS" | "WARN" | "FAIL";
export type CrossVenueSeverity = "LOW" | "MEDIUM" | "HIGH";
export type CrossVenueFailureClass =
  | "INSUFFICIENT"
  | "STALE"
  | "DEPTH_MISMATCH"
  | "IMBALANCE_MISMATCH"
  | "POLI_GAP"
  | "MULTI_SIGNAL";

export type CrossVenueActionHint =
  | "MONITOR"
  | "REQUIRE_CONFIRMATION"
  | "REDUCE_SIZE"
  | "BLOCK_EXECUTION";

export type CrossVenueEvidence = {
  ok: boolean;

  // Ladder level for the cross-venue block itself
  ladderLevel: "L3_DIVERGENCE" | "L2_DEPTH" | "L0_NONE";

  // ✅ L3 failure semantics fields (machine-readable)
  verdict: CrossVenueVerdict;
  severity: CrossVenueSeverity;

  /**
   * gatingOk = false means: "we have enough evidence to say cross-venue conditions
   * are unacceptable", and therefore aggregate.ok should be forced false.
   *
   * Note: ok can still be true while gatingOk is false.
   */
  gatingOk: boolean;

  failureClass?: CrossVenueFailureClass;
  actionHint?: CrossVenueActionHint;

  metrics?: {
    depthDeltaPct?: number;
    imbalanceDeltaPct?: number;
    poliDelta?: number;
    highSignals?: number;
    mediumSignals?: number;
    totalSignals?: number;
  };

  thresholds?: {
    depthDeltaPctFail: number;
    imbalanceDeltaPctFail: number;
    poliDeltaFail: number;
  };

  verifyTags: string[];
  reasons: string[];
  timestamp: number;
  symbol: string;
  referenceVenue: string;
  stressVenue: string;

  freshnessMs: {
    reference: number | null;
    stress: number | null;
    maxAgeMs: number;
  };

  block: {
    type: "CROSS_VENUE_DIVERGENCE";
    // report from divergence-detector (shape varies; keep any-safe)
    report: any;
    snapshots?: {
      reference: VenueSnapshot;
      stress: VenueSnapshot;
    };
  };
};

function nowMs() {
  return Date.now();
}

function toNumberMaybe(x: any): number | undefined {
  const n = typeof x === "number" ? x : Number(x);
  return Number.isFinite(n) ? n : undefined;
}

function pctDelta(a?: number, b?: number): number | undefined {
  if (!Number.isFinite(a as number) || !Number.isFinite(b as number)) return undefined;
  const A = Number(a);
  const B = Number(b);
  const denom = Math.abs(A) > 0 ? Math.abs(A) : Math.abs(B) > 0 ? Math.abs(B) : 0;
  if (denom === 0) return undefined;
  return (Math.abs(A - B) / denom) * 100;
}

export function buildCrossVenueEvidence(opts: {
  symbol: string;
  referenceVenue: string;
  stressVenue: string;
  maxAgeMs?: number;

  // Optional tuning (defaults reflect your current divergence-detector outputs)
  depthDeltaPctFail?: number;       // default 30
  imbalanceDeltaPctFail?: number;   // default 20
  poliDeltaFail?: number;           // default 15
}): CrossVenueEvidence {
  const symbol = String(opts.symbol ?? "BTC").toUpperCase();
  const referenceVenue = String(opts.referenceVenue ?? "coinbase").toLowerCase();
  const stressVenue = String(opts.stressVenue ?? "binance").toLowerCase();
  const maxAgeMs = Number.isFinite(opts.maxAgeMs) ? Number(opts.maxAgeMs) : 60_000;

  const depthDeltaPctFail = Number.isFinite(opts.depthDeltaPctFail)
    ? Number(opts.depthDeltaPctFail)
    : 30;
  const imbalanceDeltaPctFail = Number.isFinite(opts.imbalanceDeltaPctFail)
    ? Number(opts.imbalanceDeltaPctFail)
    : 20;
  const poliDeltaFail = Number.isFinite(opts.poliDeltaFail) ? Number(opts.poliDeltaFail) : 15;

  const t = nowMs();

  const refLatest = tsleBuffer.getLatest(referenceVenue, symbol);
  const stressLatest = tsleBuffer.getLatest(stressVenue, symbol);

  const reasons: string[] = [];
  const verifyTags: string[] = [];

  const freshnessRef = refLatest ? t - refLatest.ts : null;
  const freshnessStress = stressLatest ? t - stressLatest.ts : null;

  // -----------------------------
  // L0: insufficient prerequisites
  // -----------------------------
  if (!refLatest || !stressLatest) {
    reasons.push("Insufficient cross-venue data: missing latest TSLE points.");
    verifyTags.push("VERIFY_INSUFFICIENT");

    return {
      ok: false,
      ladderLevel: "L0_NONE",

      verdict: "FAIL",
      severity: "HIGH",
      gatingOk: false,
      failureClass: "INSUFFICIENT",
      actionHint: "REQUIRE_CONFIRMATION",

      thresholds: { depthDeltaPctFail, imbalanceDeltaPctFail, poliDeltaFail },

      verifyTags,
      reasons,
      timestamp: t,
      symbol,
      referenceVenue,
      stressVenue,
      freshnessMs: { reference: freshnessRef, stress: freshnessStress, maxAgeMs },
      block: {
        type: "CROSS_VENUE_DIVERGENCE",
        report: {
          hasDivergence: false,
          signals: [],
          summary: "Missing latest points for one or both venues.",
          regime: "UNKNOWN",
        },
      },
    };
  }

  // -----------------------------
  // L2: freshness gate (stale)
  // -----------------------------
  if ((freshnessRef ?? Infinity) > maxAgeMs) {
    reasons.push(`Reference venue evidence stale (${freshnessRef}ms).`);
  }
  if ((freshnessStress ?? Infinity) > maxAgeMs) {
    reasons.push(`Stress venue evidence stale (${freshnessStress}ms).`);
  }
  if (reasons.length) {
    verifyTags.push("VERIFY_STALE");

    return {
      ok: false,
      ladderLevel: "L2_DEPTH",

      verdict: "FAIL",
      severity: "HIGH",
      gatingOk: false,
      failureClass: "STALE",
      actionHint: "REQUIRE_CONFIRMATION",

      thresholds: { depthDeltaPctFail, imbalanceDeltaPctFail, poliDeltaFail },

      verifyTags,
      reasons,
      timestamp: t,
      symbol,
      referenceVenue,
      stressVenue,
      freshnessMs: { reference: freshnessRef, stress: freshnessStress, maxAgeMs },
      block: {
        type: "CROSS_VENUE_DIVERGENCE",
        report: {
          hasDivergence: false,
          signals: [],
          summary: "Cross-venue evidence stale.",
          regime: "UNKNOWN",
        },
      },
    };
  }

  // -----------------------------
  // Build VenueSnapshot inputs
  // -----------------------------
  const refState = tsleStateEngine.getState(referenceVenue, symbol);
  const stressState = tsleStateEngine.getState(stressVenue, symbol);

  const refSnap: VenueSnapshot = {
    venue: referenceVenue,
    poli: refLatest.poli,
    depth25: refLatest.depth25,
    depth50: refLatest.depth50,
    spreadBps: 0,
    imbalance2550: refLatest.imbalance2550,
    tsleState: refState.state || "STABLE",
    timestamp: refLatest.ts,
  };

  const stressSnap: VenueSnapshot = {
    venue: stressVenue,
    poli: stressLatest.poli,
    depth25: stressLatest.depth25,
    depth50: stressLatest.depth50,
    spreadBps: 0,
    imbalance2550: stressLatest.imbalance2550,
    tsleState: stressState.state || "STABLE",
    timestamp: stressLatest.ts,
  };

  // divergence-detector output
  const signals = detectDivergence(refSnap, stressSnap);
  const report = generateDivergenceReport(signals);

  // -----------------------------
  // L3 failure semantics
  // -----------------------------
  const reportSignals: any[] = Array.isArray(report?.signals) ? report.signals : [];

  // Count severities from report, but also compute deterministic deltas as backup
  const highSignals = reportSignals.filter((s) => String(s?.severity).toUpperCase() === "HIGH").length;
  const mediumSignals = reportSignals.filter((s) =>
    ["MEDIUM", "MODERATE"].includes(String(s?.severity).toUpperCase())
  ).length;

  // Compute deltas (fallback if report doesn't provide clean deltas)
  const depthRef = (toNumberMaybe(refSnap.depth25) ?? 0) + (toNumberMaybe(refSnap.depth50) ?? 0);
  const depthStress = (toNumberMaybe(stressSnap.depth25) ?? 0) + (toNumberMaybe(stressSnap.depth50) ?? 0);
  const depthDeltaPct = pctDelta(depthRef, depthStress);

  // imbalance in detector is already -1..1; treat as absolute percentage delta on the value itself
  const imbalanceDeltaPct = pctDelta(toNumberMaybe(refSnap.imbalance2550), toNumberMaybe(stressSnap.imbalance2550));
  const poliDelta = Math.abs((toNumberMaybe(refSnap.poli) ?? 0) - (toNumberMaybe(stressSnap.poli) ?? 0));

  // Determine failure classes by “dominant” breaches
  const breached: CrossVenueFailureClass[] = [];

  if (typeof depthDeltaPct === "number" && depthDeltaPct >= depthDeltaPctFail) breached.push("DEPTH_MISMATCH");
  if (typeof imbalanceDeltaPct === "number" && imbalanceDeltaPct >= imbalanceDeltaPctFail) breached.push("IMBALANCE_MISMATCH");
  if (typeof poliDelta === "number" && poliDelta >= poliDeltaFail) breached.push("POLI_GAP");

  let failureClass: CrossVenueFailureClass | undefined;
  if (breached.length >= 2) failureClass = "MULTI_SIGNAL";
  else if (breached.length === 1) failureClass = breached[0];
  else if (highSignals >= 2) failureClass = "MULTI_SIGNAL"; // defensive

  // Verdict rules (simple + explainable):
  // - FAIL if any hard threshold breached OR any HIGH signal exists
  // - WARN if divergence exists (report.hasDivergence) OR any MEDIUM/MODERATE signals exist
  // - PASS otherwise
  let verdict: CrossVenueVerdict = "PASS";
  let severity: CrossVenueSeverity = "LOW";
  let gatingOk = true;
  let actionHint: CrossVenueActionHint = "MONITOR";

  const hasDivergence = Boolean(report?.hasDivergence);

  const hardFail =
    (breached.length > 0) ||
    (highSignals > 0);

  if (hardFail) {
    verdict = "FAIL";
    severity = "HIGH";
    gatingOk = false;
    actionHint = "BLOCK_EXECUTION";

    // Reasons: keep deterministic + readable
    if (typeof depthDeltaPct === "number" && depthDeltaPct >= depthDeltaPctFail) {
      reasons.push(`Depth delta ${depthDeltaPct.toFixed(1)}% (>=${depthDeltaPctFail}%)`);
    }
    if (typeof imbalanceDeltaPct === "number" && imbalanceDeltaPct >= imbalanceDeltaPctFail) {
      reasons.push(`Imbalance delta ${imbalanceDeltaPct.toFixed(1)}% (>=${imbalanceDeltaPctFail}%)`);
    }
    if (typeof poliDelta === "number" && poliDelta >= poliDeltaFail) {
      reasons.push(`PoLi gap ${poliDelta.toFixed(0)} (>=${poliDeltaFail})`);
    }
    if (highSignals > 0) {
      reasons.push(`Warning: ${highSignals} HIGH divergence signal${highSignals === 1 ? "" : "s"} present.`);
    }

    verifyTags.push("VERIFY_FAIL");
  } else if (hasDivergence || mediumSignals > 0) {
    verdict = "WARN";
    severity = "MEDIUM";
    gatingOk = true;
    actionHint = "REDUCE_SIZE";
    failureClass = failureClass ?? "MULTI_SIGNAL"; // treat as warning multi-signal if detector flags divergence

    if (mediumSignals > 0) {
      reasons.push(`${mediumSignals} MEDIUM/MODERATE divergence signal${mediumSignals === 1 ? "" : "s"} present.`);
    } else {
      reasons.push("Cross-venue divergence present (within thresholds).");
    }

    verifyTags.push("VERIFY_WARN");
  } else {
    verdict = "PASS";
    severity = "LOW";
    gatingOk = true;
    actionHint = "MONITOR";
    verifyTags.push("VERIFY_OK");
  }

  return {
    // ok means we successfully computed on fresh data
    ok: true,
    ladderLevel: "L3_DIVERGENCE",

    verdict,
    severity,
    gatingOk,
    failureClass,
    actionHint,

    metrics: {
      depthDeltaPct,
      imbalanceDeltaPct,
      poliDelta,
      highSignals,
      mediumSignals,
      totalSignals: reportSignals.length,
    },

    thresholds: { depthDeltaPctFail, imbalanceDeltaPctFail, poliDeltaFail },

    verifyTags,
    reasons,
    timestamp: t,
    symbol,
    referenceVenue,
    stressVenue,
    freshnessMs: { reference: freshnessRef, stress: freshnessStress, maxAgeMs },
    block: {
      type: "CROSS_VENUE_DIVERGENCE",
      report,
      snapshots: { reference: refSnap, stress: stressSnap },
    },
  };
}