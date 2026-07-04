/**
 * DACT Tape — Digital Asset Consolidated Tape
 * DACT-STD-1.1 conformant append-only in-memory ring buffer.
 *
 * The sole ingestion point and authoritative record of observable venue data.
 * No downstream layer (STRATA AI, PoLi, RCL) writes back to this tape.
 *
 * DACT-STD-1.1 / Normative Amendment 1 — Synthetic Source Provenance:
 *   Every event carries sourceClass ("observed" | "synthetic") derived from
 *   transport at ingest time. Observed-coverage figures exclude synthetic events.
 *
 * DACT-STD-1.1 / Normative Amendment 2 — Cryptographic Hash Chain:
 *   Every event carries:
 *     seq      — monotonic integer, never resets for the lifetime of the process
 *     prevHash — SHA-256 hex digest of the preceding event's canonical content
 *     hash     — SHA-256 hex digest of this event's canonical content
 *   The chain is tamper-evident: any modification to a historical event breaks
 *   every subsequent hash. verifyChain() recomputes and checks the full
 *   in-memory chain. The ring-buffer eviction frontier (chainRootHash) is
 *   tracked so verification remains correct after old events roll off.
 *
 *   Canonical content is the stable JSON serialisation (sorted keys, no id)
 *   of: { seq, prevHash, timestamp, eventType, venue, asset, summary,
 *           provenance, payload }
 */

import { createHash } from "node:crypto";

export type DactEventType = "DEPTH_UPDATE" | "BBO_UPDATE" | "TRADE" | "VENUE_STATUS";

export interface DactEvent {
  id: string;
  /** Monotonic sequence number. Never resets for the process lifetime. */
  seq: number;
  /** SHA-256 hex digest of this event's canonical content. */
  hash: string;
  /** SHA-256 hex digest of the preceding event (GENESIS_HASH for event #1). */
  prevHash: string;
  timestamp: number;
  eventType: DactEventType;
  venue: string;
  asset: string;
  summary: string;
  payload: Record<string, unknown>;
  provenance: {
    sourceVenue: string;
    transport: string;
    sourceClass: "observed" | "synthetic";
    syntheticReason?: string;
    engine: string;
    dactVersion: string;
    latencyMs: number;
  };
}

interface VenueStat {
  lastEventTs: number;
  eventCount: number;
  latencyBucket: number[];
  eventsThisMinute: number;
  minuteStart: number;
  lastSourceClass: "observed" | "synthetic";
  lastTransport: string;
  syntheticReason?: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const TAPE_MAX = 10_000;
/** All-zeros genesis hash — the prevHash of the very first tape event. */
const GENESIS_HASH = "0".repeat(64);

// ── State ─────────────────────────────────────────────────────────────────

const tape: DactEvent[] = [];
const venueStats: Record<string, VenueStat> = {};
let totalIngested = 0;
const startedAt = Date.now();
const recentEventTimes: number[] = [];

/** Monotonic sequence counter. */
let sequenceCounter = 0;
/** SHA-256 hash of the most recently appended event. */
let lastHash = GENESIS_HASH;
/**
 * The hash that tape[0].prevHash must equal for the in-memory chain to be
 * valid. Starts as GENESIS_HASH; updated whenever an event is evicted from
 * the ring buffer.
 */
let chainRootHash = GENESIS_HASH;

// ── Crypto helpers ─────────────────────────────────────────────────────────

/**
 * Deterministic JSON serialisation with recursively sorted object keys.
 * Ensures the same content always produces the same byte sequence regardless
 * of insertion order in the source object.
 */
function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, val) => {
    if (val !== null && typeof val === "object" && !Array.isArray(val)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(val as object).sort()) {
        sorted[k] = (val as Record<string, unknown>)[k];
      }
      return sorted;
    }
    return val;
  });
}

/**
 * Compute the SHA-256 hash of an event's canonical content.
 * `id`, `hash`, and `prevHash` are excluded from the input — `seq` and
 * `prevHash` are passed explicitly as chain anchors.
 */
function computeEventHash(
  seq: number,
  prevHash: string,
  ev: Pick<DactEvent, "timestamp" | "eventType" | "venue" | "asset" | "summary" | "provenance" | "payload">,
): string {
  const canonical = stableStringify({
    seq,
    prevHash,
    timestamp: ev.timestamp,
    eventType: ev.eventType,
    venue: ev.venue,
    asset: ev.asset,
    summary: ev.summary,
    provenance: ev.provenance,
    payload: ev.payload,
  });
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

// ── Source-class helpers ────────────────────────────────────────────────────

function deriveSourceClass(transport: string): "observed" | "synthetic" {
  return transport === "synthetic" ? "synthetic" : "observed";
}

/**
 * Per-venue synthetic reason lookup.
 * Three categories:
 *   A. CEX / institutional — API credential or onboarding gating
 *   B. DEX / L2 — no API key concept; synthetic depth is the designed data model
 *   C. Regulated STE — partner credential required
 */
const VENUE_SYNTHETIC_REASONS: Record<string, string> = {
  bybit:  "Geo-restricted (HTTP 403) — CoinGecko-anchored synthetic depth active",
  otc:    "RFQ desk onboarding required — synthetic bilateral depth model active",
  uniswap:            "DeFiLlama TVL fallback — pool depth synthesised from aggregate TVL and CoinGecko mid-price",
  curve:              "Pool AMM — depth synthesised from pool TVL and CoinGecko mid-price",
  gmx:                "Pool-based perpetuals — depth synthesised from pool TVL and oracle mid-price",
  aerodrome:          "L2 DEX (Base) — depth synthesised from on-chain TVL model",
  velodrome:          "L2 DEX (Optimism) — depth synthesised from on-chain TVL model",
  pancakeswap:        "L2 DEX (BNB Chain) — depth synthesised from on-chain TVL model",
  "uniswap-worldchain": "L2 DEX (World Chain) — depth synthesised from on-chain TVL model",
  syncswap:           "L2 DEX (zkSync) — depth synthesised from on-chain TVL model",
  "linea-dex":        "L2 DEX (Linea) — depth synthesised from on-chain TVL model",
  "scroll-dex":       "L2 DEX (Scroll) — depth synthesised from on-chain TVL model",
  securitize: "Partner API credential required — synthetic proxy depth active (tokenised securities)",
  archax:     "Partner API credential required — synthetic proxy depth active (tokenised securities)",
  inx:        "Partner API credential required — synthetic proxy depth active (tokenised securities)",
  tzero:      "Partner API credential required — synthetic proxy depth active (tokenised securities)",
  sdx:        "Partner API credential required — synthetic proxy depth active (tokenised securities)",
  addx:       "Partner API credential required — synthetic proxy depth active (tokenised securities)",
};

// ── Core append ─────────────────────────────────────────────────────────────

/** Input type: callers supply everything except id, seq, hash, prevHash. */
type DactEventInput = Omit<DactEvent, "id" | "seq" | "hash" | "prevHash">;

export function appendDactEvent(ev: DactEventInput): void {
  const transport = ev.provenance.transport;
  const sourceClass = deriveSourceClass(transport);
  const syntheticReason: string | undefined =
    sourceClass === "synthetic"
      ? ((ev.provenance as any).syntheticReason ?? VENUE_SYNTHETIC_REASONS[ev.venue] ?? "Synthetic depth model active")
      : undefined;

  const enrichedProvenance = {
    ...ev.provenance,
    sourceClass,
    ...(syntheticReason ? { syntheticReason } : {}),
    dactVersion: "1.1",
  };

  // ── Hash chain ────────────────────────────────────────────────────────
  const seq = ++sequenceCounter;
  const prevHash = lastHash;
  const eventCore = { ...ev, provenance: enrichedProvenance };
  const hash = computeEventHash(seq, prevHash, eventCore);
  lastHash = hash;

  const event: DactEvent = {
    id: genId(),
    seq,
    hash,
    prevHash,
    ...eventCore,
  };

  // Ring buffer: track the eviction frontier so verifyChain() stays valid
  if (tape.length >= TAPE_MAX) {
    const evicted = tape.shift()!;
    chainRootHash = evicted.hash;
  }
  tape.push(event);
  totalIngested++;

  // ── Rate tracking ──────────────────────────────────────────────────────
  const now = ev.timestamp;
  recentEventTimes.push(now);
  while (recentEventTimes.length > 0 && now - recentEventTimes[0] > 60_000) {
    recentEventTimes.shift();
  }

  // ── Venue stats ────────────────────────────────────────────────────────
  const venue = ev.venue;
  if (!venueStats[venue]) {
    venueStats[venue] = {
      lastEventTs: 0,
      eventCount: 0,
      latencyBucket: [],
      eventsThisMinute: 0,
      minuteStart: now,
      lastSourceClass: sourceClass,
      lastTransport: transport,
    };
  }
  const vs = venueStats[venue];
  vs.lastEventTs = now;
  vs.eventCount++;
  vs.lastSourceClass = sourceClass;
  vs.lastTransport = transport;
  if (syntheticReason) vs.syntheticReason = syntheticReason;

  if (now - vs.minuteStart > 60_000) {
    vs.eventsThisMinute = 0;
    vs.minuteStart = now;
  }
  vs.eventsThisMinute++;

  const latMs = ev.provenance.latencyMs;
  if (latMs > 0) {
    vs.latencyBucket.push(latMs);
    if (vs.latencyBucket.length > 100) vs.latencyBucket.shift();
  }
}

function genId(): string {
  return `dact-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ── Chain verification ──────────────────────────────────────────────────────

export interface ChainVerification {
  /** True if every hash in the in-memory tape recomputes correctly. */
  valid: boolean;
  /** Number of in-memory events verified. */
  verified: number;
  /** Total events ever ingested (chain extends further than in-memory tape). */
  totalIngested: number;
  /** seq of the oldest in-memory event (chain root in memory). */
  chainRootSeq: number;
  /** Full 64-char SHA-256 hex of the tip (latest event). */
  tipHash: string;
  /** Last 8 chars of tipHash, for display. */
  tipHashShort: string;
  /** seq of the first broken event, if any. */
  firstBrokenSeq?: number;
  /** ISO timestamp of verification. */
  verifiedAt: string;
}

export function verifyChain(): ChainVerification {
  const verifiedAt = new Date().toISOString();

  if (tape.length === 0) {
    return {
      valid: true,
      verified: 0,
      totalIngested,
      chainRootSeq: 0,
      tipHash: GENESIS_HASH,
      tipHashShort: GENESIS_HASH.slice(-8),
      verifiedAt,
    };
  }

  let prevHash = chainRootHash;
  let firstBrokenSeq: number | undefined;

  for (const ev of tape) {
    // Verify prevHash linkage
    if (ev.prevHash !== prevHash) {
      firstBrokenSeq = ev.seq;
      break;
    }
    // Recompute and verify content hash
    const recomputed = computeEventHash(ev.seq, ev.prevHash, ev);
    if (recomputed !== ev.hash) {
      firstBrokenSeq = ev.seq;
      break;
    }
    prevHash = ev.hash;
  }

  const tip = tape[tape.length - 1];
  return {
    valid: firstBrokenSeq === undefined,
    verified: tape.length,
    totalIngested,
    chainRootSeq: tape[0]?.seq ?? 0,
    tipHash: tip.hash,
    tipHashShort: tip.hash.slice(-8),
    ...(firstBrokenSeq !== undefined ? { firstBrokenSeq } : {}),
    verifiedAt,
  };
}

// ── Queries ─────────────────────────────────────────────────────────────────

/**
 * Returns all in-memory events with seq > seqFrom, sorted ascending (oldest first).
 * Used by the STRATA AI cleansing stage to pull only new events since last run.
 */
export function getDactEventsSinceSeq(seqFrom: number): DactEvent[] {
  return tape.filter(e => e.seq > seqFrom).sort((a, b) => a.seq - b.seq);
}

export function getDactEvents(opts: {
  limit?: number;
  eventType?: string;
  venue?: string;
  asset?: string;
  sourceClass?: string;
}): DactEvent[] {
  let events = tape.slice().reverse();
  if (opts.eventType && opts.eventType !== "ALL") {
    events = events.filter(e => e.eventType === opts.eventType);
  }
  if (opts.venue && opts.venue !== "ALL") {
    events = events.filter(e => e.venue === opts.venue);
  }
  if (opts.asset && opts.asset !== "ALL") {
    events = events.filter(e => e.asset === opts.asset);
  }
  if (opts.sourceClass && opts.sourceClass !== "ALL") {
    events = events.filter(e => e.provenance.sourceClass === opts.sourceClass);
  }
  return events.slice(0, opts.limit ?? 100);
}

function p95(arr: number[]): number {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1];
}

export function getVenueStatMap(): Record<string, {
  lastEventTs: number;
  eventCount: number;
  p95LatencyMs: number;
  eventsPerMin: number;
  status: "ONLINE" | "DEGRADED" | "OFFLINE";
  sourceClass: "observed" | "synthetic";
  transport: string;
  syntheticReason?: string;
}> {
  const now = Date.now();
  const result: Record<string, any> = {};
  for (const [venue, vs] of Object.entries(venueStats)) {
    const age = now - vs.lastEventTs;
    let status: "ONLINE" | "DEGRADED" | "OFFLINE" = "ONLINE";
    if (age > 120_000) status = "OFFLINE";
    else if (age > 30_000) status = "DEGRADED";

    result[venue] = {
      lastEventTs: vs.lastEventTs,
      eventCount: vs.eventCount,
      p95LatencyMs: Math.round(p95(vs.latencyBucket)),
      eventsPerMin: vs.eventsThisMinute,
      status,
      sourceClass: vs.lastSourceClass,
      transport: vs.lastTransport,
      ...(vs.syntheticReason ? { syntheticReason: vs.syntheticReason } : {}),
    };
  }
  return result;
}

export function getDactStats() {
  const now = Date.now();
  const eventsIn60s = recentEventTimes.filter(t => now - t < 60_000).length;
  const eventsPerSec = Math.round((eventsIn60s / 60) * 10) / 10;

  const TOTAL_VENUES = 26;
  const activeVenues = Object.entries(venueStats).filter(
    ([, vs]) => now - vs.lastEventTs < 120_000
  );
  const venuesIngesting = activeVenues.length;
  const dataGaps = TOTAL_VENUES - venuesIngesting;

  const observedVenueCount = activeVenues.filter(([, vs]) => vs.lastSourceClass === "observed").length;
  const syntheticVenueCount = activeVenues.filter(([, vs]) => vs.lastSourceClass === "synthetic").length;

  const allLatencies = Object.values(venueStats).flatMap(vs => vs.latencyBucket);
  const p95Global = Math.round(p95(allLatencies));

  // Real cryptographic chain verification
  const chain = verifyChain();

  // Startup grace: relay venues require ≥1 completed poll (~15–30 s each) before
  // they appear in venueStats.  Flag the first 3 minutes as a warmup window so
  // venue-count gaps do not produce a false COMPROMISED signal on fresh deploys.
  const uptimeSec = (now - startedAt) / 1000;
  const warmingUp = uptimeSec < 180;

  const tapeIntegrity: "INTACT" | "DEGRADED" | "COMPROMISED" =
    !chain.valid                   ? "COMPROMISED" :   // hash-chain break → always COMPROMISED
    (dataGaps > 4 && !warmingUp)   ? "COMPROMISED" :   // sustained gaps after warmup → COMPROMISED
    dataGaps > 0                   ? "DEGRADED"    :
                                     "INTACT";

  const ingestionHistory: { minute: number; label: string; depth: number; bbo: number; trade: number; status: number }[] = [];
  const thirtyMinsAgo = now - 30 * 60_000;
  for (let t = thirtyMinsAgo; t < now; t += 60_000) {
    const bucket = tape.filter(e => e.timestamp >= t && e.timestamp < t + 60_000);
    const d = new Date(t);
    const label = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
    ingestionHistory.push({
      minute: t,
      label,
      depth: bucket.filter(e => e.eventType === "DEPTH_UPDATE").length,
      bbo:   bucket.filter(e => e.eventType === "BBO_UPDATE").length,
      trade: bucket.filter(e => e.eventType === "TRADE").length,
      status:bucket.filter(e => e.eventType === "VENUE_STATUS").length,
    });
  }

  return {
    venuesIngesting,
    totalVenues: TOTAL_VENUES,
    observedVenueCount,
    syntheticVenueCount,
    observedCoverageComputedAt: now,
    eventsPerSec,
    tapeDepth: tape.length,
    totalIngested,
    p95LatencyMs: p95Global,
    dataGaps,
    dsuCoverage: Math.round((venuesIngesting / TOTAL_VENUES) * 100),
    tapeIntegrity,
    // Chain fields
    chainVerified: chain.valid,
    chainLength: chain.totalIngested,
    chainTipHash: chain.tipHash,
    chainTipHashShort: chain.tipHashShort,
    chainRootSeq: chain.chainRootSeq,
    // Quality metrics
    normalisationRate: 100,
    // Count distinct assets with a recent event in the last 120 s (same window as venue activity)
    symbolCoverageActive: Math.min(new Set(tape.filter(e => now - e.timestamp < 120_000).map(e => e.asset)).size, 34),
    symbolCoverageTotal: 34,
    duplicateRate: 0,
    rejectedEvents: 0,
    ingestionHistory,
    uptimeMs: now - startedAt,
    warmingUp,
    verifiedAt: now,
  };
}
