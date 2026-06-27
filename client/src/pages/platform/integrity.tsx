import { useState, useEffect, useRef, useCallback } from "react";
import { DashboardHeader } from "@/components/dashboard-header";
import { PlatformTabs } from "@/components/platform-tabs";
import {
  LineChart, Line, XAxis, YAxis, ReferenceLine, Tooltip, ResponsiveContainer,
} from "recharts";
import "./tilt-terminal.css";

// ─── Palette constants (mirror tilt-terminal.css vars) ───────────────────────
const G    = "#00E676";
const A    = "#FFB300";
const R    = "#FF5252";
const T    = "#00BFA5";
const SUB  = "#7B8EA3";
const MUTED = "#4A5B6E";
const TEXT  = "#D8DEE8";
const BG    = "#0B1019";
const PANEL = "#0F151F";
const HDR   = "#080D14";
const BORDER = "#1A2435";

// ─── Interfaces ──────────────────────────────────────────────────────────────
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

type Rag = "G" | "A" | "R" | "N";

// ─── Utility functions ────────────────────────────────────────────────────────
function ragColor(rag: Rag): string {
  return rag === "G" ? G : rag === "A" ? A : rag === "R" ? R : SUB;
}

function scoreColor(v: number): string {
  if (v >= 75) return G;
  if (v >= 55) return T;
  return A;
}

function poliRating(score: number): string {
  if (score >= 90) return "AAA";
  if (score >= 80) return "AA";
  if (score >= 70) return "A";
  if (score >= 60) return "BBB";
  if (score >= 50) return "BB";
  if (score >= 40) return "B";
  return "CCC";
}

function poliStatusLabel(score: number): { label: string; color: string } {
  if (score >= 85) return { label: "STABLE",       color: G };
  if (score >= 70) return { label: "MONITORING",   color: G };
  if (score >= 50) return { label: "EARLY STRESS", color: A };
  if (score >= 30) return { label: "FRAGMENTING",  color: A };
  return                   { label: "CRITICAL",    color: R };
}

function poliDesc(score: number): string {
  if (score >= 85) return "Cross-venue liquidity conditions within normal parameters. No structural deterioration detected.";
  if (score >= 70) return "Liquidity conditions stable. Monitoring for early fragmentation signatures across venue tiers.";
  if (score >= 50) return "Minor structural deterioration detected across tier-2 venues. Monitoring for escalation.";
  if (score >= 30) return "Investment-grade integrity conditions deteriorating. Cross-venue fragmentation accelerating.";
  return "Critical liquidity failure conditions active. Cross-venue coordination capacity severely constrained.";
}

function efiLabel(efi: number): { label: string; color: string } {
  if (efi >= 0.80) return { label: "NOMINAL",        color: G };
  if (efi >= 0.50) return { label: "DEGRADED",       color: A };
  if (efi >= 0.20) return { label: "NON-EXECUTABLE", color: R };
  return                   { label: "MARKET FAILURE", color: R };
}

function lpiLabel(lpi: number): { label: string; color: string } {
  if (lpi <= 0.30) return { label: "Within operational bounds",    color: G };
  if (lpi <= 0.60) return { label: "Elevated pressure",           color: A };
  if (lpi <= 0.85) return { label: "Critical pressure",           color: R };
  return                   { label: "Systemic threshold breached", color: R };
}

function computeEfi(a: TsleAggregate): number {
  return Math.max(0, Math.min(1,
    (a.l5f_depth_quality * 0.40 + a.l5f_exec_integrity * 0.40 + a.l5f_regime_stability * 0.20) / 100
  ));
}

function heatCell(stability: number | undefined): string {
  if (stability == null) return BORDER;
  if (stability >= 70) return "rgba(0,230,118,0.32)";
  if (stability >= 40) return "rgba(255,179,0,0.32)";
  return "rgba(255,82,82,0.32)";
}

// ─── Score Ring (small reusable) ─────────────────────────────────────────────
function ScoreRing({
  score, color, size = 56,
}: { score: number | null; color: string; size?: number }) {
  const offset = score != null ? 283 - (283 * score) / 100 : 283;
  return (
    <div style={{ width: size, height: size, position: "relative", flexShrink: 0 }}>
      <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
        <circle className="tilt-ring-bg" cx="50" cy="50" r="45" />
        <circle
          className="tilt-ring-fg"
          cx="50" cy="50" r="45"
          style={{ strokeDashoffset: offset, stroke: color }}
        />
      </svg>
      <div className="tilt-tsle-center">
        <span style={{
          fontFamily: "var(--tilt-mono)",
          fontSize: size * 0.30,
          fontWeight: 700,
          color,
          lineHeight: 1,
        }}>
          {score != null ? Math.round(score) : "—"}
        </span>
      </div>
    </div>
  );
}

// ─── EWDS Cell ────────────────────────────────────────────────────────────────
function EwdsCell({
  label, value, rag, unit = "",
}: { label: string; value: string | null; rag: Rag; unit?: string }) {
  const c = ragColor(rag);
  return (
    <div style={{
      flex: 1, background: PANEL, padding: "12px 16px",
      display: "flex", flexDirection: "column", gap: 6,
    }}>
      <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 9, color: MUTED, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontFamily: "var(--tilt-mono)", fontSize: 16, fontWeight: 700, color: value ? c : SUB }}>
          {value != null ? `${value}${unit}` : "—"}
        </span>
        <span style={{
          width: 6, height: 6, borderRadius: "50%",
          background: value ? c : BORDER, flexShrink: 0,
          boxShadow: value ? `0 0 4px ${c}` : "none",
        }} />
      </div>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="tilt-panel-header" style={{ marginBottom: 10 }}>
      <div className="tilt-panel-accent" />
      <div className="tilt-panel-title">{title}</div>
      {right && <div style={{ marginLeft: "auto" }}>{right}</div>}
    </div>
  );
}

// ─── Custom EFI Tooltip ──────────────────────────────────────────────────────
function EfiTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const v: number = payload[0].value;
  const st = efiLabel(v);
  return (
    <div style={{ background: HDR, border: `1px solid ${BORDER}`, padding: "6px 10px", borderRadius: 2 }}>
      <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 9, color: MUTED, marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 13, fontWeight: 700, color: st.color }}>
        {v.toFixed(3)}
      </div>
      <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 9, color: st.color }}>{st.label}</div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function IntegrityPage() {
  const SYMBOLS = ["BTC", "ETH", "SOL"];
  const [asset, setAsset]       = useState("BTC");
  const [agg, setAgg]           = useState<TsleAggregate | null>(null);
  const [latency, setLatency]   = useState<number | null>(null);
  const [clock, setClock]       = useState(() =>
    new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  );

  const efiHistRef  = useRef<{ time: string; efi: number }[]>([]);
  const [efiHist, setEfiHist] = useState<{ time: string; efi: number }[]>([]);

  const vhRef = useRef<VenueSlice[][]>([]);
  const [venueHist, setVenueHist] = useState<VenueSlice[][]>([]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async (sym: string) => {
    const t0 = performance.now();
    try {
      const resp = await fetch(`/api/analytics/l5f/snapshot/${sym}`);
      const data = await resp.json();
      setLatency(Math.round(performance.now() - t0));
      if (data.ok && data.aggregate) {
        const a: TsleAggregate = data.aggregate;
        setAgg(a);

        // EFI ring buffer (max 60 pts ≈ 10 min at 10 s)
        const efi = computeEfi(a);
        const tLabel = new Date().toLocaleTimeString("en-GB", {
          hour: "2-digit", minute: "2-digit", second: "2-digit",
        });
        const next = [...efiHistRef.current.slice(-59), { time: tLabel, efi }];
        efiHistRef.current = next;
        setEfiHist([...next]);

        // Venue heatmap history (last 6 snapshots)
        if (a.venue_slices?.length) {
          const vh = [...vhRef.current.slice(-5), a.venue_slices];
          vhRef.current = vh;
          setVenueHist([...vh]);
        }
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    efiHistRef.current = [];
    vhRef.current = [];
    setEfiHist([]);
    setVenueHist([]);
    setAgg(null);
    fetchData(asset);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => fetchData(asset), 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [asset, fetchData]);

  useEffect(() => {
    const id = setInterval(() =>
      setClock(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }))
    , 1000);
    return () => clearInterval(id);
  }, []);

  // ── PoLi ──────────────────────────────────────────────────────────────────
  const poliScore     = agg?.l5f_composite ?? null;
  const poliRat       = poliScore != null ? poliRating(poliScore) : null;
  const poliSt        = poliScore != null ? poliStatusLabel(poliScore) : null;
  const poliDescText  = poliScore != null ? poliDesc(poliScore) : null;
  const poliColor     = poliScore != null ? scoreColor(poliScore) : SUB;

  // ── EWDS ──────────────────────────────────────────────────────────────────
  const fundRateVal  = agg != null ? Math.abs(agg.spread_elasticity * 0.05)       : null;
  const perpBasisVal = agg != null ? agg.spread_dispersion_bps                     : null;
  const insFundVal   = agg != null ? agg.l5f_regime_stability                      : null;
  const xmrgUtilVal  = agg != null ? Math.min(100, agg.fragmentation_index * 100)  : null;
  const altLiqVal    = agg != null ? agg.l5f_composite / 100                       : null;

  const fundRateRag:  Rag = fundRateVal  == null ? "N" : fundRateVal  < 0.05 ? "G" : fundRateVal  < 0.20 ? "A" : "R";
  const perpBasisRag: Rag = perpBasisVal == null ? "N" : perpBasisVal < 2    ? "G" : perpBasisVal < 8    ? "A" : "R";
  const insFundRag:   Rag = insFundVal   == null ? "N" : insFundVal   > 95   ? "G" : insFundVal   > 90   ? "A" : "R";
  const xmrgUtilRag:  Rag = xmrgUtilVal  == null ? "N" : xmrgUtilVal  < 50   ? "G" : xmrgUtilVal  < 70   ? "A" : "R";
  const altLiqRag:    Rag = altLiqVal    == null ? "N" : altLiqVal    > 0.7  ? "G" : altLiqVal    > 0.4  ? "A" : "R";

  const allRags: Rag[] = [fundRateRag, perpBasisRag, insFundRag, xmrgUtilRag, altLiqRag];
  const worstRag: Rag = allRags.includes("R") ? "R" : allRags.includes("A") ? "A" : allRags.includes("G") ? "G" : "N";

  const obsSt = worstRag === "G" ? { label: "OBSERVATION ACTIVE",   color: G }
              : worstRag === "A" ? { label: "ELEVATED OBSERVATION",  color: A }
              : worstRag === "R" ? { label: "CRITICAL OBSERVATION",  color: R }
              :                   { label: "AWAITING FEED",          color: SUB };

  // ── PoMI pillars ──────────────────────────────────────────────────────────
  const thresholdRag:   Rag = worstRag === "N" ? "N" : worstRag;
  const thresholdScore       = worstRag === "G" ? 96 : worstRag === "A" ? 75 : worstRag === "R" ? 40 : 0;
  const thresholdLabel       = worstRag === "G" ? "ACTIVE" : worstRag === "A" ? "WEAKENING" : worstRag === "R" ? "BREACHED" : "--";

  const throttleRag: Rag = agg == null ? "N" : agg.vol_regime === "NORMAL" ? "G" : agg.vol_regime === "ELEVATED" ? "A" : "R";
  const throttleScore     = agg == null ? 0 : agg.vol_regime === "NORMAL" ? 91 : agg.vol_regime === "ELEVATED" ? 70 : 30;
  const throttleLabel     = agg == null ? "--" : agg.vol_regime === "NORMAL" ? "STANDBY" : agg.vol_regime === "ELEVATED" ? "PARTIAL" : "ACTIVE";

  const venueSyncRag: Rag = perpBasisVal == null ? "N" : perpBasisVal < 3 ? "G" : perpBasisVal < 8 ? "A" : "R";
  const venueSyncScore     = perpBasisVal == null ? 0 : perpBasisVal < 3 ? 89 : perpBasisVal < 8 ? 65 : 30;
  const venueSyncLabel     = perpBasisVal == null ? "--" : perpBasisVal < 3 ? "COORDINATED" : perpBasisVal < 8 ? "MINOR DRIFT" : "FRAGMENTING";

  const pomiScore = agg != null ? Math.round((thresholdScore + throttleScore + venueSyncScore) / 3) : null;
  const pomiRat   = pomiScore != null ? poliRating(pomiScore) : null;
  const pomiColor = pomiScore != null ? scoreColor(pomiScore) : SUB;
  const pomiSt    = pomiScore != null ? (
    pomiScore >= 85 ? { label: "STABLE",      color: G } :
    pomiScore >= 70 ? { label: "MONITORING",  color: G } :
    pomiScore >= 50 ? { label: "PARTIAL",     color: A } :
                     { label: "CONSTRAINED",  color: R }
  ) : null;
  const pomiDescText = pomiScore != null ? (
    pomiScore >= 85 ? "Coordination mechanisms intact. Stability infrastructure operational." :
    pomiScore >= 70 ? "Coordination window narrowing. Monitoring for escalation triggers." :
    pomiScore >= 50 ? "Partial throttle engagement advisable. Threshold monitoring active." :
                     "Cross-venue stabilisation integrity compromised. Systemic coordination capacity constrained."
  ) : null;

  // ── EFI ───────────────────────────────────────────────────────────────────
  const currentEfi   = agg != null ? computeEfi(agg) : null;
  const currentEfiSt = currentEfi != null ? efiLabel(currentEfi) : null;
  const efiBuilding  = efiHist.length < 6;

  // ── LPI ───────────────────────────────────────────────────────────────────
  const lpi   = agg != null ? Math.max(0, Math.min(1,
    1 - (agg.l5f_depth_quality * 0.35 + agg.l5f_exec_integrity * 0.35 + agg.l5f_regime_stability * 0.30) / 100
  )) : null;
  const lpiSt = lpi != null ? lpiLabel(lpi) : null;

  // ── Venue table ───────────────────────────────────────────────────────────
  const venues = (agg?.venue_slices ?? []).slice(0, 12);
  const maxDepth = Math.max(...venues.map(v => v.depth_10bps), 1);

  // ── Heatmap venue ids from history ────────────────────────────────────────
  const heatVenueIds = Array.from(new Set(venueHist.flatMap(r => r.map(v => v.venue_id)))).slice(0, 10);
  const stableN   = venues.filter(v => v.stability_score >= 70).length;
  const stressedN = venues.filter(v => v.stability_score >= 40 && v.stability_score < 70).length;
  const criticalN = venues.filter(v => v.stability_score < 40).length;

  // ── Date string ───────────────────────────────────────────────────────────
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "2-digit",
  }).toUpperCase();

  // ─── JSX ──────────────────────────────────────────────────────────────────
  return (
    <div className="tilt-terminal" data-testid="integrity-page">
      <DashboardHeader />
      <PlatformTabs />

      <div className="tilt-root" style={{ paddingBottom: 40 }}>

        {/* ── PAGE HEADER ─────────────────────────────────────────────────── */}
        <div
          className="tilt-header"
          style={{ gap: 8 }}
          data-testid="integrity-header"
        >
          <div className="tilt-logo">STRATA<span>LINK</span></div>
          <div className="tilt-header-divider" />
          <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 10, color: SUB, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            MARKET INTEGRITY VERIFICATION
          </div>
          <div className="tilt-header-divider" />
          <div style={{ fontFamily: "var(--tilt-sans)", fontSize: 12, color: TEXT, opacity: 0.75 }}>
            PoLi Proof of Liquidity · PoMI Proof of Market Integrity
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 16, alignItems: "center" }}>
            {/* Token tabs */}
            <div className="tilt-asset-tabs" style={{ border: "none", paddingLeft: 0, paddingRight: 0 }}>
              {SYMBOLS.map(s => (
                <div
                  key={s}
                  className={`tilt-asset-tab ${asset === s ? "active" : ""}`}
                  onClick={() => setAsset(s)}
                  data-testid={`integrity-asset-${s}`}
                  style={{ padding: "0 10px" }}
                >
                  {s}
                </div>
              ))}
            </div>
            <div className="tilt-sb-live">
              <div className="tilt-sb-dot tilt-pulse" />
              LIVE
            </div>
            <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 10, color: SUB }}>
              {clock}
            </div>
          </div>
        </div>

        {/* ── STATUS BAR ──────────────────────────────────────────────────── */}
        <div
          style={{
            background: PANEL, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`,
            display: "flex", alignItems: "center", padding: "0 16px", height: 30, gap: 12,
          }}
          data-testid="integrity-obs-bar"
        >
          <span style={{ fontFamily: "var(--tilt-mono)", fontSize: 11, color: SUB, letterSpacing: "0.06em" }}>
            ● SYSTEMIC MONITORING
          </span>
          <span style={{ fontFamily: "var(--tilt-mono)", fontSize: 11, fontWeight: 700, color: obsSt.color, letterSpacing: "0.06em" }}>
            {obsSt.label}
          </span>
          <div style={{ marginLeft: "auto", fontFamily: "var(--tilt-mono)", fontSize: 10, color: MUTED, letterSpacing: "0.06em" }}>
            STRATALINK TELEMETRY &nbsp;·&nbsp; {dateStr} &nbsp;·&nbsp; <span style={{ color: SUB }}>{clock} UTC</span>
          </div>
        </div>

        {/* ── EWDS INDICATOR STRIP ────────────────────────────────────────── */}
        <div
          style={{ display: "flex", gap: 1, background: BORDER }}
          data-testid="integrity-ewds"
        >
          <EwdsCell label="FUND RATE"  value={fundRateVal  != null ? fundRateVal.toFixed(2)  : null} rag={fundRateRag}  unit="%" />
          <EwdsCell label="PERP BASIS" value={perpBasisVal != null ? perpBasisVal.toFixed(1)  : null} rag={perpBasisRag} unit="bps" />
          <EwdsCell label="INS FUND"   value={insFundVal   != null ? insFundVal.toFixed(1)    : null} rag={insFundRag}   unit="%" />
          <EwdsCell label="XMRG UTIL"  value={xmrgUtilVal  != null ? xmrgUtilVal.toFixed(0)   : null} rag={xmrgUtilRag}  unit="%" />
          <EwdsCell label="ALT LIQ"    value={altLiqVal    != null ? altLiqVal.toFixed(2)     : null} rag={altLiqRag} />
          <EwdsCell label="ADL COUNT"  value={null}                                                   rag="N" />
        </div>

        {/* ── ROW 2: POLI + POMI CARDS ────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 1, background: BORDER }} data-testid="integrity-poli-pomi">

          {/* PoLi Card */}
          <div style={{ flex: 1, background: PANEL, padding: "14px 16px" }}>
            <SectionHeader title="PoLi Market Integrity" />
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <ScoreRing score={poliScore} color={poliColor} size={60} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--tilt-sans)", fontSize: 13, color: TEXT, fontWeight: 600 }}>
                  PoLi Market Integrity
                </div>
                <div style={{ fontFamily: "var(--tilt-sans)", fontSize: 11, color: SUB, marginBottom: 10 }}>
                  Cross-venue liquidity integrity monitor
                </div>
                <div style={{ display: "flex", gap: 24, marginBottom: 10 }}>
                  <div>
                    <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 9, color: MUTED, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>PoLi Score</div>
                    <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 22, fontWeight: 700, color: poliColor, lineHeight: 1 }}>
                      {poliScore != null ? Math.round(poliScore) : "—"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 9, color: MUTED, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>Rating</div>
                    <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 22, fontWeight: 700, color: TEXT, lineHeight: 1 }}>
                      {poliRat ?? "—"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 9, color: MUTED, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>Market Status</div>
                    <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 14, fontWeight: 700, color: poliSt?.color ?? SUB }}>
                      {poliSt?.label ?? "—"}
                    </div>
                  </div>
                </div>
                <div style={{ fontFamily: "var(--tilt-sans)", fontSize: 11, color: SUB, lineHeight: 1.5, marginBottom: 8 }}>
                  {poliDescText ?? "Awaiting live data feed…"}
                </div>
                <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 9, color: MUTED, letterSpacing: "0.06em" }}>
                  STRATALINK PoLi v1.0
                </div>
              </div>
            </div>
          </div>

          {/* PoMI Card */}
          <div style={{ flex: 1, background: PANEL, padding: "14px 16px" }}>
            <SectionHeader title="PoMI Market Integrity" />
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <ScoreRing score={pomiScore} color={pomiColor} size={60} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--tilt-sans)", fontSize: 13, color: TEXT, fontWeight: 600 }}>
                  PoMI Market Integrity
                </div>
                <div style={{ fontFamily: "var(--tilt-sans)", fontSize: 11, color: SUB, marginBottom: 10 }}>
                  Coordination integrity monitor
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  <div>
                    <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 9, color: MUTED, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>PoMI Score</div>
                    <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 22, fontWeight: 700, color: pomiColor, lineHeight: 1 }}>
                      {pomiScore ?? "—"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 9, color: MUTED, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>Rating</div>
                    <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 22, fontWeight: 700, color: TEXT, lineHeight: 1 }}>
                      {pomiRat ?? "—"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 9, color: MUTED, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>Status</div>
                    <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 14, fontWeight: 700, color: pomiSt?.color ?? SUB }}>
                      {pomiSt?.label ?? "—"}
                    </div>
                  </div>

                  {/* Three pillars */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginLeft: 8 }}>
                    {[
                      { label: "Threshold", status: thresholdLabel, rag: thresholdRag },
                      { label: "Throttle",  status: throttleLabel,  rag: throttleRag  },
                      { label: "Venue Sync",status: venueSyncLabel, rag: venueSyncRag },
                    ].map(p => (
                      <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: ragColor(p.rag as Rag), flexShrink: 0 }} />
                        <span style={{ fontFamily: "var(--tilt-mono)", fontSize: 10, color: SUB }}>{p.label}</span>
                        <span style={{ fontFamily: "var(--tilt-mono)", fontSize: 10, fontWeight: 700, color: ragColor(p.rag as Rag) }}>{p.status}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ fontFamily: "var(--tilt-sans)", fontSize: 11, color: SUB, lineHeight: 1.5, margin: "8px 0" }}>
                  {pomiDescText ?? "Awaiting live data feed…"}
                </div>
                <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 9, color: MUTED, letterSpacing: "0.06em" }}>
                  STRATALINK PoMi v1.0
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── ROW 3: EXECUTION FEASIBILITY INDEX ──────────────────────────── */}
        <div style={{ background: PANEL, padding: "14px 16px", borderTop: `1px solid ${BORDER}` }} data-testid="integrity-efi">
          <SectionHeader
            title="Execution Feasibility Index"
            right={
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {currentEfiSt && (
                  <span style={{ fontFamily: "var(--tilt-mono)", fontSize: 11, color: currentEfiSt.color, letterSpacing: "0.08em" }}>
                    ● {currentEfiSt.label}
                  </span>
                )}
                <span style={{ fontFamily: "var(--tilt-mono)", fontSize: 16, fontWeight: 700, color: currentEfiSt?.color ?? SUB }}>
                  {currentEfi != null ? currentEfi.toFixed(3) : "—"}
                </span>
              </div>
            }
          />
          {efiBuilding && (
            <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 9, color: MUTED, marginBottom: 6, letterSpacing: "0.06em" }}>
              BUILDING HISTORY…
            </div>
          )}
          <div style={{ height: 120 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={efiHist} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <XAxis
                  dataKey="time"
                  tick={{ fontFamily: "var(--tilt-mono)", fontSize: 8, fill: MUTED }}
                  interval="preserveStartEnd"
                  tickLine={false}
                  axisLine={{ stroke: BORDER }}
                />
                <YAxis
                  domain={[0, 1]}
                  tick={{ fontFamily: "var(--tilt-mono)", fontSize: 8, fill: MUTED }}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                  tickFormatter={(v: number) => v.toFixed(2)}
                />
                <ReferenceLine y={0.80} stroke={BORDER} strokeDasharray="3 3" />
                <ReferenceLine y={0.50} stroke={BORDER} strokeDasharray="3 3" />
                <Tooltip content={<EfiTooltip />} />
                <Line
                  type="monotone"
                  dataKey="efi"
                  stroke={T}
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── ROW 4: HEATMAP + VENUE TABLE ────────────────────────────────── */}
        <div style={{ display: "flex", gap: 1, background: BORDER, borderTop: `1px solid ${BORDER}` }} data-testid="integrity-row4">

          {/* Left: Cross-Venue Liquidity Stability Heatmap */}
          <div style={{ flex: 1, background: PANEL, padding: "14px 16px" }}>
            <SectionHeader title="Cross-Venue Liquidity Stability" />

            {venueHist.length === 0 ? (
              <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 10, color: MUTED, padding: "20px 0" }}>
                Awaiting venue data…
              </div>
            ) : (
              <>
                {/* Heatmap grid: rows = time snapshots, cols = venues */}
                <div style={{ overflowX: "auto" }}>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: `80px repeat(${heatVenueIds.length}, 1fr)`,
                    gap: 1,
                    marginBottom: 8,
                    minWidth: 300,
                  }}>
                    {/* Header row */}
                    <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 8, color: MUTED, padding: "2px 4px" }} />
                    {heatVenueIds.map(vid => (
                      <div key={vid} style={{
                        fontFamily: "var(--tilt-mono)", fontSize: 8, color: MUTED,
                        textAlign: "center", padding: "2px 4px",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {vid.toUpperCase().slice(0, 8)}
                      </div>
                    ))}

                    {/* Data rows (newest last) */}
                    {venueHist.map((row, ri) => {
                      const isLatest = ri === venueHist.length - 1;
                      const age = venueHist.length - 1 - ri;
                      return [
                        <div key={`lbl-${ri}`} style={{
                          fontFamily: "var(--tilt-mono)", fontSize: 8, color: isLatest ? T : MUTED,
                          padding: "3px 4px", display: "flex", alignItems: "center",
                        }}>
                          {isLatest ? "NOW" : `-${age * 5}s`}
                        </div>,
                        ...heatVenueIds.map(vid => {
                          const slice = row.find(v => v.venue_id === vid);
                          return (
                            <div key={`cell-${ri}-${vid}`} style={{
                              background: heatCell(slice?.stability_score),
                              height: 18,
                              borderRadius: 1,
                            }} title={slice ? `${vid}: stability ${slice.stability_score.toFixed(0)}` : "No data"} />
                          );
                        }),
                      ];
                    })}
                  </div>
                </div>

                {/* Legend */}
                <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                  {[
                    { color: "rgba(0,230,118,0.6)", label: `STABLE (${stableN})` },
                    { color: "rgba(255,179,0,0.6)", label: `STRESSED (${stressedN})` },
                    { color: "rgba(255,82,82,0.6)", label: `CRITICAL (${criticalN})` },
                  ].map(l => (
                    <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 10, height: 10, background: l.color, borderRadius: 1 }} />
                      <span style={{ fontFamily: "var(--tilt-mono)", fontSize: 9, color: MUTED, letterSpacing: "0.06em" }}>
                        {l.label}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Right: Venue Table + LPI */}
          <div style={{ flex: 1, background: PANEL, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Venue Depth & Spread Monitor */}
            <div>
              <SectionHeader title="Venue Depth & Spread Monitor" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 70px 80px", gap: "4px 0" }}>
                {/* Table header */}
                {["VENUE", "DEPTH", "SPREAD", "STATUS"].map(h => (
                  <div key={h} style={{ fontFamily: "var(--tilt-mono)", fontSize: 9, color: MUTED, letterSpacing: "0.08em", padding: "2px 4px", borderBottom: `1px solid ${BORDER}` }}>
                    {h}
                  </div>
                ))}

                {/* Table rows */}
                {venues.length === 0 ? (
                  <div style={{ gridColumn: "1 / -1", fontFamily: "var(--tilt-mono)", fontSize: 10, color: MUTED, padding: "8px 4px" }}>
                    Awaiting venue data…
                  </div>
                ) : venues.map(v => {
                  const depthNorm = maxDepth > 0 ? (v.depth_10bps / maxDepth).toFixed(2) : "—";
                  const vRag: Rag = v.stability_score >= 70 ? "G" : v.stability_score >= 40 ? "A" : "R";
                  const vLabel = vRag === "G" ? "GREEN" : vRag === "A" ? "AMBER" : "RED";
                  return [
                    <div key={`n-${v.venue_id}`} style={{ fontFamily: "var(--tilt-mono)", fontSize: 11, fontWeight: 700, color: TEXT, padding: "4px 4px" }}>
                      {v.venue_id.toUpperCase()}
                    </div>,
                    <div key={`d-${v.venue_id}`} style={{ fontFamily: "var(--tilt-mono)", fontSize: 11, color: SUB, padding: "4px 4px" }}>
                      {depthNorm}
                    </div>,
                    <div key={`s-${v.venue_id}`} style={{ fontFamily: "var(--tilt-mono)", fontSize: 11, color: SUB, padding: "4px 4px" }}>
                      {v.spread_bps.toFixed(1)} bps
                    </div>,
                    <div key={`st-${v.venue_id}`} style={{ fontFamily: "var(--tilt-mono)", fontSize: 11, fontWeight: 700, color: ragColor(vRag), padding: "4px 4px" }}>
                      ● {vLabel}
                    </div>,
                  ];
                })}
              </div>
            </div>

            {/* Liquidation Pressure Index */}
            <div style={{
              background: lpiSt ? `${lpiSt.color}0d` : "transparent",
              border: `1px solid ${lpiSt ? `${lpiSt.color}25` : BORDER}`,
              borderRadius: 2, padding: "10px 14px",
            }}>
              <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 9, color: MUTED, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
                Liquidation Pressure Index
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
                <span style={{ fontFamily: "var(--tilt-mono)", fontSize: 28, fontWeight: 700, color: lpiSt?.color ?? SUB }}>
                  {lpi != null ? lpi.toFixed(2) : "—"}
                </span>
                <span style={{ fontFamily: "var(--tilt-mono)", fontSize: 16, color: MUTED }}>/ 1.00</span>
              </div>
              <div style={{ fontFamily: "var(--tilt-sans)", fontSize: 11, color: SUB }}>
                {lpiSt?.label ?? "Awaiting data"}
              </div>
            </div>
          </div>
        </div>

        {/* ── ROW 5: PoMI COORDINATION FRAMEWORK ──────────────────────────── */}
        <div style={{ background: PANEL, padding: "14px 16px", borderTop: `1px solid ${BORDER}` }} data-testid="integrity-pomi-coord">
          <SectionHeader
            title="PoMI — Market Integrity Coordination"
            right={
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontFamily: "var(--tilt-mono)", fontSize: 9, color: MUTED, letterSpacing: "0.08em" }}>
                  PoMI
                </span>
                <ScoreRing score={pomiScore} color={pomiColor} size={36} />
                <span style={{ fontFamily: "var(--tilt-mono)", fontSize: 14, fontWeight: 700, color: TEXT }}>
                  {pomiRat ?? "—"}
                </span>
              </div>
            }
          />
          <div style={{ fontFamily: "var(--tilt-sans)", fontSize: 11, color: MUTED, marginBottom: 12 }}>
            Coordinated Stabilisation Telemetry
          </div>

          {/* 3-column pillar grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1, background: BORDER }}>
            {[
              { pillar: "THRESHOLD DEFINITION", label: thresholdLabel, score: thresholdScore, rag: thresholdRag as Rag },
              { pillar: "THROTTLE ACTIVATION",  label: throttleLabel,  score: throttleScore,  rag: throttleRag  as Rag },
              { pillar: "VENUE SYNCHRONISATION",label: venueSyncLabel, score: venueSyncScore, rag: venueSyncRag  as Rag },
            ].map(p => {
              const c = ragColor(p.rag);
              return (
                <div key={p.pillar} style={{ background: PANEL, padding: "14px 16px" }}>
                  <div style={{ fontFamily: "var(--tilt-mono)", fontSize: 9, color: MUTED, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>
                    {p.pillar}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                    <span style={{ fontFamily: "var(--tilt-mono)", fontSize: 12, fontWeight: 700, color: c }}>
                      {p.label}
                    </span>
                    <span style={{ fontFamily: "var(--tilt-mono)", fontSize: 14, fontWeight: 700, color: c }}>
                      {p.score}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div style={{ height: 3, background: BORDER, borderRadius: 1, marginBottom: 6 }}>
                    <div style={{
                      height: "100%", width: `${p.score}%`,
                      background: c, borderRadius: 1,
                      transition: "width 1s ease",
                    }} />
                  </div>
                  {/* Decorative dot strip */}
                  <div style={{ display: "flex", gap: 3 }}>
                    {Array.from({ length: 10 }, (_, i) => (
                      <div key={i} style={{
                        width: 4, height: 4, borderRadius: "50%",
                        background: i < Math.round(p.score / 10) ? c : BORDER,
                      }} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── FOOTER ──────────────────────────────────────────────────────── */}
        <div className="tilt-statusbar" data-testid="integrity-footer">
          <div className="tilt-sb-live">
            <div className="tilt-sb-dot tilt-pulse" />
            MONITORING ACTIVE
          </div>
          <div className="tilt-sb-item">
            STRATALINK TELEMETRY
          </div>
          <div className="tilt-sb-item">
            VENUES: <span>{agg?.venue_count ?? "—"} ACTIVE</span>
          </div>
          <div className="tilt-sb-item">
            LATENCY: <span>{latency != null ? `${latency}ms` : "—"}</span>
          </div>
          <div style={{ marginLeft: "auto" }} className="tilt-sb-item">
            STRATALINK · MARKET INTEGRITY INFRASTRUCTURE
          </div>
        </div>

      </div>
    </div>
  );
}
