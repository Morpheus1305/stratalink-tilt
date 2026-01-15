/**
 * RCL Regulatory View - ADGM
 * Read-only market integrity observatory
 * Contract version: rcl_v0.1
 */

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/dashboard-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileJson, FileText, RefreshCw, AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";

interface RclInstrument {
  instrument: string;
  asset_class: string;
  status: string;
}

interface RclScreenPayload {
  meta: {
    contract_version: string;
    generated_at: string;
    time_mode: string;
    authoritative_record: boolean;
    authoritative_refs: {
      poli_snapshot: string;
      dact_window: string;
      lis_manifest: string;
    };
  };
  access_context: {
    role: string;
    jurisdiction: string;
    scopes: string[];
  };
  header: {
    jurisdiction: string;
    market_scope: string;
    instrument: string;
    snapshot_label: string;
    notice: string;
  };
  coverage: {
    instrument: string;
    venue_count: number;
    liquidity_types: string[];
    coverage_completeness: {
      known_venues: number;
      covered_venues: number;
      coverage_pct: number;
    };
    last_successful_ingest_at: string;
    coverage_flags: string[];
  };
  truth: {
    poli: {
      status: "verified" | "insufficient" | "degraded";
      evidence_level: string;
      verified_at: string;
      valid_until: string;
      status_reason: string;
    };
    integrity: {
      data_gaps: {
        present: boolean;
        gap_count: number;
      };
      latency: {
        within_bounds: boolean;
        p95_ms: number;
      };
      normalization: {
        complete: boolean;
        failed_venues: string[];
      };
      overall: {
        state: string;
        severity: "ok" | "amber" | "red";
      };
    };
  };
  provenance: {
    venues: {
      venue: string;
      lis_modules: string[];
      ingestion_method: string;
      normalization_status: string;
      last_event_at: string;
      evidence_hooks: string[];
      refs: {
        lis_ref: string;
        dact_ref: string;
      };
    }[];
    reference_ids: {
      snapshot_ref: string;
      poli_ref: string;
      dact_ref: string;
      lis_ref: string;
    };
  };
  export: {
    available: boolean;
    formats: string[];
    endpoints: {
      pdf: string;
      json: string;
    };
  };
}

function SeverityIndicator({ severity }: { severity: "ok" | "amber" | "red" }) {
  if (severity === "ok") {
    return (
      <span className="inline-flex items-center gap-1 text-green-500">
        <CheckCircle className="w-3.5 h-3.5" />
        <span className="text-xs font-medium">OK</span>
      </span>
    );
  }
  if (severity === "amber") {
    return (
      <span className="inline-flex items-center gap-1 text-amber-500">
        <AlertTriangle className="w-3.5 h-3.5" />
        <span className="text-xs font-medium">AMBER</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-red-500">
      <AlertCircle className="w-3.5 h-3.5" />
      <span className="text-xs font-medium">RED</span>
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

  const instrumentsQuery = useQuery<{ instruments: RclInstrument[] }>({
    queryKey: ["/api/rcl/v0.1/instruments"],
    staleTime: 60000,
  });

  const screenQuery = useQuery<RclScreenPayload>({
    queryKey: [`/api/rcl/v0.1/screen/adgm?instrument=${encodeURIComponent(selectedInstrument)}`],
    refetchInterval: false,
    staleTime: 30000,
  });

  const instruments = instrumentsQuery.data?.instruments ?? [];
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

      <div className="flex-1 p-6 space-y-4 max-w-7xl mx-auto w-full">
        {/* Header Section */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold">Liquidity Truth — Regulatory View</h1>
              <p className="text-xs text-muted-foreground">
                ADGM Jurisdiction • Digital Assets — Spot
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
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={screenQuery.isFetching}
                data-testid="button-refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${screenQuery.isFetching ? "animate-spin" : ""}`} />
                Fetch latest snapshot
              </Button>
            </div>
          </div>

          {/* Notice Banner */}
          <div className="bg-neutral-900/50 border border-neutral-800 rounded px-3 py-2">
            <p className="text-xs text-muted-foreground">
              {data?.header?.notice ?? "Read-only regulatory view. Non-authoritative rendering."}
            </p>
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
                <LabelValue label="instrument" value={data.coverage.instrument} mono />
                <LabelValue label="venue_count" value={data.coverage.venue_count} />
                <LabelValue
                  label="liquidity_types"
                  value={data.coverage.liquidity_types.join(", ")}
                />
                <LabelValue
                  label="coverage_pct"
                  value={`${data.coverage.coverage_completeness.coverage_pct}%`}
                  mono
                />
                <LabelValue
                  label="known_venues"
                  value={data.coverage.coverage_completeness.known_venues}
                />
                <LabelValue
                  label="covered_venues"
                  value={data.coverage.coverage_completeness.covered_venues}
                />
                <LabelValue
                  label="last_successful_ingest_at"
                  value={formatTime(data.coverage.last_successful_ingest_at)}
                />
                {data.coverage.coverage_flags.length > 0 && (
                  <div className="pt-2">
                    <span className="text-xs text-muted-foreground">coverage_flags:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {data.coverage.coverage_flags.map((flag) => (
                        <span
                          key={flag}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20"
                        >
                          {flag}
                        </span>
                      ))}
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
                    <span className="text-xs text-muted-foreground">status</span>
                    <StatusBadge status={data.truth.poli.status} />
                  </div>
                  <LabelValue label="evidence_level" value={data.truth.poli.evidence_level} mono />
                  <div className="pt-2">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Validity Window</span>
                  </div>
                  <LabelValue label="verified_at" value={formatTime(data.truth.poli.verified_at)} />
                  <LabelValue label="valid_until" value={formatTime(data.truth.poli.valid_until)} />
                  <div className="text-[10px] text-muted-foreground pt-1">
                    {data.truth.poli.status_reason}
                  </div>
                </div>

                <div className="border-t border-neutral-800 pt-2" />

                {/* Integrity */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">integrity.overall</span>
                    <SeverityIndicator severity={data.truth.integrity.overall.severity} />
                  </div>
                  <LabelValue label="state" value={data.truth.integrity.overall.state} />
                  <LabelValue
                    label="data_gaps.present"
                    value={data.truth.integrity.data_gaps.present ? `true (${data.truth.integrity.data_gaps.gap_count})` : "false"}
                  />
                  <LabelValue
                    label="latency.p95_ms"
                    value={`${data.truth.integrity.latency.p95_ms}`}
                    mono
                  />
                  <LabelValue
                    label="latency.within_bounds"
                    value={data.truth.integrity.latency.within_bounds ? "true" : "false"}
                  />
                  <LabelValue
                    label="normalization.complete"
                    value={data.truth.integrity.normalization.complete ? "true" : "false"}
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
                  <div key={venue.venue} className="border border-neutral-800 rounded p-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">{venue.venue}</span>
                      <span className="text-[10px] text-muted-foreground">{venue.ingestion_method}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      lis_modules: {venue.lis_modules.join(", ")}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      normalization_status: {venue.normalization_status}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      last_event_at: {formatTime(venue.last_event_at)}
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground/70 truncate">
                      refs.lis_ref: {venue.refs.lis_ref}
                    </div>
                  </div>
                ))}

                <div className="border-t border-neutral-800 pt-2 space-y-1">
                  <span className="text-xs text-muted-foreground">reference_ids</span>
                  <div className="text-[10px] font-mono space-y-0.5">
                    <div className="truncate">snapshot_ref: {data.provenance.reference_ids.snapshot_ref}</div>
                    <div className="truncate">poli_ref: {data.provenance.reference_ids.poli_ref}</div>
                    <div className="truncate">dact_ref: {data.provenance.reference_ids.dact_ref}</div>
                    <div className="truncate">lis_ref: {data.provenance.reference_ids.lis_ref}</div>
                  </div>
                </div>

                <div className="border-t border-neutral-800 pt-2 space-y-1">
                  <span className="text-xs text-muted-foreground">authoritative_refs</span>
                  <div className="text-[10px] font-mono space-y-0.5">
                    <div className="truncate">poli_snapshot: {data.meta.authoritative_refs.poli_snapshot}</div>
                    <div className="truncate">dact_window: {data.meta.authoritative_refs.dact_window}</div>
                    <div className="truncate">lis_manifest: {data.meta.authoritative_refs.lis_manifest}</div>
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
              <div>contract_version: {data.meta.contract_version}</div>
              <div>generated_at: {formatTime(data.meta.generated_at)}</div>
              <div>snapshot_ref: {data.provenance.reference_ids.snapshot_ref}</div>
              <div className="pt-1 text-muted-foreground/70">
                access_context: role={data.access_context.role}, jurisdiction={data.access_context.jurisdiction}, scopes=[{data.access_context.scopes.join(", ")}]
              </div>
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
