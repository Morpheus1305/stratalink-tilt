// server/services/poliMarketIntegrityEvidence.ts
/**
 * PoLi L4  -  Market Integrity Evidence (Phase 1)
 * ------------------------------------------------------------
 * Goal:
 *  - Produce machine-readable integrity evidence for manipulation risk:
 *    spoofing, wash trading, quote stuffing, layering, momentum ignition, etc.
 *
 * Phase 1 Constraint:
 *  - Use ONLY the data we have today (TSLE buffer points + optional LiquidityState).
 *  - Where true detection needs deeper telemetry (order events, cancels, prints),
 *    emit structured "DATA_GAP" signals rather than pretending we detected it.
 *
 * Output is designed to be contract-stable and incrementally enrichable.
 */

import { tsleBuffer } from "./tsle-buffer";

export type IntegrityLadderLevel = "L4_INTEGRITY" | "L3_DIVERGENCE" | "L2_DEPTH" | "L0_NONE";
export type IntegrityVerdict = "PASS" | "WARN" | "FAIL" | "INSUFFICIENT" | "STALE";
export type IntegritySeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/**
 * IMPORTANT:
 * These types are the “machine-readable taxonomy”.
 * Never rename types once published  -  add new ones instead.
 */
export type IntegritySignalType =
  // Manipulation classes
  | "SPOOFING_LIKE"
  | "LAYERING_LIKE"
  | "WASH_TRADING_RISK"
  | "QUOTE_STUFFING_RISK"
  | "MOMENTUM_IGNITION_RISK"
  | "PINGING_PROBING_RISK"
  | "MARKING_THE_CLOSE_RISK"
  | "STOP_HUNTING_RISK"
  // Structural / meta signals
  | "INTEGRITY_DATA_GAP"
  | "INTEGRITY_VOLATILITY_CHURN"
  | "DEPTH_FLASH_CRASH"
  | "IMBALANCE_WHIPSAW";

export type IntegritySignal = {
  type: IntegritySignalType;
  severity: IntegritySeverity;
  confidence: number; // 0..1
  verdict: "PASS" | "WARN" | "FAIL" | "DATA_GAP";
  message: string;

  // Evidence window and timestamps
  evidenceWindowMs: number;
  observedAt: number; // epoch ms (now)
  windowStartTs?: number;
  windowEndTs?: number;

  // Metrics & thresholds are machine-readable for UI and audit trails
  metrics?: Record<string, number | string | boolean | null>;
  thresholds?: Record<string, number | string | boolean | null>;

  // Optional: tags that can drive UI chips / filters
  tags?: string[];

  // Optional: make the "data gap" explorable (UI can show exactly what’s missing)
  requiredTelemetry?: string[];
};

export type MarketIntegrityEvidenceFailure = {
  code:
    | "NONE"
    | "INSUFFICIENT"
    | "STALE"
    | "POLICY_BLOCKING_FAIL";
  blockingSignals: Array<{
    type: IntegritySignalType;
    severity: IntegritySeverity;
    confidence: number;
    verdict: "FAIL";
  }>;
  policyApplied: {
    failOn: IntegritySeverity;
    minFailConfidence: number;
  };
};

export type MarketIntegrityEvidence = {
  ok: boolean; // "we could compute integrity evidence" (not that it is healthy)
  gatingOk: boolean; // Whether L4 allows the ladder to pass
  ladderLevel: "L4_INTEGRITY";
  verdict: IntegrityVerdict;
  severity: IntegritySeverity;
  verifyTags: string[];
  reasons: string[];
  timestamp: number;

  venue: string;
  symbol: string;

  freshnessMs: {
    latestPoint: number | null;
    maxAgeMs: number;
  };

  // Machine-readable signals
  signals: IntegritySignal[];

  // Failure semantics (machine-readable)
  failure: MarketIntegrityEvidenceFailure;

  // A compact "taxonomy envelope" helps downstream UIs/auditors
  taxonomy: {
    version: "L4_PHASE1_v1";
    signalTypes: IntegritySignalType[];
  };

  // Compact summary for logs/UI
  summary: string;
};

function nowMs() {
  return Date.now();
}

function clamp01(x: number) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function sevRank(s: IntegritySeverity): number {
  return s === "CRITICAL" ? 4 : s === "HIGH" ? 3 : s === "MEDIUM" ? 2 : 1;
}

function maxSeverity(a: IntegritySeverity, b: IntegritySeverity): IntegritySeverity {
  return sevRank(a) >= sevRank(b) ? a : b;
}

function chooseVerdictFromSignals(signals: IntegritySignal[]): { verdict: IntegrityVerdict; severity: IntegritySeverity } {
  if (!signals.length) return { verdict: "PASS", severity: "LOW" };

  // Highest priority verdicts:
  // FAIL > WARN > PASS; DATA_GAP does not automatically fail.
  let verdict: IntegrityVerdict = "PASS";
  let severity: IntegritySeverity = "LOW";

  for (const s of signals) {
    severity = maxSeverity(severity, s.severity);

    if (s.verdict === "FAIL") verdict = "FAIL";
    else if (s.verdict === "WARN" && verdict !== "FAIL") verdict = "WARN";
  }

  return { verdict, severity };
}

function pctDelta(a: number, b: number): number {
  // percent difference between a and b, symmetric-ish
  // 0..infty
  const denom = Math.max(1e-9, (Math.abs(a) + Math.abs(b)) / 2);
  return (Math.abs(a - b) / denom) * 100;
}

/**
 * Phase 1 Inputs available:
 * - TSLEPoint: ts, depth25, depth50, imbalance2550, poli
 * We do NOT have:
 * - order event rates (new/modify/cancel)
 * - trade prints / volume
 * - self-trade detection
 * - participant-level IDs
 *
 * => We implement "risk / like" signals via time-series signatures.
 */
export function buildMarketIntegrityEvidence(opts: {
  venue: string;
  symbol: string;

  // Freshness gate
  maxAgeMs?: number;

  // Evidence window
  windowPoints?: number; // how many TSLE points to inspect
  minPoints?: number; // minimum TSLE points required

  // Threshold tuning (phase 1 defaults are conservative)
  thresholds?: Partial<{
    // Depth flash crash / spoofing-like
    depthDropPct: number; // sudden drop threshold
    depthRecoverPct: number; // how much it must recover
    recoverWithinPoints: number; // within N points

    // Imbalance whipsaw
    imbalanceSwingAbs: number; // absolute change threshold, 0..2-ish range (since imbalance is -1..1)
    whipsawWithinPoints: number;

    // PoLi churn
    poliStdDev: number;
    poliJump: number;

    // Layering-like (sustained imbalance with unstable depth)
    sustainedImbalanceAbs: number;
    sustainedPoints: number;

    // Quote stuffing data gap  -  we must explicitly declare missing telemetry
    requireOrderEventTelemetry: boolean;
  }>;

  // Gating policy
  // - In Phase 1, we fail L4 only on CRITICAL/HIGH confidence patterns.
  policy?: Partial<{
    failOn: IntegritySeverity; // default HIGH
    minFailConfidence: number; // default 0.65
  }>;
}): MarketIntegrityEvidence {
  const t = nowMs();
  const venue = String(opts.venue ?? "coinbase").toLowerCase();
  const symbol = String(opts.symbol ?? "BTC").toUpperCase();

  const maxAgeMs = Number.isFinite(opts.maxAgeMs) ? Number(opts.maxAgeMs) : 60_000;

  const windowPoints = Number.isFinite(opts.windowPoints) ? Math.max(2, Number(opts.windowPoints)) : 12;
  const minPoints = Number.isFinite(opts.minPoints) ? Math.max(2, Number(opts.minPoints)) : 3;

  const thresholds = {
    depthDropPct: 60, // big instantaneous pull of visible depth
    depthRecoverPct: 50, // recover at least half of the lost depth
    recoverWithinPoints: 3,

    imbalanceSwingAbs: 0.60,
    whipsawWithinPoints: 3,

    poliStdDev: 10,
    poliJump: 10,

    sustainedImbalanceAbs: 0.45,
    sustainedPoints: 5,

    requireOrderEventTelemetry: true,
    ...(opts.thresholds ?? {}),
  };

  const policy = {
    failOn: (opts.policy?.failOn ?? "HIGH") as IntegritySeverity,
    minFailConfidence: Number.isFinite(opts.policy?.minFailConfidence) ? Number(opts.policy?.minFailConfidence) : 0.65,
  };

  const history = tsleBuffer.getHistory(venue, symbol, windowPoints);
  const latest = tsleBuffer.getLatest(venue, symbol);

  const freshnessLatest = latest ? t - latest.ts : null;

  // Freshness + sufficiency gates
  const reasons: string[] = [];
  const verifyTags: string[] = [];
  const signals: IntegritySignal[] = [];

  const taxonomyEnvelope = {
    version: "L4_PHASE1_v1" as const,
    signalTypes: [
      "SPOOFING_LIKE",
      "LAYERING_LIKE",
      "WASH_TRADING_RISK",
      "QUOTE_STUFFING_RISK",
      "MOMENTUM_IGNITION_RISK",
      "PINGING_PROBING_RISK",
      "MARKING_THE_CLOSE_RISK",
      "STOP_HUNTING_RISK",
      "INTEGRITY_DATA_GAP",
      "INTEGRITY_VOLATILITY_CHURN",
      "DEPTH_FLASH_CRASH",
      "IMBALANCE_WHIPSAW",
    ] as IntegritySignalType[],
  };

  if (!latest || history.length < minPoints) {
    reasons.push(`Insufficient TSLE history for integrity analysis (need >=${minPoints} points).`);
    verifyTags.push("VERIFY_INSUFFICIENT");

    return {
      ok: false,
      gatingOk: false,
      ladderLevel: "L4_INTEGRITY",
      verdict: "INSUFFICIENT",
      severity: "LOW",
      verifyTags,
      reasons,
      timestamp: t,
      venue,
      symbol,
      freshnessMs: { latestPoint: freshnessLatest, maxAgeMs },
      signals: [
        {
          type: "INTEGRITY_DATA_GAP",
          severity: "LOW",
          confidence: 1,
          verdict: "DATA_GAP",
          message: "Not enough TSLE points yet to compute integrity signatures.",
          evidenceWindowMs: 0,
          observedAt: t,
          metrics: { points: history.length, required: minPoints },
          thresholds: { minPoints },
          tags: ["PHASE_1", "DATA_GAP"],
          requiredTelemetry: ["tsle_points>=minPoints"],
        },
      ],
      failure: {
        code: "INSUFFICIENT",
        blockingSignals: [],
        policyApplied: { failOn: policy.failOn, minFailConfidence: policy.minFailConfidence },
      },
      taxonomy: taxonomyEnvelope,
      summary: "INSUFFICIENT: awaiting TSLE history.",
    };
  }

  if ((freshnessLatest ?? Infinity) > maxAgeMs) {
    reasons.push(`Integrity evidence stale (${freshnessLatest}ms).`);
    verifyTags.push("VERIFY_STALE");

    return {
      ok: false,
      gatingOk: false,
      ladderLevel: "L4_INTEGRITY",
      verdict: "STALE",
      severity: "LOW",
      verifyTags,
      reasons,
      timestamp: t,
      venue,
      symbol,
      freshnessMs: { latestPoint: freshnessLatest, maxAgeMs },
      signals: [
        {
          type: "INTEGRITY_DATA_GAP",
          severity: "LOW",
          confidence: 1,
          verdict: "DATA_GAP",
          message: "Integrity cannot be assessed because TSLE evidence is stale.",
          evidenceWindowMs: maxAgeMs,
          observedAt: t,
          windowStartTs: history[0]?.ts,
          windowEndTs: latest.ts,
          metrics: { freshnessMs: freshnessLatest },
          thresholds: { maxAgeMs },
          tags: ["PHASE_1", "STALE"],
          requiredTelemetry: ["fresh_tsle_points_within_maxAgeMs"],
        },
      ],
      failure: {
        code: "STALE",
        blockingSignals: [],
        policyApplied: { failOn: policy.failOn, minFailConfidence: policy.minFailConfidence },
      },
      taxonomy: taxonomyEnvelope,
      summary: "STALE: refresh LIS/TSLE buffers.",
    };
  }

  // -----------------------------
  // Phase 1 Signatures
  // -----------------------------
  const windowStart = history[0].ts;
  const windowEnd = history[history.length - 1].ts;
  const evidenceWindowMs = Math.max(0, windowEnd - windowStart);

  // Helper arrays
  const depths = history.map((p) => (p.depth25 ?? 0) + (p.depth50 ?? 0));
  const polis = history.map((p) => p.poli ?? 0);
  const imbs = history.map((p) => p.imbalance2550 ?? 0);

  // (A) DEPTH_FLASH_CRASH: sudden depth drop and rapid recovery (spoofing-like signature)
  if (history.length >= 3) {
    for (let i = 1; i < history.length - 1; i++) {
      const before = depths[i - 1];
      const drop = depths[i];
      if (before <= 0) continue;

      const dropPct = ((before - drop) / before) * 100;
      if (dropPct < thresholds.depthDropPct) continue;

      const maxJ = Math.min(history.length - 1, i + thresholds.recoverWithinPoints);
      const postMax = Math.max(...depths.slice(i + 1, maxJ + 1));
      const recoverPct = before > 0 ? ((postMax - drop) / (before - drop)) * 100 : 0;

      const conf = clamp01(0.35 + Math.min(0.55, (dropPct - thresholds.depthDropPct) / 60));
      const sev: IntegritySeverity =
        dropPct >= thresholds.depthDropPct + 25 ? "HIGH" : dropPct >= thresholds.depthDropPct + 10 ? "MEDIUM" : "LOW";

      const verdict: IntegritySignal["verdict"] =
        sev === "HIGH" && conf >= policy.minFailConfidence ? "FAIL" : sev !== "LOW" ? "WARN" : "WARN";

      signals.push({
        type: "DEPTH_FLASH_CRASH",
        severity: sev,
        confidence: conf,
        verdict,
        message: `Depth flash event: drop ${dropPct.toFixed(1)}% with partial recovery signature (spoofing-like).`,
        evidenceWindowMs,
        observedAt: t,
        windowStartTs: windowStart,
        windowEndTs: windowEnd,
        metrics: {
          pointIndex: i,
          depthBefore: before,
          depthAfterDrop: drop,
          dropPct,
          depthPostMax: postMax,
          recoverPct,
        },
        thresholds: {
          depthDropPct: thresholds.depthDropPct,
          depthRecoverPct: thresholds.depthRecoverPct,
          recoverWithinPoints: thresholds.recoverWithinPoints,
        },
        tags: ["PHASE_1", "SIGNATURE", "SPOOFING_LIKE"],
      });

      // Only report the first/best event in Phase 1 to avoid spam
      break;
    }
  }

  // (B) IMBALANCE_WHIPSAW: large imbalance swing in short time
  if (history.length >= 3) {
    let bestSwing = 0;
    let bestAt = -1;

    for (let i = 1; i < history.length; i++) {
      const swing = Math.abs(imbs[i] - imbs[i - 1]);
      if (swing > bestSwing) {
        bestSwing = swing;
        bestAt = i;
      }
    }

    if (bestAt > 0 && bestSwing >= thresholds.imbalanceSwingAbs) {
      const conf = clamp01(0.35 + Math.min(0.55, (bestSwing - thresholds.imbalanceSwingAbs) / 0.8));
      const sev: IntegritySeverity = bestSwing >= thresholds.imbalanceSwingAbs + 0.35 ? "HIGH" : "MEDIUM";
      const verdict: IntegritySignal["verdict"] =
        sev === "HIGH" && conf >= policy.minFailConfidence ? "FAIL" : "WARN";

      signals.push({
        type: "IMBALANCE_WHIPSAW",
        severity: sev,
        confidence: conf,
        verdict,
        message: `Imbalance whipsaw: |Δimbalance|=${bestSwing.toFixed(3)} (potential probing / layered pressure).`,
        evidenceWindowMs,
        observedAt: t,
        windowStartTs: windowStart,
        windowEndTs: windowEnd,
        metrics: {
          pointIndex: bestAt,
          imbalancePrev: imbs[bestAt - 1],
          imbalanceNow: imbs[bestAt],
          swingAbs: bestSwing,
        },
        thresholds: {
          imbalanceSwingAbs: thresholds.imbalanceSwingAbs,
          whipsawWithinPoints: thresholds.whipsawWithinPoints,
        },
        tags: ["PHASE_1", "SIGNATURE", "LAYERING_LIKE", "PINGING_PROBING_RISK"],
      });
    }
  }

  // (C) INTEGRITY_VOLATILITY_CHURN: PoLi churn / unstable liquidity conditions
  const poliMean = polis.reduce((a, b) => a + b, 0) / polis.length;
  const poliVar =
    polis.reduce((s, p) => s + Math.pow(p - poliMean, 2), 0) / Math.max(1, polis.length);
  const poliStd = Math.sqrt(poliVar);

  let maxJump = 0;
  for (let i = 1; i < polis.length; i++) {
    maxJump = Math.max(maxJump, Math.abs(polis[i] - polis[i - 1]));
  }

  if (poliStd >= thresholds.poliStdDev || maxJump >= thresholds.poliJump) {
    const conf = clamp01(
      0.25 +
        Math.min(
          0.6,
          (poliStd - thresholds.poliStdDev) / 15 + (maxJump - thresholds.poliJump) / 20
        )
    );
    const sev: IntegritySeverity =
      poliStd >= thresholds.poliStdDev + 8 || maxJump >= thresholds.poliJump + 8 ? "MEDIUM" : "LOW";

    signals.push({
      type: "INTEGRITY_VOLATILITY_CHURN",
      severity: sev,
      confidence: conf,
      verdict: "WARN",
      message: `Liquidity churn: PoLi σ=${poliStd.toFixed(1)}, max jump=${maxJump.toFixed(0)}.`,
      evidenceWindowMs,
      observedAt: t,
      windowStartTs: windowStart,
      windowEndTs: windowEnd,
      metrics: {
        poliStdDev: poliStd,
        poliMaxJump: maxJump,
        points: polis.length,
      },
      thresholds: {
        poliStdDev: thresholds.poliStdDev,
        poliJump: thresholds.poliJump,
      },
      tags: ["PHASE_1", "CONDITION"],
    });
  }

  // (D) SPOOFING_LIKE / LAYERING_LIKE rollups  -  ALWAYS EMIT (PASS/WARN/FAIL)
  const hasFlash = signals.some((s) => s.type === "DEPTH_FLASH_CRASH" && s.verdict !== "DATA_GAP");
  const hasWhipsaw = signals.some((s) => s.type === "IMBALANCE_WHIPSAW" && s.verdict !== "DATA_GAP");
  const hasChurn = signals.some((s) => s.type === "INTEGRITY_VOLATILITY_CHURN" && s.verdict !== "DATA_GAP");

  // SPOOFING_LIKE
  {
    let conf = 0.15;
    let sev: IntegritySeverity = "LOW";
    let v: IntegritySignal["verdict"] = "PASS";
    let msg = "No spoofing-like signature detected in Phase 1 TSLE-only evidence.";

    if (hasFlash && (hasWhipsaw || hasChurn)) {
      conf = clamp01(0.55 + (hasWhipsaw ? 0.15 : 0) + (hasChurn ? 0.10 : 0));
      sev = conf >= 0.75 ? "HIGH" : "MEDIUM";
      v = sev === "HIGH" && conf >= policy.minFailConfidence ? "FAIL" : "WARN";
      msg = "Spoofing-like pattern: rapid depth withdrawal + microstructure instability signature.";
    } else if (hasFlash) {
      conf = 0.45;
      sev = "MEDIUM";
      v = "WARN";
      msg = "Spoofing-adjacent signature: depth flash event detected (without corroborating instability).";
    }

    signals.push({
      type: "SPOOFING_LIKE",
      severity: sev,
      confidence: conf,
      verdict: v,
      message: msg,
      evidenceWindowMs,
      observedAt: t,
      windowStartTs: windowStart,
      windowEndTs: windowEnd,
      metrics: { hasFlash, hasWhipsaw, hasChurn },
      thresholds: {
        depthDropPct: thresholds.depthDropPct,
        imbalanceSwingAbs: thresholds.imbalanceSwingAbs,
        poliStdDev: thresholds.poliStdDev,
      },
      tags: ["PHASE_1", "MANIPULATION_SIGNATURE"],
    });
  }

  // LAYERING_LIKE
  {
    let conf = 0.15;
    let sev: IntegritySeverity = "LOW";
    let v: IntegritySignal["verdict"] = "PASS";
    let msg = "No layering-like signature detected in Phase 1 TSLE-only evidence.";

    if (hasWhipsaw && hasChurn) {
      conf = clamp01(0.45 + 0.20 + 0.15);
      sev = conf >= 0.7 ? "MEDIUM" : "LOW";
      v = "WARN";
      msg = "Layering-like pattern: imbalance whipsaw + churn signature.";
    } else if (hasWhipsaw) {
      conf = 0.45;
      sev = "MEDIUM";
      v = "WARN";
      msg = "Layering-adjacent signature: imbalance whipsaw detected (without corroborating churn).";
    }

    signals.push({
      type: "LAYERING_LIKE",
      severity: sev,
      confidence: conf,
      verdict: v,
      message: msg,
      evidenceWindowMs,
      observedAt: t,
      windowStartTs: windowStart,
      windowEndTs: windowEnd,
      metrics: { hasWhipsaw, hasChurn },
      tags: ["PHASE_1", "MANIPULATION_SIGNATURE"],
    });
  }

  // (E) WASH_TRADING_RISK  -  DATA GAP in Phase 1
  signals.push({
    type: "WASH_TRADING_RISK",
    severity: "LOW",
    confidence: 0,
    verdict: "DATA_GAP",
    message:
      "Wash trading detection requires trade prints / volume + participant heuristics. Phase 1 emits data-gap only.",
    evidenceWindowMs,
    observedAt: t,
    metrics: { available: false },
    thresholds: { requires: "trade_prints, volume, self_trade_signals" },
    tags: ["PHASE_1", "DATA_GAP"],
    requiredTelemetry: ["trade_prints", "trade_volume", "self_trade_signals", "participant_heuristics"],
  });

  // (F) QUOTE_STUFFING_RISK  -  DATA GAP in Phase 1
  if (thresholds.requireOrderEventTelemetry) {
    signals.push({
      type: "QUOTE_STUFFING_RISK",
      severity: "LOW",
      confidence: 0,
      verdict: "DATA_GAP",
      message:
        "Quote stuffing detection requires order event telemetry (new/modify/cancel rates). Phase 1 emits data-gap only.",
      evidenceWindowMs,
      observedAt: t,
      metrics: { available: false },
      thresholds: { requires: "order_event_rates,cancel_replace_rates" },
      tags: ["PHASE_1", "DATA_GAP"],
      requiredTelemetry: ["order_event_rates", "cancel_rates", "replace_rates", "latency_spike_metrics"],
    });
  }

  // (G) Other manipulations  -  Phase 1: data-gap stubs (taxonomy visible)
  const gapStubs: Array<{ type: IntegritySignalType; msg: string; req?: string[] }> = [
    {
      type: "MOMENTUM_IGNITION_RISK",
      msg: "Momentum ignition requires price impact + aggressive trade burst signatures (not available in TSLE-only Phase 1).",
      req: ["trade_prints", "aggressive_trade_bursts", "price_impact"],
    },
    {
      type: "PINGING_PROBING_RISK",
      msg: "Pinging/probing typically needs micro-order patterns and fill/cancel sequences (data gap in Phase 1).",
      req: ["order_event_stream", "fill_ratio", "cancel_after_fill", "micro_order_sizes"],
    },
    {
      type: "MARKING_THE_CLOSE_RISK",
      msg: "Marking-the-close requires time-bucketed auction/close prints and price impact (data gap in Phase 1).",
      req: ["close_auction_prints", "auction_order_events", "close_window_price_impact"],
    },
    {
      type: "STOP_HUNTING_RISK",
      msg: "Stop hunting requires price/trigger knowledge and aggressive sweep signatures (data gap in Phase 1).",
      req: ["price_series", "liquidation_clusters", "sweep_orders", "trigger_level_inference"],
    },
  ];

  for (const g of gapStubs) {
    signals.push({
      type: g.type,
      severity: "LOW",
      confidence: 0,
      verdict: "DATA_GAP",
      message: g.msg,
      evidenceWindowMs,
      observedAt: t,
      metrics: { available: false },
      tags: ["PHASE_1", "DATA_GAP"],
      requiredTelemetry: g.req,
    });
  }

  // -----------------------------
  // Verdict + gating policy (L4)
  // -----------------------------
  const { verdict: derivedVerdict, severity } = chooseVerdictFromSignals(signals);

  // L4 policy:
  // - L4 is COMPUTED (ok=true) if we had enough fresh TSLE data.
  // - gatingOk is false when there is a FAIL signal at/above policy.failOn with adequate confidence.
  let gatingOk = true;

  const failSeverityRank = sevRank(policy.failOn);
  const blockingSignals = signals
    .filter(
      (s) =>
        s.verdict === "FAIL" &&
        sevRank(s.severity) >= failSeverityRank &&
        (s.confidence ?? 0) >= policy.minFailConfidence
    )
    .map((s) => ({
      type: s.type,
      severity: s.severity,
      confidence: s.confidence ?? 0,
      verdict: "FAIL" as const,
    }));

  if (blockingSignals.length) gatingOk = false;

  // If everything is data gap and no computed warnings/fails, treat as PASS but tag gaps
  const anyNonGap = signals.some((s) => s.verdict !== "DATA_GAP");
  const finalVerdict: IntegrityVerdict = anyNonGap ? derivedVerdict : "PASS";

  if (!anyNonGap) {
    verifyTags.push("VERIFY_OK");
    verifyTags.push("INTEGRITY_DATA_GAPS");
  } else if (finalVerdict === "FAIL") {
    verifyTags.push("VERIFY_FAIL");
  } else if (finalVerdict === "WARN") {
    verifyTags.push("VERIFY_WARN");
  } else {
    verifyTags.push("VERIFY_OK");
  }

  const ok = true;

  const failure: MarketIntegrityEvidenceFailure = blockingSignals.length
    ? {
        code: "POLICY_BLOCKING_FAIL",
        blockingSignals,
        policyApplied: { failOn: policy.failOn, minFailConfidence: policy.minFailConfidence },
      }
    : {
        code: "NONE",
        blockingSignals: [],
        policyApplied: { failOn: policy.failOn, minFailConfidence: policy.minFailConfidence },
      };

  const summary =
    finalVerdict === "FAIL"
      ? "Market integrity risk detected (Phase 1 signatures)."
      : finalVerdict === "WARN"
      ? "Market integrity warnings present (Phase 1 signatures)."
      : "No integrity failures detected (Phase 1).";

  return {
    ok,
    gatingOk,
    ladderLevel: "L4_INTEGRITY",
    verdict: finalVerdict,
    severity,
    verifyTags,
    reasons,
    timestamp: t,
    venue,
    symbol,
    freshnessMs: { latestPoint: freshnessLatest, maxAgeMs },
    signals,
    failure,
    taxonomy: taxonomyEnvelope,
    summary,
  };
}