/**
 * RCL Mock Data Provider
 * Generates mock regulatory consumption layer data for ADGM
 * Contract version: rcl_v0.1
 */

export type RclTimeMode = "latest_snapshot" | "at_time";
export type RclPoLiStatus = "verified" | "insufficient" | "degraded";
export type RclSeverity = "green" | "amber" | "red";
export type RclEvidenceLevel = "L1" | "L2" | "L3" | "L4" | "L5";
export type RclLiquidityType = "lit" | "rfq" | "amm_derived";
export type RclAuthRefType = "poli_snapshot" | "dact_window" | "lis_manifest";

export interface RclAuthoritativeRef {
  type: RclAuthRefType;
  ref: string;
}

export interface RclFlag {
  code: string;
  severity: RclSeverity;
  message: string;
}

export interface RclInstrument {
  instrument: string;
  asset_class: string;
  status: "active" | "inactive";
}

export interface RclScreenPayload {
  meta: {
    contract_version: "rcl_v0.1";
    generated_at: string;
    time_mode: RclTimeMode;
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
    liquidity_types: RclLiquidityType[];
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
      status: RclPoLiStatus;
      evidence_level: RclEvidenceLevel;
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

const MOCK_INSTRUMENTS: RclInstrument[] = [
  { instrument: "BTC-USD", asset_class: "cryptocurrency", status: "active" },
  { instrument: "ETH-USD", asset_class: "cryptocurrency", status: "active" },
  { instrument: "SOL-USD", asset_class: "cryptocurrency", status: "active" },
  { instrument: "XRP-USD", asset_class: "cryptocurrency", status: "active" },
  { instrument: "ADA-USD", asset_class: "cryptocurrency", status: "active" },
  { instrument: "LINK-USD", asset_class: "cryptocurrency", status: "active" },
  { instrument: "DOT-USD", asset_class: "cryptocurrency", status: "active" },
  { instrument: "AVAX-USD", asset_class: "cryptocurrency", status: "active" },
];

/**
 * Declared Supervisory Venue Set - Phase A
 * Only these venues are in scope for RCL v0.1 ADGM jurisdiction.
 * Do NOT add global market venues (e.g., OKX, Bybit) to RCL-v0.1.
 */
const DECLARED_SUPERVISORY_VENUES = ["binance", "coinbase", "kraken"] as const;

const VENUE_CONFIGS = [
  {
    venue_id: "binance",
    venue_name: "Binance",
    lis_modules: ["depth", "trades", "funding"],
    ingestion_method: "relay",
    normalization_status: "complete",
  },
  {
    venue_id: "coinbase",
    venue_name: "Coinbase",
    lis_modules: ["depth", "trades"],
    ingestion_method: "rest",
    normalization_status: "complete",
  },
  {
    venue_id: "kraken",
    venue_name: "Kraken",
    lis_modules: ["depth", "trades"],
    ingestion_method: "rest",
    normalization_status: "complete",
  },
];

function generateSnapshotRef(): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).substring(2, 8);
  return `rcl-adgm-${ts}-${rand}`;
}

function generatePoliRef(): string {
  return `poli-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
}

function generateDactRef(): string {
  return `dact-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
}

function generateLisRef(): string {
  return `lis-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
}

export function getInstruments(
  q?: string,
  limit: number = 50,
  _cursor?: string
): { items: RclInstrument[]; next_cursor: string | null } {
  let filtered = MOCK_INSTRUMENTS;
  if (q) {
    const query = q.toLowerCase();
    filtered = MOCK_INSTRUMENTS.filter(
      (i) =>
        i.instrument.toLowerCase().includes(query) ||
        i.asset_class.toLowerCase().includes(query)
    );
  }
  const limited = filtered.slice(0, limit);
  return {
    items: limited,
    next_cursor: limited.length < filtered.length ? "next" : null,
  };
}

export function getAdgmScreenPayload(
  instrument: string = "BTC-USD",
  timeMode: RclTimeMode = "latest_snapshot",
  _at?: string
): RclScreenPayload {
  const now = new Date();
  const snapshotRef = generateSnapshotRef();
  const poliRef = generatePoliRef();
  const dactRef = generateDactRef();
  const lisRef = generateLisRef();

  const validUntil = new Date(now.getTime() + 5 * 60 * 1000);

  const poliStatuses: RclPoLiStatus[] = [
    "verified",
    "verified",
    "verified",
    "degraded",
  ];
  const poliStatus = poliStatuses[Math.floor(Math.random() * poliStatuses.length)];

  const overallSeverity: RclSeverity =
    poliStatus === "verified" ? "green" : poliStatus === "degraded" ? "amber" : "red";

  const venues = VENUE_CONFIGS.map((vc) => ({
    venue_id: vc.venue_id,
    venue_name: vc.venue_name,
    lis_modules: vc.lis_modules,
    ingestion_method: vc.ingestion_method,
    normalization_status: vc.normalization_status,
    last_event_at: new Date(now.getTime() - Math.random() * 5000).toISOString(),
    evidence_hooks: [`${vc.venue_id}_depth_hook`, `${vc.venue_id}_trade_hook`],
    refs: {
      lis_ref: `${vc.venue_id}-${lisRef}`,
      dact_ref: `${vc.venue_id}-${dactRef}`,
    },
  }));

  // Coverage flags derived ONLY from declared supervisory venue set
  // Never reference venues outside DECLARED_SUPERVISORY_VENUES
  const coverageFlags: RclFlag[] =
    poliStatus === "verified"
      ? []
      : [
          { 
            code: "elevated_latency", 
            severity: "amber", 
            message: "One or more declared supervisory venues reporting with elevated latency" 
          },
        ];

  return {
    meta: {
      contract_version: "rcl_v0.1",
      generated_at: now.toISOString(),
      time_mode: timeMode,
      authoritative_record: false,
      authoritative_refs: [
        { type: "poli_snapshot", ref: poliRef },
        { type: "dact_window", ref: dactRef },
        { type: "lis_manifest", ref: lisRef },
      ],
    },
    access_context: {
      role: "regulator",
      jurisdiction: "ADGM",
      scopes: ["rcl:read"],
    },
    header: {
      jurisdiction: "ADGM",
      market_scope: "Digital Assets - Spot",
      instrument,
      snapshot_label: `${instrument} Liquidity Truth Snapshot`,
      notice:
        "Read-only regulatory view. Non-authoritative rendering. For official records, refer to authoritative_refs.",
    },
    coverage: {
      instrument,
      venue_count: DECLARED_SUPERVISORY_VENUES.length,
      liquidity_types: ["lit", "rfq", "amm_derived"],
      coverage_completeness: {
        known_venues: DECLARED_SUPERVISORY_VENUES.length,
        covered_venues: venues.length,
        coverage_pct: Math.round((venues.length / DECLARED_SUPERVISORY_VENUES.length) * 100),
      },
      last_successful_ingest_at: new Date(
        now.getTime() - Math.random() * 3000
      ).toISOString(),
      coverage_flags: coverageFlags,
    },
    truth: {
      poli: {
        status: poliStatus,
        evidence_level: poliStatus === "verified" ? "L3" : poliStatus === "degraded" ? "L2" : "L1",
        verified_at: now.toISOString(),
        valid_until: validUntil.toISOString(),
        status_reason:
          poliStatus === "verified"
            ? "All required venues reporting within latency bounds"
            : poliStatus === "degraded"
            ? "Some venues reporting with elevated latency"
            : "Insufficient venue coverage for verification",
      },
      integrity: {
        data_gaps: {
          present: poliStatus !== "verified",
          gap_count: poliStatus === "verified" ? 0 : 1,
        },
        latency: {
          within_bounds: poliStatus !== "insufficient",
          p95_ms: poliStatus === "verified" ? 45 : poliStatus === "degraded" ? 120 : 350,
        },
        normalization: {
          complete: true,
          failed_venues: [],
        },
        overall: {
          state:
            poliStatus === "verified"
              ? "within_controls"
              : poliStatus === "degraded"
              ? "elevated_risk"
              : "control_breach",
          severity: overallSeverity,
        },
      },
    },
    provenance: {
      venues,
      reference_ids: {
        snapshot_ref: snapshotRef,
        poli_ref: poliRef,
        dact_ref: dactRef,
        lis_ref: lisRef,
      },
    },
    export: {
      available: true,
      formats: ["pdf", "json"],
      endpoints: {
        pdf: `/api/rcl/v0.1/exports/${snapshotRef}/pdf`,
        json: `/api/rcl/v0.1/exports/${snapshotRef}/json`,
      },
    },
  };
}

const snapshotCache = new Map<string, RclScreenPayload>();

export function cacheSnapshot(payload: RclScreenPayload): void {
  const ref = payload.provenance.reference_ids.snapshot_ref;
  snapshotCache.set(ref, payload);
  setTimeout(() => snapshotCache.delete(ref), 30 * 60 * 1000);
}

export function getSnapshot(snapshotRef: string): RclScreenPayload | null {
  return snapshotCache.get(snapshotRef) || null;
}
