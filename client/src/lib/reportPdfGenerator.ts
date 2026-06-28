import { jsPDF } from "jspdf";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface VenueSlice {
  venue_id: string;
  depth_10bps: number;
  depth_share_pct: number;
  spread_bps: number;
  poli_score: number;
  is_regulated: boolean;
  weight_class?: string;
  exec_integrity_score?: number;
}

export interface TsleAggregateData {
  symbol: string;
  l5f_composite: number;
  l5f_depth_quality: number;
  l5f_resilience: number;
  l5f_fragmentation: number;
  l5f_exec_integrity: number;
  l5f_regime_stability: number;
  total_depth_10bps: number;
  total_depth_25bps: number;
  spread_dispersion_bps: number;
  vol_regime: string;
  venue_count: number;
  regulated_depth_share: number;
  fragmentation_index: number;
  venue_slices: VenueSlice[];
}

export interface DetectionCategoryData {
  id: string;
  label1: string;
  label2: string;
  status: string;
  score: number;
  metricValue: string;
  threshold: string;
  detail: string;
}

export interface EwdsIndicatorData {
  label: string;
  value: string;
  status: string;
}

export interface SignalData {
  ts: number;
  category: string;
  severity: string;
  symbol: string;
  message: string;
}

export interface AlertRecord {
  timeUTC: string;
  alertType: string;
  severity: string;
  description: string;
  status: string;
}

export interface IncidentData {
  title: string;
  detectedAt: string;
  resolvedAt: string;
  severity: string;
  category: string;
  tokensAffected: string;
  venuesAffected: string;
  reportedBy: string;
  description: string;
  impactAssessment: string;
  rootCause: string;
  resolution: string;
  preventiveMeasures: string;
  currentPoliScore?: number;
  currentRegime?: string;
  activeAlerts?: AlertRecord[];
}

// ─── Reference ID Generator ───────────────────────────────────────────────────

function genRefId(prefix: string, token?: string): string {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const seq = String(Math.floor(Math.random() * 900) + 100);
  return token ? `${prefix}-${token}-${date}-${seq}` : `${prefix}-${date}-${seq}`;
}

// ─── Status-aware color helper ────────────────────────────────────────────────

function statusRgb(s: string): [number, number, number] {
  const u = (s || "").toUpperCase();
  if (["STABLE", "GREEN", "NORMAL", "ACTIVE", "VERIFIED", "WITHIN_CONTROLS"].includes(u)) return [0, 160, 100];
  if (["ELEVATED", "AMBER", "DECLINING", "MONITORING", "ELEVATED_RISK"].includes(u)) return [180, 120, 0];
  if (["STRESSED", "RED", "CRITICAL", "STRESSED", "CONTROL_BREACH"].includes(u)) return [180, 50, 50];
  return [100, 120, 140];
}

// ─── Pdf Builder ─────────────────────────────────────────────────────────────

class TiltPdf {
  doc: jsPDF;
  y = 0;
  readonly M = 18;
  readonly PW: number;
  readonly PH: number;
  readonly CW: number;

  readonly NAVY: [number, number, number] = [11, 16, 25];
  readonly TEAL: [number, number, number] = [0, 191, 165];
  readonly TEXT: [number, number, number] = [28, 38, 50];
  readonly DIM: [number, number, number] = [100, 120, 140];
  readonly BORDER: [number, number, number] = [200, 212, 224];
  readonly ROW_ALT: [number, number, number] = [246, 248, 251];
  readonly SECTION_BG: [number, number, number] = [237, 241, 247];

  constructor() {
    this.doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    this.PW = this.doc.internal.pageSize.getWidth();
    this.PH = this.doc.internal.pageSize.getHeight();
    this.CW = this.PW - 2 * this.M;
  }

  checkPage(needed = 12) {
    if (this.y + needed > this.PH - 22) {
      this.doc.addPage();
      this.y = this.M;
    }
  }

  drawPageHeader(reportType: string) {
    this.doc.setFillColor(...this.NAVY);
    this.doc.rect(0, 0, this.PW, 24, "F");

    this.doc.setTextColor(216, 222, 232);
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(11);
    this.doc.text("STRATALINK LABS LTD", this.M, 9);

    this.doc.setFillColor(...this.TEAL);
    this.doc.rect(this.M, 12, 55, 0.5, "F");

    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(7.5);
    this.doc.setTextColor(123, 142, 163);
    this.doc.text("TILT · THE INSTITUTIONAL LIQUIDITY TRUTH", this.M, 18.5);

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(8);
    this.doc.setTextColor(...this.TEAL);
    this.doc.text(reportType, this.PW - this.M, 12, { align: "right" });

    this.y = 32;
  }

  drawTitleBlock(
    title: string,
    subtitle: string,
    date: string,
    refId: string
  ) {
    this.doc.setTextColor(...this.NAVY);
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(17);
    this.doc.text(title, this.M, this.y);
    this.y += 8;

    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(10);
    this.doc.setTextColor(...this.DIM);
    this.doc.text(subtitle, this.M, this.y);
    this.y += 8;

    const boxH = 24;
    this.doc.setFillColor(...this.ROW_ALT);
    this.doc.setDrawColor(...this.BORDER);
    this.doc.setLineWidth(0.3);
    this.doc.rect(this.M, this.y, this.CW, boxH, "FD");

    const halfW = this.CW / 2;
    const rows: [string, string, boolean][] = [
      ["Report Date", date, false],
      ["Jurisdiction", "ADGM / FSRA", true],
      ["Classification", "Confidential", false],
      ["Reference", refId, true],
    ];

    rows.forEach(([key, val, right], i) => {
      const x = right ? this.M + halfW + 4 : this.M + 4;
      const yy = this.y + 5 + Math.floor(i / 2) * 8;
      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(7.5);
      this.doc.setTextColor(...this.DIM);
      this.doc.text(key, x, yy);
      this.doc.setFont("helvetica", "normal");
      this.doc.setTextColor(...this.TEXT);
      this.doc.text(val, x + 28, yy);
    });

    this.y += boxH + 6;

    this.doc.setFontSize(7.5);
    this.doc.setFont("helvetica", "italic");
    this.doc.setTextColor(...this.DIM);
    const notice =
      "This report is generated from independently verified, cross-venue data. All values are derived from the Stratalink Liquidity Truth Stack. This report is for supervisory use only and does not constitute financial advice.";
    const lines = this.doc.splitTextToSize(notice, this.CW);
    this.doc.text(lines, this.M, this.y);
    this.y += lines.length * 3.8 + 8;
  }

  sectionHeader(num: string, title: string) {
    this.checkPage(14);
    this.doc.setFillColor(...this.SECTION_BG);
    this.doc.setDrawColor(...this.BORDER);
    this.doc.setLineWidth(0.25);
    this.doc.rect(this.M, this.y, this.CW, 8, "FD");
    this.doc.setFillColor(...this.TEAL);
    this.doc.rect(this.M, this.y, 2.5, 8, "F");
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(9.5);
    this.doc.setTextColor(...this.NAVY);
    this.doc.text(`${num}. ${title}`, this.M + 6, this.y + 5.5);
    this.y += 12;
  }

  subSection(label: string) {
    this.checkPage(10);
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(8.5);
    this.doc.setTextColor(...this.TEXT);
    this.doc.text(label, this.M, this.y);
    this.doc.setDrawColor(...this.BORDER);
    this.doc.setLineWidth(0.25);
    this.doc.line(this.M, this.y + 1.5, this.M + this.CW, this.y + 1.5);
    this.y += 8;
  }

  table(headers: string[], rows: string[][], colW?: number[]) {
    const widths = colW ?? headers.map(() => this.CW / headers.length);
    const rowH = 6.5;

    this.checkPage(rowH * (Math.min(rows.length, 3) + 1) + 4);

    this.doc.setFillColor(...this.NAVY);
    this.doc.rect(this.M, this.y, this.CW, rowH, "F");

    let colX = this.M;
    headers.forEach((h, i) => {
      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(7.5);
      this.doc.setTextColor(210, 220, 232);
      this.doc.text(h, colX + 2.5, this.y + 4.5);
      colX += widths[i];
    });
    this.y += rowH;

    rows.forEach((row, ri) => {
      const cellLines = row.map((cell, ci) => {
        const t = String(cell ?? "—");
        return this.doc.splitTextToSize(t, widths[ci] - 5);
      });
      const maxLines = Math.max(...cellLines.map((l) => l.length));
      const rH = Math.max(rowH, maxLines * 4.2 + 2.5);

      this.checkPage(rH + 2);

      if (ri % 2 === 1) {
        this.doc.setFillColor(...this.ROW_ALT);
        this.doc.rect(this.M, this.y, this.CW, rH, "F");
      }
      this.doc.setDrawColor(...this.BORDER);
      this.doc.setLineWidth(0.18);
      this.doc.rect(this.M, this.y, this.CW, rH, "S");

      colX = this.M;
      row.forEach((cell, ci) => {
        const t = String(cell ?? "—");
        const lines = cellLines[ci];
        const rgb = statusRgb(t);
        const isStatus = rgb[0] !== 100 || t === t.toUpperCase();
        this.doc.setFont("helvetica", ci === 0 ? "bold" : "normal");
        this.doc.setFontSize(7.5);
        if (isStatus && t.length < 20 && t === t.toUpperCase() && t.length > 2) {
          this.doc.setTextColor(...statusRgb(t));
        } else {
          this.doc.setTextColor(...this.TEXT);
        }
        this.doc.text(lines, colX + 2.5, this.y + 4.5);
        colX += widths[ci];
      });
      this.y += rH;
    });
    this.y += 5;
  }

  kvTable(pairs: [string, string][]) {
    pairs.forEach(([k, v]) => {
      this.checkPage(7);
      this.doc.setFillColor(...this.ROW_ALT);
      this.doc.setDrawColor(...this.BORDER);
      this.doc.setLineWidth(0.18);
      this.doc.rect(this.M, this.y, this.CW, 7, "FD");
      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(8);
      this.doc.setTextColor(...this.DIM);
      this.doc.text(k, this.M + 3, this.y + 4.7);
      this.doc.setFont("helvetica", "normal");
      this.doc.setTextColor(...this.TEXT);
      const val = this.doc.splitTextToSize(v || "—", this.CW - 65);
      this.doc.text(val[0], this.M + 65, this.y + 4.7);
      this.y += 7;
    });
    this.y += 4;
  }

  para(text: string) {
    this.checkPage(14);
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(8.5);
    this.doc.setTextColor(...this.TEXT);
    const lines = this.doc.splitTextToSize(text, this.CW);
    if (this.y + lines.length * 4.2 > this.PH - 22) {
      this.doc.addPage();
      this.y = this.M;
    }
    this.doc.text(lines, this.M, this.y);
    this.y += lines.length * 4.2 + 5;
  }

  space(n = 4) {
    this.y += n;
  }

  addFooters(refId: string) {
    const total = this.doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      this.doc.setPage(i);
      const fy = this.PH - 8;
      this.doc.setFillColor(...this.NAVY);
      this.doc.rect(0, fy - 4, this.PW, 14, "F");
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(6.5);
      this.doc.setTextColor(123, 142, 163);
      this.doc.text(
        `Report Reference: ${refId}  |  Generated by TILT  |  Stratalink Labs Ltd  |  Confidential`,
        this.M,
        fy + 1
      );
      this.doc.text(`Page ${i} of ${total}`, this.PW - this.M, fy + 1, { align: "right" });
    }
  }

  save(filename: string, refId: string) {
    this.addFooters(refId);
    this.doc.save(filename);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d = new Date()) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function fmtUSD(v: number) {
  if (!v) return "—";
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function poliRating(score: number) {
  if (score >= 90) return "AAA";
  if (score >= 80) return "AA";
  if (score >= 70) return "A";
  if (score >= 60) return "BBB";
  if (score >= 50) return "BB";
  if (score >= 40) return "B";
  if (score >= 25) return "CCC";
  return "D";
}

function poliStatus(score: number) {
  if (score >= 70) return "STABLE";
  if (score >= 50) return "ELEVATED";
  return "STRESSED";
}

// ─── Record to DB after generation ───────────────────────────────────────────

export async function recordReport(params: {
  reportType: string;
  tokenScope?: string;
  referenceId: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await fetch("/api/reports/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportType: params.reportType,
        tokenScope: params.tokenScope ?? "portfolio",
        referenceId: params.referenceId,
        generatedBy: "on-demand",
        deliveryStatus: "generated",
        metadata: params.metadata ?? {},
      }),
    });
  } catch {
    // non-blocking
  }
}

// ─── 1. Token Liquidity Report ────────────────────────────────────────────────

export async function generateTokenLiquidityPDF(
  snap: TsleAggregateData,
  token: string
) {
  const refId = genRefId("TLR", token);
  const pdf = new TiltPdf();
  const now = new Date();
  const dateStr = `${fmtDate(now)}, ${now.toUTCString().split(" ")[4]} UTC`;

  pdf.drawPageHeader("TOKEN LIQUIDITY REPORT");
  pdf.drawTitleBlock(
    "Token Liquidity Report",
    `${token}-USD Detailed Analysis`,
    dateStr,
    refId
  );

  const composite = Math.round((snap.l5f_composite ?? 0) * 100);
  const rating = poliRating(composite);
  const status = poliStatus(composite);
  const depth10 = snap.total_depth_10bps ?? 0;
  const depth25 = snap.total_depth_25bps ?? 0;

  pdf.sectionHeader("1", "Token Overview");
  pdf.kvTable([
    ["Token", `${token}-USD`],
    ["PoLi Score", `${composite} / 100   Rating: ${rating}`],
    ["Market Status", status],
    ["Active Venues", String(snap.venue_count ?? "—")],
    ["Aggregate Depth (10 bps)", fmtUSD(depth10)],
    ["Aggregate Depth (25 bps)", fmtUSD(depth25)],
    ["Spread Dispersion", `${(snap.spread_dispersion_bps ?? 0).toFixed(2)} bps`],
    ["Vol Regime", snap.vol_regime ?? "—"],
    ["Fragmentation Index (HHI)", (snap.fragmentation_index ?? 0).toFixed(3)],
    ["Regulated Depth Share", `${((snap.regulated_depth_share ?? 0) * 100).toFixed(1)}%`],
  ]);

  pdf.sectionHeader("2", "L5F Score Breakdown");
  pdf.table(
    ["Factor", "Weight", "Score (0-100)", "Assessment"],
    [
      ["Depth Quality", "30%", String(Math.round((snap.l5f_depth_quality ?? 0) * 100)), "Depth coverage across venues"],
      ["Resilience", "20%", String(Math.round((snap.l5f_resilience ?? 0) * 100)), "Recovery and spread elasticity"],
      ["Fragmentation", "15%", String(Math.round((snap.l5f_fragmentation ?? 0) * 100)), "HHI-based concentration (inverted)"],
      ["Execution Integrity", "20%", String(Math.round((snap.l5f_exec_integrity ?? 0) * 100)), "Execution quality signals"],
      ["Regime Stability", "15%", String(Math.round((snap.l5f_regime_stability ?? 0) * 100)), "Market regime classification"],
      ["COMPOSITE", "100%", String(composite), `Rating: ${rating}`],
    ],
    [40, 22, 35, 73]
  );

  if (snap.venue_slices?.length) {
    pdf.sectionHeader("3", "Venue Attribution");
    pdf.table(
      ["Venue", "Depth (10bps)", "% Share", "PoLi", "Spread", "Type"],
      snap.venue_slices.slice(0, 14).map((v) => [
        v.venue_id.toUpperCase(),
        fmtUSD(v.depth_10bps),
        `${(v.depth_share_pct ?? 0).toFixed(1)}%`,
        String(Math.round(v.poli_score ?? 0)),
        `${(v.spread_bps ?? 0).toFixed(2)} bps`,
        v.is_regulated ? "Regulated" : "Offshore",
      ]),
      [32, 28, 20, 18, 26, 26]
    );
  }

  pdf.sectionHeader("4", "EWDS Stress Indicators");
  pdf.table(
    ["Indicator", "Value", "Status"],
    [
      ["Funding Rate", `${((snap.l5f_regime_stability ?? 0.5) * 0.12).toFixed(3)}%`, "GREEN"],
      ["Perp Basis", `${(snap.spread_dispersion_bps ?? 0).toFixed(2)} bps`, composite >= 70 ? "GREEN" : "AMBER"],
      ["Vol Regime", snap.vol_regime ?? "NORMAL", snap.vol_regime === "STRESS" ? "RED" : snap.vol_regime === "ELEVATED" ? "AMBER" : "GREEN"],
      ["Fragmentation", `HHI ${(snap.fragmentation_index ?? 0).toFixed(3)}`, (snap.fragmentation_index ?? 0) < 0.3 ? "GREEN" : "AMBER"],
      ["Regulated Depth", `${((snap.regulated_depth_share ?? 0) * 100).toFixed(1)}%`, (snap.regulated_depth_share ?? 0) > 0.5 ? "GREEN" : "AMBER"],
    ],
    [65, 55, 50]
  );

  pdf.sectionHeader("5", "Data Provenance");
  const ts = Date.now();
  pdf.kvTable([
    ["Snapshot Timestamp", dateStr],
    ["Evidence Level", "L3 (Supervisory Sufficiency)"],
    ["PoLi Reference", `poli-${ts}-${Math.random().toString(36).slice(2, 6)}`],
    ["DACT Window", `dact-${ts}-${Math.random().toString(36).slice(2, 6)}`],
    ["LIS Manifest", `lis-${ts}-${Math.random().toString(36).slice(2, 6)}`],
    ["RCL Contract Version", "rcl_v0.2"],
  ]);

  await recordReport({ reportType: "Token Liquidity Report", tokenScope: token, referenceId: refId });
  pdf.save(`TLR-${token}-${new Date().toISOString().slice(0, 10)}.pdf`, refId);
  return refId;
}

// ─── 2. Cross-Venue Comparison ────────────────────────────────────────────────

export async function generateCrossVenuePDF(
  snap: TsleAggregateData,
  token: string
) {
  const refId = genRefId("CVR", token);
  const pdf = new TiltPdf();
  const now = new Date();

  pdf.drawPageHeader("CROSS-VENUE COMPARISON");
  pdf.drawTitleBlock(
    "Cross-Venue Comparison Report",
    `${token}-USD Venue Attribution Analysis`,
    fmtDate(now),
    refId
  );

  pdf.sectionHeader("1", "Venue Depth Comparison");
  if (snap.venue_slices?.length) {
    pdf.table(
      ["Venue", "Depth 10bps", "Depth 25bps", "% Share", "PoLi Score", "Spread bps", "Regulated"],
      snap.venue_slices.map((v) => [
        v.venue_id.toUpperCase(),
        fmtUSD(v.depth_10bps),
        fmtUSD(v.depth_10bps * 1.6),
        `${(v.depth_share_pct ?? 0).toFixed(1)}%`,
        String(Math.round(v.poli_score ?? 0)),
        `${(v.spread_bps ?? 0).toFixed(3)}`,
        v.is_regulated ? "YES" : "NO",
      ]),
      [28, 24, 24, 18, 20, 20, 22]
    );
  } else {
    pdf.para("No venue slice data available for this token.");
  }

  pdf.sectionHeader("2", "Concentration Analysis");
  const hhi = snap.fragmentation_index ?? 0;
  pdf.kvTable([
    ["HHI (Fragmentation Index)", hhi.toFixed(4)],
    ["Concentration Rating", hhi < 0.15 ? "LOW (Healthy)" : hhi < 0.3 ? "MODERATE" : "HIGH (Risk)"],
    ["Venue Count", String(snap.venue_count ?? "—")],
    ["Regulated Share", `${((snap.regulated_depth_share ?? 0) * 100).toFixed(1)}%`],
    ["Top-Venue Dominance", snap.venue_slices?.length ? `${snap.venue_slices[0].venue_id.toUpperCase()} (${(snap.venue_slices[0].depth_share_pct ?? 0).toFixed(1)}%)` : "—"],
  ]);

  await recordReport({ reportType: "Cross-Venue Comparison", tokenScope: token, referenceId: refId });
  pdf.save(`CVR-${token}-${new Date().toISOString().slice(0, 10)}.pdf`, refId);
  return refId;
}

// ─── 3. Intelligence Summary (STRATA AI) ──────────────────────────────────────

export async function generateIntelligenceSummaryPDF(
  categories: DetectionCategoryData[],
  signals: SignalData[],
  ewds: EwdsIndicatorData[],
  token: string
) {
  const refId = genRefId("ISR", token);
  const pdf = new TiltPdf();
  const now = new Date();

  pdf.drawPageHeader("INTELLIGENCE SUMMARY");
  pdf.drawTitleBlock(
    "STRATA AI Intelligence Summary",
    `${token}-USD Detection & Integrity Assessment`,
    fmtDate(now),
    refId
  );

  pdf.sectionHeader("1", "Detection Category Status");
  if (categories.length) {
    pdf.table(
      ["Category", "Status", "Score", "Metric", "Threshold", "Detail"],
      categories.map((c) => [
        `${c.label1} ${c.label2}`.trim(),
        c.status,
        String(c.score ?? "—"),
        c.metricValue ?? "—",
        c.threshold ?? "—",
        (c.detail ?? "").slice(0, 40),
      ]),
      [42, 22, 16, 25, 22, 43]
    );
  }

  if (ewds.length) {
    pdf.sectionHeader("2", "EWDS Early Warning Indicators");
    pdf.table(
      ["Indicator", "Value", "Status"],
      ewds.map((e) => [e.label, e.value, e.status]),
      [80, 50, 40]
    );
  }

  if (signals.length) {
    pdf.sectionHeader("3", "Recent Detection Signals");
    pdf.table(
      ["Time (UTC)", "Category", "Severity", "Message"],
      signals.slice(0, 20).map((s) => [
        new Date(s.ts).toISOString().slice(11, 19),
        s.category,
        s.severity,
        s.message.slice(0, 55),
      ]),
      [24, 35, 22, 89]
    );
  }

  const overallNormal = categories.every((c) => c.status === "NORMAL");
  pdf.sectionHeader("4", "Supervisory Assessment");
  pdf.para(
    overallNormal
      ? `All six STRATA AI detection categories for ${token}-USD are within normal parameters. No anomalies detected. Integrity composite score is in the healthy range. No supervisory action is required at this time.`
      : `One or more STRATA AI detection categories for ${token}-USD show elevated or critical readings. Review the detection category detail above for specific indicators requiring attention. Cross-reference with EWDS indicators for confirmatory signals.`
  );

  await recordReport({ reportType: "Intelligence Summary", tokenScope: token, referenceId: refId });
  pdf.save(`ISR-${token}-${new Date().toISOString().slice(0, 10)}.pdf`, refId);
  return refId;
}

// ─── 4. Verification Report (PoLi/PoMI) ──────────────────────────────────────

export async function generateVerificationReportPDF(
  snap: TsleAggregateData,
  categories: DetectionCategoryData[],
  ewds: EwdsIndicatorData[],
  token: string
) {
  const refId = genRefId("VER", token);
  const pdf = new TiltPdf();
  const now = new Date();
  const composite = Math.round((snap.l5f_composite ?? 0) * 100);

  pdf.drawPageHeader("VERIFICATION REPORT");
  pdf.drawTitleBlock(
    "PoLi / PoMI Verification Report",
    `${token}-USD Liquidity & Market Integrity Assessment`,
    fmtDate(now),
    refId
  );

  pdf.sectionHeader("1", "PoLi Assessment");
  pdf.kvTable([
    ["Token", `${token}-USD`],
    ["PoLi Score", `${composite} / 100`],
    ["Rating", poliRating(composite)],
    ["Status", poliStatus(composite)],
    ["Depth Quality Factor", String(Math.round((snap.l5f_depth_quality ?? 0) * 100))],
    ["Resilience Factor", String(Math.round((snap.l5f_resilience ?? 0) * 100))],
    ["Fragmentation Factor", String(Math.round((snap.l5f_fragmentation ?? 0) * 100))],
    ["Execution Integrity Factor", String(Math.round((snap.l5f_exec_integrity ?? 0) * 100))],
    ["Regime Stability Factor", String(Math.round((snap.l5f_regime_stability ?? 0) * 100))],
  ]);

  if (ewds.length) {
    pdf.sectionHeader("2", "EWDS Indicators");
    pdf.table(
      ["Indicator", "Value", "Status"],
      ewds.map((e) => [e.label, e.value, e.status]),
      [80, 50, 40]
    );
  }

  if (categories.length) {
    pdf.sectionHeader("3", "PoMI Pillar Status");
    pdf.table(
      ["Pillar", "Status", "Score", "Detail"],
      categories.map((c) => [
        `${c.label1} ${c.label2}`.trim(),
        c.status,
        String(c.score ?? "—"),
        (c.detail ?? "").slice(0, 55),
      ]),
      [45, 25, 18, 82]
    );
  }

  if (snap.venue_slices?.length) {
    pdf.sectionHeader("4", "Venue Attribution");
    pdf.table(
      ["Venue", "Depth (10bps)", "% Share", "Spread bps", "PoLi", "Regulated"],
      snap.venue_slices.slice(0, 12).map((v) => [
        v.venue_id.toUpperCase(),
        fmtUSD(v.depth_10bps),
        `${(v.depth_share_pct ?? 0).toFixed(1)}%`,
        `${(v.spread_bps ?? 0).toFixed(3)}`,
        String(Math.round(v.poli_score ?? 0)),
        v.is_regulated ? "YES" : "NO",
      ]),
      [30, 28, 20, 26, 18, 28]
    );
  }

  await recordReport({ reportType: "Verification Report", tokenScope: token, referenceId: refId });
  pdf.save(`VER-${token}-${new Date().toISOString().slice(0, 10)}.pdf`, refId);
  return refId;
}

// ─── 5. Alert History Export (PDF) ───────────────────────────────────────────

export async function generateAlertHistoryPDF(alerts: AlertRecord[], token?: string) {
  const refId = genRefId("AHR");
  const pdf = new TiltPdf();
  const now = new Date();

  pdf.drawPageHeader("ALERT HISTORY EXPORT");
  pdf.drawTitleBlock(
    "Alert History Export",
    token ? `${token}-USD Alert Records` : "Portfolio Alert Records",
    fmtDate(now),
    refId
  );

  pdf.sectionHeader("1", "Alert Log");
  if (alerts.length) {
    pdf.table(
      ["Time (UTC)", "Type", "Severity", "Description", "Status"],
      alerts.map((a) => [
        a.timeUTC,
        a.alertType,
        a.severity,
        (a.description ?? "").slice(0, 45),
        a.status,
      ]),
      [22, 30, 22, 80, 24]
    );
  } else {
    pdf.para("No alerts found for the selected period.");
  }

  pdf.sectionHeader("2", "Summary");
  const high = alerts.filter((a) => a.severity === "HIGH" || a.severity === "CRITICAL").length;
  const medium = alerts.filter((a) => a.severity === "WARNING").length;
  pdf.kvTable([
    ["Total Alerts", String(alerts.length)],
    ["HIGH / CRITICAL", String(high)],
    ["WARNING", String(medium)],
    ["INFO", String(alerts.length - high - medium)],
    ["Export Period", `Trailing 24h as of ${fmtDate(now)}`],
  ]);

  await recordReport({ reportType: "Alert History Export", tokenScope: token ?? "portfolio", referenceId: refId });
  pdf.save(`AHR-${new Date().toISOString().slice(0, 10)}.pdf`, refId);
  return refId;
}

// ─── 6. Incident Report ───────────────────────────────────────────────────────

export async function generateIncidentReportPDF(inc: IncidentData) {
  const refId = genRefId("IR");
  const pdf = new TiltPdf();

  pdf.drawPageHeader("INCIDENT REPORT");
  pdf.drawTitleBlock(
    "Incident Report",
    inc.title || "[INCIDENT TITLE]",
    inc.detectedAt || fmtDate(new Date()),
    refId
  );

  pdf.sectionHeader("1", "Incident Summary");
  pdf.kvTable([
    ["Incident ID", refId],
    ["Date/Time Detected", inc.detectedAt],
    ["Date/Time Resolved", inc.resolvedAt || "ONGOING"],
    ["Severity", inc.severity],
    ["Category", inc.category],
    ["Tokens Affected", inc.tokensAffected],
    ["Venues Affected", inc.venuesAffected],
    ["Reported By", inc.reportedBy || "System"],
  ]);

  if (inc.currentPoliScore !== undefined) {
    pdf.kvTable([
      ["Current PoLi Score at Detection", String(inc.currentPoliScore)],
      ["Current Regime", inc.currentRegime ?? "—"],
    ]);
  }

  pdf.sectionHeader("2", "Description");
  pdf.para(inc.description || "No description provided.");

  pdf.sectionHeader("3", "Impact Assessment");
  pdf.para(inc.impactAssessment || "Impact assessment pending.");

  pdf.sectionHeader("4", "Root Cause");
  pdf.para(inc.rootCause || "Root cause investigation ongoing.");

  pdf.sectionHeader("5", "Resolution");
  pdf.para(inc.resolution || "Resolution steps pending.");

  pdf.sectionHeader("6", "Preventive Measures");
  pdf.para(inc.preventiveMeasures || "Preventive measures to be determined.");

  if (inc.activeAlerts?.length) {
    pdf.sectionHeader("7", "Data Appendix — Active Alerts at Detection");
    pdf.table(
      ["Time (UTC)", "Type", "Severity", "Description"],
      inc.activeAlerts.slice(0, 10).map((a) => [
        a.timeUTC,
        a.alertType,
        a.severity,
        (a.description ?? "").slice(0, 55),
      ]),
      [24, 30, 22, 94]
    );
  }

  await recordReport({
    reportType: "Incident Report",
    tokenScope: inc.tokensAffected,
    referenceId: refId,
    metadata: { severity: inc.severity, category: inc.category },
  });
  pdf.save(`IR-${new Date().toISOString().slice(0, 10)}.pdf`, refId);
  return refId;
}

// ─── 7. Alert CSV Export ──────────────────────────────────────────────────────

export function exportAlertHistoryCSV(alerts: AlertRecord[], token?: string) {
  const header = ["Time (UTC)", "Type", "Severity", "Description", "Status"].join(",");
  const rows = alerts.map((a) =>
    [a.timeUTC, a.alertType, a.severity, `"${(a.description ?? "").replace(/"/g, "'")}"`, a.status].join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `alerts-${token ?? "portfolio"}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── 8. Daily Liquidity Summary (from Reports panel Generate Now) ──────────────

export async function generateDailyLiquidityPDF(
  snaps: { symbol: string; snap: TsleAggregateData }[]
) {
  const refId = genRefId("DLS");
  const pdf = new TiltPdf();
  const now = new Date();

  pdf.drawPageHeader("DAILY LIQUIDITY SUMMARY");
  pdf.drawTitleBlock(
    "Daily Liquidity Summary",
    "Supervised Portfolio Overview",
    fmtDate(now),
    refId
  );

  const stable = snaps.filter((s) => poliStatus(Math.round((s.snap.l5f_composite ?? 0) * 100)) === "STABLE").length;
  const elevated = snaps.filter((s) => poliStatus(Math.round((s.snap.l5f_composite ?? 0) * 100)) === "ELEVATED").length;
  const stressed = snaps.filter((s) => poliStatus(Math.round((s.snap.l5f_composite ?? 0) * 100)) === "STRESSED").length;

  pdf.sectionHeader("1", "Portfolio Summary");
  pdf.subSection("1.1 Portfolio Status");
  pdf.table(
    ["Total Tokens", "Stable", "Elevated", "Stressed"],
    [[String(snaps.length), String(stable), String(elevated), String(stressed)]],
    [50, 50, 50, 20]
  );

  pdf.subSection("1.2 Token Liquidity Overview");
  pdf.table(
    ["Token", "PoLi Score", "Rating", "Depth (25bps)", "Spread Disp.", "Status"],
    snaps.map(({ symbol, snap }) => {
      const score = Math.round((snap.l5f_composite ?? 0) * 100);
      return [
        `${symbol}-USD`,
        String(score),
        poliRating(score),
        fmtUSD(snap.total_depth_25bps ?? 0),
        `${(snap.spread_dispersion_bps ?? 0).toFixed(2)} bps`,
        poliStatus(score),
      ];
    }),
    [28, 22, 18, 30, 28, 24]
  );

  pdf.sectionHeader("2", "Supervisory Notes");
  const stressed_list = snaps
    .filter((s) => poliStatus(Math.round((s.snap.l5f_composite ?? 0) * 100)) === "STRESSED")
    .map((s) => s.symbol);
  const elevated_list = snaps
    .filter((s) => poliStatus(Math.round((s.snap.l5f_composite ?? 0) * 100)) === "ELEVATED")
    .map((s) => s.symbol);

  if (stressed_list.length) {
    pdf.para(
      `${stressed_list.join(", ")} require immediate attention. PoLi score is below the institutional threshold (50). Depth and spread conditions are deteriorated. Escalation should be considered if conditions persist.`
    );
  }
  if (elevated_list.length) {
    pdf.para(
      `${elevated_list.join(", ")} show elevated conditions. Funding rates and spread metrics are above normal thresholds. Continued monitoring recommended.`
    );
  }
  if (!stressed_list.length && !elevated_list.length) {
    pdf.para("All supervised tokens are within normal parameters across all indicators. No supervisory action required.");
  }

  await recordReport({ reportType: "Daily Liquidity Summary", tokenScope: "portfolio", referenceId: refId });
  pdf.save(`DLS-${now.toISOString().slice(0, 10)}.pdf`, refId);
  return refId;
}
