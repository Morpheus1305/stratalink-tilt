import { useState, useEffect, useRef, memo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/dashboard-header";
import { PlatformTabs } from "@/components/platform-tabs";
import { PlatformFooter } from "@/components/platform-footer";
import { TT } from "@/components/tilt-tooltip";
import "./tilt-terminal.css";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

// ── Types ─────────────────────────────────────────────────────────────────────

type EventType = "DEPTH_UPDATE" | "BBO_UPDATE" | "TRADE" | "VENUE_STATUS";

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
    engine: string;
    dactVersion: string;
    latencyMs: number;
  };
}

interface DactStats {
  venuesIngesting: number;
  totalVenues: number;
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
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const MONO = "'JetBrains Mono', 'SF Mono', Consolas, monospace";

const C = {
  bg:       "#080D14",
  panel:    "#0B1320",
  border:   "#1A2435",
  text:     "#C8D8E8",
  muted:    "#7B8EA3",
  accent:   "#00BFA5",
  amber:    "#F59E0B",
  red:      "#EF4444",
  green:    "#22C55E",
  gold:     "#C9A84C",
  depth:    "#00BFA5",
  bbo:      "#818CF8",
  trade:    "#34D399",
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
    <span
      style={{
        display: "inline-block",
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: col,
        marginRight: 6,
        flexShrink: 0,
        boxShadow: `0 0 5px ${col}80`,
      }}
    />
  );
}

function MetricCard({
  label, value, sub, tooltip, highlight,
}: {
  label: string;
  value: string | number;
  sub?: string;
  tooltip?: string;
  highlight?: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: 4,
        padding: "10px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div style={{ fontSize: 9, fontFamily: MONO, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>
        {tooltip ? <TT title={label} body={tooltip}><span style={{ borderBottom: `1px dashed ${C.muted}`, cursor: "help" }}>{label}</span></TT> : label}
      </div>
      <div
        data-testid={`dact-metric-${label.toLowerCase().replace(/\s+/g, "-")}`}
        style={{ fontSize: 16, fontFamily: MONO, fontWeight: 700, color: highlight ?? C.text, letterSpacing: "-0.01em", lineHeight: 1 }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 10, fontFamily: MONO, color: C.muted }}>{sub}</div>
      )}
    </div>
  );
}

// ── Venue groups for the matrix ────────────────────────────────────────────────
const GROUP_ORDER = [
  "Centralised Exchanges",
  "DEX Perpetuals",
  "DEX Spot",
  "L2 DEX",
  "Dark / Institutional",
  "Regulated STE",
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
  const streamRef = useRef<HTMLDivElement>(null);
  const [displayEvents, setDisplayEvents] = useState<DactEvent[]>([]);

  const statsQuery = useQuery<{ stats: DactStats }>({
    queryKey: ["/api/dact/stats"],
    refetchInterval: 5000,
  });

  const eventsQuery = useQuery<{ events: DactEvent[] }>({
    queryKey: ["/api/dact/events", filterType, filterVenue, filterAsset],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: "100",
        eventType: filterType,
        venue: filterVenue,
        asset: filterAsset,
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

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: C.bg }}>
      <DashboardHeader />
      <PlatformTabs />

      {/* ── Breadcrumb ──────────────────────────────────────────────────── */}
      <div
        style={{
          padding: "8px 20px",
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: C.panel,
        }}
      >
        <div style={{ fontFamily: MONO, fontSize: 10, color: C.muted, letterSpacing: "0.1em" }}>
          STRATA LINK{" "}
          <span style={{ color: C.border }}>›</span>{" "}
          <span style={{ color: C.muted }}>DIGITAL ASSET CONSOLIDATED TAPE</span>{" "}
          <span style={{ color: C.border }}>›</span>{" "}
          <span style={{ color: C.accent }}>DACT v1.0</span>
        </div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: C.muted }}>
          <LiveClock />
        </div>
      </div>

      {/* ── Page subtitle ───────────────────────────────────────────────── */}
      <div style={{ padding: "10px 20px 6px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontFamily: MONO, fontSize: 10, color: C.muted, lineHeight: 1.5 }}>
          The Institutional Liquidity Truth Terminal's immutable consolidated tape — the sole ingestion point and authoritative record of observable digital asset liquidity across all connected venues.
        </div>
      </div>

      {/* ── Section 1: Header metrics ───────────────────────────────────── */}
      <div style={{ padding: "12px 20px", display: "flex", gap: 10, borderBottom: `1px solid ${C.border}` }}>
        <MetricCard
          label="VENUES INGESTING"
          value={stats ? `${stats.venuesIngesting} / ${stats.totalVenues}` : "—"}
          sub="of Declared Supervisory Universe"
          tooltip="Number of venues in the Declared Supervisory Universe actively sending data. Any venue not ingesting is shown as OFFLINE in the venue matrix below."
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
        <div
          style={{
            flex: "0 0 60%",
            display: "flex",
            flexDirection: "column",
            background: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          {/* Stream header + filters */}
          <div
            style={{
              padding: "10px 14px",
              borderBottom: `1px solid ${C.border}`,
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: C.accent, letterSpacing: "0.1em", marginRight: 4 }}>
              <TT title="Live Event Stream" body="Real-time feed of every DACT event ingested from all 26 active venues. Each row shows the UTC timestamp, event type (DEPTH_UPDATE, BBO_UPDATE, TRADE, VENUE_STATUS), source venue, asset, and a normalised human-readable summary. Filter by type, venue, or asset using the dropdowns. Pause the stream to inspect a snapshot without the feed advancing.">
                LIVE EVENT STREAM
              </TT>
            </div>
            {/* Filter: event type */}
            <select
              data-testid="dact-filter-type"
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              style={selectStyle}
            >
              <option value="ALL">All Types</option>
              <option value="DEPTH_UPDATE">DEPTH</option>
              <option value="BBO_UPDATE">BBO</option>
              <option value="TRADE">TRADE</option>
              <option value="VENUE_STATUS">STATUS</option>
            </select>
            {/* Filter: venue */}
            <select
              data-testid="dact-filter-venue"
              value={filterVenue}
              onChange={e => setFilterVenue(e.target.value)}
              style={selectStyle}
            >
              <option value="ALL">All Venues</option>
              {ALL_VENUES_26.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
            {/* Filter: asset */}
            <select
              data-testid="dact-filter-asset"
              value={filterAsset}
              onChange={e => setFilterAsset(e.target.value)}
              style={selectStyle}
            >
              <option value="ALL">All Assets</option>
              {KNOWN_ASSETS.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            {/* Pause toggle */}
            <button
              data-testid="dact-pause-btn"
              onClick={() => setPaused(p => !p)}
              style={{
                marginLeft: "auto",
                fontFamily: MONO,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                padding: "4px 12px",
                background: paused ? C.amber + "22" : "transparent",
                border: `1px solid ${paused ? C.amber : C.border}`,
                borderRadius: 3,
                color: paused ? C.amber : C.muted,
                cursor: "pointer",
              }}
            >
              {paused ? "▶ RESUME" : "⏸ PAUSE"}
            </button>
          </div>

          {/* Stream body */}
          <div
            ref={streamRef}
            style={{
              flex: 1,
              overflowY: "auto",
              fontFamily: MONO,
              fontSize: 11,
            }}
          >
            {displayEvents.length === 0 ? (
              <div style={{ padding: "24px 16px", color: C.muted, textAlign: "center", fontSize: 11, fontFamily: MONO }}>
                {eventsQuery.isLoading ? "Connecting to tape…" : "No events yet — ingestion cycle begins every 5s"}
              </div>
            ) : (
              displayEvents.map((ev, i) => (
                <EventRow key={ev.id} event={ev} zebra={i % 2 === 0} />
              ))
            )}
          </div>

          {/* Stream footer */}
          <div
            style={{
              padding: "6px 14px",
              borderTop: `1px solid ${C.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ fontFamily: MONO, fontSize: 9, color: C.muted }}>
              {displayEvents.length} events displayed
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
        <div
          style={{
            flex: "0 0 calc(40% - 16px)",
            display: "flex",
            flexDirection: "column",
            background: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <div>
              <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: C.accent, letterSpacing: "0.1em" }}>
                <TT title="Venue Coverage Matrix" body="Real-time status of every venue in the Declared Supervisory Universe (DSU). The DSU is the complete set of venues TILT is authorised to supervise. Green = ONLINE (sending events within the expected window). Amber = DEGRADED (events arriving but with elevated latency or gaps). Red = OFFLINE (no events for >120 seconds). Any offline venue represents a blind spot in consolidated tape coverage.">
                  VENUE COVERAGE MATRIX
                </TT>
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
            {/* Column headers */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 52px 72px 66px 68px 54px",
                padding: "6px 12px",
                borderBottom: `1px solid ${C.border}`,
                position: "sticky",
                top: 0,
                background: C.panel,
                zIndex: 1,
              }}
            >
              {([
                ["VENUE",    "Full venue name as registered in the Declared Supervisory Universe. Venues are grouped by type: Centralised Exchanges, DEX Perpetuals, DEX Spot, L2 DEX, Dark / Institutional, and Regulated STE."],
                ["TYPE",     "Venue type shortcode: CEX (centralised exchange), PERP-DEX (perpetuals DEX), SPOT-DEX (spot AMM), L2-DEX (Layer-2 AMM), OTC (dark / institutional RFQ), STE (regulated Securities Token Exchange)."],
                ["CHAIN",    "The blockchain or infrastructure layer this venue operates on. Multi-chain venues show the primary chain. L2 venues show their specific rollup (e.g. Base, Optimism, zkSync Era)."],
                ["STATUS",   "Live ingestion status. ONLINE = events received within the expected 120s window. DEGRADED = events arriving but with latency or partial data. OFFLINE = no events for >120s. Offline venues create blind spots in consolidated tape coverage."],
                ["LAST EVT", "Time elapsed since the most recent event was received from this venue. Events older than 120 seconds trigger DEGRADED status. Events older than 300 seconds trigger OFFLINE. 'just now' means the venue is actively streaming."],
                ["EVT/MIN",  "Events per minute from this venue over the last observation window. A sudden drop to 0 or — indicates a venue connectivity issue. Cross-reference with the EVENTS/SEC aggregate metric at the top of the page."],
              ] as [string, string][]).map(([h, tip]) => (
                <div key={h} style={{ fontFamily: MONO, fontSize: 9, color: C.muted, letterSpacing: "0.08em" }}>
                  <TT title={h} body={tip}>{h}</TT>
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
                  <div
                    style={{
                      padding: "5px 12px",
                      fontFamily: MONO,
                      fontSize: 9,
                      fontWeight: 700,
                      color: C.gold,
                      letterSpacing: "0.1em",
                      background: "#0D1A2C",
                      borderBottom: `1px solid ${C.border}`,
                      borderTop: `1px solid ${C.border}`,
                    }}
                  >
                    {group.toUpperCase()} ({rows.length})
                  </div>
                  {rows.map((v, idx) => {
                    const rel = relTime(v.lastEventTs);
                    return (
                      <div
                        key={v.id}
                        data-testid={`dact-venue-row-${v.id}`}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 52px 72px 66px 68px 54px",
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
        <div
          style={{
            flex: "0 0 60%",
            background: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: 4,
            padding: "12px 14px",
          }}
        >
          <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: C.accent, letterSpacing: "0.1em", marginBottom: 12 }}>
            <TT title="Ingestion Volume — Last 30 Min" body="Stacked area chart showing the volume of events ingested into DACT by type over the past 30 minutes. DEPTH (teal) = orderbook depth updates. BBO (indigo) = best bid / offer quote updates. TRADE (green) = confirmed trades. STATUS (amber) = venue status change events. A declining total across all event types indicates venue disconnections or API issues. This chart accumulates after the first minute of operation.">
              INGESTION VOLUME — LAST 30 MIN
            </TT>
          </div>
          {!hasHistory ? (
            <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, fontFamily: MONO, fontSize: 11 }}>
              Accumulating history — check back in 1 minute
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={ingestionHistory} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="2 4" stroke={C.border} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: C.muted, fontSize: 9, fontFamily: MONO }}
                  tickLine={false}
                  axisLine={{ stroke: C.border }}
                  interval={4}
                />
                <YAxis
                  tick={{ fill: C.muted, fontSize: 9, fontFamily: MONO }}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                />
                <Tooltip
                  contentStyle={{ background: "#0B1320", border: `1px solid ${C.border}`, borderRadius: 4, fontFamily: MONO, fontSize: 10, color: C.text }}
                  labelStyle={{ color: C.muted }}
                  itemStyle={{ color: C.text }}
                />
                <Area type="monotone" dataKey="depth"  stackId="1" stroke={C.depth}       fill={C.depth + "40"}       name="DEPTH" />
                <Area type="monotone" dataKey="bbo"    stackId="1" stroke={C.bbo}         fill={C.bbo + "40"}         name="BBO"   />
                <Area type="monotone" dataKey="trade"  stackId="1" stroke={C.trade}       fill={C.trade + "40"}       name="TRADE" />
                <Area type="monotone" dataKey="status" stackId="1" stroke={C.venueStatus} fill={C.venueStatus + "40"} name="STATUS"/>
              </AreaChart>
            </ResponsiveContainer>
          )}
          {/* Legend */}
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
        <div
          style={{
            flex: "0 0 calc(40% - 16px)",
            background: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: 4,
            padding: "12px 14px",
          }}
        >
          <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: C.accent, letterSpacing: "0.1em", marginBottom: 12 }}>
            <TT title="Data Quality Metrics" body="Six quality assurance metrics that certify the consolidated tape meets DACT-STD-1.0 conformance requirements. These metrics are checked continuously. Any degradation (non-INTACT integrity, normalisation rate below 100%, duplicate or rejected events above 0) should trigger investigation of the affected venue relay. All values should be green under normal operating conditions.">
              DATA QUALITY METRICS
            </TT>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {[
                {
                  label: "Tape Integrity",
                  value: stats?.tapeIntegrity ?? "—",
                  valueColor: integrityColor,
                  desc: "Whether the tape has any gaps or inconsistencies",
                  tip: "INTACT means the tape is complete with no detected gaps, sequence breaks, or event rejections. DEGRADED means one or more venues have stopped reporting or events are arriving out of sequence. COMPROMISED means critical tape violations have been detected — investigate immediately.",
                },
                {
                  label: "Normalisation Rate",
                  value: stats ? `${stats.normalisationRate}%` : "—",
                  valueColor: C.green,
                  desc: "% of events successfully normalised to LTR schema",
                  tip: "Percentage of incoming raw venue events that were successfully normalised into the canonical DACT schema (LTR — Liquidity Truth Record). 100% means every event from every venue parsed correctly. Below 100% means some events were malformed or used an unrecognised schema version — check the relevant venue relay.",
                },
                {
                  label: "Symbol Coverage",
                  value: stats ? `${stats.symbolCoverageActive} / ${stats.symbolCoverageTotal}` : "—",
                  valueColor: C.text,
                  desc: "Assets with active data vs total monitored",
                  tip: "Number of ILU assets with at least one active venue event in the current observation window, versus the total number of assets in the Institutional Liquidity Universe. Tokens awaiting venue feed activation will show as inactive and are not scored.",
                },
                {
                  label: "Venue Coverage",
                  value: stats ? `${stats.venuesIngesting} / ${stats.totalVenues}` : "—",
                  valueColor: stats && stats.venuesIngesting === stats.totalVenues ? C.green : C.amber,
                  desc: "Venues reporting vs total in DSU",
                  tip: "Number of DSU venues actively reporting data versus the total declared universe of 26 venues. Full coverage (26/26) means no supervisory blind spots. Any shortfall means at least one venue is offline — see the Venue Coverage Matrix for which venue is affected.",
                },
                {
                  label: "Duplicate Rate",
                  value: stats ? `${stats.duplicateRate}%` : "—",
                  valueColor: C.green,
                  desc: "% of events deduplicated (should be near 0%)",
                  tip: "Percentage of incoming events that were identified as duplicates and discarded. DACT performs sequence-number and timestamp deduplication. A non-zero duplicate rate indicates a venue relay is replaying events — this is non-critical but should be investigated if persistent.",
                },
                {
                  label: "Rejected Events",
                  value: stats ? stats.rejectedEvents : "—",
                  valueColor: C.green,
                  desc: "Events rejected for invalid schema (should be 0)",
                  tip: "Count of events rejected outright for failing schema validation (missing required fields, invalid types, or provenance violations). Zero is the target. Any rejections indicate a breaking change in a venue relay's output format. Check the relay for the affected venue.",
                },
              ].map(row => (
                <tr key={row.label} style={{ borderBottom: `1px solid ${C.border}22` }}>
                  <td style={{ padding: "8px 0", fontFamily: MONO, fontSize: 10, color: C.muted, width: "45%", paddingRight: 8 }}>
                    <TT title={row.label} body={row.tip}>
                      <span style={{ borderBottom: `1px dashed ${C.muted}`, cursor: "help" }}>{row.label}</span>
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
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section 5: Non-Contamination Attestation ────────────────────── */}
      <div style={{ padding: "0 20px 20px" }}>
        <div
          data-testid="dact-attestation"
          style={{
            background: "#0D1E3A",
            border: `1px solid ${C.gold}`,
            borderRadius: 4,
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: "0.12em" }}>
                NON-CONTAMINATION ATTESTATION
              </div>
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 9,
                  color: C.gold,
                  border: `1px solid ${C.gold}`,
                  borderRadius: 3,
                  padding: "2px 8px",
                  letterSpacing: "0.08em",
                }}
              >
                DACT-STD-1.0 CONFORMANCE: FULL
              </div>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 9, color: C.gold + "99" }}>
              VERIFIED:{" "}
              {stats ? new Date(stats.verifiedAt).toISOString().replace("T", " ").slice(0, 19) + " UTC" : "—"}
            </div>
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: C.gold + "CC", lineHeight: 1.7, maxWidth: 900 }}>
            This tape is an append-only, uncontaminated record of observable market data. No downstream layer
            (STRATA AI, PoLi, RCL) has written to or modified any DACT event. All events carry complete provenance
            (sourceVenue, transport, engine, dactVersion, latencyMs). DACT is a verbose fact layer — it records
            what happened but does not score, interpret, or evaluate. Analytical logic belongs exclusively to
            downstream layers. This separation is the epistemic foundation of the Stratalink Liquidity Truth Stack.
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            {[
              ["Layer", "Layer 1 — Digital Assets Consolidated Tape"],
              ["Standard", "DACT-STD-1.0"],
              ["Tape Mode", "APPEND-ONLY · IN-MEMORY RING BUFFER (10,000 events)"],
              ["Replay", "Deterministic event replay supported"],
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

  return (
    <div
      data-testid={`dact-event-row-${ev.id}`}
      style={{
        display: "grid",
        gridTemplateColumns: "100px 110px 90px 70px 1fr",
        padding: "4px 14px",
        borderBottom: `1px solid ${C.border}22`,
        background: zebra ? "transparent" : "#0A1220",
        alignItems: "center",
        gap: 8,
      }}
    >
      <div style={{ fontFamily: MONO, fontSize: 10, color: C.muted, whiteSpace: "nowrap" }}>{ts}</div>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 9,
          fontWeight: 700,
          color: typeColor,
          letterSpacing: "0.06em",
          whiteSpace: "nowrap",
        }}
      >
        {ev.eventType}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 10, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {ev.venue}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 10, color: C.accent, fontWeight: 700 }}>{ev.asset}</div>
      <div style={{ fontFamily: MONO, fontSize: 10, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {ev.summary}
      </div>
    </div>
  );
});

// ── Select style helper ────────────────────────────────────────────────────────

const selectStyle: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 10,
  color: "#C8D8E8",
  background: "#0B1320",
  border: "1px solid #1A2435",
  borderRadius: 3,
  padding: "3px 8px",
  cursor: "pointer",
  outline: "none",
};
