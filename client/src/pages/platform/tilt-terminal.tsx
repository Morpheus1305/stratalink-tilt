import { useState, useEffect, useRef, memo } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/dashboard-header";
import { PlatformTabs } from "@/components/platform-tabs";
import { useToken } from "@/contexts/TokenContext";
import { ExportButton } from "@/components/export-button";
import { generateTokenLiquidityPDF, generateCrossVenuePDF } from "@/lib/reportPdfGenerator";
import "./tilt-terminal.css";
import { PlatformFooter } from "@/components/platform-footer";

const LiveClock = memo(function LiveClock() {
  const [clockStr, setClockStr] = useState(() =>
    new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  );
  useEffect(() => {
    const id = setInterval(() =>
      setClockStr(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }))
    , 1000);
    return () => clearInterval(id);
  }, []);
  return <span data-testid="tilt-time">{clockStr}</span>;
});

interface VenueSlice {
  venue_id: string;
  depth_10bps: number;
  depth_share_pct: number;
  spread_bps: number;
  stability_score: number;
  is_regulated: boolean;
  weight_class: string;
  exec_integrity_score: number;
  price_leadership_score: number;
  poli_score: number;
}

interface TsleAggregate {
  symbol: string;
  computed_at_utc: number;
  venue_count: number;
  total_depth_10bps: number;
  total_depth_25bps: number;
  regulated_depth_share: number;
  offshore_depth_share: number;
  fragmentation_index: number;
  spread_dispersion_bps: number;
  vol_regime: "NORMAL" | "ELEVATED" | "STRESS";
  depth_decay_rate: number;
  withdrawal_velocity: number;
  spread_elasticity: number;
  l5f_depth_quality: number;
  l5f_resilience: number;
  l5f_fragmentation: number;
  l5f_exec_integrity: number;
  l5f_regime_stability: number;
  l5f_composite: number;
  venue_slices: VenueSlice[];
}

function fmtDepth(v: number | null | undefined): string {
  if (v == null || v === 0) return "—";
  if (v >= 1e9) return "$" + (v / 1e9).toFixed(1) + "b";
  if (v >= 1e6) return "$" + (v / 1e6).toFixed(0) + "m";
  if (v >= 1e3) return "$" + (v / 1e3).toFixed(0) + "k";
  return "$" + Math.round(v);
}

function scoreColor(v: number): string {
  if (v >= 75) return "var(--tilt-green)";
  if (v >= 55) return "var(--tilt-accent)";
  return "var(--tilt-amber)";
}

function trendChar(prev: number | undefined, curr: number): { sym: string; cls: string } {
  if (prev == null) return { sym: "→", cls: "flat" };
  const d = curr - prev;
  if (d > 0.5) return { sym: "↑", cls: "up" };
  if (d < -0.5) return { sym: "↓", cls: "dn" };
  return { sym: "→", cls: "flat" };
}

export default function TiltTerminal() {
  const { selectedSymbol } = useToken();
  const latencyRef = useRef<number | null>(null);
  const totalRecordsRef = useRef(0);
  const prevFactorsRef = useRef<Record<string, Record<string, number>>>({});

  const { data: rawAgg = null, isLoading: loading } = useQuery<TsleAggregate | null>({
    queryKey: ["/api/analytics/l5f/snapshot", selectedSymbol],
    queryFn: async () => {
      const t0 = performance.now();
      const resp = await fetch(`/api/analytics/l5f/snapshot/${selectedSymbol}`);
      const data = await resp.json();
      latencyRef.current = Math.round(performance.now() - t0);
      if (data.ok && data.aggregate) {
        totalRecordsRef.current += (data.aggregate.venue_count || 1);
        return data.aggregate as TsleAggregate;
      }
      return null;
    },
    refetchInterval: 5000,
    placeholderData: keepPreviousData,
    staleTime: 4000,
  });
  const agg: TsleAggregate | null = rawAgg ? {
    ...rawAgg,
    spread_dispersion_bps: rawAgg.spread_dispersion_bps ?? 0,
    l5f_depth_quality:     rawAgg.l5f_depth_quality     ?? 0,
    depth_decay_rate:      rawAgg.depth_decay_rate       ?? 0,
    fragmentation_index:   rawAgg.fragmentation_index    ?? 0,
    regulated_depth_share: rawAgg.regulated_depth_share  ?? 0,
    spread_elasticity:     rawAgg.spread_elasticity       ?? 0,
    withdrawal_velocity:   rawAgg.withdrawal_velocity     ?? 0,
    l5f_regime_stability:  rawAgg.l5f_regime_stability    ?? 0,
    l5f_exec_integrity:    rawAgg.l5f_exec_integrity      ?? 0,
    l5f_composite:         rawAgg.l5f_composite           ?? 0,
    venue_count:           rawAgg.venue_count             ?? 0,
    total_depth_10bps:     rawAgg.total_depth_10bps       ?? 0,
    venue_slices:          (rawAgg.venue_slices ?? []).map((v: any) => ({
      ...v,
      spread_bps:       v.spread_bps       ?? 0,
      depth_10bps:      v.depth_10bps      ?? 0,
      depth_share_pct:  v.depth_share_pct  ?? 0,
      stability_score:  v.stability_score  ?? 0,
    })),
  } : null;

  const prev = prevFactorsRef.current[selectedSymbol] || {};
  const factors = agg
    ? {
        dq: agg.l5f_depth_quality,
        r: agg.l5f_resilience,
        f: agg.l5f_fragmentation,
        ei: agg.l5f_exec_integrity,
        rs: agg.l5f_regime_stability,
      }
    : null;

  useEffect(() => {
    if (factors && agg) {
      prevFactorsRef.current[agg.symbol] = { ...factors };
    }
  }, [agg, factors]);

  const isWarming = agg ? agg.depth_decay_rate === 0 && agg.l5f_resilience >= 79 : false;

  const regimeMap = {
    NORMAL: {
      text: "NORMAL — STABLE",
      color: "var(--tilt-green)",
      bg: "rgba(34,197,94,0.07)",
      border: "rgba(34,197,94,0.2)",
      note: "No pre-stress indicators active",
    },
    ELEVATED: {
      text: "ELEVATED — MONITORING",
      color: "var(--tilt-amber)",
      bg: "rgba(245,158,11,0.07)",
      border: "rgba(245,158,11,0.2)",
      note: "Liquidity stress indicators active — monitor closely",
    },
    STRESS: {
      text: "STRESS — ALERT",
      color: "var(--tilt-red)",
      bg: "rgba(239,68,68,0.07)",
      border: "rgba(239,68,68,0.2)",
      note: "Multiple stress indicators active",
    },
  };

  const rc = agg ? regimeMap[agg.vol_regime] || regimeMap.NORMAL : regimeMap.NORMAL;

  const factorRows = [
    { key: "dq", label: "Depth Quality", weight: "x0.30", barColor: "var(--tilt-accent)" },
    { key: "r", label: "Resilience", weight: "x0.20", barColor: "var(--tilt-sub)" },
    { key: "f", label: "Fragmentation", weight: "x0.15", barColor: "var(--tilt-amber)" },
    { key: "ei", label: "Execution Integrity", weight: "x0.20", barColor: "var(--tilt-green)" },
    { key: "rs", label: "Regime Stability", weight: "x0.15", barColor: "var(--tilt-sub)" },
  ];

  function tileClass(value: number | null, gThresh: number, aThresh: number): string {
    if (value == null) return "";
    return value < gThresh ? "g" : value < aThresh ? "a" : "r";
  }

  function dotClass(value: number | null, gThresh: number, aThresh: number): string {
    if (value == null) return "";
    return value < gThresh ? "tilt-dot-g" : value < aThresh ? "tilt-dot-a" : "tilt-dot-r";
  }

  const score = agg?.l5f_composite ?? 0;
  const offset = 283 - (283 * score) / 100;
  const statusLabel = score >= 80 ? "ROBUST" : score >= 65 ? "STABLE" : score >= 50 ? "FRAGILE" : "DETERIORATING";
  const statusColors: Record<string, string> = {
    ROBUST: "var(--tilt-green)",
    STABLE: "var(--tilt-accent)",
    FRAGILE: "var(--tilt-amber)",
    DETERIORATING: "var(--tilt-red)",
  };

  const leader = agg?.venue_slices?.reduce<VenueSlice | null>(
    (best, v) => (v.price_leadership_score > (best?.price_leadership_score || 0) ? v : best),
    null
  ) ?? null;

  return (
    <div className="tilt-terminal" data-testid="tilt-terminal">
      <DashboardHeader />
      <PlatformTabs />

      <div className="tilt-root">
        {/* HEADER */}
        <div className="tilt-header" data-testid="tilt-header">
          <div className="tilt-logo">
            STRATA<span>LINK</span>
          </div>
          <div className="tilt-header-divider" />
          <div style={{ fontSize: 10, color: "var(--tilt-sub)", letterSpacing: 1 }}>
            INSTITUTIONAL LIQUIDITY TERMINAL
          </div>
          <div className="tilt-header-divider" />
          <div style={{ fontSize: 10, color: "var(--tilt-muted)" }}>TILT v1.0</div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
            {agg && (
              <ExportButton
                options={[
                  {
                    label: "Token Liquidity Report (PDF)",
                    format: "PDF",
                    onGenerate: async () => { await generateTokenLiquidityPDF(agg as any, selectedSymbol); },
                  },
                  {
                    label: "Cross-Venue Comparison (PDF)",
                    format: "PDF",
                    onGenerate: async () => { await generateCrossVenuePDF(agg as any, selectedSymbol); },
                  },
                ]}
              />
            )}
            <div style={{ fontSize: 10, color: "var(--tilt-muted)" }}>
              14 VENUES &middot; 17 TSLE FEEDS
            </div>
            <div className="tilt-sb-live">
              <div className="tilt-sb-dot tilt-pulse" />
              LIVE
            </div>
          </div>
        </div>

        {/* TOP CONTEXT BAR */}
        <div className="tilt-topbar" data-testid="tilt-topbar">
          <div className="tilt-tb-item">
            <div className="tilt-tb-label">Total Depth +/-10bps</div>
            <div className="tilt-tb-value tilt-tb-depth" data-testid="tilt-depth">
              {agg ? fmtDepth(agg.total_depth_10bps) : "—"}
            </div>
          </div>
          <div className="tilt-tb-divider" />
          <div className="tilt-tb-item">
            <div className="tilt-tb-label">Venues Live</div>
            <div className="tilt-tb-value" data-testid="tilt-venues">
              {agg?.venue_count ?? "—"}
            </div>
          </div>
          <div className="tilt-tb-divider" />
          <div className="tilt-tb-item">
            <div className="tilt-tb-label">Spread Dispersion</div>
            <div className="tilt-tb-value" data-testid="tilt-sdisp">
              {agg ? agg.spread_dispersion_bps.toFixed(1) + " bps" : "—"}
            </div>
          </div>
          <div className="tilt-tb-divider" />
          <div className="tilt-tb-item">
            <div className="tilt-tb-label">Vol Regime</div>
            <div
              className={`tilt-regime-badge ${
                agg?.vol_regime === "NORMAL"
                  ? "tilt-regime-normal"
                  : agg?.vol_regime === "ELEVATED"
                    ? "tilt-regime-elevated"
                    : agg
                      ? "tilt-regime-stress"
                      : "tilt-regime-normal"
              }`}
              data-testid="tilt-regime"
            >
              {agg?.vol_regime ?? "—"}
            </div>
          </div>
          <div className="tilt-tb-divider" />
          <div className="tilt-tb-item">
            <div className="tilt-tb-label">Regulated</div>
            <div className="tilt-tb-value" style={{ color: "var(--tilt-green)" }} data-testid="tilt-reg">
              {agg ? Math.round(agg.regulated_depth_share * 100) + "%" : "—"}
            </div>
          </div>
          <div className="tilt-tb-divider" />
          <div className="tilt-tb-item">
            <div className="tilt-tb-label">Offshore</div>
            <div className="tilt-tb-value" style={{ color: "var(--tilt-amber)" }} data-testid="tilt-off">
              {agg ? Math.round(agg.offshore_depth_share * 100) + "%" : "—"}
            </div>
          </div>
          <div className="tilt-header-divider" style={{ marginLeft: 12 }} />
          <div className="tilt-tb-timestamp">
            LAST UPDATE &nbsp;<LiveClock />
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="tilt-main" data-testid="tilt-main">
          {/* PANEL 1: STATUS BOARD */}
          <div className="tilt-panel tilt-p-status">
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <div className="tilt-panel-header">
                <div className="tilt-panel-accent" />
                <div className="tilt-panel-title">Liquidity Health Core</div>
                {isWarming && (
                  <div className="tilt-warming-note" data-testid="tilt-warming">
                    Buffer warming — R &amp; RS values are neutral defaults
                  </div>
                )}
                <div className="tilt-ph-tag">PANEL 1</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "190px 1fr", gap: 16, flex: 1, minHeight: 0 }}>
                {/* TSLE Column */}
                <div className="tilt-tsle-col">
                  <div className="tilt-tsle-ring">
                    <svg viewBox="0 0 100 100">
                      <circle className="tilt-ring-bg" cx="50" cy="50" r="45" />
                      <circle
                        className="tilt-ring-fg"
                        cx="50"
                        cy="50"
                        r="45"
                        style={{ strokeDashoffset: agg ? offset : 283 }}
                      />
                    </svg>
                    <div className="tilt-tsle-center">
                      <div className="tilt-tsle-number" data-testid="tilt-l5f-score">
                        {agg ? score.toFixed(1) : "—"}
                      </div>
                      <div className="tilt-tsle-sub">/ 100</div>
                    </div>
                  </div>
                  <div className="tilt-tsle-status" style={{ color: agg ? statusColors[statusLabel] : "var(--tilt-sub)" }}>
                    {agg ? `● ${statusLabel}` : "● LOADING"}
                  </div>
                  <div style={{ fontSize: 9, color: "var(--tilt-muted)", letterSpacing: 1, marginBottom: 8 }}>
                    L5F COMPOSITE
                  </div>
                  <div className="tilt-tsle-deltas">
                    <div className="tilt-tsle-delta">
                      <div className="tilt-d-label">24h Change</div>
                      <div className="tilt-d-val tilt-d-neu">—</div>
                    </div>
                    <div className="tilt-tsle-delta">
                      <div className="tilt-d-label">7d Change</div>
                      <div className="tilt-d-val tilt-d-neu">—</div>
                    </div>
                  </div>
                </div>

                {/* L5F Column */}
                <div className="tilt-l5f-col">
                  <div className="tilt-l5f-title">Liquidity 5-Factor Score (L5F)</div>
                  {factorRows.map((fr) => {
                    const val = factors ? (factors as any)[fr.key] : null;
                    const t = trendChar(prev[fr.key], val ?? 0);
                    return (
                      <div className="tilt-l5f-row" key={fr.key}>
                        <div className="tilt-l5f-name">{fr.label}</div>
                        <div className="tilt-l5f-score" data-testid={`tilt-l5f-${fr.key}`}>
                          {val != null ? val.toFixed(1) : "—"}
                        </div>
                        <div className={`tilt-l5f-trend ${t.cls}`}>{t.sym}</div>
                        <div className="tilt-l5f-bar-wrap">
                          <div
                            className="tilt-l5f-bar"
                            style={{
                              width: val != null ? `${val}%` : "0%",
                              background: val != null ? scoreColor(val) : fr.barColor,
                            }}
                          />
                        </div>
                        <div className="tilt-l5f-weight">{fr.weight}</div>
                      </div>
                    );
                  })}
                  <div className="tilt-l5f-total">
                    <div>
                      <div className="tilt-l5f-total-label">L5F COMPOSITE</div>
                      <div style={{ fontSize: 9, color: "var(--tilt-muted)", marginTop: 2 }}>
                        0.30·DQ + 0.20·R + 0.15·(100-F) + 0.20·EI + 0.15·RS
                      </div>
                    </div>
                    <div className="tilt-l5f-total-score" data-testid="tilt-l5f-total">
                      {agg ? score.toFixed(1) : "—"}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>

          {/* PANEL 2: REGIME & STRESS */}
          <div className="tilt-panel tilt-p-regime">
            <div className="tilt-panel-header">
              <div className="tilt-panel-accent" style={{ background: "var(--tilt-amber)" }} />
              <div className="tilt-panel-title">Stress &amp; Regime</div>
              <div className="tilt-ph-tag">PANEL 4</div>
            </div>

            {[
              {
                label: "Liquidity Withdrawal Velocity",
                value: agg?.withdrawal_velocity,
                fmt: (v: number) => v.toFixed(1) + " bps/hr",
                g: 20, a: 40,
              },
              {
                label: "Depth Decay Rate",
                value: agg?.depth_decay_rate,
                fmt: (v: number) => v.toFixed(1) + "% / min",
                g: 5, a: 15,
              },
              {
                label: "Spread Elasticity",
                value: agg?.spread_elasticity,
                fmt: (v: number) => v.toFixed(2) + "x",
                g: 1.0, a: 1.5,
              },
            ].map((tile, i) => {
              const cls = tile.value != null ? tileClass(tile.value, tile.g, tile.a) : "";
              const dc = tile.value != null ? dotClass(tile.value, tile.g, tile.a) : "";
              return (
                <div className={`tilt-regime-tile ${cls}`} key={i} data-testid={`tilt-stress-${i}`}>
                  <div>
                    <div className="tilt-rt-label">{tile.label}</div>
                    <div className="tilt-rt-value">
                      {tile.value != null ? tile.fmt(tile.value) : "—"}
                    </div>
                  </div>
                  <div className={`tilt-rt-dot ${dc}`} />
                </div>
              );
            })}

            <div className="tilt-regime-tile">
              <div>
                <div className="tilt-rt-label">Funding Skew (Perps vs Spot)</div>
                <div className="tilt-rt-value" style={{ color: "var(--tilt-muted)" }}>
                  Phase 2
                </div>
              </div>
              <div className="tilt-rt-dot" />
            </div>
            <div className="tilt-regime-tile">
              <div>
                <div className="tilt-rt-label">Derivatives Dominance</div>
                <div className="tilt-rt-value" style={{ color: "var(--tilt-muted)" }}>
                  Phase 2
                </div>
              </div>
              <div className="tilt-rt-dot" />
            </div>

            <div
              className="tilt-regime-box"
              style={{ background: rc.bg, border: `1px solid ${rc.border}` }}
              data-testid="tilt-regime-box"
            >
              <div style={{ fontSize: 9, color: rc.color, letterSpacing: 1, fontWeight: 700, marginBottom: 3 }}>
                REGIME CLASSIFICATION
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: agg ? rc.color : "var(--tilt-sub)" }}>
                {agg ? rc.text : "LOADING..."}
              </div>
              <div style={{ fontSize: 10, color: "var(--tilt-muted)", marginTop: 2 }}>
                {agg ? rc.note : "Awaiting first tick"}
              </div>
            </div>
          </div>

          {/* PANEL 3: CROSS-VENUE DEPTH MAP */}
          <div className="tilt-panel tilt-p-venue">
            <div className="tilt-panel-header">
              <div className="tilt-panel-accent" style={{ background: "var(--tilt-green)" }} />
              <div className="tilt-panel-title">Cross-Venue Depth Map</div>
              <div className="tilt-ph-tag" style={{ marginLeft: 0, background: "rgba(0,230,118,0.08)", color: "var(--tilt-green)", borderColor: "rgba(0,230,118,0.2)" }}>+/- 10 bps</div>
              <div className="tilt-ph-tag">PANEL 2</div>
            </div>
            <div style={{ overflow: "auto", flex: 1 }}>
              <table className="tilt-venue-table" data-testid="tilt-venue-table">
                <thead>
                  <tr>
                    <th style={{ width: 160 }}>Venue</th>
                    <th>Depth (10bps)</th>
                    <th>% of Global</th>
                    <th>Regulated</th>
                    <th>Stability</th>
                    <th style={{ width: 180 }}>Depth Share</th>
                  </tr>
                </thead>
                <tbody>
                  {!agg || !agg.venue_slices?.length ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", color: "var(--tilt-muted)", padding: 20 }}>
                        Awaiting first tick...
                      </td>
                    </tr>
                  ) : (
                    agg.venue_slices.map((v) => {
                      const stabColor =
                        v.stability_score >= 75 ? "var(--tilt-green)" : v.stability_score >= 60 ? "var(--tilt-amber)" : "var(--tilt-red)";
                      const barWidth = Math.min(v.depth_share_pct * 3, 100);
                      return (
                        <tr key={v.venue_id} data-testid={`tilt-venue-${v.venue_id}`}>
                          <td>
                            <div className="tilt-venue-name">{v.venue_id}</div>
                            <div className="tilt-venue-type">{v.weight_class}</div>
                          </td>
                          <td className="tilt-depth-val">{fmtDepth(v.depth_10bps)}</td>
                          <td className="tilt-pct-val">{v.depth_share_pct.toFixed(1)}%</td>
                          <td className={v.is_regulated ? "tilt-reg-yes" : "tilt-reg-no"}>
                            {v.is_regulated ? "YES" : "NO"}
                          </td>
                          <td>
                            <div className="tilt-stab-bar-wrap">
                              <span className="tilt-stab-num" style={{ color: stabColor }}>
                                {Math.round(v.stability_score)}
                              </span>
                              <div className="tilt-mini-bar-wrap">
                                <div
                                  className="tilt-mini-bar"
                                  style={{ width: `${v.stability_score}%`, background: stabColor }}
                                />
                              </div>
                            </div>
                          </td>
                          <td>
                            <div
                              style={{
                                height: 8,
                                background: "var(--tilt-border)",
                                borderRadius: 2,
                                width: "100%",
                                maxWidth: 140,
                                margin: "auto",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${barWidth}%`,
                                  background: v.is_regulated ? "var(--tilt-accent)" : "var(--tilt-muted)",
                                  borderRadius: 2,
                                  maxWidth: "100%",
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* PANEL 4: STRUCTURAL INTEGRITY */}
          <div className="tilt-panel tilt-p-integrity">
            <div className="tilt-panel-header">
              <div className="tilt-panel-accent" />
              <div className="tilt-panel-title">Structural Integrity</div>
              <div className="tilt-ph-tag">PANEL 3</div>
            </div>

            <div className="tilt-int-tile">
              <div className="tilt-int-label">FRAGMENTATION INDEX (HHI-based)</div>
              <div
                className="tilt-int-value"
                data-testid="tilt-fi"
                style={{
                  color: agg
                    ? agg.fragmentation_index < 0.3
                      ? "var(--tilt-green)"
                      : agg.fragmentation_index < 0.55
                        ? "var(--tilt-amber)"
                        : "var(--tilt-red)"
                    : "var(--tilt-sub)",
                }}
              >
                {agg ? agg.fragmentation_index.toFixed(2) : "—"}
              </div>
              <div className="tilt-int-sub">
                {agg
                  ? agg.fragmentation_index < 0.3
                    ? "Low fragmentation — depth well concentrated"
                    : agg.fragmentation_index < 0.55
                      ? "Moderate dispersion — offshore venues fragmenting"
                      : "High fragmentation — liquidity widely dispersed"
                  : "Awaiting data"}
              </div>
            </div>

            <div className="tilt-int-tile">
              <div className="tilt-int-label">CROSS-VENUE SPREAD DISPERSION</div>
              <div
                className="tilt-int-value"
                data-testid="tilt-sd"
                style={{
                  color: agg
                    ? agg.spread_dispersion_bps < 2
                      ? "var(--tilt-green)"
                      : agg.spread_dispersion_bps < 5
                        ? "var(--tilt-amber)"
                        : "var(--tilt-red)"
                    : "var(--tilt-sub)",
                }}
              >
                {agg ? agg.spread_dispersion_bps.toFixed(1) + " bps" : "—"}
              </div>
              <div className="tilt-int-sub">
                {agg
                  ? agg.spread_dispersion_bps < 2
                    ? "Within acceptable institutional range"
                    : agg.spread_dispersion_bps < 5
                      ? "Elevated spread dispersion — review venue fills"
                      : "High dispersion — execution quality degraded"
                  : "Awaiting data"}
              </div>
            </div>

            <div className="tilt-int-tile">
              <div className="tilt-int-label">BASIS DISPERSION (Spot vs Perp)</div>
              <div className="tilt-int-value" style={{ color: "var(--tilt-muted)" }}>
                Phase 2
              </div>
              <div className="tilt-int-sub">Perp basis feed not yet in LISSnapshot</div>
            </div>

            <div className="tilt-int-price-leader">
              <div className="tilt-ipl-left">
                <div className="tilt-int-label">PRICE LEADERSHIP INDEX</div>
                <div
                  className="tilt-int-value"
                  data-testid="tilt-pl"
                  style={{
                    fontSize: 14,
                    color: leader?.is_regulated ? "var(--tilt-green)" : "var(--tilt-text)",
                  }}
                >
                  {leader?.venue_id ?? "—"}
                </div>
                <div className="tilt-int-sub">
                  {leader
                    ? leader.is_regulated
                      ? "Regulated venue leading price discovery"
                      : "Offshore venue leading — monitor"
                    : "Awaiting data"}
                </div>
              </div>
              <div className="tilt-leader-badge" data-testid="tilt-pl-badge">
                {leader?.venue_id?.toUpperCase() ?? "—"}
              </div>
            </div>
          </div>
        </div>

        {/* STATUS BAR */}
        <PlatformFooter
          venueCount={agg?.venue_count ?? null}
          latency={latencyRef.current}
          testId="tilt-statusbar"
        />
      </div>
    </div>
  );
}
