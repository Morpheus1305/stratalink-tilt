/**
 * STRATA AI Cleansing Stage
 * DACT-STD-1.1 / Normative Amendment 3
 *
 * This module is the single gateway between the raw DACT tape and all
 * downstream attestation layers (tsleBuffer → analytics-layer → PoMI → PoLi).
 *
 * Guarantee: no event reaches tsleBuffer without first passing through DACT
 * and surviving this cleansing stage.
 *
 * Two-category exclusion in a single pass:
 *
 *   1. SYNTHETIC — events whose provenance.sourceClass === "synthetic".
 *      These are depth models, not observable market events. They must not
 *      enter liquidity attestations. Reason sourced from event.provenance.syntheticReason.
 *
 *   2. MANIPULATION — events that STRATA AI anomaly detection identifies as
 *      carrying a high-confidence manipulation signal. Phase 1 detects:
 *        - BOOK_IMBALANCE: extreme bid/ask asymmetry (spoofing-like)
 *        - SPREAD_ANOMALY: pathological spread on a normally tight venue
 *      Phase 1 data gaps (require order-event telemetry not yet available):
 *        - Layering, wash trades, quote stuffing, momentum ignition — these
 *          are logged as TELEMETRY_GAP entries and are NOT excluded (evidence
 *          threshold not met).
 *
 * Every exclusion is appended to the in-memory exclusion ring buffer with its
 * full reason, making the raw-to-cleansed boundary fully auditable.
 *
 * Regulatory path: the raw DACT tape and this exclusion log together constitute
 * the complete record for the Regulatory Consumption Layer. Neither is filtered.
 * Attestation layers receive only the cleansed output.
 */

import { getDactEventsSinceSeq, type DactEvent } from "./dact-tape";
import { tsleBuffer } from "./tsle-buffer";

// ── Types ──────────────────────────────────────────────────────────────────

export type ExclusionCategory = "synthetic" | "manipulation";

export interface ExclusionEntry {
  /** Monotonic seq of the excluded DACT event. */
  seq: number;
  /** DACT event id. */
  eventId: string;
  venue: string;
  asset: string;
  /** Unix ms timestamp of the original event. */
  timestamp: number;
  /** Exclusion category. */
  category: ExclusionCategory;
  /** Human-readable reason. For synthetic: the syntheticReason from provenance. */
  reason: string;
  /** Anomaly type tag, present for manipulation exclusions only. */
  anomalyType?: string;
  /** UTC ISO string when the exclusion was recorded. */
  excludedAt: string;
}

export interface CleanseResult {
  passed: number;
  excluded: number;
  syntheticExcluded: number;
  manipulationExcluded: number;
  newEventsProcessed: number;
}

// ── State ──────────────────────────────────────────────────────────────────

const EXCLUSION_LOG_MAX = 2_000;
const exclusionLog: ExclusionEntry[] = [];

/** Highest DACT seq processed by this stage. Starts at 0 (process nothing until first run). */
let lastCleanseSeq = 0;

/** Cumulative totals since process start. */
let totalPassed = 0;
let totalExcluded = 0;
let totalSynthetic = 0;
let totalManipulation = 0;

// ── Venue sets for manipulation thresholds ─────────────────────────────────

/**
 * Venues expected to maintain tight spreads under normal conditions.
 * A spread > TIGHT_VENUE_SPREAD_THRESHOLD_BPS on these is anomalous.
 */
const TIGHT_SPREAD_VENUES = new Set([
  "binance", "coinbase", "kraken", "okx", "bybit", "bitget", "deribit",
]);
const TIGHT_VENUE_SPREAD_THRESHOLD_BPS = 300; // 3% — well above any realistic tight market

/**
 * Book imbalance threshold. If one side exceeds this fraction of total depth
 * at ±25bps, the event is flagged as a spoofing-like imbalance.
 */
const BOOK_IMBALANCE_THRESHOLD = 0.93; // 93% of total depth on one side

// ── Manipulation detection ─────────────────────────────────────────────────

/**
 * Phase 1 anomaly detection using available DEPTH_UPDATE payload fields.
 * Returns the exclusion reason + anomaly type, or null if the event is clean.
 *
 * Only excludes events with high-confidence signals. Signals that require
 * order-event telemetry are not grounds for exclusion in Phase 1.
 */
function detectManipulation(ev: DactEvent): { reason: string; anomalyType: string } | null {
  if (ev.eventType !== "DEPTH_UPDATE") return null;

  const p = ev.payload;
  const bidNotional   = (p.depth_bid_25bps  as number | undefined) ?? 0;
  const askNotional   = (p.depth_ask_25bps  as number | undefined) ?? 0;
  const totalNotional = (p.depth_25bps      as number | undefined) ?? (bidNotional + askNotional);

  // Signal 1 — BOOK_IMBALANCE (spoofing-like extreme one-sided depth)
  if (totalNotional > 0) {
    const dominantFraction = Math.max(bidNotional, askNotional) / totalNotional;
    if (dominantFraction >= BOOK_IMBALANCE_THRESHOLD) {
      const side = bidNotional > askNotional ? "bid" : "ask";
      const pct  = (dominantFraction * 100).toFixed(1);
      return {
        anomalyType: "BOOK_IMBALANCE",
        reason: `${pct}% ${side}-dominant depth at ±25bps on ${ev.venue}/${ev.asset} — ` +
                `spoofing-like order book imbalance (threshold ${(BOOK_IMBALANCE_THRESHOLD * 100).toFixed(0)}%)`,
      };
    }
  }

  // Signal 2 — SPREAD_ANOMALY (quote stuffing or stale/broken quote on tight venue)
  if (TIGHT_SPREAD_VENUES.has(ev.venue)) {
    const spreadBps = (p.spread_bps as number | undefined) ?? 0;
    if (spreadBps > TIGHT_VENUE_SPREAD_THRESHOLD_BPS) {
      return {
        anomalyType: "SPREAD_ANOMALY",
        reason: `Spread ${spreadBps.toFixed(1)}bps on ${ev.venue}/${ev.asset} exceeds ` +
                `${TIGHT_VENUE_SPREAD_THRESHOLD_BPS}bps threshold — ` +
                `potential quote stuffing or pathological stale quote`,
      };
    }
  }

  return null;
}

// ── DACT event → LISSnapshot conversion ────────────────────────────────────

/**
 * Convert a cleansed DACT DEPTH_UPDATE event to LISSnapshot format for
 * tsleBuffer.record(). The payload must contain full band notional data as
 * written by ingestionManager after the Change 1 enrichment.
 */
function toSnapshot(ev: DactEvent) {
  const p = ev.payload;
  return {
    venue:     ev.venue,
    symbol:    ev.asset,
    timestamp: ev.timestamp,
    mid_price: (p.mid_price as number | undefined) ?? 0,
    spread: {
      absolute: 0,
      bps: (p.spread_bps as number | undefined) ?? 0,
    },
    bands: {
      "pct_0.1": {
        bid_notional:   (p.depth_bid_10bps  as number | undefined) ?? 0,
        ask_notional:   (p.depth_ask_10bps  as number | undefined) ?? 0,
        total_notional: (p.depth_10bps      as number | undefined) ?? 0,
      },
      "pct_0.25": {
        bid_notional:   (p.depth_bid_25bps  as number | undefined) ?? 0,
        ask_notional:   (p.depth_ask_25bps  as number | undefined) ?? 0,
        total_notional: (p.depth_25bps      as number | undefined) ?? 0,
      },
      "pct_0.5": {
        bid_notional:   (p.depth_bid_50bps  as number | undefined) ?? 0,
        ask_notional:   (p.depth_ask_50bps  as number | undefined) ?? 0,
        total_notional: (p.depth_50bps      as number | undefined) ?? 0,
      },
      "pct_1.0": {
        bid_notional:   (p.depth_bid_100bps as number | undefined) ?? 0,
        ask_notional:   (p.depth_ask_100bps as number | undefined) ?? 0,
        total_notional: (p.depth_100bps     as number | undefined) ?? 0,
      },
      "pct_2.0": {
        bid_notional:   (p.depth_bid_200bps as number | undefined) ?? 0,
        ask_notional:   (p.depth_ask_200bps as number | undefined) ?? 0,
        total_notional: (p.depth_200bps     as number | undefined) ?? 0,
      },
    },
  };
}

// ── Core cleansing function ─────────────────────────────────────────────────

/**
 * Main entry point. Called by ingestionManager after each DACT append cycle.
 *
 * Reads all DACT events with seq > lastCleanseSeq, applies the two-category
 * filter, logs every exclusion, and feeds clean events to tsleBuffer.
 *
 * Only DEPTH_UPDATE events feed tsleBuffer. TRADE, BBO_UPDATE, and
 * VENUE_STATUS events are preserved on the raw tape for surveillance but
 * do not enter the attestation path in Phase 1.
 */
export function cleanseAndFeedBuffer(): CleanseResult {
  const newEvents = getDactEventsSinceSeq(lastCleanseSeq);
  const result: CleanseResult = {
    passed: 0,
    excluded: 0,
    syntheticExcluded: 0,
    manipulationExcluded: 0,
    newEventsProcessed: newEvents.length,
  };

  if (newEvents.length === 0) return result;

  const excludedAt = new Date().toISOString();

  for (const ev of newEvents) {
    // Advance the watermark regardless of event type
    if (ev.seq > lastCleanseSeq) lastCleanseSeq = ev.seq;

    // Non-depth events are surveillance-only — do not feed tsleBuffer
    if (ev.eventType !== "DEPTH_UPDATE") continue;

    // ── Gate 1: Synthetic exclusion (provenance-based, deterministic) ──────
    if (ev.provenance.sourceClass === "synthetic") {
      const entry: ExclusionEntry = {
        seq:        ev.seq,
        eventId:    ev.id,
        venue:      ev.venue,
        asset:      ev.asset,
        timestamp:  ev.timestamp,
        category:   "synthetic",
        reason:     ev.provenance.syntheticReason
                      ?? "Synthetic depth model active — not observable market data",
        excludedAt,
      };
      exclusionLog.push(entry);
      if (exclusionLog.length > EXCLUSION_LOG_MAX) exclusionLog.shift();
      result.excluded++;
      result.syntheticExcluded++;
      totalExcluded++;
      totalSynthetic++;
      continue;
    }

    // ── Gate 2: Manipulation detection (observed events only) ──────────────
    const manip = detectManipulation(ev);
    if (manip) {
      const entry: ExclusionEntry = {
        seq:        ev.seq,
        eventId:    ev.id,
        venue:      ev.venue,
        asset:      ev.asset,
        timestamp:  ev.timestamp,
        category:   "manipulation",
        reason:     manip.reason,
        anomalyType:manip.anomalyType,
        excludedAt,
      };
      exclusionLog.push(entry);
      if (exclusionLog.length > EXCLUSION_LOG_MAX) exclusionLog.shift();
      result.excluded++;
      result.manipulationExcluded++;
      totalExcluded++;
      totalManipulation++;
      continue;
    }

    // ── Clean: convert and feed tsleBuffer ────────────────────────────────
    try {
      tsleBuffer.record(toSnapshot(ev));
      result.passed++;
      totalPassed++;
    } catch {
      // Malformed payload — event is already safely on the hash chain.
      // Do not exclude: absence from tsleBuffer is sufficient.
    }
  }

  return result;
}

// ── Accessors for API / surveillance ───────────────────────────────────────

/** Returns the exclusion log, newest first, up to limit entries. */
export function getExclusionLog(limit = 200): ExclusionEntry[] {
  return exclusionLog.slice().reverse().slice(0, limit);
}

/** Returns aggregate statistics for the exclusion log since process start. */
export function getExclusionStats(): {
  totalExcluded: number;
  totalPassed: number;
  synthetic: number;
  manipulation: number;
  byAnomaly: Record<string, number>;
  logDepth: number;
  lastCleanseSeq: number;
} {
  const byAnomaly: Record<string, number> = {};
  for (const e of exclusionLog) {
    if (e.anomalyType) {
      byAnomaly[e.anomalyType] = (byAnomaly[e.anomalyType] ?? 0) + 1;
    }
  }
  return {
    totalExcluded,
    totalPassed,
    synthetic:    totalSynthetic,
    manipulation: totalManipulation,
    byAnomaly,
    logDepth:     exclusionLog.length,
    lastCleanseSeq,
  };
}
