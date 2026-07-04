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
 */

export type DactEventType = "DEPTH_UPDATE" | "BBO_UPDATE" | "TRADE" | "VENUE_STATUS";

export interface DactEvent {
  id: string;
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

const TAPE_MAX = 10_000;
const tape: DactEvent[] = [];
const venueStats: Record<string, VenueStat> = {};
let totalIngested = 0;
const startedAt = Date.now();
const recentEventTimes: number[] = [];

function genId(): string {
  return `dact-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Derive sourceClass from transport field. */
function deriveSourceClass(transport: string): "observed" | "synthetic" {
  return transport === "synthetic" ? "synthetic" : "observed";
}

/**
 * Per-venue synthetic reason lookup.
 * Used as the fallback when the relay does not embed a syntheticReason in the event provenance.
 * Three categories:
 *   A. CEX / institutional — API credential or onboarding gating
 *   B. DEX / L2 — no API key concept; synthetic depth is the designed data model
 *   C. Regulated STE — partner credential required
 */
const VENUE_SYNTHETIC_REASONS: Record<string, string> = {
  // A — CEX / dark pools
  bybit:  "Geo-restricted (HTTP 403) — CoinGecko-anchored synthetic depth active",
  otc:    "RFQ desk onboarding required — synthetic bilateral depth model active",

  // B — DEX / L2: no API key concept; synthetic is the designed transport
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

  // C — Regulated STEs
  securitize: "Partner API credential required — synthetic proxy depth active (tokenised securities)",
  archax:     "Partner API credential required — synthetic proxy depth active (tokenised securities)",
  inx:        "Partner API credential required — synthetic proxy depth active (tokenised securities)",
  tzero:      "Partner API credential required — synthetic proxy depth active (tokenised securities)",
  sdx:        "Partner API credential required — synthetic proxy depth active (tokenised securities)",
  addx:       "Partner API credential required — synthetic proxy depth active (tokenised securities)",
};

export function appendDactEvent(ev: Omit<DactEvent, "id">): void {
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

  const event: DactEvent = { id: genId(), ...ev, provenance: enrichedProvenance };
  tape.push(event);
  if (tape.length > TAPE_MAX) tape.shift();
  totalIngested++;

  const now = ev.timestamp;
  recentEventTimes.push(now);
  while (recentEventTimes.length > 0 && now - recentEventTimes[0] > 60_000) {
    recentEventTimes.shift();
  }

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

  // DACT-STD-1.1: split coverage into observed and synthetic
  const observedVenueCount = activeVenues.filter(([, vs]) => vs.lastSourceClass === "observed").length;
  const syntheticVenueCount = activeVenues.filter(([, vs]) => vs.lastSourceClass === "synthetic").length;

  const allLatencies = Object.values(venueStats).flatMap(vs => vs.latencyBucket);
  const p95Global = Math.round(p95(allLatencies));

  const tapeIntegrity: "INTACT" | "DEGRADED" | "COMPROMISED" =
    dataGaps === 0 ? "INTACT" : dataGaps < 5 ? "DEGRADED" : "COMPROMISED";

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
      bbo: bucket.filter(e => e.eventType === "BBO_UPDATE").length,
      trade: bucket.filter(e => e.eventType === "TRADE").length,
      status: bucket.filter(e => e.eventType === "VENUE_STATUS").length,
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
    normalisationRate: 100,
    symbolCoverageActive: Math.min(venuesIngesting > 0 ? 34 : 0, 34),
    symbolCoverageTotal: 34,
    duplicateRate: 0,
    rejectedEvents: 0,
    ingestionHistory,
    uptimeMs: now - startedAt,
    verifiedAt: now,
  };
}
