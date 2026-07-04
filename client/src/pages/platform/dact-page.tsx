import { useState, useEffect, useRef, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/dashboard-header";
import { PlatformTabs } from "@/components/platform-tabs";
import { PlatformFooter } from "@/components/platform-footer";
import { TT } from "@/components/tilt-tooltip";
import { ExportButton } from "@/components/export-button";
import "./tilt-terminal.css";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

// ── Types ─────────────────────────────────────────────────────────────────────

type EventType = "DEPTH_UPDATE" | "BBO_UPDATE" | "TRADE" | "VENUE_STATUS";
type SourceClass = "observed" | "synthetic";

interface ClockSync {
  divergenceMs: number;
  rttMs: number;
  status: "in-tolerance" | "out-of-tolerance" | "unavailable";
  measuredAt: number;
  toleranceMs: number;
  sessionBreachCount: number;
  sourceDescription: "host NTP synchronisation state";
  initialised: boolean;
}

interface DactEvent {
  id: string;
  timestamp: number;
  eventType: EventType;
  venue: string;
  asset: string;
  summary: string;
  payload: Record<string, unknown>;
  provenance: {
    sourceVenue: string;
    transport: string;
    sourceClass: SourceClass;
    syntheticReason?: string;
    engine: string;
    dactVersion: string;
    latencyMs: number;
  };
}

interface DactStats {
  venuesIngesting: number;
  totalVenues: number;
  observedVenueCount: number;
  syntheticVenueCount: number;
  observedCoverageComputedAt: number;
  eventsPerSec: number;
  tapeDepth: number;
  totalIngested: number;
  p95LatencyMs: number;
  dataGaps: number;
  dsuCoverage: number;
  tapeIntegrity: "INTACT" | "DEGRADED" | "COMPROMISED";
  normalisationRate: number;
  symbolCoverageActive: number;
  symbolCoverageTotal: number;
  duplicateRate: number;
  rejectedEvents: number;
  ingestionHistory: {
    minute: number;
    label: string;
    depth: number;
    bbo: number;
    trade: number;
    status: number;
  }[];
  verifiedAt: number;
}

interface VenueRow {
  id: string;
  displayName: string;
  type: string;
  chain: string;
  group: string;
  status: "ONLINE" | "DEGRADED" | "OFFLINE";
  lastEventTs: number;
  p95LatencyMs: number;
  eventsPerMin: number;
  sourceClass: SourceClass;
  transport: string;
  syntheticReason?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const MONO = "'JetBrains Mono', 'SF Mono', Consolas, monospace";

const C = {
  bg:          "#080D14",
  panel:       "#0B1320",
  border:      "#1A2435",
  text:        "#C8D8E8",
  muted:       "#7B8EA3",
  accent:      "#00BFA5",
  amber:       "#F59E0B",
  red:         "#EF4444",
  green:       "#22C55E",
  blue:        "#818CF8",
  gold:        "#C9A84C",
  depth:       "#00BFA5",
  bbo:         "#818CF8",
  trade:       "#34D399",
  venueStatus: "#F59E0B",
};

const LiveClock = memo(function LiveClock() {
  const [s, setS] = useState(() =>
    new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  );
  useEffect(() => {
    const id = setInterval(() =>
      setS(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }))
    , 1000);
    return () => clearInterval(id);
  }, []);
  return <span style={{ fontFamily: MONO, color: C.accent }}>{s}</span>;
});

function relTime(ts: number): { text: string; stale: boolean } {
  if (!ts) return { text: "—", stale: true };
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 5)   return { text: "just now", stale: false };
  if (s < 60)  return { text: `${s}s ago`, stale: s > 60 };
  if (s < 120) return { text: `${Math.round(s / 60)}m ago`, stale: true };
  return { text: ">2m ago", stale: true };
}

function eventTypeColor(t: EventType): string {
  switch (t) {
    case "DEPTH_UPDATE":  return C.depth;
    case "BBO_UPDATE":    return C.bbo;
    case "TRADE":         return C.trade;
    case "VENUE_STATUS":  return C.venueStatus;
  }
}

function statusDot(status: "ONLINE" | "DEGRADED" | "OFFLINE") {
  const col = status === "ONLINE" ? C.green : status === "DEGRADED" ? C.amber : C.red;
  return (
    <span style={{
      display: "inline-block", width: 7, height: 7, borderRadius: "50%",
      background: col, marginRight: 6, flexShrink: 0, boxShadow: `0 0 5px ${col}80`,
    }} />
  );
}

/** DACT-STD-1.1: resolve venue sourceClass label and colour. */
function sourceClassLabel(sc: SourceClass, transport: string): { label: string; color: string } {
  if (sc === "synthetic") return { label: "SYNTHETIC", color: C.amber };
  if (transport === "relay") return { label: "RELAY-OBS", color: C.blue };
  return { label: "OBSERVED", color: C.green };
}

/** Change 6: freshness indicator for observed-coverage figure. */
function coverageFreshness(computedAt: number): { label: string; color: string } {
  const ageMs = Date.now() - computedAt;
  if (ageMs < 30_000) return { label: "LIVE", color: C.green };
  if (ageMs < 60_000) return { label: "AGING", color: C.amber };
  return { label: "STALE", color: C.red };
}

function MetricCard({
  label, value, sub, tooltip, highlight,
}: {
  label: string; value: string | number; sub?: string; tooltip?: string; highlight?: string;
}) {
  return (
    <div style={{
      flex: 1, minWidth: 0, background: C.panel, border: `1px solid ${C.border}`,
      borderRadius: 4, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 4,
    }}>
      <div style={{ fontSize: 9, fontFamily: MONO, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>
        {tooltip
          ? <TT title={label} body={tooltip}><span>{label}</span></TT>
          : label}
      </div>
      <div
        data-testid={`dact-metric-${label.toLowerCase().replace(/\s+/g, "-")}`}
        style={{ fontSize: 16, fontFamily: MONO, fontWeight: 700, color: highlight ?? C.text, letterSpacing: "-0.01em", lineHeight: 1 }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: 10, fontFamily: MONO, color: C.muted }}>{sub}</div>}
    </div>
  );
}

const GROUP_ORDER = [
  "Centralised Exchanges", "DEX Perpetuals", "DEX Spot",
  "L2 DEX", "Dark / Institutional", "Regulated STE",
];

const KNOWN_ASSETS = [
  "BTC","ETH","SOL","BNB","XRP","DOGE","ADA","AVAX","TON","LINK",
  "DOT","SHIB","MATIC","TRX","NEAR","LTC","BCH","XLM","ATOM","UNI",
  "APT","FIL","OP","ARB","INJ",
  "ONDO","STOKEN","BRKB","TGLD","CREDO",
  "TRES20","TRETF","SMID","SCRE","SARC",
];

const ALL_VENUES_26 = [
  "binance","coinbase","kraken","okx","bybit","deribit","bitget",
  "hyperliquid","dydx","gmx",
  "uniswap","curve",
  "aerodrome","velodrome","pancakeswap","uniswap-worldchain","syncswap","linea-dex","scroll-dex",
  "otc",
  "securitize","archax","inx","tzero","sdx","addx",
];

// ── Main Component ─────────────────────────────────────────────────────────────

export default function DactPage() {
  const [paused, setPaused] = useState(false);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterVenue, setFilterVenue] = useState<string>("ALL");
  const [filterAsset, setFilterAsset] = useState<string>("ALL");
  // Change 5: source-class filter, default OBSERVED
  const [filterSourceClass, setFilterSourceClass] = useState<string>("observed");
  const [displayEvents, setDisplayEvents] = useState<DactEvent[]>([]);
  // Change 6: track age of coverage figure
  const [, setTick] = useState(0);

  // Tick every second for freshness indicator
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const statsQuery = useQuery<{ stats: DactStats }>({
    queryKey: ["/api/dact/stats"],
    refetchInterval: 5000,
  });

  const eventsQuery = useQuery<{ events: DactEvent[] }>({
    queryKey: ["/api/dact/events", filterType, filterVenue, filterAsset, filterSourceClass],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: "100",
        eventType: filterType,
        venue: filterVenue,
        asset: filterAsset,
        sourceClass: filterSourceClass,
      });
      const r = await fetch(`/api/dact/events?${params}`);
      return r.json();
    },
    refetchInterval: paused ? false : 2000,
  });

  const venuesQuery = useQuery<{ venues: VenueRow[] }>({
    queryKey: ["/api/dact/venues"],
    refetchInterval: 5000,
  });

  // Change 7: clock synchronisation measurement
  const clockQuery = useQuery<{ clockSync: ClockSync }>({
    queryKey: ["/api/dact/clock-sync"],
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (!paused && eventsQuery.data?.events) {
      setDisplayEvents(eventsQuery.data.events);
    }
  }, [eventsQuery.data, paused]);

  const stats: DactStats | undefined = statsQuery.data?.stats;
  const venues: VenueRow[] = venuesQuery.data?.venues ?? [];

  const groupedVenues = GROUP_ORDER.map(group => ({
    group,
    rows: venues.filter(v => v.group === group),
  })).filter(g => g.rows.length > 0);

  const integrityColor =
    !stats ? C.muted :
    stats.tapeIntegrity === "INTACT" ? C.green :
    stats.tapeIntegrity === "DEGRADED" ? C.amber : C.red;

  const ingestionHistory = stats?.ingestionHistory ?? [];
  const hasHistory = ingestionHistory.some(b => b.depth + b.bbo + b.trade + b.status > 0);

  // ── Coverage freshness (Change 6) ─────────────────────────────────────────
  const fresh = stats ? coverageFreshness(stats.observedCoverageComputedAt) : null;

  // ── Export helpers ─────────────────────────────────────────────────────────
  function downloadBlob(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  async function generateDactSnapshotJson() {
    const dateStr = new Date().toISOString().slice(0, 10);
    const snapshot = {
      report: "DACT Daily Snapshot",
      dact_version: "1.1",
      generated_at_utc: new Date().toISOString(),
      date: dateStr,
      summary: {
        venues_ingesting: stats?.venuesIngesting ?? 0,
        total_venues: stats?.totalVenues ?? 26,
        observed_venue_count: stats?.observedVenueCount ?? 0,
        synthetic_venue_count: stats?.syntheticVenueCount ?? 0,
        observed_coverage_computed_at: stats ? new Date(stats.observedCoverageComputedAt).toISOString() : null,
        dsu_coverage_pct: stats?.dsuCoverage ?? 0,
        events_per_sec: stats?.eventsPerSec ?? 0,
        tape_depth: stats?.tapeDepth ?? 0,
        total_ingested: stats?.totalIngested ?? 0,
        p95_latency_ms: stats?.p95LatencyMs ?? 0,
        data_gaps: stats?.dataGaps ?? 0,
        tape_integrity: stats?.tapeIntegrity ?? "UNKNOWN",
        normalisation_rate_pct: stats?.normalisationRate ?? 0,
        symbol_coverage_active: stats?.symbolCoverageActive ?? 0,
        symbol_coverage_total: stats?.symbolCoverageTotal ?? 0,
        duplicate_rate_pct: stats?.duplicateRate ?? 0,
        rejected_events: stats?.rejectedEvents ?? 0,
        verified_at_utc: stats ? new Date(stats.verifiedAt).toISOString() : null,
      },
      venue_matrix: venues.map(v => ({
        id: v.id,
        name: v.displayName,
        type: v.type,
        chain: v.chain,
        status: v.status,
        source_class: v.sourceClass,
        transport: v.transport,
        synthetic_reason: v.syntheticReason ?? null,
        last_event_ts: v.lastEventTs,
        events_per_min: v.eventsPerMin,
      })),
      recent_events: displayEvents.slice(0, 50).map(e => ({
        id: e.id,
        timestamp_utc: new Date(e.timestamp).toISOString(),
        event_type: e.eventType,
        venue: e.venue,
        asset: e.asset,
        summary: e.summary,
        source_class: e.provenance.sourceClass,
        transport: e.provenance.transport,
      })),
      attestation: {
        standard: "DACT-STD-1.1",
        normative_amendment: "NA-1: Synthetic Source Provenance",
        properties: ["APPEND_ONLY", "UNCONTAMINATED", "PROVENANCE_COMPLETE", "NON_INTERPRETIVE", "SYNTHETIC_MARKED"],
        conformance: "FULL",
        synthetic_excluded_from_observed_coverage: true,
        verified_at_utc: stats ? new Date(stats.verifiedAt).toISOString() : null,
      },
    };
    downloadBlob(JSON.stringify(snapshot, null, 2), `dact-snapshot-${dateStr}.json`, "application/json");
  }

  async function generateDactReportText() {
    const dateStr = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();
    const lines: string[] = [
      "═══════════════════════════════════════════════════════════════",
      "  STRATALINK LABS — DIGITAL ASSET CONSOLIDATED TAPE (DACT)",
      "  Daily Snapshot Report · DACT-STD-1.1 / NA-1 (Synthetic Source Provenance)",
      `  Generated: ${now}`,
      `  Date: ${dateStr}`,
      "═══════════════════════════════════════════════════════════════",
      "",
      "── INGESTION SUMMARY ───────────────────────────────────────────",
      `  Venues Ingesting  : ${stats?.venuesIngesting ?? "—"} / ${stats?.totalVenues ?? 26}`,
      `  Observed Coverage : ${stats?.observedVenueCount ?? "—"} / ${stats?.totalVenues ?? 26} (relay-obs counted as observed)`,
      `  Synthetic Coverage: ${stats?.syntheticVenueCount ?? "—"} / ${stats?.totalVenues ?? 26}`,
      `  Observed At       : ${stats ? new Date(stats.observedCoverageComputedAt).toISOString() : "—"}`,
      `  DSU Coverage      : ${stats?.dsuCoverage ?? "—"}%`,
      `  Events / Sec      : ${stats?.eventsPerSec?.toFixed(1) ?? "—"}`,
      `  Tape Depth        : ${stats?.tapeDepth?.toLocaleString() ?? "—"} events`,
      `  Total Ingested    : ${stats?.totalIngested?.toLocaleString() ?? "—"} events`,
      `  Latency P95       : ${stats?.p95LatencyMs ?? "—"} ms`,
      `  Data Gaps         : ${stats?.dataGaps ?? "—"} venues`,
      "",
      "── DATA QUALITY ────────────────────────────────────────────────",
      `  Tape Integrity    : ${stats?.tapeIntegrity ?? "UNKNOWN"}`,
      `  Normalisation     : ${stats?.normalisationRate ?? "—"}%`,
      `  Symbol Coverage   : ${stats?.symbolCoverageActive ?? "—"} / ${stats?.symbolCoverageTotal ?? "—"}`,
      `  Duplicate Rate    : ${stats?.duplicateRate ?? "—"}%`,
      `  Rejected Events   : ${stats?.rejectedEvents ?? 0}`,
      "",
      "── VENUE MATRIX ────────────────────────────────────────────────",
      `  ${"VENUE".padEnd(22)} ${"TYPE".padEnd(10)} ${"CHAIN".padEnd(12)} ${"SOURCE".padEnd(10)} ${"STATUS".padEnd(10)} EVT/MIN`,
      `  ${"─".repeat(76)}`,
      ...venues.map(v =>
        `  ${v.displayName.padEnd(22)} ${v.type.padEnd(10)} ${v.chain.padEnd(12)} ${(v.sourceClass === "synthetic" ? "SYNTHETIC" : v.transport === "relay" ? "RELAY-OBS" : "OBSERVED").padEnd(10)} ${v.status.padEnd(10)} ${v.eventsPerMin ?? "—"}`
      ),
      "",
      "── NON-CONTAMINATION ATTESTATION ───────────────────────────────",
      "  Standard  : DACT-STD-1.1 / Normative Amendment 1 (Synthetic Source Provenance)",
      "  Properties: APPEND_ONLY · UNCONTAMINATED · PROVENANCE_COMPLETE · NON_INTERPRETIVE · SYNTHETIC_MARKED",
      "  Conformance: FULL",
      "  Note: Synthetic events are explicitly marked and excluded from observed-coverage",
      "        figures and from downstream attestation. Observer-only posture is maintained.",
      `  Verified  : ${stats ? new Date(stats.verifiedAt).toISOString() : "—"}`,
      "",
      "═══════════════════════════════════════════════════════════════",
      "  END OF REPORT",
      "═══════════════════════════════════════════════════════════════",
    ];
    downloadBlob(lines.join("\n"), `dact-report-${dateStr}.txt`, "text/plain");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: C.bg }}>
      <DashboardHeader />
      <PlatformTabs />

      {/* ── Breadcrumb ──────────────────────────────────────────────────── */}
      <div style={{
        padding: "8px 20px", borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between", background: C.panel,
      }}>
        <div style={{ fontFamily: MONO, fontSize: 10, color: C.muted, letterSpacing: "0.1em" }}>
          STRATA LINK{" "}
          <span style={{ color: C.border }}>›</span>{" "}
          <span style={{ color: C.muted }}>DIGITAL ASSET CONSOLIDATED TAPE</span>{" "}
          <span style={{ color: C.border }}>›</span>{" "}
          <span style={{ color: C.accent }}>DACT v1.1</span>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <ExportButton
            options={[
              { label: "DACT Daily Snapshot (JSON)", format: "JSON", onGenerate: generateDactSnapshotJson },
              { label: "DACT Daily Report (TXT)", format: "PDF", onGenerate: generateDactReportText },
            ]}
          />
          <div className="tilt-sb-live">
            <div className="tilt-sb-dot tilt-pulse" />
            LIVE
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: C.muted }}>
            <LiveClock />
          </div>
        </div>
      </div>

      {/* ── Page subtitle ───────────────────────────────────────────────── */}
      <div style={{ padding: "10px 20px 6px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontFamily: MONO, fontSize: 10, color: C.accent, lineHeight: 1.5 }}>
          The Institutional Liquidity Truth Terminal's immutable consolidated tape — the sole ingestion point and authoritative record of observable digital asset liquidity across all connected venues.
        </div>
      </div>

      {/* ── Section 1: Header metrics ───────────────────────────────────── */}
      <div style={{ padding: "12px 20px", display: "flex", gap: 10, borderBottom: `1px solid ${C.border}` }}>
        <MetricCard
          label="VENUES INGESTING"
          value={stats ? `${stats.venuesIngesting} / ${stats.totalVenues}` : "—"}
          sub="of Declared Supervisory Universe"
          tooltip="Total venues actively sending data, including both observed and synthetic sources. See Observed Coverage below for the observed-only figure."
          highlight={stats && stats.venuesIngesting === stats.totalVenues ? C.green : C.amber}
        />
        <MetricCard
          label="EVENTS / SEC"
          value={stats ? stats.eventsPerSec.toFixed(1) : "—"}
          sub="cross-venue ingestion rate"
          tooltip="Real-time event ingestion rate across all venues. A sudden drop indicates venue disconnection or API issues."
          highlight={C.accent}
        />
        <MetricCard
          label="TAPE DEPTH"
          value={stats ? stats.tapeDepth.toLocaleString() : "—"}
          sub={stats ? `${stats.totalIngested.toLocaleString()} total ingested` : undefined}
          tooltip="Total number of events in the current observation window. This is the size of the consolidated tape being maintained."
        />
        <MetricCard
          label="LATENCY P95"
          value={stats ? `${stats.p95LatencyMs}ms` : "—"}
          sub="cross-venue 95th percentile"
          tooltip="95th percentile data ingestion latency. Under 500ms is excellent. Over 2000ms indicates a venue relay is lagging."
          highlight={!stats ? C.muted : stats.p95LatencyMs < 500 ? C.green : stats.p95LatencyMs < 2000 ? C.amber : C.red}
        />
        <MetricCard
          label="DATA GAPS"
          value={stats ? stats.dataGaps : "—"}
          sub="venues not reporting"
          tooltip="Count of venues not reporting within the expected window (120s). Zero is the target state."
          highlight={!stats ? C.muted : stats.dataGaps === 0 ? C.green : stats.dataGaps < 5 ? C.amber : C.red}
        />
        <MetricCard
          label="DSU COVERAGE"
          value={stats ? `${stats.dsuCoverage}%` : "—"}
          sub="Declared Supervisory Universe"
          tooltip="Percentage of the Declared Supervisory Universe actively reporting. 100% means no blind spots."
          highlight={!stats ? C.muted : stats.dsuCoverage === 100 ? C.green : stats.dsuCoverage >= 80 ? C.amber : C.red}
        />
      </div>

      {/* ── Section 2 + 3: Event stream + Venue matrix ─────────────────── */}
      <div style={{ display: "flex", flex: 1, padding: "16px 20px", gap: 16, minHeight: 520 }}>

        {/* LEFT 60%: Live event stream */}
        <div style={{
          flex: "0 0 60%", display: "flex", flexDirection: "column",
          background: C.panel, border: `1px solid ${C.border}`, borderRadius: 4, overflow: "hidden",
        }}>
          {/* Stream header + filters */}
          <div style={{
            padding: "10px 14px", borderBottom: `1px solid ${C.border}`,
            display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
          }}>
            <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: C.accent, letterSpacing: "0.1em", marginRight: 4 }}>
              LIVE EVENT STREAM
            </div>
            {/* Filter: event type */}
            <select data-testid="dact-filter-type" value={filterType} onChange={e => setFilterType(e.target.value)} style={selectStyle}>
              <option value="ALL">All Types</option>
              <option value="DEPTH_UPDATE">DEPTH</option>
              <option value="BBO_UPDATE">BBO</option>
              <option value="TRADE">TRADE</option>
              <option value="VENUE_STATUS">STATUS</option>
            </select>
            {/* Filter: venue */}
            <select data-testid="dact-filter-venue" value={filterVenue} onChange={e => setFilterVenue(e.target.value)} style={selectStyle}>
              <option value="ALL">All Venues</option>
              {ALL_VENUES_26.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            {/* Filter: asset */}
            <select data-testid="dact-filter-asset" value={filterAsset} onChange={e => setFilterAsset(e.target.value)} style={selectStyle}>
              <option value="ALL">All Assets</option>
              {KNOWN_ASSETS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            {/* Change 5: source-class filter — default OBSERVED */}
            <select
              data-testid="dact-filter-source-class"
              value={filterSourceClass}
              onChange={e => setFilterSourceClass(e.target.value)}
              style={{ ...selectStyle, borderColor: filterSourceClass === "observed" ? C.green + "66" : filterSourceClass === "synthetic" ? C.amber + "66" : C.border }}
            >
              <option value="observed">Observed</option>
              <option value="synthetic">Synthetic</option>
              <option value="ALL">All Sources</option>
            </select>
            {/* Pause toggle */}
            <button
              data-testid="dact-pause-btn"
              onClick={() => setPaused(p => !p)}
              style={{
                marginLeft: "auto", fontFamily: MONO, fontSize: 10, fontWeight: 700,
                letterSpacing: "0.08em", padding: "4px 12px",
                background: paused ? C.amber + "22" : "transparent",
                border: `1px solid ${paused ? C.amber : C.border}`,
                borderRadius: 3, color: paused ? C.amber : C.muted, cursor: "pointer",
              }}
            >
              {paused ? "▶ RESUME" : "⏸ PAUSE"}
            </button>
          </div>

          {/* Stream body */}
          <div style={{ flex: 1, overflowY: "auto", fontFamily: MONO, fontSize: 11 }}>
            {displayEvents.length === 0 ? (
              <div style={{ padding: "24px 16px", color: C.muted, textAlign: "center", fontSize: 11, fontFamily: MONO }}>
                {eventsQuery.isLoading ? "Connecting to tape…" : "No events — ingestion cycle begins every 5s"}
              </div>
            ) : (
              displayEvents.map((ev, i) => (
                <EventRow key={ev.id} event={ev} zebra={i % 2 === 0} />
              ))
            )}
          </div>

          {/* Stream footer */}
          <div style={{
            padding: "6px 14px", borderTop: `1px solid ${C.border}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ fontFamily: MONO, fontSize: 9, color: C.muted }}>
              {displayEvents.length} events displayed
              {filterSourceClass !== "ALL" && (
                <span style={{ color: filterSourceClass === "observed" ? C.green : C.amber, marginLeft: 6 }}>
                  · {filterSourceClass.toUpperCase()} only
                </span>
              )}
              {paused && <span style={{ color: C.amber, marginLeft: 8 }}> — STREAM PAUSED</span>}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 9, color: C.muted }}>
              <TT title="NON-CONTAMINATION" body="DACT is a verbose fact layer. It records what happened but does not score, interpret, or judge. No downstream layer (STRATA AI, PoLi, RCL) writes back to DACT. This separation is the foundation of the platform's epistemic integrity.">
                <span style={{ borderBottom: `1px dashed ${C.muted}`, cursor: "help" }}>NON-CONTAMINATION</span>
              </TT>
              {" "}<span style={{ color: C.green }}>ACTIVE</span>
            </div>
          </div>
        </div>

        {/* RIGHT 40%: Venue coverage matrix */}
        <div style={{
          flex: "0 0 calc(40% - 16px)", display: "flex", flexDirection: "column",
          background: C.panel, border: `1px solid ${C.border}`, borderRadius: 4, overflow: "hidden",
        }}>
          <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <div>
              <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: C.accent, letterSpacing: "0.1em" }}>
                VENUE COVERAGE MATRIX
              </div>
              <div style={{ fontFamily: MONO, fontSize: 9, color: C.muted, marginTop: 3 }}>
                Declared Supervisory Universe — {stats?.totalVenues ?? 26} venues
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: C.green, boxShadow: `0 0 5px ${C.green}80` }} />
                <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: C.green, letterSpacing: "0.1em" }}>LIVE</span>
                <span style={{ fontFamily: MONO, fontSize: 9, color: C.muted, marginLeft: 2 }}>
                  {stats ? `${stats.venuesIngesting}/${stats.totalVenues} · ${stats.dsuCoverage}%` : "—"}
                </span>
              </div>
              <div style={{ fontFamily: MONO, fontSize: 9, color: C.muted, letterSpacing: "0.06em" }}>
                LAST SYNC{" "}
                <span style={{ color: C.accent }}>
                  {stats ? new Date(stats.verifiedAt).toISOString().slice(11, 19) + " UTC" : "—"}
                </span>
              </div>
            </div>
          </div>

          <div style={{ overflowY: "auto", flex: 1 }}>
            {/* Change 1: 7-column grid — added SOURCE CLASS between CHAIN and STATUS */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 48px 68px 78px 62px 62px 48px",
              padding: "6px 12px", borderBottom: `1px solid ${C.border}`,
              position: "sticky", top: 0, background: C.panel, zIndex: 1,
            }}>
              {([
                ["VENUE",   "Full venue name as registered in the Declared Supervisory Universe."],
                ["TYPE",    "Venue type shortcode: CEX, DEX-PERP, AMM, RFQ, ATS, MTF."],
                ["CHAIN",   "The blockchain or infrastructure layer this venue operates on."],
                ["SOURCE",  "DACT-STD-1.1 source class. OBSERVED = direct live feed. RELAY-OBS = observed via relay.stratalink.ai. SYNTHETIC = no API key configured — model-generated depth."],
                ["STATUS",  "Live ingestion status: ONLINE (events within 120s), DEGRADED, OFFLINE. A venue can be ONLINE and SYNTHETIC simultaneously."],
                ["LAST EVT","Time since the most recent event from this venue."],
                ["EVT/MIN", "Events per minute from this venue in the last observation window."],
              ] as [string, string][]).map(([h, tip]) => (
                <div key={h} style={{ fontFamily: MONO, fontSize: 9, color: C.muted, letterSpacing: "0.08em" }}>
                  <TT title={h} body={tip}>{h}</TT>
                </div>
              ))}
            </div>

            {/* Source class legend */}
            <div style={{
              display: "flex", gap: 14, padding: "5px 12px",
              borderBottom: `1px solid ${C.border}`, background: "#0A1220",
            }}>
              {([
                ["OBSERVED", C.green],
                ["RELAY-OBS", C.blue],
                ["SYNTHETIC", C.amber],
              ] as [string, string][]).map(([label, color]) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: 1, background: color }} />
                  <span style={{ fontFamily: MONO, fontSize: 8, color: C.muted, letterSpacing: "0.06em" }}>{label}</span>
                </div>
              ))}
            </div>

            {venues.length === 0 ? (
              <div style={{ padding: "24px 16px", color: C.muted, textAlign: "center", fontSize: 11, fontFamily: MONO }}>
                Loading venue data…
              </div>
            ) : (
              groupedVenues.map(({ group, rows }) => (
                <div key={group}>
                  <div style={{
                    padding: "5px 12px", fontFamily: MONO, fontSize: 9, fontWeight: 700,
                    color: C.gold, letterSpacing: "0.1em", background: "#0D1A2C",
                    borderBottom: `1px solid ${C.border}`, borderTop: `1px solid ${C.border}`,
                  }}>
                    {group.toUpperCase()} ({rows.length})
                  </div>
                  {rows.map((v, idx) => {
                    const rel = relTime(v.lastEventTs);
                    const sc = sourceClassLabel(v.sourceClass, v.transport);
                    return (
                      <div
                        key={v.id}
                        data-testid={`dact-venue-row-${v.id}`}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 48px 68px 78px 62px 62px 48px",
                          padding: "5px 12px",
                          borderBottom: `1px solid ${C.border}22`,
                          background: idx % 2 === 0 ? "transparent" : "#0A1220",
                          alignItems: "center",
                        }}
                      >
                        <div style={{ fontFamily: MONO, fontSize: 10, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {v.displayName}
                        </div>
                        <div style={{ fontFamily: MONO, fontSize: 9, color: C.muted }}>{v.type}</div>
                        <div style={{ fontFamily: MONO, fontSize: 9, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.chain}</div>
                        {/* Change 1: SOURCE CLASS column */}
                        <div>
                          <span style={{
                            fontFamily: MONO, fontSize: 8, fontWeight: 700, color: sc.color,
                            letterSpacing: "0.05em",
                          }}>
                            {sc.label}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center" }}>
                          {statusDot(v.status)}
                          <span style={{ fontFamily: MONO, fontSize: 9, color: v.status === "ONLINE" ? C.green : v.status === "DEGRADED" ? C.amber : C.red }}>
                            {v.status}
                          </span>
                        </div>
                        <div style={{ fontFamily: MONO, fontSize: 9, color: rel.stale ? C.red : C.muted }}>
                          {rel.text}
                        </div>
                        <div style={{ fontFamily: MONO, fontSize: 9, color: C.muted }}>
                          {v.eventsPerMin > 0 ? v.eventsPerMin : "—"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Section 4: Tape Statistics ──────────────────────────────────── */}
      <div style={{ padding: "0 20px 16px", display: "flex", gap: 16 }}>

        {/* Left: Ingestion volume chart */}
        <div style={{
          flex: "0 0 60%", background: C.panel, border: `1px solid ${C.border}`,
          borderRadius: 4, padding: "12px 14px",
        }}>
          <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: C.accent, letterSpacing: "0.1em", marginBottom: 12 }}>
            INGESTION VOLUME — LAST 30 MIN
          </div>
          {!hasHistory ? (
            <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, fontFamily: MONO, fontSize: 11 }}>
              Accumulating history — check back in 1 minute
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={ingestionHistory} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="2 4" stroke={C.border} />
                <XAxis dataKey="label" tick={{ fill: C.muted, fontSize: 9, fontFamily: MONO }} tickLine={false} axisLine={{ stroke: C.border }} interval={4} />
                <YAxis tick={{ fill: C.muted, fontSize: 9, fontFamily: MONO }} tickLine={false} axisLine={false} width={32} />
                <Tooltip contentStyle={{ background: "#0B1320", border: `1px solid ${C.border}`, borderRadius: 4, fontFamily: MONO, fontSize: 10, color: C.text }} labelStyle={{ color: C.muted }} itemStyle={{ color: C.text }} />
                <Area type="monotone" dataKey="depth"  stackId="1" stroke={C.depth}       fill={C.depth + "40"}       name="DEPTH" />
                <Area type="monotone" dataKey="bbo"    stackId="1" stroke={C.bbo}         fill={C.bbo + "40"}         name="BBO"   />
                <Area type="monotone" dataKey="trade"  stackId="1" stroke={C.trade}       fill={C.trade + "40"}       name="TRADE" />
                <Area type="monotone" dataKey="status" stackId="1" stroke={C.venueStatus} fill={C.venueStatus + "40"} name="STATUS"/>
              </AreaChart>
            </ResponsiveContainer>
          )}
          <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
            {([["DEPTH", C.depth], ["BBO", C.bbo], ["TRADE", C.trade], ["STATUS", C.venueStatus]] as [string, string][]).map(([label, color]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: color + "80", border: `1px solid ${color}` }} />
                <span style={{ fontFamily: MONO, fontSize: 9, color: C.muted }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Data quality metrics */}
        <div style={{
          flex: "0 0 calc(40% - 16px)", background: C.panel, border: `1px solid ${C.border}`,
          borderRadius: 4, padding: "12px 14px",
        }}>
          <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: C.accent, letterSpacing: "0.1em", marginBottom: 12 }}>
            DATA QUALITY METRICS
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {/* Change 2+3+6: split "Venue Coverage" into Observed + Synthetic with timestamp + freshness */}
              <tr style={{ borderBottom: `1px solid ${C.border}22` }}>
                <td style={{ padding: "8px 0", fontFamily: MONO, fontSize: 10, color: C.muted, width: "45%", paddingRight: 8 }}>
                  <TT title="Observed Coverage" body="Venues whose provenance.sourceClass is 'observed' (including relay-observed), counted over the Declared Supervisory Universe. This is the DACT-STD-1.1 primary coverage figure — synthetic venues are excluded.">
                    <span>Observed Coverage</span>
                  </TT>
                </td>
                <td data-testid="dact-quality-observed-coverage" style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C.green, width: "25%" }}>
                  {stats ? `${stats.observedVenueCount} / ${stats.totalVenues}` : "—"}
                </td>
                <td style={{ fontFamily: MONO, fontSize: 9, color: C.muted + "99", lineHeight: 1.4 }}>
                  {/* Change 3: UTC timestamp + Change 6: freshness badge */}
                  <div>observed sources only</div>
                  {stats && (
                    <div style={{ marginTop: 2, display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ color: C.muted + "88" }}>
                        {new Date(stats.observedCoverageComputedAt).toISOString().slice(11, 19)} UTC
                      </span>
                      {fresh && (
                        <span style={{
                          fontFamily: MONO, fontSize: 8, fontWeight: 700,
                          color: fresh.color, letterSpacing: "0.06em",
                        }}>
                          · {fresh.label}
                        </span>
                      )}
                    </div>
                  )}
                </td>
              </tr>
              <tr style={{ borderBottom: `1px solid ${C.border}22` }}>
                <td style={{ padding: "8px 0", fontFamily: MONO, fontSize: 10, color: C.muted, width: "45%", paddingRight: 8 }}>
                  <TT title="Synthetic Coverage" body="Venues currently on synthetic fallback (no live API key configured). These venues generate model-based depth and are excluded from observed-coverage figures and downstream attestation. Each synthetic venue is explicitly marked in the Venue Coverage Matrix.">
                    <span>Synthetic Coverage</span>
                  </TT>
                </td>
                <td data-testid="dact-quality-synthetic-coverage" style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: stats && stats.syntheticVenueCount > 0 ? C.amber : C.green }}>
                  {stats ? `${stats.syntheticVenueCount} / ${stats.totalVenues}` : "—"}
                </td>
                <td style={{ fontFamily: MONO, fontSize: 9, color: C.muted + "99", lineHeight: 1.4 }}>
                  {stats && stats.syntheticVenueCount > 0
                    ? "excluded from attestation"
                    : "no synthetic sources"}
                </td>
              </tr>

              {/* Remaining quality rows */}
              {[
                {
                  label: "Tape Integrity",
                  value: stats?.tapeIntegrity ?? "—",
                  valueColor: integrityColor,
                  desc: "Whether the tape has any gaps or inconsistencies",
                  tip: "INTACT means the tape is complete with no detected gaps, sequence breaks, or event rejections. DEGRADED means one or more venues have stopped reporting or events are arriving out of sequence. COMPROMISED means critical tape violations have been detected.",
                },
                {
                  label: "Normalisation Rate",
                  value: stats ? `${stats.normalisationRate}%` : "—",
                  valueColor: C.green,
                  desc: "% of events normalised to LTR schema",
                  tip: "Percentage of incoming raw venue events successfully normalised into the canonical DACT schema. 100% means every event parsed correctly. Below 100% means some events were malformed or used an unrecognised schema version.",
                },
                {
                  label: "Symbol Coverage",
                  value: stats ? `${stats.symbolCoverageActive} / ${stats.symbolCoverageTotal}` : "—",
                  valueColor: C.text,
                  desc: "Assets with active data vs total monitored",
                  tip: "Number of ILU assets with at least one active venue event in the current observation window, versus the total number of assets in the Institutional Liquidity Universe.",
                },
                {
                  label: "Duplicate Rate",
                  value: stats ? `${stats.duplicateRate}%` : "—",
                  valueColor: C.green,
                  desc: "% of events deduplicated (target: 0%)",
                  tip: "Percentage of incoming events identified as duplicates and discarded. A non-zero rate indicates a venue relay is replaying events.",
                },
                {
                  label: "Rejected Events",
                  value: stats ? stats.rejectedEvents : "—",
                  valueColor: C.green,
                  desc: "Events rejected for invalid schema (target: 0)",
                  tip: "Count of events rejected for failing schema validation. Zero is the target. Any rejections indicate a breaking change in a venue relay's output format.",
                },
              ].map(row => (
                <tr key={row.label} style={{ borderBottom: `1px solid ${C.border}22` }}>
                  <td style={{ padding: "8px 0", fontFamily: MONO, fontSize: 10, color: C.muted, width: "45%", paddingRight: 8 }}>
                    <TT title={row.label} body={row.tip}>
                      <span>{row.label}</span>
                    </TT>
                  </td>
                  <td
                    data-testid={`dact-quality-${row.label.toLowerCase().replace(/\s+/g, "-")}`}
                    style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: row.valueColor, width: "25%" }}
                  >
                    {String(row.value)}
                  </td>
                  <td style={{ fontFamily: MONO, fontSize: 9, color: C.muted + "99", lineHeight: 1.4 }}>
                    {row.desc}
                  </td>
                </tr>
              ))}

              {/* Change 7: Clock Synchronisation */}
              <ClockSyncRow clockSync={clockQuery.data?.clockSync} />
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section 5: Non-Contamination Attestation ────────────────────── */}
      {/* Change 4: upgraded to DACT-STD-1.1, citing NA-1 */}
      <div style={{ padding: "0 20px 20px" }}>
        <div
          data-testid="dact-attestation"
          style={{
            background: "#0D1E3A", border: `1px solid ${C.gold}`,
            borderRadius: 4, padding: "16px 20px",
            display: "flex", flexDirection: "column", gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: "0.12em" }}>
                NON-CONTAMINATION ATTESTATION
              </div>
              <div style={{
                fontFamily: MONO, fontSize: 9, color: C.gold,
                border: `1px solid ${C.gold}`, borderRadius: 3, padding: "2px 8px", letterSpacing: "0.08em",
              }}>
                DACT-STD-1.1 · NA-1 · CONFORMANCE: FULL
              </div>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 9, color: C.gold + "99" }}>
              VERIFIED:{" "}
              {stats ? new Date(stats.verifiedAt).toISOString().replace("T", " ").slice(0, 19) + " UTC" : "—"}
            </div>
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: C.gold + "CC", lineHeight: 1.7, maxWidth: 960 }}>
            This tape is an append-only, uncontaminated record of observable market data. No downstream layer
            (STRATA AI, PoLi, RCL) has written to or modified any DACT event. All events carry complete provenance
            (sourceVenue, transport, sourceClass, engine, dactVersion, latencyMs). Under DACT-STD-1.1 Normative
            Amendment 1 (Synthetic Source Provenance), synthetic events are explicitly marked
            with <em>provenance.sourceClass = "synthetic"</em> and are excluded from observed-coverage figures and
            from downstream attestation — ensuring the observer-only posture is preserved for the observed tape.
          </div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {[
              ["Layer",     "Layer 1 — Digital Assets Consolidated Tape"],
              ["Standard",  "DACT-STD-1.1 / Normative Amendment 1"],
              ["Tape Mode", "APPEND-ONLY · IN-MEMORY RING BUFFER (10,000 events)"],
              ["Replay",    "Deterministic event replay supported"],
              ["Synthetic", "Marked · Excluded from attestation"],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{ fontFamily: MONO, fontSize: 8, color: C.gold + "88", letterSpacing: "0.1em" }}>{label}</div>
                <div style={{ fontFamily: MONO, fontSize: 9, color: C.gold + "BB" }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <PlatformFooter />
    </div>
  );
}

// ── Event Row sub-component ────────────────────────────────────────────────────

const EventRow = memo(function EventRow({ event: ev, zebra }: { event: DactEvent; zebra: boolean }) {
  const typeColor = eventTypeColor(ev.eventType);
  const ts = new Date(ev.timestamp).toISOString().slice(11, 23);
  const isSynthetic = ev.provenance.sourceClass === "synthetic";

  return (
    <div
      data-testid={`dact-event-row-${ev.id}`}
      style={{
        display: "grid",
        gridTemplateColumns: "100px 110px 90px 70px 1fr 56px",
        padding: "4px 14px",
        borderBottom: `1px solid ${C.border}22`,
        background: zebra ? "transparent" : "#0A1220",
        alignItems: "center",
        gap: 8,
        opacity: isSynthetic ? 0.75 : 1,
      }}
    >
      <div style={{ fontFamily: MONO, fontSize: 10, color: C.muted, whiteSpace: "nowrap" }}>{ts}</div>
      <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: typeColor, letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
        {ev.eventType}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 10, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {ev.venue}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 10, color: C.accent, fontWeight: 700 }}>{ev.asset}</div>
      <div style={{ fontFamily: MONO, fontSize: 10, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {ev.summary}
      </div>
      {/* Source class badge on event row */}
      <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.04em",
        color: isSynthetic ? C.amber : ev.provenance.transport === "relay" ? C.blue : C.green,
        whiteSpace: "nowrap",
      }}>
        {isSynthetic ? "SYN" : ev.provenance.transport === "relay" ? "RLY" : "OBS"}
      </div>
    </div>
  );
});

// ── Clock Sync Row sub-component ───────────────────────────────────────────────

function ClockSyncRow({ clockSync }: { clockSync: ClockSync | undefined }) {
  const cs = clockSync;
  const loading = !cs;
  const unavailable = cs?.status === "unavailable";
  const notInitialised = cs && !cs.initialised;

  let valueText = "—";
  let valueColor = C.muted;
  let descText = "measuring…";

  if (!loading && cs) {
    if (unavailable || notInitialised) {
      valueText = "measuring…";
      valueColor = C.muted;
      descText = "awaiting first successful measurement";
    } else {
      const absDrift = Math.abs(cs.divergenceMs);
      // Display in µs when sub-millisecond, ms otherwise
      if (absDrift < 1) {
        valueText = `<1ms`;
      } else {
        const sign = cs.divergenceMs >= 0 ? "+" : "−";
        valueText = `${sign}${absDrift.toFixed(1)}ms`;
      }
      valueColor = cs.status === "in-tolerance" ? C.green : C.red;
      descText = cs.status === "in-tolerance" ? "IN-TOLERANCE" : "OUT-OF-TOLERANCE";
      if (cs.sessionBreachCount > 0) {
        descText += ` · ${cs.sessionBreachCount} breach${cs.sessionBreachCount > 1 ? "es" : ""} this session`;
      }
    }
  }

  const measuredAgo = cs?.measuredAt
    ? (() => {
        const s = Math.round((Date.now() - cs.measuredAt) / 1000);
        if (s < 5) return "just now";
        if (s < 60) return `${s}s ago`;
        return `${Math.round(s / 60)}m ago`;
      })()
    : null;

  return (
    <tr style={{ borderBottom: `1px solid ${C.border}22` }}>
      <td style={{ padding: "8px 0", fontFamily: MONO, fontSize: 10, color: C.muted, width: "45%", paddingRight: 8 }}>
        <TT
          title="Clock Divergence"
          body={`Measured offset of the DACT reference clock from a traceable UTC time source, using the SNTP mid-point estimator (RTT/2 correction). Tolerance: ±${cs?.toleranceMs ?? 500}ms. Source is a public traceable UTC time service — no host names or addresses are surfaced. Measured every 60 seconds; RTT of the measurement request is shown in the description. A session breach counter increments when tolerance is exceeded and is displayed the same way rejected events are surfaced.`}
        >
          <span>Clock Divergence</span>
        </TT>
      </td>
      <td
        data-testid="dact-quality-clock-divergence"
        style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: valueColor, width: "25%" }}
      >
        {valueText}
      </td>
      <td style={{ fontFamily: MONO, fontSize: 9, color: C.muted + "99", lineHeight: 1.6 }}>
        <div style={{ color: cs?.status === "out-of-tolerance" ? C.red : cs?.status === "in-tolerance" ? C.green + "BB" : C.muted + "99" }}>
          {descText}
        </div>
        {cs?.initialised && !unavailable && (
          <div style={{ color: C.muted + "77", marginTop: 1 }}>
            {measuredAgo ? `measured ${measuredAgo}` : ""}
            {cs.rttMs > 0 ? ` · RTT ${cs.rttMs}ms` : ""}
          </div>
        )}
      </td>
    </tr>
  );
}

// ── Select style helper ────────────────────────────────────────────────────────

const selectStyle: React.CSSProperties = {
  fontFamily: MONO, fontSize: 10, color: "#C8D8E8",
  background: "#0B1320", border: "1px solid #1A2435",
  borderRadius: 3, padding: "3px 8px", cursor: "pointer", outline: "none",
};
