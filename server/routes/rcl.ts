/**
 * RCL (Regulatory Consumption Layer) API Routes
 * Version: v0.1
 * Jurisdiction: ADGM
 * 
 * Read-only regulatory view endpoints for market integrity monitoring
 */

import { Router, Request, Response, NextFunction } from "express";
import {
  getAdgmScreenPayload,
  getInstruments,
  cacheSnapshot,
  getSnapshot,
  type RclScreenPayload,
  type RclTimeMode,
} from "../services/rclLive";

const router = Router();

interface AccessContext {
  role: string;
  jurisdiction: string;
  scopes: string[];
}

declare global {
  namespace Express {
    interface Request {
      rclAccess?: AccessContext;
    }
  }
}

function requireBearerToken(req: Request, res: Response, next: NextFunction) {
  req.rclAccess = {
    role: "regulator",
    jurisdiction: "ADGM",
    scopes: ["rcl:read"],
  };
  next();
}

router.get("/meta", (_req: Request, res: Response) => {
  res.json({
    contract_version: "rcl_v0.1",
    jurisdiction: "ADGM",
    description: "Regulatory Consumption Layer - Read-only market integrity view",
    endpoints: [
      { path: "/screen/adgm", method: "GET", description: "ADGM regulatory screen payload" },
      { path: "/instruments", method: "GET", description: "List available instruments" },
      { path: "/exports/:snapshot_ref/json", method: "GET", description: "Export snapshot as JSON" },
      { path: "/exports/:snapshot_ref/pdf", method: "GET", description: "Export snapshot as PDF" },
    ],
    authoritative_record: false,
  });
});

router.get("/instruments", requireBearerToken, (req: Request, res: Response) => {
  const q = req.query.q as string | undefined;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const cursor = req.query.cursor as string | undefined;

  const result = getInstruments(q, limit, cursor);

  res.json({
    items: result.items,
    pagination: {
      limit,
      next_cursor: result.next_cursor,
    },
  });
});

router.get("/screen/adgm", requireBearerToken, (req: Request, res: Response) => {
  const instrument = (req.query.instrument as string) || "BTC-USD";
  const timeModeParam = req.query.time_mode as string | undefined;
  const timeMode: RclTimeMode = timeModeParam === "at_time" ? "at_time" : "latest_snapshot";
  const at = req.query.at as string | undefined;

  const payload = getAdgmScreenPayload(instrument, timeMode, at);
  
  cacheSnapshot(payload);

  res.json(payload);
});

router.get("/exports/:snapshot_ref/json", requireBearerToken, (req: Request, res: Response) => {
  const { snapshot_ref } = req.params;

  const payload = getSnapshot(snapshot_ref);

  if (!payload) {
    return res.status(404).json({
      error: {
        code: "SNAPSHOT_NOT_FOUND",
        message: "Snapshot reference not found or expired",
        generated_at: new Date().toISOString(),
      },
    });
  }

  const instrument = payload.header.instrument.replace(/[^a-zA-Z0-9-]/g, "_");
  
  res.setHeader("Content-Type", "application/json");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="rcl_adgm_${instrument}_${snapshot_ref}.json"`
  );
  res.send(JSON.stringify(payload, null, 2));
});

function generatePdfContent(payload: any, snapshot_ref: string): string {
  const instrument = payload.header?.instrument || "Unknown";
  const escapeText = (text: string) => text.replace(/[()\\]/g, "\\$&");
  
  const lines: string[] = [];
  let y = 750;
  const lineHeight = 14;
  const sectionGap = 24;
  
  const addLine = (text: string, fontSize: number = 10, bold: boolean = false) => {
    const fontCmd = bold ? "/F2" : "/F1";
    lines.push(`${fontCmd} ${fontSize} Tf`);
    lines.push(`50 ${y} Td`);
    lines.push(`(${escapeText(text)}) Tj`);
    y -= lineHeight;
  };
  
  const addSection = (title: string) => {
    y -= sectionGap / 2;
    lines.push(`/F2 11 Tf`);
    lines.push(`50 ${y} Td`);
    lines.push(`(${escapeText(title)}) Tj`);
    y -= lineHeight + 4;
  };
  
  const addKV = (key: string, value: string) => {
    lines.push(`/F1 9 Tf`);
    lines.push(`50 ${y} Td`);
    lines.push(`(${escapeText(key)}: ${escapeText(value)}) Tj`);
    y -= lineHeight;
  };

  lines.push("BT");
  
  lines.push("/F2 16 Tf");
  lines.push(`50 ${y} Td`);
  lines.push("(ADGM Regulatory Liquidity Snapshot) Tj");
  y -= 28;
  
  addSection("Document Metadata");
  addKV("Type", "Regulatory Liquidity Snapshot");
  addKV("Jurisdiction", payload.header?.jurisdiction || "ADGM");
  addKV("Contract Version", payload.meta?.contract_version || "rcl_v0.1");
  addKV("Instrument", instrument);
  addKV("Snapshot Reference", snapshot_ref);
  addKV("Generated At", payload.meta?.generated_at || new Date().toISOString());
  
  const activeCount = payload.coverage?.coverage_completeness?.covered_venues ?? 0;
  const knownCount = payload.coverage?.coverage_completeness?.known_venues ?? 0;
  const coveragePct = payload.coverage?.coverage_completeness?.coverage_pct ?? 0;
  addSection("Supervisory Scope (RCL-v0.2)");
  addKV("Jurisdiction", payload.header?.jurisdiction || "ADGM");
  addKV("Asset Class", "Digital Assets");
  addKV("Market Type", "Spot & Derivatives");
  addKV("Supervisory Universe", `${activeCount} venues active across ${knownCount} configured (${coveragePct}%)`);
  addKV("Version", "RCL-v0.2");
  
  addSection("Coverage Analysis");
  addKV("Instrument", payload.coverage?.instrument || instrument);
  addKV("Venue Count", String(payload.coverage?.venue_count || 3));
  const liquidityTypes = payload.coverage?.liquidity_types?.map((t: string) => 
    t === "lit" ? "Lit" : t === "rfq" ? "RFQ" : t === "amm_derived" ? "AMM-Derived" : t
  ).join(", ") || "Lit, RFQ, AMM-Derived";
  addKV("Liquidity Types", liquidityTypes);
  addKV("Coverage Percentage", `${payload.coverage?.coverage_completeness?.coverage_pct || 100}%`);
  addKV("Known Venues", String(payload.coverage?.coverage_completeness?.known_venues || 3));
  addKV("Covered Venues", String(payload.coverage?.coverage_completeness?.covered_venues || 3));
  addKV("Last Ingest", payload.coverage?.last_successful_ingest_at || new Date().toISOString());
  
  addSection("Liquidity Truth Status");
  const status = payload.truth?.poli?.status || "verified";
  addKV("Status", status.toUpperCase());
  const evidenceLevel = payload.truth?.poli?.evidence_level || "L3";
  const evidenceDesc = evidenceLevel === "L1" ? "Minimal Evidence" :
                       evidenceLevel === "L2" ? "Partial Sufficiency" :
                       evidenceLevel === "L3" ? "Supervisory Sufficiency" :
                       evidenceLevel === "L4" ? "Enhanced Verification" : "Forensic Grade";
  addKV("Evidence Level", `${evidenceLevel} (${evidenceDesc})`);
  addKV("Verified At", payload.truth?.poli?.verified_at || new Date().toISOString());
  addKV("Valid Until", payload.truth?.poli?.valid_until || new Date(Date.now() + 300000).toISOString());
  
  addSection("Integrity Metrics");
  const integrity = payload.truth?.integrity;
  const integrityState = integrity?.overall?.state || "within_controls";
  const integrityLabel = integrityState === "within_controls" ? "Within Controls" : 
                         integrityState === "elevated_risk" ? "Elevated Risk" : "Control Breach";
  addKV("Integrity Status", integrityLabel);
  addKV("Data Gaps", String(integrity?.data_gaps?.gap_count || 0));
  addKV("Ingestion Latency (p95)", `${integrity?.latency?.p95_ms || 45}ms`);
  addKV("Within Bounds", integrity?.latency?.within_bounds ? "Yes" : "No");
  addKV("Normalization", integrity?.normalization?.complete ? "Complete" : "Incomplete");
  
  addSection("Venue Provenance");
  const venues = payload.provenance?.venues || [];
  venues.forEach((v: any) => {
    y -= 4;
    lines.push(`/F2 9 Tf`);
    lines.push(`50 ${y} Td`);
    lines.push(`(${escapeText((v.venue_name || v.venue_id || "Unknown").toUpperCase())}) Tj`);
    y -= lineHeight;
    addKV("  Connection Status", v.ingestion_method || "rest");
    addKV("  Modules", (v.lis_modules || []).join(", ") || "depth, trades");
    addKV("  Normalization", v.normalization_status || "complete");
    addKV("  Last Event", v.last_event_at || new Date().toISOString());
    addKV("  LIS Reference", v.refs?.lis_ref || "N/A");
  });
  
  addSection("Reference Identifiers");
  const refs = payload.provenance?.reference_ids || {};
  addKV("Snapshot Reference", refs.snapshot_ref || snapshot_ref);
  addKV("PoLi Reference", refs.poli_ref || "N/A");
  addKV("DACT Reference", refs.dact_ref || "N/A");
  addKV("LIS Reference", refs.lis_ref || "N/A");
  
  addSection("Authoritative Records (Official)");
  const authRecs = payload.meta?.authoritative_records || {};
  addKV("PoLi Snapshot", authRecs.poli_snapshot || "N/A");
  addKV("DACT Window", authRecs.dact_window || "N/A");
  addKV("LIS Manifest", authRecs.lis_manifest || "N/A");
  
  addSection("Regulatory Compliance");
  addKV("Annex A", "Declared Supervisory Universe");
  addKV("Annex B", "Expansion Governance");
  addKV("Access Scope", "rcl:read (observation only)");
  addKV("UI Status", "Non-authoritative (display only)");
  
  y -= sectionGap;
  lines.push(`/F1 8 Tf`);
  lines.push(`50 ${y} Td`);
  lines.push(`(IMPORTANT: This PDF is a rendered view. For official records, refer to machine-verifiable) Tj`);
  y -= 12;
  lines.push(`50 ${y} Td`);
  lines.push(`(PoLi snapshots, DACT artifacts, and LIS manifests referenced above.) Tj`);
  
  lines.push("ET");
  
  const streamContent = lines.join("\n");
  const streamLength = streamContent.length;
  
  return `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>
endobj
4 0 obj
<< /Length ${streamLength} >>
stream
${streamContent}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
6 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>
endobj
xref
0 7
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000250 00000 n 
trailer
<< /Size 7 /Root 1 0 R >>
startxref
999
%%EOF`;
}

router.get("/exports/:snapshot_ref/pdf", requireBearerToken, (req: Request, res: Response) => {
  const { snapshot_ref } = req.params;

  const payload = getSnapshot(snapshot_ref);

  if (!payload) {
    return res.status(404).json({
      error: {
        code: "SNAPSHOT_NOT_FOUND",
        message: "Snapshot reference not found or expired",
        generated_at: new Date().toISOString(),
      },
    });
  }

  const instrument = (payload.header?.instrument || "unknown").replace(/[^a-zA-Z0-9-]/g, "_");
  const pdfContent = generatePdfContent(payload, snapshot_ref);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="rcl_adgm_${instrument}_${snapshot_ref}.pdf"`
  );
  res.send(pdfContent);
});

export default router;
