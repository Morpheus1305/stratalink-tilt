/**
 * RCL Regulatory View - ADGM
 * Read-only market integrity observatory
 * Contract version: rcl_v0.1
 */

import { useState, useEffect } from "react";
import { useToken } from "@/contexts/TokenContext";
import { useQuery } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/dashboard-header";
import { PlatformTabs } from "@/components/platform-tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, AlertCircle, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { generateRCLPDF } from "@/lib/pdfExport";
import { PlatformFooter } from "@/components/platform-footer";
import { TT } from "@/components/tilt-tooltip";

type RclSeverity = "green" | "amber" | "red";

interface RclAuthoritativeRef {
  type: "poli_snapshot" | "dact_window" | "lis_manifest";
  ref: string;
}

interface RclFlag {
  code: string;
  severity: RclSeverity;
  message: string;
}

interface RclInstrument {
  instrument: string;
  asset_class: string;
  status: "active" | "inactive";
}

interface RclScreenPayload {
  meta: {
    contract_version: "rcl_v0.1";
    generated_at: string;
    time_mode: "latest_snapshot" | "at_time";
    authoritative_record: false;
    authoritative_refs: RclAuthoritativeRef[];
  };
  access_context: {
    role: "regulator";
    jurisdiction: "ADGM";
    scopes: string[];
  };
  header: {
    jurisdiction: "ADGM";
    market_scope: string;
    instrument: string;
    snapshot_label: string;
    notice: string;
  };
  coverage: {
    instrument: string;
    venue_count: number;
    liquidity_types: Array<"lit" | "rfq" | "amm_derived">;
    coverage_completeness: {
      known_venues: number;
      covered_venues: number;
      coverage_pct: number;
    };
    last_successful_ingest_at: string;
    coverage_flags: RclFlag[];
  };
  truth: {
    poli: {
      status: "verified" | "insufficient" | "degraded";
      evidence_level: "L1" | "L2" | "L3" | "L4" | "L5";
      verified_at: string;
      valid_until: string;
      status_reason: string;
    };
    integrity: {
      data_gaps: { present: boolean; gap_count: number };
      latency: { within_bounds: boolean; p95_ms: number };
      normalization: { complete: boolean; failed_venues: string[] };
      overall: { state: string; severity: RclSeverity };
    };
  };
  provenance: {
    venues: Array<{
      venue_id: string;
      venue_name?: string;
      lis_modules: string[];
      ingestion_method: string;
      normalization_status: string;
      last_event_at: string;
      evidence_hooks: string[];
      refs: { lis_ref: string; dact_ref: string };
    }>;
    reference_ids: {
      snapshot_ref: string;
      poli_ref: string;
      dact_ref: string;
      lis_ref: string;
    };
  };
  export: {
    available: boolean;
    formats: Array<"pdf" | "json">;
    endpoints: { pdf: string; json: string };
  };
}

function IntegrityIndicator({ severity, state }: { severity: RclSeverity; state: string }) {
  const label = state === "within_controls" ? "Within controls" : 
                state === "elevated_risk" ? "Elevated Risk" : 
                state === "control_breach" ? "Control Breach" : state;
  
  if (severity === "green") {
    return (
      <span className="inline-flex items-center gap-1 text-green-500">
        <CheckCircle className="w-3.5 h-3.5" />
        <span className="text-xs font-medium">{label}</span>
      </span>
    );
  }
  if (severity === "amber") {
    return (
      <span className="inline-flex items-center gap-1 text-amber-500">
        <AlertTriangle className="w-3.5 h-3.5" />
        <span className="text-xs font-medium">{label}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-red-500">
      <AlertCircle className="w-3.5 h-3.5" />
      <span className="text-xs font-medium">{label}</span>
    </span>
  );
}

function StatusBadge({ status }: { status: "verified" | "insufficient" | "degraded" }) {
  const colors = {
    verified: "bg-green-500/10 text-green-500 border-green-500/20",
    degraded: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    insufficient: "bg-red-500/10 text-red-500 border-red-500/20",
  };
  return (
    <span className={`px-2 py-0.5 rounded border text-xs font-medium uppercase ${colors[status]}`}>
      {status}
    </span>
  );
}

function LabelValue({ label, value, mono = false }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xs ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

type EvidenceLevel = "L1" | "L2" | "L3" | "L4" | "L5";

interface EvidenceLevelInfo {
  title: string;
  subtitle: string;
  indicators: Array<{ text: string; status: "complete" | "partial" | "warning" }>;
  description: string;
  statusLabel: string;
  statusColor: "red" | "yellow" | "green" | "blue" | "purple";
}

const EVIDENCE_LEVELS: Record<EvidenceLevel, EvidenceLevelInfo> = {
  L1: {
    title: "Level 1: Minimal Evidence",
    subtitle: "Minimal Evidence",
    indicators: [
      { text: "Basic venue connectivity confirmed", status: "warning" },
      { text: "Limited depth data available", status: "warning" },
      { text: "Incomplete trade history", status: "warning" },
    ],
    description: "This evidence level provides basic awareness but does not meet regulatory standards for supervisory conclusions.",
    statusLabel: "Insufficient for regulatory reliance",
    statusColor: "red",
  },
  L2: {
    title: "Level 2: Partial Sufficiency",
    subtitle: "Partial Sufficiency",
    indicators: [
      { text: "Order book snapshots available", status: "partial" },
      { text: "Recent trade data confirmed", status: "partial" },
      { text: "Funding/settlement flows incomplete", status: "warning" },
    ],
    description: "This evidence level provides partial market visibility but lacks comprehensive coverage for full supervisory assessment.",
    statusLabel: "Limited regulatory applicability",
    statusColor: "yellow",
  },
  L3: {
    title: "Level 3: Supervisory Sufficiency",
    subtitle: "Supervisory Sufficiency",
    indicators: [
      { text: "Order book depth data available", status: "complete" },
      { text: "Trade execution history confirmed", status: "complete" },
      { text: "Funding and settlement flows tracked", status: "complete" },
    ],
    description: "This evidence level meets regulatory standards for supervisory observation and market surveillance.",
    statusLabel: "Suitable for regulatory oversight",
    statusColor: "green",
  },
  L4: {
    title: "Level 4: Enhanced Verification",
    subtitle: "Enhanced Verification",
    indicators: [
      { text: "Real-time order book depth (full LOB)", status: "complete" },
      { text: "Complete trade and settlement audit trail", status: "complete" },
      { text: "Cross-venue liquidity correlation confirmed", status: "complete" },
      { text: "Sub-second timestamp precision", status: "complete" },
    ],
    description: "This evidence level supports detailed forensic analysis and enhanced supervisory investigations.",
    statusLabel: "Enhanced regulatory capabilities",
    statusColor: "blue",
  },
  L5: {
    title: "Level 5: Forensic Grade",
    subtitle: "Forensic Grade",
    indicators: [
      { text: "Microsecond-precision event sequencing", status: "complete" },
      { text: "Complete order lifecycle tracking", status: "complete" },
      { text: "Cross-venue arbitrage detection capable", status: "complete" },
      { text: "Smart order router pathway reconstruction", status: "complete" },
      { text: "Cryptographic verification of all artifacts", status: "complete" },
    ],
    description: "This evidence level supports formal proceedings, enforcement actions, and expert testimony.",
    statusLabel: "Court-admissible evidence grade",
    statusColor: "purple",
  },
};

function EvidenceLevelTooltipContent({ level }: { level: EvidenceLevel }) {
  const info = EVIDENCE_LEVELS[level];

  const getIndicatorIcon = (status: "complete" | "partial" | "warning") => {
    switch (status) {
      case "complete": return <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />;
      case "partial": return <span className="w-3 h-3 flex items-center justify-center text-yellow-500 flex-shrink-0 text-xs">◐</span>;
      case "warning": return <AlertTriangle className="w-3 h-3 text-orange-500 flex-shrink-0" />;
    }
  };

  const statusColors = {
    red: "text-red-400",
    yellow: "text-yellow-400",
    green: "text-green-400",
    blue: "text-blue-400",
    purple: "text-purple-400",
  };

  return (
    <div className="space-y-2">
      <div className="font-semibold text-sm">Evidence Ladder  -  {info.title}</div>
      <div className={`font-medium text-xs ${statusColors[info.statusColor]}`}>{info.subtitle}</div>
      <div className="text-xs space-y-1.5 pt-1">
        {info.indicators.map((ind, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            {getIndicatorIcon(ind.status)}
            <span>{ind.text}</span>
          </div>
        ))}
      </div>
      <div className="text-[10px] text-muted-foreground pt-1 italic">{info.description}</div>
      <div className="text-[10px] pt-1 border-t border-border">
        <span className="text-muted-foreground">Status: </span>
        <span className={`font-medium ${statusColors[info.statusColor]}`}>{info.statusLabel}</span>
      </div>
    </div>
  );
}

export default function RegulatoryAdgmView() {
  const { selectedPair: selectedInstrument } = useToken();

  const fmtClock = () => new Date().toLocaleTimeString("en-GB", { hour12: false });
  const [clockStr, setClockStr] = useState(fmtClock);
  useEffect(() => {
    const id = setInterval(() => setClockStr(fmtClock()), 1000);
    return () => clearInterval(id);
  }, []);

  const instrumentsQuery = useQuery<{ items: RclInstrument[] }>({
    queryKey: ["/api/rcl/v0.1/instruments"],
    staleTime: 60000,
  });

  const screenQuery = useQuery<RclScreenPayload>({
    queryKey: [`/api/rcl/v0.1/screen/adgm?instrument=${encodeURIComponent(selectedInstrument)}`],
    refetchInterval: false,
    staleTime: 30000,
  });

  const instruments = instrumentsQuery.data?.items ?? [];
  const data = screenQuery.data;

  const handleExportJson = () => {
    if (!data?.export?.endpoints?.json) return;
    window.open(data.export.endpoints.json, "_blank");
  };

  const handleExportPdf = () => {
    if (!data) return;
    generateRCLPDF(data as any);
  };

  const handleRefresh = () => {
    screenQuery.refetch();
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const displayInstruments = instruments.length > 0
    ? instruments
    : [{ instrument: "BTC-USD" }, { instrument: "ETH-USD" }, { instrument: "SOL-USD" }] as RclInstrument[];

  const coveragePct = data?.coverage.coverage_completeness.coverage_pct;
  const venueCount = data?.coverage.venue_count ?? data?.provenance.venues.length;
  const evidenceLevel = data?.truth.poli.evidence_level;
  const poliStatus = data?.truth.poli.status;
  const integrityState = data?.truth.integrity.overall.state;

  const poliStatusColor = poliStatus === "verified" ? "#00E676" : poliStatus === "degraded" ? "#FFB300" : "#FF5252";
  const integrityColor = integrityState === "within_controls" ? "#00E676" : integrityState === "elevated_risk" ? "#FFB300" : "#FF5252";

  const tiltVars = {
    "--tilt-header": "#080D14",
    "--tilt-border": "#1A2435",
    "--tilt-accent": "#00BFA5",
    "--tilt-green": "#00E676",
    "--tilt-amber": "#FFB300",
    "--tilt-red": "#FF5252",
    "--tilt-text": "#D8DEE8",
    "--tilt-sub": "#7B8EA3",
    "--tilt-muted": "#4A5B6E",
    "--tilt-hover": "#131D2B",
    "--tilt-mono": "'JetBrains Mono', 'SF Mono', 'Fira Code', Consolas, monospace",
  } as React.CSSProperties;

  return (
    <div className="tilt-terminal" data-testid="regulatory-adgm-page">
      <DashboardHeader />
      <PlatformTabs />

      {/* ── TILT-STYLE INNER HEADERS ────────────────────────────────────────── */}
      <div style={tiltVars}>
        {/* Title bar */}
        <div className="tilt-header">
          <div className="tilt-logo">STRATA<span>LINK</span></div>
          <div className="tilt-header-divider" />
          <div style={{ fontSize: 10, color: "var(--tilt-sub)", letterSpacing: 1 }}>
            REGULATORY CONSUMPTION LAYER
          </div>
          <div className="tilt-header-divider" />
          <div style={{ fontSize: 10, color: "var(--tilt-muted)" }}>RCL v0.2</div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
            <button
              onClick={handleExportJson}
              disabled={!data}
              data-testid="button-export-json"
              style={{
                display: "flex", alignItems: "center", gap: 5,
                background: "var(--tilt-panel)", border: "1px solid var(--tilt-border)",
                borderRadius: 2, padding: "3px 9px",
                fontSize: 9, letterSpacing: "0.08em", fontFamily: "var(--tilt-mono)",
                color: data ? "var(--tilt-green)" : "var(--tilt-muted)",
                cursor: data ? "pointer" : "default", outline: "none",
              }}
            >
              &#x2B07; EXPORT JSON
            </button>
            <button
              onClick={handleExportPdf}
              disabled={!data}
              data-testid="button-export-pdf"
              style={{
                display: "flex", alignItems: "center", gap: 5,
                background: "var(--tilt-panel)", border: "1px solid var(--tilt-border)",
                borderRadius: 2, padding: "3px 9px",
                fontSize: 9, letterSpacing: "0.08em", fontFamily: "var(--tilt-mono)",
                color: data ? "var(--tilt-green)" : "var(--tilt-muted)",
                cursor: data ? "pointer" : "default", outline: "none",
              }}
            >
              &#x2B07; EXPORT PDF
            </button>
            <div style={{ width: 1, height: 12, background: "var(--tilt-border)" }} />
            <div style={{ fontSize: 10, color: "var(--tilt-muted)" }}>
              {venueCount != null ? `${venueCount} VENUES` : " - "} &middot; ADGM
            </div>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: screenQuery.isFetching ? "#FFB300" : "#00E676",
              boxShadow: screenQuery.isFetching ? "0 0 6px #FFB300" : "0 0 6px #00E676",
            }} />
          </div>
        </div>

        {/* Status bar */}
        <div className="tilt-topbar">
          {/* VENUE COUNT */}
          <TT title="Venue Count" body="Number of venues actively reporting data for this asset in the current RCL snapshot.">
            <div className="tilt-tb-item">
              <div className="tilt-tb-label">VENUES</div>
              <div className="tilt-tb-value">{venueCount ?? " - "}</div>
            </div>
          </TT>
          <div className="tilt-tb-divider" />

          {/* COVERAGE */}
          <TT title="Coverage Percentage" body="Percentage of configured venues reporting. 100% = full supervisory coverage with no blind spots. Partial coverage for non-BTC tokens reflects genuine market structure - not every token is listed on every venue.">
            <div className="tilt-tb-item">
              <div className="tilt-tb-label">COVERAGE</div>
              <div className="tilt-tb-value">
                {coveragePct != null ? `${coveragePct}%` : " - "}
              </div>
            </div>
          </TT>
          <div className="tilt-tb-divider" />

          {/* EVIDENCE LEVEL */}
          <TT title="Evidence Level" body="L1 = Minimal Evidence. L2 = Partial Sufficiency. L3 = Supervisory Sufficiency (minimum for routine use). L4 = Enhanced Verification. L5 = Forensic Grade (suitable for formal proceedings and enforcement actions).">
            <div className="tilt-tb-item">
              <div className="tilt-tb-label">EVIDENCE</div>
              <div className="tilt-tb-value" style={{ color: "var(--tilt-accent)" }}>
                {evidenceLevel ?? " - "}
              </div>
            </div>
          </TT>
          <div className="tilt-tb-divider" />

          {/* POLI STATUS */}
          <TT title="PoLi Verification Status" body="VERIFIED = data has passed PoLi quality checks. DEGRADED = partial coverage or data gaps present. INSUFFICIENT = coverage too low for reliable scoring. VERIFIED is the target state.">
            <div className="tilt-tb-item" style={{ minWidth: 90 }}>
              <div className="tilt-tb-label">POLI STATUS</div>
              <div style={{
                fontFamily: "var(--tilt-mono)", fontSize: 11, fontWeight: 700,
                background: poliStatus === "verified" ? "rgba(0,230,118,0.08)"
                  : poliStatus === "degraded" ? "rgba(255,179,0,0.08)"
                  : poliStatus ? "rgba(255,82,82,0.08)" : "transparent",
                color: poliStatus ? poliStatusColor : "var(--tilt-muted)",
                border: poliStatus ? `1px solid ${poliStatusColor}33` : "none",
                borderRadius: 2, padding: "1px 6px", textTransform: "uppercase",
              }}>
                {poliStatus ?? "LOADING"}
              </div>
            </div>
          </TT>
          <div className="tilt-tb-divider" />

          {/* INTEGRITY */}
          <TT title="Data Integrity" body="NORMAL = no integrity concerns. ELEVATED = minor anomalies detected, data usable with caution. BREACH = data integrity compromised, do not rely on this snapshot for formal purposes without investigation.">
            <div className="tilt-tb-item" style={{ minWidth: 80 }}>
              <div className="tilt-tb-label">INTEGRITY</div>
              <div style={{
                fontFamily: "var(--tilt-mono)", fontSize: 11, fontWeight: 700,
                color: integrityState ? integrityColor : "var(--tilt-muted)",
                textTransform: "uppercase",
              }}>
                {integrityState === "within_controls" ? "NORMAL"
                  : integrityState === "elevated_risk" ? "ELEVATED"
                  : integrityState === "control_breach" ? "BREACH"
                  : integrityState ? integrityState.toUpperCase() : " - "}
              </div>
            </div>
          </TT>
          <div className="tilt-tb-divider" />

          {/* JURISDICTION */}
          <TT title="Regulatory Jurisdiction" body="The jurisdiction this RCL view is configured for. Determines which compliance framework, access permissions and audit requirements apply. ADGM = Abu Dhabi Global Market / Financial Services Regulatory Authority.">
            <div className="tilt-tb-item">
              <div className="tilt-tb-label">JURISDICTION</div>
              <div className="tilt-tb-value" style={{ fontSize: 11 }}>ADGM</div>
            </div>
          </TT>

          {/* Refresh + timestamp */}
          <div className="tilt-tb-timestamp">
            <button
              data-testid="button-refresh"
              onClick={handleRefresh}
              disabled={screenQuery.isFetching}
              style={{
                background: "none", border: "none", cursor: "pointer",
                marginRight: 10, color: "var(--tilt-sub)", fontSize: 10,
                opacity: screenQuery.isFetching ? 0.5 : 1,
                fontFamily: "var(--tilt-mono)", letterSpacing: "0.06em",
              }}
            >
              {screenQuery.isFetching ? "LOADING..." : "REFRESH"}
            </button>
            LAST UPDATE&nbsp;<span>{clockStr}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-4 max-w-7xl mx-auto w-full">

        {/* Loading State */}
        {screenQuery.isLoading && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error State */}
        {screenQuery.isError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded p-4 text-center">
            <p className="text-sm text-red-400">Failed to load regulatory screen data</p>
          </div>
        )}

        {/* Three-Pane Layout */}
        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left Pane: Coverage */}
            <Card className="border-border ">
              <CardHeader className="pb-2">
                <TT title="Coverage Panel" body="How many configured venues are contributing data for this token right now. 100% = full supervisory coverage, no blind spots. Partial coverage may occur for tokens not listed on all 20 venues - this reflects genuine market structure, not a system error.">
                  <CardTitle className="text-sm font-medium">Coverage</CardTitle>
                </TT>
              </CardHeader>
              <CardContent className="space-y-1">
                <LabelValue label="Instrument" value={data.coverage.instrument} mono />
                <LabelValue label="Venue Count" value={data.coverage.venue_count} />
                <LabelValue
                  label="Liquidity Types"
                  value={data.coverage.liquidity_types.map(t => 
                    t === "lit" ? "Lit" : t === "rfq" ? "RFQ" : t === "amm_derived" ? "AMM-Derived" : t
                  ).join(" / ")}
                />
                <LabelValue
                  label="Coverage"
                  value={`${data.coverage.coverage_completeness.coverage_pct}%`}
                  mono
                />
                <LabelValue
                  label="Known Venues"
                  value={data.coverage.coverage_completeness.known_venues}
                />
                <LabelValue
                  label="Covered Venues"
                  value={data.coverage.coverage_completeness.covered_venues}
                />
                <LabelValue
                  label="Last Ingest"
                  value={formatTime(data.coverage.last_successful_ingest_at)}
                />
                {data.coverage.coverage_flags.length > 0 && (
                  <div className="pt-2">
                    <span className="text-xs text-muted-foreground">Coverage Flags</span>
                    <div className="flex flex-col gap-1 mt-1">
                      {data.coverage.coverage_flags.map((flag) => {
                        const severityColors = {
                          green: "bg-green-500/10 text-green-500 border-green-500/20",
                          amber: "bg-amber-500/10 text-amber-500 border-amber-500/20",
                          red: "bg-red-500/10 text-red-500 border-red-500/20",
                        };
                        return (
                          <div
                            key={flag.code}
                            className={`text-[10px] px-1.5 py-0.5 rounded border ${severityColors[flag.severity]}`}
                          >
                            <span className="font-medium">{flag.code}</span>
                            <span className="opacity-80 ml-1"> -  {flag.message}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Center Pane: Truth */}
            <Card className="border-border ">
              <CardHeader className="pb-2">
                <TT title="Truth Panel" body="DACT-verified data quality assessment. PoLi Status shows whether the data passes quality thresholds. Evidence Level shows how forensically robust the data is for supervisory use (L3 = minimum for routine use; L5 = suitable for enforcement actions). Integrity shows data continuity and latency.">
                  <CardTitle className="text-sm font-medium">Truth</CardTitle>
                </TT>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* PoLi Status */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <TT title="PoLi Verification Status" body="VERIFIED = data has passed all PoLi quality checks and is suitable for supervisory use. DEGRADED = partial coverage or data gaps present. INSUFFICIENT = coverage too low for reliable scoring. Target state for regulatory use is VERIFIED.">
                      <span className="text-xs text-muted-foreground">Status</span>
                    </TT>
                    <StatusBadge status={data.truth.poli.status} />
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                    <span className="text-xs text-muted-foreground">Evidence Level</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-mono">
                        {data.truth.poli.evidence_level} ({EVIDENCE_LEVELS[data.truth.poli.evidence_level as EvidenceLevel]?.subtitle || data.truth.poli.evidence_level})
                      </span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3 h-3 text-muted-foreground/60 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-sm p-3">
                          <EvidenceLevelTooltipContent level={data.truth.poli.evidence_level as EvidenceLevel} />
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  <div className="pt-2">
                    <TT title="PoLi Validity Window" body="The time window during which this PoLi verification is valid. After Valid Until, a fresh attestation is required. The window is typically 4 hours for live monitoring and 24 hours for audit archive records.">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Validity Window</span>
                    </TT>
                  </div>
                  <LabelValue label="Verified At" value={formatTime(data.truth.poli.verified_at)} />
                  <LabelValue label="Valid Until" value={formatTime(data.truth.poli.valid_until)} />
                  <div className="text-[10px] text-muted-foreground pt-1">
                    {data.truth.poli.status_reason}
                  </div>
                </div>

                <div className="border-t border-border pt-2" />

                {/* Integrity */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <TT title="Data Integrity Assessment" body="Measures the continuity, timeliness, and completeness of ingested data. Checks: no data gaps during the observation window, p95 ingestion latency within 2000ms, and full normalisation across all venue formats. Failures here affect DACT audit validity.">
                      <span className="text-xs text-muted-foreground">Integrity</span>
                    </TT>
                    <IntegrityIndicator 
                      severity={data.truth.integrity.overall.severity} 
                      state={data.truth.integrity.overall.state} 
                    />
                  </div>
                  <LabelValue
                    label="Data Gaps"
                    value={data.truth.integrity.data_gaps.present ? `Present (${data.truth.integrity.data_gaps.gap_count})` : "None"}
                  />
                  <LabelValue
                    label="Ingestion Latency (p95)"
                    value={`${data.truth.integrity.latency.p95_ms} ms`}
                    mono
                  />
                  <LabelValue
                    label="Within Bounds"
                    value={data.truth.integrity.latency.within_bounds ? "Yes" : "No"}
                  />
                  <LabelValue
                    label="Normalization"
                    value={data.truth.integrity.normalization.complete ? "Complete" : "Incomplete"}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Right Pane: Provenance */}
            <Card className="border-border ">
              <CardHeader className="pb-2">
                <TT title="Provenance Panel" body="Per-venue attribution chain showing exactly where each data point originated and how it was ingested. Shows ingestion method, transport protocol, latency, and normalisation status per venue. This is the cryptographically-anchored audit trail for DACT compliance.">
                  <CardTitle className="text-sm font-medium">Provenance</CardTitle>
                </TT>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.provenance.venues.map((venue) => (
                  <div key={venue.venue_id} className="border border-border rounded p-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">{venue.venue_name || venue.venue_id}</span>
                      <span className="text-[10px] text-muted-foreground">{venue.ingestion_method}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Modules: {venue.lis_modules.join(", ")}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Normalization: {venue.normalization_status}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Last Event: {formatTime(venue.last_event_at)}
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground/70 truncate">
                      LIS Ref: {venue.refs.lis_ref}
                    </div>
                  </div>
                ))}

                <div className="border-t border-border pt-2 space-y-1">
                  <span className="text-xs text-muted-foreground">Reference IDs</span>
                  <div className="text-[10px] font-mono space-y-0.5">
                    <div className="truncate">Snapshot: {data.provenance.reference_ids.snapshot_ref}</div>
                    <div className="truncate">PoLi: {data.provenance.reference_ids.poli_ref}</div>
                    <div className="truncate">DACT: {data.provenance.reference_ids.dact_ref}</div>
                    <div className="truncate">LIS: {data.provenance.reference_ids.lis_ref}</div>
                  </div>
                </div>

                <div className="border-t border-border pt-2 space-y-1">
                  <span className="text-xs text-muted-foreground">Authoritative references (official records)</span>
                  <div className="text-[10px] font-mono space-y-0.5">
                    {data.meta.authoritative_refs.map((ref) => {
                      const label = ref.type === "poli_snapshot" ? "PoLi Snapshot" :
                                    ref.type === "dact_window" ? "DACT Window" :
                                    ref.type === "lis_manifest" ? "LIS Manifest" : ref.type;
                      return (
                        <div key={ref.type} className="truncate">{label}: {ref.ref}</div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Footer: Metadata */}
        {data && (
          <div className="pt-4 border-t border-border">
            <div className="text-[10px] font-mono text-muted-foreground space-y-0.5">
              <div>Contract Version: {data.meta.contract_version}</div>
              <div>Generated At: {formatTime(data.meta.generated_at)}</div>
              <div>Snapshot Ref: {data.provenance.reference_ids.snapshot_ref}</div>
              <div className="border-t border-border my-1.5" />
              <div>Supervisory Scope: <span className="text-green-500/80">RCL-v0.2  -  {data.coverage.coverage_completeness.covered_venues} venues active across {data.coverage.coverage_completeness.known_venues} configured ({data.coverage.coverage_completeness.coverage_pct}%)</span></div>
              <div>Data Status: <span className="text-green-500/80">Live ingestion  -  RCL-v0.2</span></div>
              <div>Access: Regulator ({data.access_context.jurisdiction})  -  Permissions: {data.access_context.scopes.join(", ")} (observation only)</div>
              <div className="text-muted-foreground/60">Compliance: Annex A (Declared Supervisory Universe) • Annex B (Expansion Governance)</div>
            </div>

          </div>
        )}
      </div>
      <PlatformFooter
        venueCount={data?.coverage?.venue_count ?? null}
        testId="rcl-footer"
      />
    </div>
  );
}
