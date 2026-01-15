/**
 * RCL Mock Data Provider
 * Generates mock regulatory consumption layer data for ADGM
 * Contract version: rcl_v0.1
 */

export interface RclInstrument {
  instrument: string;
  asset_class: string;
  status: string;
}

export interface RclScreenPayload {
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

const VENUE_CONFIGS = [
  {
    venue: "binance",
    lis_modules: ["depth", "trades", "funding"],
    ingestion_method: "relay",
    normalization_status: "complete",
  },
  {
    venue: "coinbase",
    lis_modules: ["depth", "trades"],
    ingestion_method: "rest",
    normalization_status: "complete",
  },
  {
    venue: "kraken",
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
): { instruments: RclInstrument[]; next_cursor: string | null } {
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
    instruments: limited,
    next_cursor: limited.length < filtered.length ? "next" : null,
  };
}

export function getAdgmScreenPayload(
  instrument: string = "BTC-USD",
  timeMode: string = "realtime",
  _at?: string
): RclScreenPayload {
  const now = new Date();
  const snapshotRef = generateSnapshotRef();
  const poliRef = generatePoliRef();
  const dactRef = generateDactRef();
  const lisRef = generateLisRef();

  const validUntil = new Date(now.getTime() + 5 * 60 * 1000);

  const poliStatuses: Array<"verified" | "insufficient" | "degraded"> = [
    "verified",
    "verified",
    "verified",
    "degraded",
  ];
  const poliStatus = poliStatuses[Math.floor(Math.random() * poliStatuses.length)];

  const overallSeverity: "ok" | "amber" | "red" =
    poliStatus === "verified" ? "ok" : poliStatus === "degraded" ? "amber" : "red";

  const venues = VENUE_CONFIGS.map((vc) => ({
    venue: vc.venue,
    lis_modules: vc.lis_modules,
    ingestion_method: vc.ingestion_method,
    normalization_status: vc.normalization_status,
    last_event_at: new Date(now.getTime() - Math.random() * 5000).toISOString(),
    evidence_hooks: [`${vc.venue}_depth_hook`, `${vc.venue}_trade_hook`],
    refs: {
      lis_ref: `${vc.venue}-${lisRef}`,
      dact_ref: `${vc.venue}-${dactRef}`,
    },
  }));

  return {
    meta: {
      contract_version: "rcl_v0.1",
      generated_at: now.toISOString(),
      time_mode: timeMode,
      authoritative_record: false,
      authoritative_refs: {
        poli_snapshot: poliRef,
        dact_window: dactRef,
        lis_manifest: lisRef,
      },
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
      venue_count: venues.length,
      liquidity_types: ["lit", "rfq", "amm_derived"],
      coverage_completeness: {
        known_venues: 5,
        covered_venues: venues.length,
        coverage_pct: Math.round((venues.length / 5) * 100),
      },
      last_successful_ingest_at: new Date(
        now.getTime() - Math.random() * 3000
      ).toISOString(),
      coverage_flags:
        poliStatus === "verified"
          ? []
          : ["partial_venue_coverage", "okx_unavailable"],
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
              ? "healthy"
              : poliStatus === "degraded"
              ? "degraded"
              : "impaired",
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
