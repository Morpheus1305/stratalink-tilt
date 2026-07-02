// server/services/poliEngine.ts
// PoLi Engine  -  consumes DACT (tape events) and produces PoLi snapshots + evidence table
// This is the clean separation: DACT is ground truth, PoLi is interpretation.

import {
  computePoLiRating,
  isLiquidityReal,
  getPoLiInterpretation,
  type PoLiRating,
} from "../../shared/liquidity-truth";

// Inlined types (liquidityTape.ts removed per strip-list Phase 1)
type LiquidityVenue = string;

type DepthPayload = {
  side?: "bid" | "ask";
  depthUsd?: number;
  notionalUsd?: number;
  provenance?: { sourceVenue?: string; transport?: string };
};

type SpreadPayload = {
  spreadBps?: number;
};

type ImbalancePayload = {
  imbalancePct?: number;
};

type LiquidityTapeEvent = {
  id: string;
  ts: number;
  type: string;
  venue: LiquidityVenue;
  symbol: string;
  payload: DepthPayload | SpreadPayload | ImbalancePayload | Record<string, unknown>;
};

export type PoLiSnapshot = {
  venue: LiquidityVenue;
  symbol: string;
  ts: number;
  score: number;
  rating: PoLiRating;
  isReal: boolean;
  components: {
    depthScore: number;
    balanceScore: number;
    spreadScore: number;
  };
  interpretation: string;
  evidenceCount: number;
  provenance: {
    dactVersion: string;
    eventsConsumed: number;
    oldestEventTs: number | null;
    newestEventTs: number | null;
  };
};

export type PoLiEvidenceRow = {
  eventId: string;
  ts: number;
  type: string;
  venue: LiquidityVenue;
  symbol: string;
  contribution: "depth" | "spread" | "imbalance" | "other";
  value: number;
  weight: number;
};

export type PoLiEvidenceTable = {
  venue: LiquidityVenue;
  symbol: string;
  generatedAt: number;
  rows: PoLiEvidenceRow[];
};

const DACT_VERSION = "v0.1";
const SNAPSHOT_WINDOW_MS = 60_000;

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function validateBinanceProvenance(event: LiquidityTapeEvent): boolean {
  if (event.venue !== "binance") return true;

  const provenance = (event.payload as any)?.provenance;
  if (!provenance) return false;
  if (provenance.sourceVenue !== "binance") return false;
  if (provenance.transport !== "relay") return false;
  return true;
}

function computeDepthScore(depthEvents: LiquidityTapeEvent[]): number {
  if (depthEvents.length === 0) return 0;

  let totalDepthUsd = 0;
  for (const e of depthEvents) {
    const payload = e.payload as DepthPayload;
    totalDepthUsd += payload.notionalUsd ?? payload.depthUsd ?? 0;
  }

  const avgDepth = totalDepthUsd / depthEvents.length;
  if (avgDepth >= 10_000_000) return 40;
  if (avgDepth >= 5_000_000) return 35;
  if (avgDepth >= 2_000_000) return 30;
  if (avgDepth >= 1_000_000) return 25;
  if (avgDepth >= 500_000) return 20;
  if (avgDepth >= 100_000) return 15;
  if (avgDepth > 0) return 10;
  return 0;
}

function computeSpreadScore(spreadEvents: LiquidityTapeEvent[]): number {
  if (spreadEvents.length === 0) return 0;

  let totalSpreadBps = 0;
  for (const e of spreadEvents) {
    const payload = e.payload as SpreadPayload;
    totalSpreadBps += payload.spreadBps ?? 0;
  }

  const avgSpread = totalSpreadBps / spreadEvents.length;
  if (avgSpread <= 1) return 25;
  if (avgSpread <= 2) return 22;
  if (avgSpread <= 5) return 18;
  if (avgSpread <= 10) return 14;
  if (avgSpread <= 25) return 10;
  if (avgSpread <= 50) return 6;
  return 2;
}

function computeBalanceScore(imbalanceEvents: LiquidityTapeEvent[], depthEvents: LiquidityTapeEvent[]): number {
  let avgImbalance = 50;

  if (imbalanceEvents.length > 0) {
    let totalImbalance = 0;
    for (const e of imbalanceEvents) {
      const payload = e.payload as ImbalancePayload;
      totalImbalance += Math.abs(payload.imbalancePct ?? 0);
    }
    avgImbalance = totalImbalance / imbalanceEvents.length;
  } else if (depthEvents.length >= 2) {
    const bids = depthEvents.filter(e => (e.payload as DepthPayload).side === "bid");
    const asks = depthEvents.filter(e => (e.payload as DepthPayload).side === "ask");
    const bidTotal = bids.reduce((sum, e) => sum + ((e.payload as DepthPayload).notionalUsd ?? 0), 0);
    const askTotal = asks.reduce((sum, e) => sum + ((e.payload as DepthPayload).notionalUsd ?? 0), 0);
    const total = bidTotal + askTotal;
    if (total > 0) {
      avgImbalance = Math.abs((bidTotal - askTotal) / total) * 100;
    }
  }

  if (avgImbalance <= 5) return 35;
  if (avgImbalance <= 10) return 30;
  if (avgImbalance <= 20) return 25;
  if (avgImbalance <= 30) return 20;
  if (avgImbalance <= 50) return 15;
  return 10;
}

function buildEvidenceTable(
  venue: LiquidityVenue,
  symbol: string,
  events: LiquidityTapeEvent[]
): PoLiEvidenceTable {
  const rows: PoLiEvidenceRow[] = [];

  for (const e of events) {
    let contribution: "depth" | "spread" | "imbalance" | "other" = "other";
    let value = 0;
    let weight = 1;

    if (e.type === "DEPTH_UPDATE") {
      contribution = "depth";
      const p = e.payload as DepthPayload;
      value = p.notionalUsd ?? p.depthUsd ?? 0;
      weight = 2;
    } else if (e.type === "SPREAD_UPDATE") {
      contribution = "spread";
      const p = e.payload as SpreadPayload;
      value = p.spreadBps ?? 0;
      weight = 1.5;
    } else if (e.type === "IMBALANCE") {
      contribution = "imbalance";
      const p = e.payload as ImbalancePayload;
      value = p.imbalancePct ?? 0;
      weight = 1;
    }

    rows.push({
      eventId: e.id,
      ts: e.ts,
      type: e.type,
      venue: e.venue,
      symbol: e.symbol,
      contribution,
      value,
      weight,
    });
  }

  return {
    venue,
    symbol,
    generatedAt: Date.now(),
    rows,
  };
}

export function consumeDACTEvents(
  venue: LiquidityVenue,
  symbol: string,
  windowMs: number = SNAPSHOT_WINDOW_MS
): { events: LiquidityTapeEvent[]; rejected: number } {
  const now = Date.now();
  const since = now - windowMs;

  // Tape store removed (strip-list Phase 1). consumeDACTEvents returns empty;
  // PoLi scoring now driven by TSLE buffer via getCachedPoLiSnapshot callers.
  void since;
  return { events: [], rejected: 0 };
}

export function computePoLiSnapshot(
  venue: LiquidityVenue,
  symbol: string,
  windowMs: number = SNAPSHOT_WINDOW_MS
): PoLiSnapshot {
  const { events, rejected } = consumeDACTEvents(venue, symbol, windowMs);

  const depthEvents = events.filter(e => e.type === "DEPTH_UPDATE");
  const spreadEvents = events.filter(e => e.type === "SPREAD_UPDATE");
  const imbalanceEvents = events.filter(e => e.type === "IMBALANCE");

  const depthScore = computeDepthScore(depthEvents);
  const spreadScore = computeSpreadScore(spreadEvents);
  const balanceScore = computeBalanceScore(imbalanceEvents, depthEvents);

  const rawScore = depthScore + spreadScore + balanceScore;
  const score = clampScore(rawScore);
  const rating = computePoLiRating(score);
  const isReal = isLiquidityReal(score);
  const interpretation = getPoLiInterpretation(score);

  const timestamps = events.map(e => e.ts);
  const oldestEventTs = timestamps.length > 0 ? Math.min(...timestamps) : null;
  const newestEventTs = timestamps.length > 0 ? Math.max(...timestamps) : null;

  return {
    venue,
    symbol: symbol.toUpperCase(),
    ts: Date.now(),
    score,
    rating,
    isReal,
    components: {
      depthScore,
      balanceScore,
      spreadScore,
    },
    interpretation,
    evidenceCount: events.length,
    provenance: {
      dactVersion: DACT_VERSION,
      eventsConsumed: events.length,
      oldestEventTs,
      newestEventTs,
    },
  };
}

export function getPoLiEvidence(
  venue: LiquidityVenue,
  symbol: string,
  windowMs: number = SNAPSHOT_WINDOW_MS
): PoLiEvidenceTable {
  const { events } = consumeDACTEvents(venue, symbol, windowMs);
  return buildEvidenceTable(venue, symbol, events);
}

export function getPoLiWithEvidence(
  venue: LiquidityVenue,
  symbol: string,
  windowMs: number = SNAPSHOT_WINDOW_MS
): { snapshot: PoLiSnapshot; evidence: PoLiEvidenceTable } {
  const snapshot = computePoLiSnapshot(venue, symbol, windowMs);
  const evidence = getPoLiEvidence(venue, symbol, windowMs);
  return { snapshot, evidence };
}

const snapshotCache = new Map<string, { snapshot: PoLiSnapshot; expiresAt: number }>();
const CACHE_TTL_MS = 5_000;

export function getCachedPoLiSnapshot(
  venue: LiquidityVenue,
  symbol: string,
  windowMs: number = SNAPSHOT_WINDOW_MS
): PoLiSnapshot {
  const key = `${venue}:${symbol.toUpperCase()}`;
  const now = Date.now();

  const cached = snapshotCache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.snapshot;
  }

  const snapshot = computePoLiSnapshot(venue, symbol, windowMs);
  snapshotCache.set(key, { snapshot, expiresAt: now + CACHE_TTL_MS });
  return snapshot;
}

export function clearPoLiCache(): void {
  snapshotCache.clear();
}
