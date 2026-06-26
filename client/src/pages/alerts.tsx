import { useQuery } from "@tanstack/react-query";
import type { AlertsData, DashboardData } from "@shared/schema";
import { DashboardHeader } from "@/components/dashboard-header";
import { PlatformTabs } from "@/components/platform-tabs";
import { StressSignalsPanel } from "@/components/stress-signals-panel";
import { BottomTicker } from "@/components/bottom-ticker";
import { DateTimeBar } from "@/components/date-time-bar";
import { TokenSelector } from "@/components/token-selector";
import { useToken } from "@/contexts/TokenContext";
import { Download, Filter } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "./platform/tilt-terminal.css";

/* ─── helpers ─────────────────────────────────────────────────────────────── */
function PanelHeader({ title, tag }: { title: string; tag?: string }) {
  return (
    <div className="tilt-panel-header">
      <div className="tilt-panel-accent" />
      <div className="tilt-panel-title">{title}</div>
      {tag && <div className="tilt-ph-tag" style={{ marginLeft: "auto" }}>{tag}</div>}
    </div>
  );
}

function SbDivider() {
  return <div style={{ width: 1, background: "var(--tilt-border)", alignSelf: "stretch", margin: "0 2px" }} />;
}

function RasDot({ ras }: { ras: string }) {
  const color = ras === "high" ? "var(--tilt-red)" : ras === "medium" ? "var(--tilt-amber)" : "var(--tilt-green)";
  return (
    <div style={{
      width: 8, height: 8, borderRadius: "50%", background: color,
      boxShadow: `0 0 4px ${color}`, flexShrink: 0,
    }} />
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  let color = "var(--tilt-sub)";
  let bg = "rgba(123,142,163,0.08)";
  let border = "rgba(123,142,163,0.18)";
  if (severity === "CRITICAL" || severity === "HIGH") {
    color = "var(--tilt-red)"; bg = "rgba(255,82,82,0.08)"; border = "rgba(255,82,82,0.20)";
  } else if (severity === "WARNING") {
    color = "var(--tilt-amber)"; bg = "rgba(255,179,0,0.08)"; border = "rgba(255,179,0,0.20)";
  } else if (severity === "INFO") {
    color = "var(--tilt-accent)"; bg = "rgba(0,191,165,0.08)"; border = "rgba(0,191,165,0.18)";
  }
  return (
    <span style={{
      fontFamily: "var(--tilt-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
      padding: "2px 6px", borderRadius: 2, color, background: bg, border: `1px solid ${border}`,
      textTransform: "uppercase",
    }}>
      {severity}
    </span>
  );
}

function StatusText({ status }: { status: string }) {
  const color = status === "New" ? "var(--tilt-accent)"
    : status === "Acknowledged" ? "var(--tilt-green)"
    : "var(--tilt-sub)";
  return (
    <span style={{ fontFamily: "var(--tilt-mono)", fontSize: 10, color, letterSpacing: "0.06em" }}>
      {status.toUpperCase()}
    </span>
  );
}

/* ─── TABLE HEADER CELL ───────────────────────────────────────────────────── */
const TH_STYLE: React.CSSProperties = {
  fontFamily: "var(--tilt-mono)",
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  color: "var(--tilt-muted)",
  padding: "6px 10px",
  textAlign: "left",
  borderBottom: "1px solid var(--tilt-border)",
  background: "var(--tilt-header)",
  whiteSpace: "nowrap",
};

const TD_STYLE: React.CSSProperties = {
  fontFamily: "var(--tilt-mono)",
  fontSize: 11,
  color: "var(--tilt-text)",
  padding: "7px 10px",
  borderBottom: "1px solid rgba(26,36,53,0.6)",
  verticalAlign: "middle",
};

/* ─── MAIN COMPONENT ──────────────────────────────────────────────────────── */
export default function Alerts() {
  const { selectedToken, setSelectedToken } = useToken();
  const asset = selectedToken || "BTC";

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard", asset],
    queryFn: async () => {
      const r = await fetch(`/api/dashboard?asset=${asset}`);
      if (!r.ok) throw new Error("Failed to fetch dashboard data");
      return r.json();
    },
    refetchInterval: 10000,
  });

  const { data: alertsData, isLoading: alertsLoading } = useQuery<AlertsData>({
    queryKey: ["/api/alerts", asset],
    queryFn: async () => {
      const r = await fetch(`/api/alerts?asset=${asset}`);
      if (!r.ok) throw new Error("Failed to fetch alerts data");
      return r.json();
    },
    refetchInterval: 15000,
  });

  const { data: l5fData } = useQuery<{ ok: boolean; aggregate: any }>({
    queryKey: ["/api/analytics/l5f/snapshot", asset],
    queryFn: async () => {
      const r = await fetch(`/api/analytics/l5f/snapshot/${asset}`);
      if (!r.ok) throw new Error("L5F unavailable");
      return r.json();
    },
    refetchInterval: 5000,
  });

  const l5fAgg = l5fData?.aggregate ?? null;

  const isLoading = dashboardLoading || alertsLoading;

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0B1019", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "var(--tilt-mono, monospace)", fontSize: 11, color: "#4A5B6E", letterSpacing: "0.10em" }}>
          LOADING ALERTS...
        </div>
      </div>
    );
  }

  if (!dashboardData || !alertsData) {
    return (
      <div style={{ minHeight: "100vh", background: "#0B1019", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "var(--tilt-mono, monospace)", fontSize: 11, color: "#FF5252", letterSpacing: "0.10em" }}>
          ERROR: FAILED TO LOAD DATA
        </div>
      </div>
    );
  }

  const totalWarnings = alertsData.alertLog?.filter(l => l.severity === "WARNING" || l.severity === "CRITICAL" || l.severity === "HIGH").length ?? 0;
  const critCount = alertsData.criticalAssets?.count ?? 0;
  const critTotal = alertsData.criticalAssets?.total ?? 0;

  return (
    <div className="tilt-terminal" data-testid="alerts-page" style={{ minHeight: "100vh" }}>
      <DashboardHeader />
      <PlatformTabs />

      <div className="tilt-root" style={{ flex: 1, minHeight: 0, overflow: "auto" }}>

        {/* ── INNER HEADER BAR ─────────────────────────────────────────────── */}
        <div className="tilt-header" data-testid="alerts-header">
          <div className="tilt-logo">STRATA<span>LINK</span></div>
          <div className="tilt-header-divider" />
          <div style={{ fontSize: 10, color: "var(--tilt-sub)", letterSpacing: 1 }}>
            ALERTS &amp; STRESS MONITOR
          </div>
          <div className="tilt-header-divider" />
          <div style={{ fontSize: 10, color: "var(--tilt-muted)" }}>ALERT v1.0</div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 16, alignItems: "center" }}>
            <div style={{ fontSize: 10, color: "var(--tilt-muted)" }}>
              {alertsData.alertLog?.length ?? 0} EVENTS &middot; {totalWarnings} ACTIVE
            </div>
            <div className="tilt-sb-live">
              <div className="tilt-sb-dot tilt-pulse" />
              LIVE
            </div>
          </div>
        </div>

        {/* ── TOPBAR: token selector + metrics ────────────────────────────── */}
        <div className="tilt-topbar" data-testid="alerts-topbar">
          {/* Token tabs */}
          <div className="tilt-asset-tabs">
            {["BTC", "ETH", "SOL"].map((s) => (
              <div
                key={s}
                className={`tilt-asset-tab ${asset === s ? "active" : ""}`}
                onClick={() => setSelectedToken(s)}
                data-testid={`alerts-asset-${s}`}
              >
                {s}
              </div>
            ))}
          </div>

          <div className="tilt-tb-divider" />
          <div className="tilt-tb-item">
            <div className="tilt-tb-label">Market Depth</div>
            <div className="tilt-tb-value tilt-tb-depth" data-testid="alerts-tb-depth">
              {dashboardData.liveMetrics.find((m) => m.label === "MARKET DEPTH")?.value ?? "—"}
            </div>
          </div>
          <div className="tilt-tb-divider" />
          <div className="tilt-tb-item">
            <div className="tilt-tb-label">Volatility 24H</div>
            <div className="tilt-tb-value" data-testid="alerts-tb-vol">
              {dashboardData.liveMetrics.find((m) => m.label === "VOLATILITY 24H")?.value ?? "—"}
            </div>
          </div>
          <div className="tilt-tb-divider" />
          <div className="tilt-tb-item">
            <div className="tilt-tb-label">Bid-Ask Spread</div>
            <div className="tilt-tb-value" data-testid="alerts-tb-spread">
              {dashboardData.liveMetrics.find((m) => m.label === "BID-ASK SPREAD")?.value ?? "—"}
            </div>
          </div>
          <div className="tilt-tb-divider" />
          <div className="tilt-tb-item">
            <div className="tilt-tb-label">Warning Cap</div>
            <div className="tilt-tb-value" style={{ color: "var(--tilt-amber)" }} data-testid="alerts-tb-warn">
              {alertsData.activeWarningCapacity ?? "—"}
            </div>
          </div>
          <div className="tilt-tb-divider" />
          <div className="tilt-tb-item">
            <div className="tilt-tb-label">Critical Assets</div>
            <div className="tilt-tb-value" style={{ color: "var(--tilt-red)" }} data-testid="alerts-tb-crit">
              {critCount}/{critTotal}
            </div>
          </div>

          <div className="tilt-tb-timestamp">
            LAST SYNC <span style={{ marginLeft: 6 }}>{new Date().toISOString().slice(11, 19)} UTC</span>
          </div>
        </div>

        {/* ── PANEL ROW 1: Liquidity Intelligence + Stress Signals ─────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--tilt-border)" }}>
          {/* Panel 1 — Liquidity Intelligence */}
          <div className="tilt-panel" data-testid="panel-liquidity-intelligence">
            <PanelHeader title="Liquidity Intelligence" tag="PANEL 1" />
            <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, padding: "10px 12px" }}>
              {/* Ring column */}
              <div className="tilt-tsle-col">
                <div className="tilt-tsle-ring" data-testid="card-liquidity-score">
                  <svg viewBox="0 0 100 100">
                    <circle className="tilt-ring-bg" cx="50" cy="50" r="45" />
                    <circle
                      className="tilt-ring-fg"
                      cx="50" cy="50" r="45"
                      style={{
                        strokeDashoffset: l5fAgg
                          ? 283 - (l5fAgg.l5f_composite / 100) * 283
                          : 283,
                        stroke: l5fAgg
                          ? (l5fAgg.l5f_composite >= 75
                            ? "var(--tilt-green)"
                            : l5fAgg.l5f_composite >= 55
                            ? "var(--tilt-accent)"
                            : "var(--tilt-amber)")
                          : "var(--tilt-border)",
                      }}
                    />
                  </svg>
                  <div className="tilt-tsle-center">
                    <div className="tilt-tsle-number" data-testid="text-score-value">
                      {l5fAgg ? Math.round(l5fAgg.l5f_composite) : "—"}
                    </div>
                    <div className="tilt-tsle-sub">/ 100</div>
                  </div>
                </div>
                {(() => {
                  const s = l5fAgg?.l5f_composite ?? 0;
                  const label = s >= 80 ? "ROBUST" : s >= 65 ? "STABLE" : s >= 50 ? "FRAGILE" : "DETERIORATING";
                  const color = s >= 80
                    ? "var(--tilt-green)"
                    : s >= 65
                    ? "var(--tilt-accent)"
                    : s >= 50
                    ? "var(--tilt-amber)"
                    : "var(--tilt-red)";
                  return (
                    <div className="tilt-tsle-status" style={{ color: l5fAgg ? color : "var(--tilt-sub)" }} data-testid="text-risk-level">
                      {l5fAgg ? `\u25CF ${label}` : "\u25CF LOADING"}
                    </div>
                  );
                })()}
                <div style={{ fontSize: 9, color: "var(--tilt-muted)", letterSpacing: 1, marginBottom: 4 }}>
                  L5F COMPOSITE
                </div>
              </div>
              {/* Factor breakdown column */}
              <div className="tilt-l5f-col" style={{ justifyContent: "center" }}>
                <div className="tilt-l5f-title">Liquidity 5-Factor Score (L5F)</div>
                {([
                  { key: "l5f_depth_quality",       label: "Depth Quality",       weight: "×0.30" },
                  { key: "l5f_resilience",           label: "Resilience",          weight: "×0.20" },
                  { key: "l5f_fragmentation",        label: "Fragmentation",       weight: "×0.15" },
                  { key: "l5f_execution_integrity",  label: "Execution Integrity", weight: "×0.20" },
                  { key: "l5f_regime_stability",     label: "Regime Stability",    weight: "×0.15" },
                ] as const).map(({ key, label, weight }) => {
                  const val: number | null = l5fAgg ? ((l5fAgg as any)[key] ?? null) : null;
                  const barColor = val != null
                    ? (val >= 75 ? "var(--tilt-green)" : val >= 55 ? "var(--tilt-accent)" : "var(--tilt-amber)")
                    : "var(--tilt-border)";
                  return (
                    <div className="tilt-l5f-row" key={key}>
                      <div className="tilt-l5f-name">{label}</div>
                      <div className="tilt-l5f-score">{val != null ? val.toFixed(1) : "—"}</div>
                      <div className="tilt-l5f-bar-wrap">
                        <div className="tilt-l5f-bar" style={{ width: val != null ? `${val}%` : "0%", background: barColor }} />
                      </div>
                      <div className="tilt-l5f-weight">{weight}</div>
                    </div>
                  );
                })}
                <div className="tilt-l5f-total">
                  <div className="tilt-l5f-total-label">L5F COMPOSITE</div>
                  <div className="tilt-l5f-total-score">
                    {l5fAgg ? l5fAgg.l5f_composite.toFixed(1) : "—"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Panel 2 — Stress Signal Detection */}
          <div className="tilt-panel" data-testid="panel-stress-signals">
            <PanelHeader title="Stress Signal Detection" tag="PANEL 2" />
            <StressSignalsPanel signals={dashboardData.stressSignals} />
          </div>
        </div>

        {/* ── PANEL ROW 2: Alert Timeline + Capacity stats ─────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 1, background: "var(--tilt-border)", marginTop: 1 }}>
          {/* Panel 3 — Alert Timeline Chart */}
          <div className="tilt-panel" data-testid="panel-alert-timeline">
            <PanelHeader title={`Alert Timeline — ${asset}`} tag="PANEL 3" />
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={alertsData.alertTimeline}>
                <CartesianGrid strokeDasharray="2 4" stroke="#1A2435" opacity={0.8} />
                <XAxis
                  dataKey="time"
                  stroke="#1A2435"
                  tick={{ fill: "#4A5B6E", fontSize: 9, fontFamily: "var(--tilt-mono, monospace)" }}
                  interval={9}
                />
                <YAxis
                  stroke="#1A2435"
                  tick={{ fill: "#4A5B6E", fontSize: 9, fontFamily: "var(--tilt-mono, monospace)" }}
                  width={24}
                />
                <Tooltip
                  contentStyle={{
                    background: "#0F151F",
                    border: "1px solid #1A2435",
                    borderRadius: 2,
                    fontFamily: "var(--tilt-mono, monospace)",
                    fontSize: 10,
                  }}
                  labelStyle={{ color: "#7B8EA3" }}
                  itemStyle={{ color: "#D8DEE8" }}
                />
                <Area type="monotone" dataKey="critical" stackId="1" stroke="#FF5252" fill="#FF5252" fillOpacity={0.5} />
                <Area type="monotone" dataKey="warning"  stackId="1" stroke="#FFB300" fill="#FFB300" fillOpacity={0.5} />
                <Area type="monotone" dataKey="info"     stackId="1" stroke="#00BFA5" fill="#00BFA5" fillOpacity={0.4} />
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
              {[
                { color: "#FF5252", label: "CRITICAL" },
                { color: "#FFB300", label: "WARNING" },
                { color: "#00BFA5", label: "INFO" },
              ].map(({ color, label }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 8, height: 2, background: color, borderRadius: 1 }} />
                  <span style={{ fontFamily: "var(--tilt-mono)", fontSize: 9, color: "var(--tilt-muted)", letterSpacing: "0.08em" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Panel 4 — Warning Capacity + Critical Assets */}
          <div className="tilt-panel" data-testid="panel-capacity">
            <PanelHeader title="Capacity &amp; Risk" tag="PANEL 4" />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Warning Capacity tile */}
              <div style={{
                background: "rgba(255,179,0,0.05)",
                border: "1px solid rgba(255,179,0,0.15)",
                borderRadius: 2,
                padding: "10px 12px",
              }} data-testid="card-warning-capacity">
                <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 9, color: "var(--tilt-muted)", letterSpacing: "0.10em", marginBottom: 6, textTransform: "uppercase" }}>
                  Active Warning Capacity
                </div>
                <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 28, fontWeight: 700, color: "var(--tilt-amber)", lineHeight: 1 }} data-testid="text-warning-capacity">
                  {alertsData.activeWarningCapacity}
                </div>
                <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 9, color: "var(--tilt-muted)", marginTop: 4, letterSpacing: "0.06em" }}>
                  SEVERE SESSION BEFORE COLLAPSE
                </div>
              </div>

              {/* Critical Assets tile */}
              <div style={{
                background: "rgba(255,82,82,0.05)",
                border: "1px solid rgba(255,82,82,0.15)",
                borderRadius: 2,
                padding: "10px 12px",
              }} data-testid="card-critical-assets">
                <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 9, color: "var(--tilt-muted)", letterSpacing: "0.10em", marginBottom: 6, textTransform: "uppercase" }}>
                  Critical Assets
                </div>
                <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 28, fontWeight: 700, color: "var(--tilt-red)", lineHeight: 1 }} data-testid="text-critical-assets-count">
                  {critCount} <span style={{ fontSize: 14, color: "var(--tilt-sub)", fontWeight: 400 }}>/ {critTotal}</span>
                </div>
                <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 9, color: "var(--tilt-muted)", marginTop: 4, letterSpacing: "0.06em" }}>
                  CRITICAL LIQUIDITY
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── PANEL ROW 3: Real-Time Risk Indicators ────────────────────────── */}
        <div style={{ background: "var(--tilt-panel)", marginTop: 1, borderTop: "1px solid var(--tilt-border)" }}>
          <div style={{ padding: "10px 14px" }}>
            <div className="tilt-panel-header" style={{ marginBottom: 0 }}>
              <div className="tilt-panel-accent" />
              <div className="tilt-panel-title">Real-Time Risk Indicators</div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button
                  data-testid="button-filter-alerts"
                  style={{
                    fontFamily: "var(--tilt-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
                    padding: "3px 10px", borderRadius: 2, cursor: "pointer",
                    background: "rgba(255,82,82,0.08)", color: "var(--tilt-red)",
                    border: "1px solid rgba(255,82,82,0.20)", display: "flex", alignItems: "center", gap: 4,
                  }}
                >
                  <Filter style={{ width: 10, height: 10 }} />
                  CRITICAL
                </button>
                <button
                  data-testid="button-export-alerts"
                  style={{
                    fontFamily: "var(--tilt-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
                    padding: "3px 10px", borderRadius: 2, cursor: "pointer",
                    background: "rgba(0,191,165,0.08)", color: "var(--tilt-accent)",
                    border: "1px solid rgba(0,191,165,0.18)", display: "flex", alignItems: "center", gap: 4,
                  }}
                >
                  <Download style={{ width: 10, height: 10 }} />
                  EXPORT
                </button>
              </div>
            </div>
            <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 9, color: "var(--tilt-muted)", letterSpacing: "0.06em", marginTop: 4, marginBottom: 8 }}>
              Timeline of abnormal market events, changing liquidity profile and risk
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }} data-testid="table-risk-indicators">
              <thead>
                <tr>
                  <th style={TH_STYLE}>INDICATOR</th>
                  <th style={TH_STYLE}>OBSERVED BEHAVIOR</th>
                  <th style={{ ...TH_STYLE, textAlign: "center" }}>RAS</th>
                </tr>
              </thead>
              <tbody>
                {alertsData.riskIndicators.map((indicator, index) => (
                  <tr
                    key={index}
                    data-testid={`row-indicator-${index}`}
                    style={{ background: index % 2 === 1 ? "var(--tilt-panel2)" : "var(--tilt-panel)" }}
                  >
                    <td style={{ ...TD_STYLE, color: "var(--tilt-text)", fontWeight: 500 }}
                      data-testid={`text-indicator-name-${index}`}>
                      {indicator.indicator}
                    </td>
                    <td style={{ ...TD_STYLE, color: "var(--tilt-sub)" }}
                      data-testid={`text-indicator-behavior-${index}`}>
                      {indicator.observedBehavior}
                    </td>
                    <td style={{ ...TD_STYLE, textAlign: "center" }}>
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <RasDot ras={indicator.ras} data-testid={`dot-ras-${index}`} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── PANEL ROW 4: Alert Log ────────────────────────────────────────── */}
        <div style={{ background: "var(--tilt-panel)", marginTop: 1, borderTop: "1px solid var(--tilt-border)" }}>
          <div style={{ padding: "10px 14px" }}>
            <div className="tilt-panel-header" style={{ marginBottom: 0 }}>
              <div className="tilt-panel-accent" />
              <div className="tilt-panel-title">Alert Log</div>
              <span style={{ marginLeft: 8, fontFamily: "var(--tilt-mono)", fontSize: 9, color: "var(--tilt-muted)", letterSpacing: "0.06em" }}>
                UTC TIMES
              </span>
            </div>
          </div>
          <div style={{ overflowX: "auto", paddingBottom: 4 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }} data-testid="table-alert-log">
              <thead>
                <tr>
                  <th style={TH_STYLE}>TIME (UTC)</th>
                  <th style={TH_STYLE}>ALERT TYPE</th>
                  <th style={{ ...TH_STYLE, textAlign: "center" }}>SEVERITY</th>
                  <th style={TH_STYLE}>DESCRIPTION</th>
                  <th style={{ ...TH_STYLE, textAlign: "center" }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {alertsData.alertLog.map((log, idx) => (
                  <tr
                    key={log.id}
                    data-testid={`row-alert-${log.id}`}
                    style={{ background: idx % 2 === 1 ? "var(--tilt-panel2)" : "var(--tilt-panel)" }}
                  >
                    <td style={{ ...TD_STYLE, color: "var(--tilt-sub)", whiteSpace: "nowrap" }}
                      data-testid={`text-alert-time-${log.id}`}>
                      {log.timeUTC}
                    </td>
                    <td style={{ ...TD_STYLE, color: "var(--tilt-text)", fontWeight: 500 }}
                      data-testid={`text-alert-type-${log.id}`}>
                      {log.alertType}
                    </td>
                    <td style={{ ...TD_STYLE, textAlign: "center" }}>
                      <SeverityBadge severity={log.severity} data-testid={`badge-severity-${log.id}`} />
                    </td>
                    <td style={{ ...TD_STYLE, color: "var(--tilt-sub)", fontSize: 10 }}
                      data-testid={`text-alert-desc-${log.id}`}>
                      {log.description}
                    </td>
                    <td style={{ ...TD_STYLE, textAlign: "center" }}>
                      <StatusText status={log.status} data-testid={`text-alert-status-${log.id}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── STATUS BAR ───────────────────────────────────────────────────── */}
        <div className="tilt-statusbar" data-testid="alerts-statusbar">
          <div className="tilt-sb-live">
            <div className="tilt-sb-dot tilt-pulse" />
            LIVE DATA
          </div>
          <div className="tilt-sb-item">
            ASSET: <span data-testid="alerts-sb-asset">{asset}</span>
          </div>
          <div className="tilt-sb-item">
            ACTIVE WARNINGS: <span data-testid="alerts-sb-warnings" style={{ color: "var(--tilt-amber)" }}>{totalWarnings}</span>
          </div>
          <div className="tilt-sb-item">
            CRITICAL: <span data-testid="alerts-sb-critical" style={{ color: "var(--tilt-red)" }}>{critCount}/{critTotal}</span>
          </div>
          <div className="tilt-sb-item">
            LOG ENTRIES: <span data-testid="alerts-sb-entries">{alertsData.alertLog?.length ?? 0}</span>
          </div>
          <div style={{ marginLeft: "auto" }} className="tilt-sb-item">
            STRATALINK ALERTS &middot; PHASE 1 INSTITUTIONAL PREVIEW &middot; <span>CONFIDENTIAL</span>
          </div>
        </div>

      </div>

      {/* Bottom Bars */}
      <DateTimeBar />
      <BottomTicker items={dashboardData.tickerItems} />
    </div>
  );
}
