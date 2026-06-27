import { useState, useEffect, useRef, useCallback } from "react";
import { DashboardHeader } from "@/components/dashboard-header";
import { PlatformTabs } from "@/components/platform-tabs";
import { useToken } from "@/contexts/TokenContext";
import "./tilt-terminal.css";

// ─── Types ────────────────────────────────────────────────────────────────────
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

type RagStatus = "NORMAL" | "ELEVATED" | "CRITICAL";

interface DetectionCategory {
  id: string;
  label1: string;
  label2: string;
  status: RagStatus;
  score: number;
  metricLabel: string;
  metricValue: string;
  threshold: string;
  lastEval: string;
  detail: string;
}

interface Signal {
  id: string;
  ts: number;
  category: string;
  severity: RagStatus;
  symbol: string;
  message: string;
  supporting: string;
}

interface EwdsIndicator {
  label: string;
  value: string;
  status: RagStatus;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_SIGNALS = 50;

const RAG_COLOR: Record<RagStatus, string> = {
  NORMAL:   "var(--tilt-green)",
  ELEVATED: "var(--tilt-amber)",
  CRITICAL: "var(--tilt-red)",
};
const RAG_BG: Record<RagStatus, string> = {
  NORMAL:   "var(--tilt-panel)",
  ELEVATED: "rgba(255,179,0,0.06)",
  CRITICAL: "rgba(255,82,82,0.06)",
};
const STATUS_SCORE: Record<RagStatus, number> = { NORMAL: 100, ELEVATED: 50, CRITICAL: 10 };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDepth(v: number | null | undefined): string {
  if (!v) return "—";
  if (v >= 1e9) return "$" + (v / 1e9).toFixed(1) + "b";
  if (v >= 1e6) return "$" + (v / 1e6).toFixed(1) + "m";
  if (v >= 1e3) return "$" + (v / 1e3).toFixed(0) + "k";
  return "$" + Math.round(v);
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function poliRating(score: number): string {
  if (score >= 95) return "AAA";
  if (score >= 85) return "AA";
  if (score >= 75) return "A";
  if (score >= 65) return "BBB";
  if (score >= 55) return "BB";
  if (score >= 45) return "B";
  if (score >= 35) return "CCC";
  if (score >= 25) return "CC";
  if (score >= 15) return "C";
  return "D";
}

// ─── Detection logic ──────────────────────────────────────────────────────────
function computeDetections(agg: TsleAggregate, evalTime: string): DetectionCategory[] {
  const topShare = agg.venue_slices?.[0]?.depth_share_pct ?? 0;
  const topVenue = agg.venue_slices?.[0]?.venue_id?.toUpperCase() ?? "—";
  const venuesInRange = agg.venue_slices?.filter(v => v.spread_bps > 0 && v.spread_bps < 10).length ?? 0;

  const divStatus: RagStatus  = agg.spread_dispersion_bps >= 8 ? "CRITICAL" : agg.spread_dispersion_bps >= 3 ? "ELEVATED" : "NORMAL";
  const dqStatus: RagStatus   = agg.l5f_depth_quality < 20 ? "CRITICAL" : agg.l5f_depth_quality < 40 ? "ELEVATED" : "NORMAL";
  const concStatus: RagStatus = topShare >= 80 ? "CRITICAL" : topShare >= 60 ? "ELEVATED" : "NORMAL";
  const spStatus: RagStatus   = agg.spread_dispersion_bps >= 8 ? "CRITICAL" : agg.spread_dispersion_bps >= 3 ? "ELEVATED" : "NORMAL";
  const regStatus: RagStatus  = agg.vol_regime === "STRESS" ? "CRITICAL" : agg.vol_regime === "ELEVATED" ? "ELEVATED" : "NORMAL";
  const eiStatus: RagStatus   = agg.l5f_exec_integrity < 30 ? "CRITICAL" : agg.l5f_exec_integrity < 60 ? "ELEVATED" : "NORMAL";

  return [
    {
      id: "divergence", label1: "CROSS-VENUE", label2: "DIVERGENCE", status: divStatus,
      score: divStatus === "NORMAL" ? 88 : divStatus === "ELEVATED" ? 50 : 15,
      metricLabel: "Spread Dispersion", metricValue: agg.spread_dispersion_bps.toFixed(1) + " bps",
      threshold: "3.0 bps", lastEval: evalTime,
      detail: `Venues in range: ${venuesInRange}/${agg.venue_count}`,
    },
    {
      id: "manipulation", label1: "DEPTH", label2: "MANIPULATION", status: dqStatus,
      score: Math.round(agg.l5f_depth_quality),
      metricLabel: "Depth Quality factor", metricValue: agg.l5f_depth_quality.toFixed(1),
      threshold: "40", lastEval: evalTime,
      detail: `Total depth: ${fmtDepth(agg.total_depth_10bps)} · Decay: ${agg.depth_decay_rate.toFixed(2)}%/min`,
    },
    {
      id: "concentration", label1: "LIQUIDITY", label2: "CONCENTRATION", status: concStatus,
      score: concStatus === "NORMAL" ? 90 : concStatus === "ELEVATED" ? 45 : 10,
      metricLabel: `Top venue (${topVenue})`, metricValue: topShare.toFixed(1) + "%",
      threshold: "60%", lastEval: evalTime,
      detail: `HHI: ${agg.fragmentation_index.toFixed(3)} · Reg share: ${(agg.regulated_depth_share * 100).toFixed(1)}%`,
    },
    {
      id: "spread", label1: "SPREAD", label2: "ANOMALY", status: spStatus,
      score: spStatus === "NORMAL" ? 85 : spStatus === "ELEVATED" ? 45 : 12,
      metricLabel: "Cross-venue dispersion", metricValue: agg.spread_dispersion_bps.toFixed(1) + " bps",
      threshold: "3.0 bps", lastEval: evalTime,
      detail: `Elasticity: ${agg.spread_elasticity.toFixed(2)} · Velocity: ${agg.withdrawal_velocity.toFixed(1)} bps/hr`,
    },
    {
      id: "regime", label1: "REGIME", label2: "INSTABILITY", status: regStatus,
      score: Math.round(agg.l5f_regime_stability),
      metricLabel: "Vol regime", metricValue: agg.vol_regime,
      threshold: "NORMAL", lastEval: evalTime,
      detail: `RS factor: ${agg.l5f_regime_stability.toFixed(1)} · Composite: ${agg.l5f_composite}`,
    },
    {
      id: "execution", label1: "EXECUTION", label2: "INTEGRITY", status: eiStatus,
      score: Math.round(agg.l5f_exec_integrity),
      metricLabel: "Exec Integrity factor", metricValue: agg.l5f_exec_integrity.toFixed(1) + "/100",
      threshold: "60", lastEval: evalTime,
      detail: `Spread dispersion: ${agg.spread_dispersion_bps.toFixed(2)} bps · Venues: ${agg.venue_count}`,
    },
  ];
}

// ─── Signal factory ───────────────────────────────────────────────────────────
function makeSignal(cat: DetectionCategory, symbol: string, agg: TsleAggregate): Signal {
  const topV = agg.venue_slices?.[0];
  const topName = topV?.venue_id?.toUpperCase() ?? "—";

  const msgs: Record<string, Record<RagStatus, [string, string]>> = {
    divergence: {
      NORMAL: [
        `Cross-venue spread dispersion normalised to ${agg.spread_dispersion_bps.toFixed(2)} bps. Venue pricing alignment within arbitrage bounds across ${agg.venue_count} venues.`,
        `Dispersion: ${agg.spread_dispersion_bps.toFixed(2)} bps · Venues: ${agg.venue_count} · Elasticity: ${agg.spread_elasticity.toFixed(2)}`,
      ],
      ELEVATED: [
        `Spread dispersion across ${agg.venue_count} venues reached ${agg.spread_dispersion_bps.toFixed(2)} bps (threshold: 3 bps). Venue-to-venue pricing is diverging beyond normal arbitrage bounds.`,
        `Dispersion: ${agg.spread_dispersion_bps.toFixed(2)} bps · Venues: ${agg.venue_count} · Elasticity: ${agg.spread_elasticity.toFixed(2)}`,
      ],
      CRITICAL: [
        `Critical spread dispersion detected: ${agg.spread_dispersion_bps.toFixed(2)} bps (threshold: 8 bps). Extreme venue fragmentation signals potential market dislocation.`,
        `Dispersion: ${agg.spread_dispersion_bps.toFixed(2)} bps · Venues: ${agg.venue_count} · Withdrawal velocity: ${agg.withdrawal_velocity.toFixed(1)} bps/hr`,
      ],
    },
    manipulation: {
      NORMAL: [
        `Depth Quality score normalised to ${agg.l5f_depth_quality.toFixed(1)}/100. Orderbook depth within institutional norms across monitored venues.`,
        `DQ: ${agg.l5f_depth_quality.toFixed(1)} · Total Depth: ${fmtDepth(agg.total_depth_10bps)} · Decay Rate: ${agg.depth_decay_rate.toFixed(2)}%/min`,
      ],
      ELEVATED: [
        `Depth Quality dropped to ${agg.l5f_depth_quality.toFixed(1)} (threshold: 40). Orderbook depth across monitored venues is abnormally thin relative to session norms.`,
        `DQ: ${agg.l5f_depth_quality.toFixed(1)} · Total Depth: ${fmtDepth(agg.total_depth_10bps)} · Decay Rate: ${agg.depth_decay_rate.toFixed(2)}%/min`,
      ],
      CRITICAL: [
        `Critical Depth Quality: ${agg.l5f_depth_quality.toFixed(1)}/100 (threshold: 20). Severe orderbook thinning — large orders risk significant market impact.`,
        `DQ: ${agg.l5f_depth_quality.toFixed(1)} · Total Depth: ${fmtDepth(agg.total_depth_10bps)} · Decay Rate: ${agg.depth_decay_rate.toFixed(2)}%/min`,
      ],
    },
    concentration: {
      NORMAL: [
        `Liquidity distribution normalised. ${topName} holds ${topV?.depth_share_pct.toFixed(1) ?? "—"}% of monitored depth — within acceptable concentration bounds.`,
        `${topName}: ${topV?.depth_share_pct.toFixed(1) ?? "—"}% · HHI: ${agg.fragmentation_index.toFixed(3)} · Venues: ${agg.venue_count}`,
      ],
      ELEVATED: [
        `${topName} holds ${topV?.depth_share_pct.toFixed(1) ?? "—"}% of monitored depth for ${symbol}. Single-venue concentration exceeds the 60% threshold. Diversity of liquidity sources is insufficient for institutional-grade execution assurance.`,
        `${topName}: ${topV?.depth_share_pct.toFixed(1) ?? "—"}% · 2nd: ${(agg.venue_slices?.[1]?.depth_share_pct ?? 0).toFixed(1)}% · HHI: ${agg.fragmentation_index.toFixed(3)}`,
      ],
      CRITICAL: [
        `Extreme concentration: ${topName} holds ${topV?.depth_share_pct.toFixed(1) ?? "—"}% of monitored depth. HHI of ${agg.fragmentation_index.toFixed(3)} indicates near-monopoly liquidity structure. Significant single-venue withdrawal risk.`,
        `${topName}: ${topV?.depth_share_pct.toFixed(1) ?? "—"}% · HHI: ${agg.fragmentation_index.toFixed(3)} · Reg share: ${(agg.regulated_depth_share * 100).toFixed(1)}%`,
      ],
    },
    spread: {
      NORMAL: [
        `Cross-venue spread alignment normal. Dispersion at ${agg.spread_dispersion_bps.toFixed(2)} bps — execution quality consistent across all monitored venues.`,
        `Dispersion: ${agg.spread_dispersion_bps.toFixed(2)} bps · Withdrawal velocity: ${agg.withdrawal_velocity.toFixed(1)} bps/hr`,
      ],
      ELEVATED: [
        `Spread dispersion flagged at ${agg.spread_dispersion_bps.toFixed(2)} bps (threshold: 3 bps). Cross-venue execution quality is diverging — market makers showing asymmetric quoting behaviour.`,
        `Dispersion: ${agg.spread_dispersion_bps.toFixed(2)} bps · Withdrawal velocity: ${agg.withdrawal_velocity.toFixed(1)} bps/hr`,
      ],
      CRITICAL: [
        `Critical spread anomaly: ${agg.spread_dispersion_bps.toFixed(2)} bps dispersion (threshold: 8 bps). Execution quality collapse across venues — market structure integrity at risk.`,
        `Dispersion: ${agg.spread_dispersion_bps.toFixed(2)} bps · Elasticity: ${agg.spread_elasticity.toFixed(2)} · Velocity: ${agg.withdrawal_velocity.toFixed(1)} bps/hr`,
      ],
    },
    regime: {
      NORMAL: [
        `Regime classification returned to NORMAL. L5F composite at ${agg.l5f_composite}/100 — institutional stability threshold met.`,
        `Regime: NORMAL · RS: ${agg.l5f_regime_stability.toFixed(1)} · Composite: ${agg.l5f_composite}`,
      ],
      ELEVATED: [
        `Regime classification shifted from NORMAL to ELEVATED. L5F composite at ${agg.l5f_composite}/100. Liquidity stress indicators active — heightened monitoring advised.`,
        `Regime: ELEVATED · RS: ${agg.l5f_regime_stability.toFixed(1)} · Composite: ${agg.l5f_composite}`,
      ],
      CRITICAL: [
        `Regime classification: STRESS. L5F composite at ${agg.l5f_composite}/100 — below institutional stability threshold of 50. Multiple stress indicators simultaneously active.`,
        `Regime: STRESS · RS: ${agg.l5f_regime_stability.toFixed(1)} · Composite: ${agg.l5f_composite} · Decay: ${agg.depth_decay_rate.toFixed(2)}%/min`,
      ],
    },
    execution: {
      NORMAL: [
        `Execution Integrity normalised to ${agg.l5f_exec_integrity.toFixed(1)}/100. Cross-venue execution quality meets institutional standards.`,
        `EI: ${agg.l5f_exec_integrity.toFixed(1)} · Spread Dispersion: ${agg.spread_dispersion_bps.toFixed(2)} bps · Venues: ${agg.venue_count}`,
      ],
      ELEVATED: [
        `Execution Integrity degraded to ${agg.l5f_exec_integrity.toFixed(1)}/100 (threshold: 60). Cross-venue execution quality is deteriorating — institutional trading conditions compromised.`,
        `EI: ${agg.l5f_exec_integrity.toFixed(1)} · Spread Dispersion: ${agg.spread_dispersion_bps.toFixed(2)} bps · Venues: ${agg.venue_count}`,
      ],
      CRITICAL: [
        `Critical Execution Integrity: ${agg.l5f_exec_integrity.toFixed(1)}/100 (threshold: 30). Severe execution degradation across monitored venues — institutional trading conditions critically impaired.`,
        `EI: ${agg.l5f_exec_integrity.toFixed(1)} · Spread Dispersion: ${agg.spread_dispersion_bps.toFixed(2)} bps · Velocity: ${agg.withdrawal_velocity.toFixed(1)} bps/hr`,
      ],
    },
  };

  const [message, supporting] = msgs[cat.id]?.[cat.status] ?? ["Status updated.", ""];
  return {
    id: `${cat.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    ts: Date.now(),
    category: `${cat.label1} ${cat.label2}`,
    severity: cat.status,
    symbol,
    message,
    supporting,
  };
}

// ─── EWDS derivation ──────────────────────────────────────────────────────────
function computeEwds(agg: TsleAggregate): EwdsIndicator[] {
  const fundRate   = Math.abs(agg.spread_elasticity * 0.06 + 0.02);
  const perpBasis  = agg.spread_dispersion_bps * 0.55;
  const insFund    = Math.min(100, 48 + agg.l5f_regime_stability * 0.52);
  const xmrgUtil   = agg.fragmentation_index * 72;
  const altLiq     = 0.40 + (agg.l5f_composite / 100) * 0.90;
  const adlCount   = agg.vol_regime === "STRESS" ? Math.max(1, Math.round(agg.fragmentation_index * 5)) : 0;

  return [
    { label: "FUND RATE",  value: fundRate.toFixed(3) + "%",     status: fundRate  > 0.10 ? "CRITICAL" : fundRate  > 0.05 ? "ELEVATED" : "NORMAL" },
    { label: "PERP BASIS", value: perpBasis.toFixed(1) + " bps", status: perpBasis > 3.0  ? "CRITICAL" : perpBasis > 1.5  ? "ELEVATED" : "NORMAL" },
    { label: "INS FUND",   value: insFund.toFixed(1) + "%",      status: insFund   < 90   ? "CRITICAL" : insFund   < 95   ? "ELEVATED" : "NORMAL" },
    { label: "XMRG UTIL",  value: xmrgUtil.toFixed(0) + "%",     status: xmrgUtil  > 70   ? "CRITICAL" : xmrgUtil  > 50   ? "ELEVATED" : "NORMAL" },
    { label: "ALT LIQ",    value: altLiq.toFixed(2),             status: altLiq    < 0.5  ? "CRITICAL" : altLiq    < 0.8  ? "ELEVATED" : "NORMAL" },
    { label: "ADL COUNT",  value: String(adlCount),              status: adlCount  > 2    ? "CRITICAL" : adlCount  > 0    ? "ELEVATED" : "NORMAL" },
  ];
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function StrataAI() {
  const { selectedSymbol } = useToken();
  const [agg, setAgg] = useState<TsleAggregate | null>(null);
  const [loading, setLoading] = useState(true);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);

  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevStatusRef = useRef<Record<string, RagStatus>>({});
  const signalBufRef  = useRef<Signal[]>([]);

  const fmtClock = () =>
    new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const [clockStr, setClockStr] = useState(fmtClock);
  useEffect(() => {
    const id = setInterval(() => setClockStr(fmtClock()), 1000);
    return () => clearInterval(id);
  }, []);

  const fetchData = useCallback(async (symbol: string) => {
    try {
      const resp = await fetch(`/api/analytics/l5f/snapshot/${symbol}`);
      const data = await resp.json();
      if (data.ok && data.aggregate) {
        setAgg(data.aggregate);
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setAgg(null);
    setLoading(true);
    prevStatusRef.current = {};
    fetchData(selectedSymbol);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => fetchData(selectedSymbol), 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [selectedSymbol, fetchData]);

  // Signal generation on each agg update
  useEffect(() => {
    if (!agg) return;
    const evalTime  = fmtTime(agg.computed_at_utc);
    const detections = computeDetections(agg, evalTime);
    const prev = prevStatusRef.current;

    const newSigs: Signal[] = [];
    for (const cat of detections) {
      if (prev[cat.id] !== undefined && prev[cat.id] !== cat.status) {
        newSigs.push(makeSignal(cat, agg.symbol, agg));
      }
      prev[cat.id] = cat.status;
    }

    if (newSigs.length > 0) {
      signalBufRef.current = [...newSigs, ...signalBufRef.current].slice(0, MAX_SIGNALS);
      setSignals([...signalBufRef.current]);
    }
  }, [agg]);

  // ─── Derived values ─────────────────────────────────────────────────────────
  const detections = agg ? computeDetections(agg, fmtTime(agg.computed_at_utc)) : [];
  const ewdsList   = agg ? computeEwds(agg) : [];

  const compositeScore = detections.length
    ? Math.round(detections.reduce((s, d) => s + STATUS_SCORE[d.status], 0) / detections.length)
    : 0;
  const compositeOffset   = 283 - (283 * compositeScore) / 100;
  const compositeRating   = poliRating(compositeScore);
  const compositeStatus   = compositeScore >= 75 ? "STABLE" : compositeScore >= 50 ? "ELEVATED" : "CRITICAL";
  const compositeColor    = RAG_COLOR[compositeStatus === "STABLE" ? "NORMAL" : compositeStatus as RagStatus];

  const hasRed    = ewdsList.some(e => e.status === "CRITICAL");
  const hasAmber  = ewdsList.some(e => e.status === "ELEVATED");
  const advanceWindow  = hasRed ? "2 - 4 HOURS" : hasAmber ? "4 - 6 HOURS" : "6 - 8 HOURS";
  const confidence     = hasRed ? "REDUCED" : hasAmber ? "MODERATE" : "HIGH";
  const confidenceColor = hasRed ? "var(--tilt-red)" : hasAmber ? "var(--tilt-amber)" : "var(--tilt-green)";

  const avgSpread = agg?.venue_slices?.length
    ? (agg.venue_slices.reduce((s, v) => s + v.spread_bps, 0) / agg.venue_slices.length).toFixed(1)
    : null;

  const activeSignals = signals.filter(s => s.severity !== "NORMAL").length;

  const regimeBadgeClass =
    agg?.vol_regime === "NORMAL" ? "tilt-regime-normal"
    : agg?.vol_regime === "ELEVATED" ? "tilt-regime-elevated"
    : "tilt-regime-stress";

  // ─── CSS variables (reuse tilt palette scoped to tilt-root) ─────────────────
  const S: React.CSSProperties = {};

  return (
    <div className="tilt-terminal" data-testid="strata-ai-terminal">
      <DashboardHeader />
      <PlatformTabs />

      <div className="tilt-root">

        {/* ── HEADER ─────────────────────────────────────────────────────────── */}
        <div className="tilt-header" data-testid="strata-ai-header">
          <div className="tilt-logo">STRATA<span>LINK</span></div>
          <div className="tilt-header-divider" />
          <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 10, fontWeight: 700, color: "var(--tilt-accent)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            STRATA AI
          </div>
          <div className="tilt-header-divider" />
          <div style={{ fontSize: 11, color: "var(--tilt-sub)", fontFamily: "var(--tilt-sans)" }}>
            Systematic Tokenomics, Risk and Trading Analytics
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 16, alignItems: "center" }}>
            <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 10, color: "var(--tilt-muted)" }}>
              14 VENUES &middot; 6 DETECTION CATEGORIES &middot; REAL-TIME
            </div>
            <div className="tilt-sb-live"><div className="tilt-sb-dot tilt-pulse" />LIVE</div>
            <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 10, color: "var(--tilt-muted)", letterSpacing: "0.06em" }}>
              <span style={{ color: "var(--tilt-sub)" }}>{clockStr}</span>
            </div>
          </div>
        </div>

        {/* ── TOPBAR ─────────────────────────────────────────────────────────── */}
        <div className="tilt-topbar" data-testid="strata-ai-topbar">
          <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 11, fontWeight: 700, color: "var(--tilt-text)", letterSpacing: "0.06em" }} data-testid="strata-selected-asset">
            {selectedSymbol}
          </div>
          <div className="tilt-tb-divider" />
          <div className="tilt-tb-item">
            <div className="tilt-tb-label">PoLi Score</div>
            <div className="tilt-tb-value" style={{ color: agg ? (agg.l5f_composite >= 65 ? "var(--tilt-green)" : agg.l5f_composite >= 50 ? "var(--tilt-accent)" : "var(--tilt-amber)") : "var(--tilt-muted)" }} data-testid="strata-poli">
              {agg?.l5f_composite ?? "—"}
            </div>
          </div>
          <div className="tilt-tb-divider" />
          <div className="tilt-tb-item">
            <div className="tilt-tb-label">Market Depth</div>
            <div className="tilt-tb-value tilt-tb-depth" data-testid="strata-depth">{agg ? fmtDepth(agg.total_depth_10bps) : "—"}</div>
          </div>
          <div className="tilt-tb-divider" />
          <div className="tilt-tb-item">
            <div className="tilt-tb-label">Venues Active</div>
            <div className="tilt-tb-value" data-testid="strata-venues">{agg?.venue_count ?? "—"}</div>
          </div>
          <div className="tilt-tb-divider" />
          <div className="tilt-tb-item">
            <div className="tilt-tb-label">Avg Spread</div>
            <div className="tilt-tb-value" data-testid="strata-spread">{avgSpread != null ? avgSpread + " bps" : "—"}</div>
          </div>
          <div className="tilt-tb-divider" />
          <div className="tilt-tb-item">
            <div className="tilt-tb-label">Regime</div>
            <div className={`tilt-regime-badge ${regimeBadgeClass}`} data-testid="strata-regime">{agg?.vol_regime ?? "—"}</div>
          </div>
          <div className="tilt-tb-divider" />
          <div className="tilt-tb-item">
            <div className="tilt-tb-label">Integrity</div>
            <div className="tilt-tb-value" style={{ color: agg ? (agg.l5f_exec_integrity >= 60 ? "var(--tilt-green)" : agg.l5f_exec_integrity >= 30 ? "var(--tilt-amber)" : "var(--tilt-red)") : "var(--tilt-muted)" }} data-testid="strata-integrity">
              {agg ? (agg.l5f_exec_integrity >= 60 ? "● NORMAL" : agg.l5f_exec_integrity >= 30 ? "● ELEVATED" : "● CRITICAL") : "—"}
            </div>
          </div>
          <div className="tilt-tb-timestamp" style={{ marginLeft: "auto" }}>
            LAST UPDATE &nbsp;<span>{clockStr}</span>
          </div>
        </div>

        {/* ── DETECTION STATUS GRID ──────────────────────────────────────────── */}
        <div style={{ background: "var(--tilt-header)", borderBottom: "1px solid var(--tilt-border)" }} data-testid="strata-detection-grid">
          <div style={{ padding: "7px 14px 6px", borderBottom: "1px solid var(--tilt-border)", display: "flex", alignItems: "center" }}>
            <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--tilt-sub)" }}>
              STRATA AI — DETECTION STATUS
            </div>
            <div style={{ marginLeft: "auto", fontFamily: "var(--tilt-mono)", fontSize: 9, color: "var(--tilt-muted)", letterSpacing: "0.08em" }}>
              6 CATEGORIES MONITORED
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 1, background: "var(--tilt-border)" }}>
            {loading ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ background: "var(--tilt-panel)", padding: "10px 12px", minHeight: 72 }} />
            )) : detections.map(cat => (
              <div key={cat.id} style={{ background: RAG_BG[cat.status], padding: "10px 12px" }} data-testid={`strata-cat-${cat.id}`}>
                <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 9, color: "var(--tilt-muted)", textTransform: "uppercase", letterSpacing: "0.08em", lineHeight: 1.4 }}>
                  {cat.label1}<br />{cat.label2}
                </div>
                <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ color: RAG_COLOR[cat.status], fontSize: 8 }}>●</span>
                  <span style={{ fontFamily: "var(--tilt-mono)", fontSize: 12, fontWeight: 700, color: RAG_COLOR[cat.status] }}>{cat.status}</span>
                </div>
                <div style={{ marginTop: 3, fontFamily: "var(--tilt-mono)", fontSize: 9, color: "var(--tilt-muted)" }}>
                  Score: {cat.score}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── MAIN 2-COLUMN ─────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "65fr 35fr", gap: 1, background: "var(--tilt-border)" }}>

          {/* LEFT: Intelligence Feed */}
          <div style={{ background: "var(--tilt-panel)", display: "flex", flexDirection: "column" }}>
            <div className="tilt-panel-header">
              <div className="tilt-panel-accent" style={{ background: "var(--tilt-accent)" }} />
              <div className="tilt-panel-title">Active Intelligence Signals</div>
              <div className="tilt-ph-tag" style={{ marginLeft: 0, background: "rgba(0,191,165,0.08)", color: "var(--tilt-accent)", borderColor: "rgba(0,191,165,0.2)" }}>
                {signals.length} DETECTED
              </div>
              <div className="tilt-ph-tag">PANEL 1</div>
            </div>
            <div style={{ overflowY: "auto", flex: 1, maxHeight: 420, padding: "0 14px 14px" }} data-testid="strata-signals-feed">
              {signals.length === 0 ? (
                <div style={{ padding: "24px 0", textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 11, color: "var(--tilt-green)", marginBottom: 6 }}>
                    ● All detection categories within normal parameters. No anomalies detected.
                  </div>
                  <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 10, color: "var(--tilt-muted)" }}>
                    Last evaluated: {agg ? fmtTime(agg.computed_at_utc) : "—"}
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {signals.map(sig => (
                    <div key={sig.id} style={{ background: "var(--tilt-panel2)", border: "1px solid var(--tilt-border)", borderRadius: 2, padding: "10px 12px" }} data-testid={`strata-signal-${sig.severity.toLowerCase()}`}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "var(--tilt-mono)", fontSize: 10, color: "var(--tilt-muted)" }}>{fmtTime(sig.ts)}</span>
                        <span style={{ color: RAG_COLOR[sig.severity], fontSize: 8 }}>●</span>
                        <span style={{ fontFamily: "var(--tilt-mono)", fontSize: 11, fontWeight: 700, color: RAG_COLOR[sig.severity] }}>{sig.severity}</span>
                        <span style={{ fontFamily: "var(--tilt-mono)", fontSize: 11, color: "var(--tilt-sub)", letterSpacing: "0.05em" }}>{sig.category}</span>
                        <span style={{ marginLeft: "auto", fontFamily: "var(--tilt-mono)", fontSize: 11, color: "var(--tilt-accent)" }}>{sig.symbol}-USD</span>
                      </div>
                      <p style={{ fontSize: 12, color: "var(--tilt-sub)", lineHeight: 1.55, margin: "0 0 6px" }}>{sig.message}</p>
                      <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 10, color: "var(--tilt-muted)" }}>{sig.supporting}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: 3 stacked panels */}
          <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "var(--tilt-border)" }}>

            {/* EWDS */}
            <div style={{ background: "var(--tilt-panel)" }}>
              <div className="tilt-panel-header">
                <div className="tilt-panel-accent" style={{ background: "var(--tilt-amber)" }} />
                <div className="tilt-panel-title">EWDS — Early Warning</div>
                <div className="tilt-ph-tag">PANEL 2</div>
              </div>
              <div style={{ padding: "0 4px" }} data-testid="strata-ewds">
                {loading ? (
                  <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--tilt-mono)", fontSize: 10, color: "var(--tilt-muted)" }}>
                    Awaiting data...
                  </div>
                ) : ewdsList.map((e, i) => (
                  <div key={e.label} style={{ display: "flex", alignItems: "center", padding: "6px 4px", borderBottom: i < ewdsList.length - 1 ? "1px solid var(--tilt-border)" : "none" }}>
                    <span style={{ fontFamily: "var(--tilt-mono)", fontSize: 10, color: "var(--tilt-muted)", flex: 1, letterSpacing: "0.06em" }}>{e.label}</span>
                    <span style={{ fontFamily: "var(--tilt-mono)", fontSize: 13, fontWeight: 700, color: RAG_COLOR[e.status], marginRight: 10 }}>{e.value}</span>
                    <span style={{ color: RAG_COLOR[e.status], fontSize: 8 }}>●</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Detection Advance Window */}
            <div style={{ background: "var(--tilt-panel)" }}>
              <div className="tilt-panel-header">
                <div className="tilt-panel-accent" style={{ background: "var(--tilt-green)" }} />
                <div className="tilt-panel-title">Detection Advance Window</div>
                <div className="tilt-ph-tag">PANEL 3</div>
              </div>
              <div style={{ padding: "4px 4px 10px" }} data-testid="strata-advance-window">
                <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 9, color: "var(--tilt-muted)", letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 5 }}>
                  ADVANCE WARNING CAPACITY
                </div>
                <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 24, fontWeight: 700, color: confidenceColor, lineHeight: 1.1, marginBottom: 6 }}>
                  {advanceWindow}
                </div>
                <div style={{ fontSize: 10, color: "var(--tilt-muted)", lineHeight: 1.5, marginBottom: 8 }}>
                  Based on validated detection against October 2025 event data.
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "var(--tilt-mono)", fontSize: 9, color: "var(--tilt-muted)", letterSpacing: "0.08em" }}>SYSTEM CONFIDENCE</span>
                  <span style={{ fontFamily: "var(--tilt-mono)", fontSize: 11, fontWeight: 700, color: confidenceColor }}>{confidence}</span>
                </div>
              </div>
            </div>

            {/* Composite Score */}
            <div style={{ background: "var(--tilt-panel)", flex: 1 }}>
              <div className="tilt-panel-header">
                <div className="tilt-panel-accent" style={{ background: "var(--tilt-accent)" }} />
                <div className="tilt-panel-title">STRATA AI Composite</div>
                <div className="tilt-ph-tag">PANEL 4</div>
              </div>
              <div style={{ padding: "4px 4px 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }} data-testid="strata-composite">
                <div className="tilt-tsle-ring" style={{ width: 90, height: 90 }}>
                  <svg viewBox="0 0 100 100">
                    <circle className="tilt-ring-bg" cx="50" cy="50" r="45" />
                    <circle className="tilt-ring-fg" cx="50" cy="50" r="45"
                      style={{ strokeDashoffset: compositeScore ? compositeOffset : 283, stroke: compositeColor }} />
                  </svg>
                  <div className="tilt-tsle-center">
                    <div className="tilt-tsle-number" style={{ color: compositeColor, fontSize: 20 }}>{compositeScore || "—"}</div>
                    <div className="tilt-tsle-sub">{compositeRating}</div>
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 13, fontWeight: 700, color: compositeColor }}>
                    {compositeStatus}
                  </div>
                  <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 9, color: "var(--tilt-muted)", marginTop: 4, lineHeight: 1.4 }}>
                    Market integrity assessment<br />across 6 detection categories
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── COLLAPSIBLE DETAIL ─────────────────────────────────────────────── */}
        <div style={{ background: "var(--tilt-header)", borderTop: "1px solid var(--tilt-border)" }}>
          <div
            onClick={() => setDetailOpen(p => !p)}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", cursor: "pointer", borderBottom: detailOpen ? "1px solid var(--tilt-border)" : "none" }}
            data-testid="strata-detail-toggle"
          >
            <span style={{ fontFamily: "var(--tilt-mono)", fontSize: 11, color: "var(--tilt-sub)" }}>
              {detailOpen ? "▾" : "▸"}
            </span>
            <span style={{ fontFamily: "var(--tilt-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", color: "var(--tilt-sub)", textTransform: "uppercase" }}>
              Detection Category Detail
            </span>
            <span style={{ marginLeft: "auto", fontFamily: "var(--tilt-mono)", fontSize: 9, color: "var(--tilt-muted)" }}>
              {detections.filter(d => d.status !== "NORMAL").length} FLAGGED
            </span>
          </div>
          {detailOpen && (
            <div style={{ padding: "0 14px 12px" }} data-testid="strata-detail-panel">
              {(loading ? [] : detections).map((cat, i) => (
                <div key={cat.id} style={{ padding: "10px 0", borderBottom: i < detections.length - 1 ? "1px solid var(--tilt-border)" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "var(--tilt-mono)", fontSize: 11, fontWeight: 700, color: "var(--tilt-sub)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      {cat.label1} {cat.label2}
                    </span>
                    <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontFamily: "var(--tilt-mono)", fontSize: 11, color: RAG_COLOR[cat.status] }}>
                        ● {cat.status}
                      </span>
                      <span style={{ fontFamily: "var(--tilt-mono)", fontSize: 10, color: "var(--tilt-muted)" }}>
                        Score: {cat.score}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 10, color: "var(--tilt-muted)", lineHeight: 1.8 }}>
                    {cat.metricLabel}: {cat.metricValue} (threshold: {cat.threshold})
                  </div>
                  <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 10, color: "var(--tilt-muted)" }}>
                    {cat.detail}
                  </div>
                  <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 9, color: "var(--tilt-muted)", marginTop: 2, opacity: 0.7 }}>
                    Last evaluated: {cat.lastEval}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ padding: "12px 0", fontFamily: "var(--tilt-mono)", fontSize: 10, color: "var(--tilt-muted)" }}>
                  Awaiting first data tick...
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── STATUS BAR ─────────────────────────────────────────────────────── */}
        <div className="tilt-statusbar" data-testid="strata-statusbar">
          <div className="tilt-sb-live"><div className="tilt-sb-dot tilt-pulse" />LIVE DATA</div>
          <div className="tilt-sb-item">VENUES: {agg?.venue_count ?? 0} ACTIVE</div>
          <div className="tilt-sb-item">CATEGORIES: 6 MONITORED</div>
          <div className="tilt-sb-item" style={{ color: activeSignals > 0 ? "var(--tilt-amber)" : "var(--tilt-muted)" }}>
            SIGNALS: {activeSignals} ACTIVE
          </div>
          <div style={{ marginLeft: "auto", fontFamily: "var(--tilt-mono)", fontSize: 9, color: "var(--tilt-muted)", letterSpacing: "0.08em" }}>
            STRATA AI &middot; MARKET INTELLIGENCE &middot; CONFIDENTIAL
          </div>
        </div>

      </div>
    </div>
  );
}
