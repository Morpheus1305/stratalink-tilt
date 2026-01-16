/**
 * RCL Regulatory View - ADGM
 * Read-only market integrity observatory
 * Contract version: rcl_v0.1
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/dashboard-header";
import { PlatformTabs } from "@/components/platform-tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileJson, FileText, RefreshCw, AlertCircle, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
    <div className="flex justify-between items-center py-1.5 border-b border-neutral-800/50 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xs ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

export default function RegulatoryAdgmView() {
  const [selectedInstrument, setSelectedInstrument] = useState("BTC-USD");

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
    if (!data?.export?.endpoints?.pdf) return;
    window.open(data.export.endpoints.pdf, "_blank");
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

  return (
    <div className="min-h-screen bg-background flex flex-col" data-testid="regulatory-adgm-page">
      <DashboardHeader />
      <PlatformTabs />

      <div className="flex-1 p-6 space-y-4 max-w-7xl mx-auto w-full">
        {/* Header Section */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold">Liquidity Truth — Regulatory View</h1>
              <p className="text-xs text-muted-foreground">
                ADGM Jurisdiction • Digital Assets — Spot
              </p>
              <p className="text-xs text-muted-foreground/80 font-medium">
                Supervisory Scope (RCL-v0.1): Binance, Coinbase, Kraken
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedInstrument}
                onChange={(e) => setSelectedInstrument(e.target.value)}
                className="h-8 px-2 text-sm bg-neutral-900 border border-neutral-800 rounded focus:outline-none focus:ring-1 focus:ring-neutral-700"
                data-testid="select-instrument"
              >
                {instruments.length === 0 && (
                  <option value="BTC-USD">BTC-USD</option>
                )}
                {instruments.map((i) => (
                  <option key={i.instrument} value={i.instrument}>
                    {i.instrument}
                  </option>
                ))}
              </select>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={screenQuery.isFetching}
                className="text-muted-foreground"
                data-testid="button-refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${screenQuery.isFetching ? "animate-spin" : ""}`} />
                Load latest snapshot
              </Button>
            </div>
          </div>

          {/* Notice Banner */}
          <div className="bg-neutral-900/50 border border-neutral-800 rounded px-3 py-2 space-y-1">
            <p className="text-xs text-muted-foreground">
              Read-only regulatory view derived from live venue ingestion. This interface renders time-bounded supervisory snapshots.
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground/70">
              <span><span className="font-medium">UI Status:</span> Non-authoritative (display only)</span>
              <span><span className="font-medium">Official Records:</span> PoLi snapshots, DACT artifacts, LIS manifests (see references below)</span>
            </div>
          </div>
        </div>

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
            <Card className="border-neutral-800 bg-neutral-950/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Coverage</CardTitle>
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
                            <span className="opacity-80 ml-1">— {flag.message}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Center Pane: Truth */}
            <Card className="border-neutral-800 bg-neutral-950/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Truth</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* PoLi Status */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Status</span>
                    <StatusBadge status={data.truth.poli.status} />
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-neutral-800/50">
                    <span className="text-xs text-muted-foreground">Evidence Level</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-mono">
                        {data.truth.poli.evidence_level === "L3" 
                          ? "L3 (Supervisory sufficiency)" 
                          : data.truth.poli.evidence_level}
                      </span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3 h-3 text-muted-foreground/60 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-xs p-3 space-y-2">
                          <div className="font-semibold text-sm">Evidence Ladder — Level 3</div>
                          <div className="text-green-500 font-medium text-xs">Supervisory Sufficiency</div>
                          <div className="text-xs space-y-1 pt-1">
                            <div className="flex items-center gap-1.5"><CheckCircle className="w-3 h-3 text-green-500" /> Order book depth data available</div>
                            <div className="flex items-center gap-1.5"><CheckCircle className="w-3 h-3 text-green-500" /> Trade execution history confirmed</div>
                            <div className="flex items-center gap-1.5"><CheckCircle className="w-3 h-3 text-green-500" /> Funding and settlement flows tracked</div>
                          </div>
                          <div className="text-[10px] text-muted-foreground pt-1 italic">
                            This evidence level meets regulatory standards for supervisory observation and market surveillance.
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  <div className="pt-2">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Validity Window</span>
                  </div>
                  <LabelValue label="Verified At" value={formatTime(data.truth.poli.verified_at)} />
                  <LabelValue label="Valid Until" value={formatTime(data.truth.poli.valid_until)} />
                  <div className="text-[10px] text-muted-foreground pt-1">
                    {data.truth.poli.status_reason}
                  </div>
                </div>

                <div className="border-t border-neutral-800 pt-2" />

                {/* Integrity */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Integrity</span>
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
            <Card className="border-neutral-800 bg-neutral-950/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Provenance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.provenance.venues.map((venue) => (
                  <div key={venue.venue_id} className="border border-neutral-800 rounded p-2 space-y-1">
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

                <div className="border-t border-neutral-800 pt-2 space-y-1">
                  <span className="text-xs text-muted-foreground">Reference IDs</span>
                  <div className="text-[10px] font-mono space-y-0.5">
                    <div className="truncate">Snapshot: {data.provenance.reference_ids.snapshot_ref}</div>
                    <div className="truncate">PoLi: {data.provenance.reference_ids.poli_ref}</div>
                    <div className="truncate">DACT: {data.provenance.reference_ids.dact_ref}</div>
                    <div className="truncate">LIS: {data.provenance.reference_ids.lis_ref}</div>
                  </div>
                </div>

                <div className="border-t border-neutral-800 pt-2 space-y-1">
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

        {/* Footer: Export Buttons */}
        {data && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-neutral-800">
            <div className="text-[10px] font-mono text-muted-foreground space-y-0.5">
              <div>Contract Version: {data.meta.contract_version}</div>
              <div>Generated At: {formatTime(data.meta.generated_at)}</div>
              <div>Snapshot Ref: {data.provenance.reference_ids.snapshot_ref}</div>
              <div className="border-t border-neutral-800 my-1.5" />
              <div>Supervisory Scope: <span className="text-green-500/80">Limited pilot — DSU = {"{Binance, Coinbase, Kraken}"}</span></div>
              <div>Data Status: <span className="text-green-500/80">Live ingestion — RCL-v0.1</span></div>
              <div>Access: Regulator ({data.access_context.jurisdiction}) — Permissions: {data.access_context.scopes.join(", ")} (observation only)</div>
              <div className="text-muted-foreground/60">Compliance: Annex A (Declared Supervisory Universe) • Annex B (Expansion Governance)</div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportJson}
                disabled={!data.export.available}
                data-testid="button-export-json"
              >
                <FileJson className="w-3.5 h-3.5 mr-1" />
                Export JSON
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPdf}
                disabled={!data.export.available}
                data-testid="button-export-pdf"
              >
                <FileText className="w-3.5 h-3.5 mr-1" />
                Export PDF
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
