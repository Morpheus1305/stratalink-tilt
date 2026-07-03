import { useState, useEffect, useRef, memo } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { TT } from "@/components/tilt-tooltip";
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
  if (v == null || v === 0) return " - ";
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
      text: "NORMAL  -  STABLE",
      color: "var(--tilt-green)",
      bg: "rgba(34,197,94,0.07)",
      border: "rgba(34,197,94,0.2)",
      note: "No pre-stress indicators active",
    },
    ELEVATED: {
      text: "ELEVATED  -  MONITORING",
      color: "var(--tilt-amber)",
      bg: "rgba(245,158,11,0.07)",
      border: "rgba(245,158,11,0.2)",
      note: "Liquidity stress indicators active  -  monitor closely",
    },
    STRESS: {
      text: "STRESS  -  ALERT",
      color: "var(--tilt-red)",
      bg: "rgba(239,68,68,0.07)",
      border: "rgba(239,68,68,0.2)",
      note: "Multiple stress indicators active",
    },
  };

  const rc = agg ? regimeMap[agg.vol_regime] || regimeMap.NORMAL : regimeMap.NORMAL;

  const factorRows = [
    {
      key: "dq", label: "Depth Quality", weight: "x0.30", barColor: "var(--tilt-accent)",
      tipTitle: "Depth Quality (Weight: 30%)",
      tipBody: "Measures the quality of available depth  -  not just how much exists, but how resilient, distributed and executable it is. A high raw depth figure with a low Depth Quality score means depth is concentrated, thin or decaying rapidly. This is typically the most important sub-score.",
    },
    {
      key: "r", label: "Resilience", weight: "x0.20", barColor: "var(--tilt-sub)",
      tipTitle: "Resilience (Weight: 20%)",
      tipBody: "Measures how quickly depth replenishes after being consumed by an order. High resilience means market makers are actively refreshing liquidity. A high resilience score alongside low depth quality means the market is actively being made but conditions are still fragile.",
    },
    {
      key: "f", label: "Fragmentation", weight: "x0.15", barColor: "var(--tilt-amber)",
      tipTitle: "Fragmentation (Weight: 15%, inverted)",
      tipBody: "Measures how unevenly depth is distributed across venues. Higher fragmentation means more concentration at fewer venues. NOTE: the L5F formula uses (100 - Fragmentation), so higher fragmentation reduces the composite. High concentration creates single-venue dependency risk.",
    },
    {
      key: "ei", label: "Execution Integrity", weight: "x0.20", barColor: "var(--tilt-green)",
      tipTitle: "Execution Integrity (Weight: 20%)",
      tipBody: "Assesses whether an institutional-size order could be executed cleanly across venues at acceptable cost. Factors in spread dispersion, slippage estimates and venue accessibility. Below 60 means execution quality is degraded  -  venue selection dramatically affects cost.",
    },
    {
      key: "rs", label: "Regime Stability", weight: "x0.15", barColor: "var(--tilt-sub)",
      tipTitle: "Regime Stability (Weight: 15%)",
      tipBody: "Measures whether the overall market regime is stable or dislocating. A score of 100 means fully stable  -  no vol spike, no flash event, no structural break. Issues happening within a stable regime are structural and slow-moving rather than acute.",
    },
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
            THE INSTITUTIONAL LIQUIDITY TRUTH TERMINAL
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
              26 VENUES &middot; 31 TSLE FEEDS
            </div>
            <div className="tilt-sb-live">
              <div className="tilt-sb-dot tilt-pulse" />
              LIVE
            </div>
          </div>
        </div>

        {/* TOP CONTEXT BAR */}
        <div className="tilt-topbar" data-testid="tilt-topbar">
          <TT title="Total Depth (+/-10 basis points)" body="Total order book depth within 10 basis points of mid-price, aggregated across all active venues. This is the raw depth figure before any quality adjustment. Cross-reference with the L5F composite below to understand whether this depth is genuinely executable or structurally fragile.">
            <div className="tilt-tb-item">
              <div className="tilt-tb-label">Total Depth +/-10bps</div>
              <div className="tilt-tb-value tilt-tb-depth" data-testid="tilt-depth">
                {agg ? fmtDepth(agg.total_depth_10bps) : " - "}
              </div>
            </div>
          </TT>
          <div className="tilt-tb-divider" />
          <TT title="Venues Live" body="Number of configured venues actively returning data for this asset. 20 out of 20 means full coverage across all CEX, DEX, and L2 chains  -  the platform is seeing the entire market. If this drops below 15, investigate which venue relay has gone offline.">
            <div className="tilt-tb-item">
              <div className="tilt-tb-label">Venues Live</div>
              <div className="tilt-tb-value" data-testid="tilt-venues">
                {agg?.venue_count ?? " - "}
              </div>
            </div>
          </TT>
          <div className="tilt-tb-divider" />
          <TT title="Spread Dispersion (bps)" body="The dispersion of bid-ask spreads across all active venues. Measures how differently venues are quoting the same asset. High dispersion means venue selection dramatically affects execution cost. Under 3 bps is normal; above 5 bps indicates fragmentation.">
            <div className="tilt-tb-item">
              <div className="tilt-tb-label">Spread Dispersion</div>
              <div className="tilt-tb-value" data-testid="tilt-sdisp">
                {agg ? agg.spread_dispersion_bps.toFixed(1) + " bps" : " - "}
              </div>
            </div>
          </TT>
          <div className="tilt-tb-divider" />
          <TT title="Volatility Regime" body="Market regime classification based on volatility structure, volume patterns and correlation behaviour. NORMAL means no vol spike or structural dislocation. STRESSED or CRISIS would indicate acute market conditions.">
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
                {agg?.vol_regime ?? " - "}
              </div>
            </div>
          </TT>
          <div className="tilt-tb-divider" />
          <TT title="Regulated Venue Share (%)" body="Percentage of total depth sitting on regulated venues (e.g. Kraken, Coinbase). A low percentage means the majority of liquidity sits outside the supervisory perimeter  -  a structural market observation, not a platform issue.">
            <div className="tilt-tb-item">
              <div className="tilt-tb-label">Regulated</div>
              <div className="tilt-tb-value" style={{ color: "var(--tilt-green)" }} data-testid="tilt-reg">
                {agg ? Math.round(agg.regulated_depth_share * 100) + "%" : " - "}
              </div>
            </div>
          </TT>
          <div className="tilt-tb-divider" />
          <TT title="Offshore Venue Share (%)" body="Percentage of total depth on unregulated or offshore venues. The mirror of the Regulated figure. A high offshore percentage means supervisory action targeting only regulated venues would affect a small fraction of actual market depth.">
            <div className="tilt-tb-item">
              <div className="tilt-tb-label">Offshore</div>
              <div className="tilt-tb-value" style={{ color: "var(--tilt-amber)" }} data-testid="tilt-off">
                {agg ? Math.round(agg.offshore_depth_share * 100) + "%" : " - "}
              </div>
            </div>
          </TT>
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
                <TT title="Liquidity Health Core" body="Primary liquidity health panel combining the L5F 5-factor composite score (ring gauge) and the TSLE time-series efficiency score. The ring shows current institutional liquidity quality. The five factor bars show the component breakdown. Buffer warming appears during the first 3–5 minutes while Resilience and Regime Stability factors reach steady state.">
                  <div className="tilt-panel-title">Liquidity Health Core</div>
                </TT>
                {isWarming && (
                  <div className="tilt-warming-note" data-testid="tilt-warming">
                    Buffer warming  -  R &amp; RS values are neutral defaults
                  </div>
                )}
                <div className="tilt-ph-tag">PANEL 1</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "190px 1fr", gap: 16, flex: 1, minHeight: 0 }}>
                {/* TSLE Column */}
                <div className="tilt-tsle-col">
                  <TT title="L5F Composite Score" body="The Liquidity 5-Factor Score  -  a weighted composite of Depth Quality, Resilience, Fragmentation, Execution Integrity and Regime Stability. Scale 0-100. Rating bands: AAA (90-100), AA (80-89), A (70-79), BBB (60-69), BB (50-59), B (40-49), CCC (25-39), D (0-24). Below 40 means liquidity is not real at institutional scale.">
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
                          {agg ? score.toFixed(1) : " - "}
                        </div>
                        <div className="tilt-tsle-sub">/ 100</div>
                      </div>
                    </div>
                  </TT>
                  <TT title="L5F Status" body="Qualitative assessment of liquidity trajectory. ROBUST (above 80, improving), STABLE (65-79), FRAGILE (50-64), DETERIORATING (below 50). DETERIORATING means conditions are worsening  -  monitor for further decline toward the critical threshold of 40.">
                    <div className="tilt-tsle-status" style={{ color: agg ? statusColors[statusLabel] : "var(--tilt-sub)" }}>
                      {agg ? `● ${statusLabel}` : "● LOADING"}
                    </div>
                  </TT>
                  <div style={{ fontSize: 9, color: "var(--tilt-muted)", letterSpacing: 1, marginBottom: 8 }}>
                    L5F COMPOSITE
                  </div>
                  <div className="tilt-tsle-deltas">
                    <div className="tilt-tsle-delta">
                      <div className="tilt-d-label">24h Change</div>
                      <div className="tilt-d-val tilt-d-neu"> - </div>
                    </div>
                    <div className="tilt-tsle-delta">
                      <div className="tilt-d-label">7d Change</div>
                      <div className="tilt-d-val tilt-d-neu"> - </div>
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
                      <TT key={fr.key} title={fr.tipTitle} body={fr.tipBody}>
                        <div className="tilt-l5f-row">
                          <div className="tilt-l5f-name">{fr.label}</div>
                          <div className="tilt-l5f-score" data-testid={`tilt-l5f-${fr.key}`}>
                            {val != null ? val.toFixed(1) : " - "}
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
                      </TT>
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
                      {agg ? score.toFixed(1) : " - "}
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
              <TT title="Stress & Regime Monitor" body="Real-time stress and market regime panel. Tracks liquidity withdrawal velocity (bps/hour), fragmentation pressure, current regime classification (NORMAL / THIN / STRESSED / CONFIRMED_STRESS), and spread divergence across venues. Amber and red values indicate conditions requiring immediate attention.">
                <div className="tilt-panel-title">Stress &amp; Regime</div>
              </TT>
              <div className="tilt-ph-tag">PANEL 4</div>
            </div>

            {[
              {
                label: "Liquidity Withdrawal Velocity",
                value: agg?.withdrawal_velocity,
                fmt: (v: number) => v.toFixed(1) + " bps/hr",
                g: 20, a: 40,
                tipTitle: "Liquidity Withdrawal Velocity (bps/hr)",
                tipBody: "Rate at which depth is withdrawing from the order book across venues. Near zero in steady state. Elevated values mean market makers are pulling quotes. Above 20 bps/hr indicates aggressive withdrawal.",
              },
              {
                label: "Depth Decay Rate",
                value: agg?.depth_decay_rate,
                fmt: (v: number) => v.toFixed(1) + "% / min",
                g: 5, a: 15,
                tipTitle: "Depth Decay Rate (%/min)",
                tipBody: "Rate at which order book depth decays per minute. Measures the half-life of resting depth. At 5%/min, depth has a half-life of roughly 14 minutes  -  what you see on screen now will be substantially different shortly.",
              },
              {
                label: "Spread Elasticity",
                value: agg?.spread_elasticity,
                fmt: (v: number) => v.toFixed(2) + "x",
                g: 1.0, a: 1.5,
                tipTitle: "Spread Elasticity (multiplier)",
                tipBody: "How much spreads widen under order flow relative to normal. 1.0x = normal. At 2.0x+, spreads widen twice as fast as usual when orders hit the book, meaning institutional orders cause more market impact than expected.",
              },
            ].map((tile, i) => {
              const cls = tile.value != null ? tileClass(tile.value, tile.g, tile.a) : "";
              const dc = tile.value != null ? dotClass(tile.value, tile.g, tile.a) : "";
              return (
                <TT key={i} title={tile.tipTitle} body={tile.tipBody}>
                  <div className={`tilt-regime-tile ${cls}`} data-testid={`tilt-stress-${i}`}>
                    <div>
                      <div className="tilt-rt-label">{tile.label}</div>
                      <div className="tilt-rt-value">
                        {tile.value != null ? tile.fmt(tile.value) : " - "}
                      </div>
                    </div>
                    <div className={`tilt-rt-dot ${dc}`} />
                  </div>
                </TT>
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

            <TT title="Regime Classification" body="Overall market regime assessment. NORMAL/STRESSED/CRISIS combined with STABLE/TRANSITIONING/DISLOCATING. NORMAL-STABLE is the calmest state. No pre-stress indicators active.">
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
            </TT>
          </div>

          {/* PANEL 3: CROSS-VENUE DEPTH MAP */}
          <div className="tilt-panel tilt-p-venue">
            <div className="tilt-panel-header">
              <div className="tilt-panel-accent" style={{ background: "var(--tilt-green)" }} />
              <TT title="Cross-Venue Depth Map" body="Per-venue order book depth at ±10 basis points for the selected symbol. Shows bid depth, ask depth, global share, spread in basis points, and TSLE efficiency score for each of the 20 monitored venues. Identify which venues hold the deepest resting liquidity and which are withdrawing.">
                <div className="tilt-panel-title">Cross-Venue Depth Map</div>
              </TT>
              {agg?.venue_slices?.length != null && (
                <div
                  className="tilt-ph-tag"
                  style={{ marginLeft: 0, background: "rgba(0,230,118,0.08)", color: "var(--tilt-green)", borderColor: "rgba(0,230,118,0.2)" }}
                  data-testid="tilt-venue-panel-count"
                >
                  {agg.venue_slices.length} VENUES
                </div>
              )}
              <div className="tilt-ph-tag" style={{ marginLeft: 0, background: "rgba(0,230,118,0.08)", color: "var(--tilt-green)", borderColor: "rgba(0,230,118,0.2)" }}>+/- 10 bps</div>
              <div className="tilt-ph-tag">PANEL 2</div>
            </div>
            <div style={{ overflow: "auto", flex: 1 }}>
              <table className="tilt-venue-table" data-testid="tilt-venue-table">
                <thead>
                  <tr>
                    <th style={{ width: 160 }}>Venue</th>
                    <th><TT title="Venue Depth (+/-10bps)" body="Total order book depth at this venue within 10 basis points of mid-price. Larger values mean more resting liquidity available for execution.">Depth (10bps)</TT></th>
                    <th><TT title="Global Depth Share" body="This venue's depth as a percentage of total depth across all active venues. High concentration at a single venue creates dependency risk  -  if that venue goes offline, a large share of depth disappears.">% of Global</TT></th>
                    <th><TT title="Regulatory Status" body="Whether this venue is regulated (YES) or unregulated (NO). Regulated venues operate under a supervisory framework; unregulated venues are offshore. This does not determine the stability score  -  depth and spread quality are weighted more heavily.">Regulated</TT></th>
                    <th><TT title="Venue Stability Score" body="Three-factor composite: depth relative to the largest venue (40%), spread quality (35%), and regulatory status (25%). GREEN (60+) = stable. AMBER (35-59) = stressed. RED (below 35) = critical. The score reflects execution quality, not just regulatory status.">Stability</TT></th>
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
              <TT title="Structural Integrity" body="Structural integrity metrics including the Fragmentation Index (HHI-based venue concentration), cross-venue price dispersion, depth symmetry (bid vs ask balance), and Proof of Market Integrity sub-scores. These probe whether the market microstructure is functioning correctly at a cross-venue level.">
                <div className="tilt-panel-title">Structural Integrity</div>
              </TT>
              <div className="tilt-ph-tag">PANEL 3</div>
            </div>

            <TT title="Fragmentation Index (HHI-based)" body="Herfindahl-Hirschman Index applied to venue depth shares. 0 = perfectly distributed. 1 = single venue monopoly. Above 0.25 indicates meaningful concentration. The same index used by competition authorities for merger review.">
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
                  {agg ? agg.fragmentation_index.toFixed(2) : " - "}
                </div>
                <div className="tilt-int-sub">
                  {agg
                    ? agg.fragmentation_index < 0.3
                      ? "Low fragmentation  -  depth well concentrated"
                      : agg.fragmentation_index < 0.55
                        ? "Moderate dispersion  -  offshore venues fragmenting"
                        : "High fragmentation  -  liquidity widely dispersed"
                    : "Awaiting data"}
                </div>
              </div>
            </TT>

            <TT title="Cross-Venue Spread Dispersion (bps)" body="Standard deviation of bid-ask spreads across all active venues. Confirms whether venues are quoting similar or very different execution conditions. Under 3 bps is normal; above 5 bps indicates fragmentation that degrades execution quality.">
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
                  {agg ? agg.spread_dispersion_bps.toFixed(1) + " bps" : " - "}
                </div>
                <div className="tilt-int-sub">
                  {agg
                    ? agg.spread_dispersion_bps < 2
                      ? "Within acceptable institutional range"
                      : agg.spread_dispersion_bps < 5
                        ? "Elevated spread dispersion  -  review venue fills"
                        : "High dispersion  -  execution quality degraded"
                    : "Awaiting data"}
                </div>
              </div>
            </TT>

            <div className="tilt-int-tile">
              <div className="tilt-int-label">BASIS DISPERSION (Spot vs Perp)</div>
              <div className="tilt-int-value" style={{ color: "var(--tilt-muted)" }}>
                Phase 2
              </div>
              <div className="tilt-int-sub">Perp basis feed not yet in LISSnapshot</div>
            </div>

            <TT title="Price Leadership Index" body="Identifies which venue's price movements lead the rest of the market. The price leader is the venue where price discovery happens  -  other venues follow. If the leader is unregulated, price discovery for this asset is happening outside the supervisory perimeter.">
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
                    {leader?.venue_id ?? " - "}
                  </div>
                  <div className="tilt-int-sub">
                    {leader
                      ? leader.is_regulated
                        ? "Regulated venue leading price discovery"
                        : "Offshore venue leading  -  monitor"
                      : "Awaiting data"}
                  </div>
                </div>
                <div className="tilt-leader-badge" data-testid="tilt-pl-badge">
                  {leader?.venue_id?.toUpperCase() ?? " - "}
                </div>
              </div>
            </TT>
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
