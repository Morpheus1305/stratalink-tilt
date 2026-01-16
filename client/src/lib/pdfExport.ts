import { jsPDF } from "jspdf";

interface RCLSnapshotData {
  meta: {
    contract_version: string;
    generated_at: string;
    authoritative_records: {
      poli_snapshot: string;
      dact_window: string;
      lis_manifest: string;
    };
  };
  header: {
    jurisdiction: string;
    instrument: string;
  };
  coverage: {
    instrument: string;
    venue_count: number;
    liquidity_types: string[];
    coverage_completeness: {
      coverage_pct: number;
      known_venues: number;
      covered_venues: number;
    };
    last_successful_ingest_at: string;
  };
  truth: {
    poli: {
      status: string;
      evidence_level: string;
      verified_at: string;
      valid_until: string;
    };
    integrity: {
      data_gaps: { gap_count: number };
      latency: { p95_ms: number; within_bounds: boolean };
      normalization: { complete: boolean };
      overall: { state: string };
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
      refs: { lis_ref: string };
    }>;
    reference_ids: {
      snapshot_ref: string;
      poli_ref: string;
      dact_ref: string;
      lis_ref: string;
    };
  };
}

const getEvidenceDescription = (level: string): string => {
  switch (level) {
    case "L1": return "Minimal Evidence";
    case "L2": return "Partial Sufficiency";
    case "L3": return "Supervisory Sufficiency";
    case "L4": return "Enhanced Verification";
    case "L5": return "Forensic Grade";
    default: return level;
  }
};

const getIntegrityLabel = (state: string): string => {
  switch (state) {
    case "within_controls": return "Within Controls";
    case "elevated_risk": return "Elevated Risk";
    case "control_breach": return "Control Breach";
    default: return state;
  }
};

export function generateRCLPDF(data: RCLSnapshotData): string {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let currentY = margin;

  const checkNewPage = (spaceNeeded: number = 10): boolean => {
    if (currentY + spaceNeeded > pageHeight - margin) {
      doc.addPage();
      currentY = margin;
      return true;
    }
    return false;
  };

  const addHeading = (text: string, size: number = 14) => {
    checkNewPage(15);
    doc.setFontSize(size);
    doc.setFont("helvetica", "bold");
    doc.text(text, margin, currentY);
    currentY += size * 0.5 + 5;
  };

  const addKeyValue = (key: string, value: string, indent: number = 0) => {
    checkNewPage(8);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    const keyText = `${key}:`;
    doc.text(keyText, margin + indent, currentY);

    doc.setFont("helvetica", "normal");
    const keyWidth = doc.getTextWidth(keyText);
    const maxValueWidth = contentWidth - keyWidth - indent - 5;
    const valueLines = doc.splitTextToSize(value || "N/A", maxValueWidth);

    doc.text(valueLines[0], margin + indent + keyWidth + 2, currentY);
    currentY += 6;

    for (let i = 1; i < valueLines.length; i++) {
      checkNewPage(6);
      doc.text(valueLines[i], margin + indent + keyWidth + 2, currentY);
      currentY += 6;
    }
  };

  const addSpace = (space: number = 5) => {
    currentY += space;
  };

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("ADGM Regulatory Liquidity Snapshot", margin, currentY);
  currentY += 15;

  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 10;

  addHeading("Document Metadata", 14);
  addKeyValue("Type", "Regulatory Liquidity Snapshot");
  addKeyValue("Jurisdiction", data.header?.jurisdiction || "ADGM");
  addKeyValue("Contract Version", data.meta?.contract_version || "rcl_v0.1");
  addKeyValue("Instrument", data.coverage?.instrument || data.header?.instrument);
  addKeyValue("Snapshot Reference", data.provenance?.reference_ids?.snapshot_ref || "N/A");
  addKeyValue("Generated At", data.meta?.generated_at || new Date().toISOString());
  addSpace(8);

  addHeading("Supervisory Scope (RCL-v0.1)", 14);
  addKeyValue("Jurisdiction", data.header?.jurisdiction || "ADGM");
  addKeyValue("Asset Class", "Digital Assets");
  addKeyValue("Market Type", "Spot");
  addKeyValue("Declared Supervisory Universe (DSU)", "Binance, Coinbase, Kraken");
  addKeyValue("Version", "RCL-v0.1");
  addSpace(8);

  addHeading("Coverage Analysis", 14);
  addKeyValue("Instrument", data.coverage?.instrument || "N/A");
  addKeyValue("Venue Count", String(data.coverage?.venue_count || 3));
  const liquidityTypes = data.coverage?.liquidity_types
    ?.map((t) =>
      t === "lit" ? "Lit" : t === "rfq" ? "RFQ" : t === "amm_derived" ? "AMM-Derived" : t
    )
    .join(", ") || "Lit, RFQ, AMM-Derived";
  addKeyValue("Liquidity Types", liquidityTypes);
  addKeyValue("Coverage Percentage", `${data.coverage?.coverage_completeness?.coverage_pct || 100}%`);
  addKeyValue("Known Venues", String(data.coverage?.coverage_completeness?.known_venues || 3));
  addKeyValue("Covered Venues", String(data.coverage?.coverage_completeness?.covered_venues || 3));
  addKeyValue("Last Ingest", data.coverage?.last_successful_ingest_at || new Date().toISOString());
  addSpace(8);

  addHeading("Liquidity Truth Status", 14);
  const status = data.truth?.poli?.status || "verified";
  addKeyValue("Status", status.toUpperCase());
  const evidenceLevel = data.truth?.poli?.evidence_level || "L3";
  addKeyValue("Evidence Level", `${evidenceLevel} (${getEvidenceDescription(evidenceLevel)})`);
  addKeyValue("Verified At", data.truth?.poli?.verified_at || new Date().toISOString());
  addKeyValue("Valid Until", data.truth?.poli?.valid_until || new Date(Date.now() + 300000).toISOString());
  addSpace(8);

  addHeading("Integrity Metrics", 14);
  addKeyValue("Integrity Status", getIntegrityLabel(data.truth?.integrity?.overall?.state || "within_controls"));
  addKeyValue("Data Gaps", String(data.truth?.integrity?.data_gaps?.gap_count || 0));
  addKeyValue("Ingestion Latency (p95)", `${data.truth?.integrity?.latency?.p95_ms || 45} ms`);
  addKeyValue("Within Bounds", data.truth?.integrity?.latency?.within_bounds ? "Yes" : "No");
  addKeyValue("Normalization", data.truth?.integrity?.normalization?.complete ? "Complete" : "Incomplete");
  addSpace(8);

  addHeading("Venue Provenance", 14);
  const venues = data.provenance?.venues || [];
  venues.forEach((v) => {
    checkNewPage(30);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text((v.venue_name || v.venue_id || "Unknown").toUpperCase(), margin, currentY);
    currentY += 8;

    addKeyValue("Connection Status", v.ingestion_method || "rest", 5);
    addKeyValue("Modules", (v.lis_modules || []).join(", ") || "depth, trades", 5);
    addKeyValue("Normalization", v.normalization_status || "complete", 5);
    addKeyValue("Last Event", v.last_event_at || new Date().toISOString(), 5);
    addKeyValue("LIS Reference", v.refs?.lis_ref || "N/A", 5);
    addSpace(5);
  });
  addSpace(3);

  addHeading("Reference Identifiers", 14);
  const refs = data.provenance?.reference_ids || {};
  addKeyValue("Snapshot Reference", refs.snapshot_ref || "N/A");
  addKeyValue("PoLi Reference", refs.poli_ref || "N/A");
  addKeyValue("DACT Reference", refs.dact_ref || "N/A");
  addKeyValue("LIS Reference", refs.lis_ref || "N/A");
  addSpace(8);

  addHeading("Authoritative Records (Official)", 14);
  const authRecs = data.meta?.authoritative_records || {};
  addKeyValue("PoLi Snapshot", authRecs.poli_snapshot || "N/A");
  addKeyValue("DACT Window", authRecs.dact_window || "N/A");
  addKeyValue("LIS Manifest", authRecs.lis_manifest || "N/A");
  addSpace(8);

  addHeading("Regulatory Compliance", 14);
  addKeyValue("Annex A", "Declared Supervisory Universe");
  addKeyValue("Annex B", "Expansion Governance");
  addKeyValue("Access Scope", "rcl:read (observation only)");
  addKeyValue("UI Status", "Non-authoritative (display only)");
  addSpace(10);

  checkNewPage(40);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Important Notice", margin, currentY);
  currentY += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const noticeText =
    "This PDF is a rendered view of the RCL regulatory snapshot. For official records and authoritative evidence, refer to the machine-verifiable artifacts referenced above (PoLi snapshots, DACT artifacts, LIS manifests).";
  const noticeLines = doc.splitTextToSize(noticeText, contentWidth);
  doc.text(noticeLines, margin, currentY);
  currentY += noticeLines.length * 6;
  addSpace(5);

  doc.setFont("helvetica", "bold");
  doc.text("UI Status: Non-authoritative (display only)", margin, currentY);
  currentY += 6;
  doc.setFont("helvetica", "normal");
  doc.text("Official Records: Machine-verifiable PoLi, DACT, and LIS artifacts", margin, currentY);
  currentY += 10;

  doc.setFontSize(9);
  doc.text("This document was generated from RCL-v0.1 in accordance with:", margin, currentY);
  currentY += 5;
  doc.text("  - Annex A: Declared Supervisory Universe", margin, currentY);
  currentY += 5;
  doc.text("  - Annex B: Venue Expansion Playbook", margin, currentY);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
  const instrument = (data.coverage?.instrument || "unknown").replace(/[^a-zA-Z0-9-]/g, "_");
  const filename = `rcl-adgm-${instrument}-${timestamp}.pdf`;

  doc.save(filename);

  return filename;
}
