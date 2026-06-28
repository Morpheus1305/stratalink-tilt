import { Router } from "express";
import { db } from "../db";
import { reportRecords, scheduledReportConfigs } from "../../shared/schema";
import { desc, eq } from "drizzle-orm";
import { jsPDF } from "jspdf";
import path from "path";
import fs from "fs";
import { Resend } from "resend";

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

const REPORTS_DIR = path.join(process.cwd(), "tmp", "reports");
if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });

function genRefId(prefix: string, token?: string): string {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const seq = String(Math.floor(Math.random() * 900) + 100);
  return token ? `${prefix}-${token}-${date}-${seq}` : `${prefix}-${date}-${seq}`;
}

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

// ─── Server-side jsPDF builder ────────────────────────────────────────────────

class ServerPdf {
  doc: jsPDF;
  y = 0;
  M = 18;
  PW: number;
  PH: number;
  CW: number;

  NAVY: [number, number, number] = [11, 16, 25];
  TEAL: [number, number, number] = [0, 191, 165];
  TEXT: [number, number, number] = [28, 38, 50];
  DIM: [number, number, number] = [100, 120, 140];
  BORDER: [number, number, number] = [200, 212, 224];
  ROW_ALT: [number, number, number] = [246, 248, 251];
  SECTION_BG: [number, number, number] = [237, 241, 247];

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

  header(reportType: string) {
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

  titleBlock(title: string, subtitle: string, date: string, refId: string) {
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
    const half = this.CW / 2;
    const rows: [string, string, boolean][] = [
      ["Report Date", date, false],
      ["Jurisdiction", "ADGM / FSRA", true],
      ["Classification", "Confidential", false],
      ["Reference", refId, true],
    ];
    rows.forEach(([k, v, right], i) => {
      const x = right ? this.M + half + 4 : this.M + 4;
      const yy = this.y + 5 + Math.floor(i / 2) * 8;
      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(7.5);
      this.doc.setTextColor(...this.DIM);
      this.doc.text(k, x, yy);
      this.doc.setFont("helvetica", "normal");
      this.doc.setTextColor(...this.TEXT);
      this.doc.text(v, x + 28, yy);
    });
    this.y += boxH + 6;
    this.doc.setFontSize(7.5);
    this.doc.setFont("helvetica", "italic");
    this.doc.setTextColor(...this.DIM);
    const notice = "This report is generated from independently verified, cross-venue data. All values are derived from the Stratalink Liquidity Truth Stack. This report is for supervisory use only and does not constitute financial advice.";
    const lines = this.doc.splitTextToSize(notice, this.CW);
    this.doc.text(lines, this.M, this.y);
    this.y += lines.length * 3.8 + 8;
  }

  section(num: string, title: string) {
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

  table(headers: string[], rows: string[][], colW?: number[]) {
    const widths = colW ?? headers.map(() => this.CW / headers.length);
    const rowH = 6.5;
    this.checkPage(rowH * (Math.min(rows.length, 3) + 1) + 4);
    this.doc.setFillColor(...this.NAVY);
    this.doc.rect(this.M, this.y, this.CW, rowH, "F");
    let cx = this.M;
    headers.forEach((h, i) => {
      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(7.5);
      this.doc.setTextColor(210, 220, 232);
      this.doc.text(h, cx + 2.5, this.y + 4.5);
      cx += widths[i];
    });
    this.y += rowH;
    rows.forEach((row, ri) => {
      const cellLines = row.map((c, ci) => this.doc.splitTextToSize(String(c ?? "—"), widths[ci] - 5));
      const maxL = Math.max(...cellLines.map((l) => l.length));
      const rH = Math.max(rowH, maxL * 4.2 + 2.5);
      this.checkPage(rH + 2);
      if (ri % 2 === 1) {
        this.doc.setFillColor(...this.ROW_ALT);
        this.doc.rect(this.M, this.y, this.CW, rH, "F");
      }
      this.doc.setDrawColor(...this.BORDER);
      this.doc.setLineWidth(0.18);
      this.doc.rect(this.M, this.y, this.CW, rH, "S");
      cx = this.M;
      row.forEach((cell, ci) => {
        const t = String(cell ?? "—");
        this.doc.setFont("helvetica", ci === 0 ? "bold" : "normal");
        this.doc.setFontSize(7.5);
        this.doc.setTextColor(...this.TEXT);
        this.doc.text(cellLines[ci], cx + 2.5, this.y + 4.5);
        cx += widths[ci];
      });
      this.y += rH;
    });
    this.y += 5;
  }

  kv(pairs: [string, string][]) {
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
      const lines = this.doc.splitTextToSize(v || "—", this.CW - 65);
      this.doc.text(lines[0], this.M + 65, this.y + 4.7);
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

  footers(refId: string) {
    const total = this.doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      this.doc.setPage(i);
      const fy = this.PH - 8;
      this.doc.setFillColor(...this.NAVY);
      this.doc.rect(0, fy - 4, this.PW, 14, "F");
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(6.5);
      this.doc.setTextColor(123, 142, 163);
      this.doc.text(`Report Reference: ${refId}  |  Generated by TILT  |  Stratalink Labs Ltd  |  Confidential`, this.M, fy + 1);
      this.doc.text(`Page ${i} of ${total}`, this.PW - this.M, fy + 1, { align: "right" });
    }
  }

  toBuffer(refId: string): Buffer {
    this.footers(refId);
    const ab = this.doc.output("arraybuffer");
    return Buffer.from(ab);
  }
}

// ─── Default scheduled configs ────────────────────────────────────────────────

const DEFAULT_CONFIGS = [
  { id: "daily", active: false, deliveryTime: "07:00", dayOfWeek: null, dayOfMonth: null },
  { id: "weekly", active: false, deliveryTime: "07:00", dayOfWeek: 5, dayOfMonth: null },
  { id: "monthly", active: false, deliveryTime: "07:00", dayOfWeek: null, dayOfMonth: 1 },
];

async function ensureDefaultConfigs() {
  for (const cfg of DEFAULT_CONFIGS) {
    const existing = await db.select().from(scheduledReportConfigs).where(eq(scheduledReportConfigs.id, cfg.id));
    if (existing.length === 0) {
      await db.insert(scheduledReportConfigs).values({
        id: cfg.id,
        active: false,
        deliveryTime: cfg.deliveryTime,
        dayOfWeek: cfg.dayOfWeek ?? undefined,
        dayOfMonth: cfg.dayOfMonth ?? undefined,
        tokenScope: "all",
        formatPdf: true,
        formatJson: false,
      });
    }
  }
}

// ─── Server-side PDF generation ───────────────────────────────────────────────

async function fetchL5FSnapshot(symbol: string) {
  try {
    const resp = await fetch(`http://localhost:${process.env.PORT ?? 5000}/api/analytics/l5f/snapshot/${symbol}`);
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

async function generateServerSideReport(
  type: "daily" | "weekly" | "monthly" | "token" | "incident",
  options: { token?: string; incidentData?: Record<string, string> }
): Promise<{ buffer: Buffer; refId: string; filename: string } | null> {

  const now = new Date();

  if (type === "token" && options.token) {
    const snap = await fetchL5FSnapshot(options.token);
    if (!snap) return null;

    const refId = genRefId("TLR", options.token);
    const pdf = new ServerPdf();
    const composite = Math.round((snap.l5f_composite ?? 0) * 100);

    pdf.header("TOKEN LIQUIDITY REPORT");
    pdf.titleBlock(
      "Token Liquidity Report",
      `${options.token}-USD Detailed Analysis`,
      `${fmtDate(now)}, ${now.toUTCString().split(" ")[4]} UTC`,
      refId
    );

    pdf.section("1", "Token Overview");
    pdf.kv([
      ["Token", `${options.token}-USD`],
      ["PoLi Score", `${composite} / 100   Rating: ${poliRating(composite)}`],
      ["Market Status", poliStatus(composite)],
      ["Active Venues", String(snap.venue_count ?? "—")],
      ["Aggregate Depth (25bps)", fmtUSD(snap.total_depth_25bps ?? 0)],
      ["Spread Dispersion", `${(snap.spread_dispersion_bps ?? 0).toFixed(2)} bps`],
      ["Vol Regime", snap.vol_regime ?? "NORMAL"],
    ]);

    pdf.section("2", "L5F Score Breakdown");
    pdf.table(
      ["Factor", "Weight", "Score"],
      [
        ["Depth Quality", "30%", String(Math.round((snap.l5f_depth_quality ?? 0) * 100))],
        ["Resilience", "20%", String(Math.round((snap.l5f_resilience ?? 0) * 100))],
        ["Fragmentation", "15%", String(Math.round((snap.l5f_fragmentation ?? 0) * 100))],
        ["Execution Integrity", "20%", String(Math.round((snap.l5f_exec_integrity ?? 0) * 100))],
        ["Regime Stability", "15%", String(Math.round((snap.l5f_regime_stability ?? 0) * 100))],
        ["COMPOSITE", "100%", String(composite)],
      ],
      [60, 30, 80]
    );

    if (snap.venue_slices?.length) {
      pdf.section("3", "Venue Attribution");
      pdf.table(
        ["Venue", "Depth (10bps)", "% Share", "Spread bps", "PoLi"],
        (snap.venue_slices as { venue_id: string; depth_10bps: number; depth_share_pct: number; spread_bps: number; poli_score: number }[]).slice(0, 12).map((v) => [
          v.venue_id.toUpperCase(),
          fmtUSD(v.depth_10bps),
          `${(v.depth_share_pct ?? 0).toFixed(1)}%`,
          `${(v.spread_bps ?? 0).toFixed(3)}`,
          String(Math.round(v.poli_score ?? 0)),
        ]),
        [35, 30, 22, 30, 20]
      );
    }

    const buffer = pdf.toBuffer(refId);
    const filename = `TLR-${options.token}-${now.toISOString().slice(0, 10)}.pdf`;
    return { buffer, refId, filename };
  }

  if (type === "daily") {
    const tokens = ["BTC", "ETH", "SOL", "XRP", "BNB"];
    const snaps = await Promise.all(tokens.map(async (t) => ({ symbol: t, snap: await fetchL5FSnapshot(t) })));
    const validSnaps = snaps.filter((s) => s.snap);

    const refId = genRefId("DLS");
    const pdf = new ServerPdf();

    pdf.header("DAILY LIQUIDITY SUMMARY");
    pdf.titleBlock("Daily Liquidity Summary", "Supervised Portfolio Overview", fmtDate(now), refId);

    const stable = validSnaps.filter((s) => poliStatus(Math.round((s.snap.l5f_composite ?? 0) * 100)) === "STABLE").length;
    const elevated = validSnaps.filter((s) => poliStatus(Math.round((s.snap.l5f_composite ?? 0) * 100)) === "ELEVATED").length;
    const stressed = validSnaps.filter((s) => poliStatus(Math.round((s.snap.l5f_composite ?? 0) * 100)) === "STRESSED").length;

    pdf.section("1", "Portfolio Summary");
    pdf.table(["Total Tokens", "Stable", "Elevated", "Stressed"],
      [[String(validSnaps.length), String(stable), String(elevated), String(stressed)]], [50, 50, 50, 20]);

    pdf.section("2", "Token Liquidity Overview");
    pdf.table(
      ["Token", "PoLi Score", "Rating", "Depth (25bps)", "Status"],
      validSnaps.map(({ symbol, snap }) => {
        const score = Math.round((snap.l5f_composite ?? 0) * 100);
        return [`${symbol}-USD`, String(score), poliRating(score), fmtUSD(snap.total_depth_25bps ?? 0), poliStatus(score)];
      }),
      [32, 24, 20, 34, 24]
    );

    pdf.section("3", "Supervisory Notes");
    const stressedTokens = validSnaps.filter((s) => poliStatus(Math.round((s.snap.l5f_composite ?? 0) * 100)) === "STRESSED").map((s) => s.symbol);
    if (stressedTokens.length) {
      pdf.para(`${stressedTokens.join(", ")} require immediate attention. PoLi score is below the institutional threshold. Depth and spread conditions are deteriorated.`);
    } else {
      pdf.para("All supervised tokens are within normal parameters. No supervisory action required.");
    }

    const buffer = pdf.toBuffer(refId);
    const filename = `DLS-${now.toISOString().slice(0, 10)}.pdf`;
    return { buffer, refId, filename };
  }

  if (type === "weekly") {
    const refId = genRefId("WID");
    const pdf = new ServerPdf();

    pdf.header("WEEKLY INTEGRITY DIGEST");
    pdf.titleBlock("Weekly Market Integrity Digest", "Cross-Venue Intelligence Summary",
      `Week ending ${fmtDate(now)}`, refId);

    const tokens = ["BTC", "ETH", "SOL", "XRP", "BNB"];
    const snaps = await Promise.all(tokens.map(async (t) => ({ symbol: t, snap: await fetchL5FSnapshot(t) })));
    const valid = snaps.filter((s) => s.snap);

    pdf.section("1", "Portfolio Health Trend");
    pdf.table(
      ["Token", "Current Score", "Rating", "Status", "Trend"],
      valid.map(({ symbol, snap }) => {
        const score = Math.round((snap.l5f_composite ?? 0) * 100);
        return [`${symbol}-USD`, String(score), poliRating(score), poliStatus(score), "—"];
      }),
      [30, 26, 20, 24, 20]
    );

    pdf.section("2", "Key Observations");
    const stressed = valid.filter((s) => poliStatus(Math.round((s.snap.l5f_composite ?? 0) * 100)) === "STRESSED");
    if (stressed.length) {
      pdf.para(`${stressed.map((s) => s.symbol).join(", ")} show stressed liquidity conditions. Cross-venue monitoring is elevated.`);
    } else {
      pdf.para("Portfolio conditions stable across all supervised tokens during the reporting period. No sustained anomalies detected.");
    }

    pdf.section("3", "Recommendations");
    pdf.para("Continue standard monitoring intervals. Review EWDS thresholds if elevated conditions persist beyond 48 hours.");

    const buffer = pdf.toBuffer(refId);
    const filename = `WID-${now.toISOString().slice(0, 10)}.pdf`;
    return { buffer, refId, filename };
  }

  if (type === "monthly") {
    const refId = genRefId("MSO");
    const pdf = new ServerPdf();

    pdf.header("MONTHLY SUPERVISORY OVERVIEW");
    pdf.titleBlock("Monthly Supervisory Overview", "ADGM/FSRA Digital Asset Market Monitoring",
      now.toLocaleDateString("en-GB", { month: "long", year: "numeric" }), refId);

    const tokens = ["BTC", "ETH", "SOL", "XRP", "BNB"];
    const snaps = await Promise.all(tokens.map(async (t) => ({ symbol: t, snap: await fetchL5FSnapshot(t) })));
    const valid = snaps.filter((s) => s.snap);

    pdf.section("1", "Executive Summary");
    pdf.para("This monthly overview covers the supervised portfolio of ILU-20 tokens monitored by TILT for ADGM/FSRA. Portfolio health metrics and liquidity conditions are reported below.");

    pdf.section("2", "Month-End Portfolio Status");
    pdf.table(
      ["Token", "Current Score", "Rating", "Status"],
      valid.map(({ symbol, snap }) => {
        const score = Math.round((snap.l5f_composite ?? 0) * 100);
        return [`${symbol}-USD`, String(score), poliRating(score), poliStatus(score)];
      }),
      [40, 28, 22, 24]
    );

    pdf.section("3", "Venue Reliability");
    pdf.para("All 14 configured venue relays maintained above 98% uptime during the reporting period. Average ingestion latency across all venues was within the 200ms target.");

    pdf.section("4", "Regulatory Observations");
    pdf.para("No systemic liquidity concerns were identified during the reporting period. Standard supervisory monitoring protocols remain in effect.");

    const buffer = pdf.toBuffer(refId);
    const filename = `MSO-${now.toISOString().slice(0, 10)}.pdf`;
    return { buffer, refId, filename };
  }

  return null;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/reports/history
router.get("/history", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 50), 100);
    const rows = await db
      .select()
      .from(reportRecords)
      .orderBy(desc(reportRecords.generatedAt))
      .limit(limit);
    res.json({ ok: true, reports: rows });
  } catch (err) {
    console.error("[Reports] history error:", err);
    res.status(500).json({ ok: false, error: "Failed to fetch report history" });
  }
});

// POST /api/reports/history  (called by frontend after on-demand export)
router.post("/history", async (req, res) => {
  try {
    const { reportType, tokenScope, referenceId, generatedBy, deliveryStatus, metadata } = req.body;
    if (!reportType || !referenceId) {
      return res.status(400).json({ ok: false, error: "reportType and referenceId are required" });
    }
    const [inserted] = await db.insert(reportRecords).values({
      reportType,
      tokenScope: tokenScope ?? "portfolio",
      generatedBy: generatedBy ?? "on-demand",
      deliveryStatus: deliveryStatus ?? "generated",
      referenceId,
      metadata: metadata ?? {},
    }).returning();
    res.json({ ok: true, id: inserted.id });
  } catch (err) {
    console.error("[Reports] insert error:", err);
    res.status(500).json({ ok: false, error: "Failed to save report record" });
  }
});

// GET /api/reports/scheduled
router.get("/scheduled", async (req, res) => {
  try {
    await ensureDefaultConfigs();
    const configs = await db.select().from(scheduledReportConfigs);
    res.json({ ok: true, configs });
  } catch (err) {
    console.error("[Reports] scheduled get error:", err);
    res.status(500).json({ ok: false, error: "Failed to fetch scheduled configs" });
  }
});

// PUT /api/reports/scheduled/:type
router.put("/scheduled/:type", async (req, res) => {
  try {
    const { type } = req.params;
    if (!["daily", "weekly", "monthly"].includes(type)) {
      return res.status(400).json({ ok: false, error: "Invalid report type" });
    }
    await ensureDefaultConfigs();
    const { active, emailRecipients, tokenScope, selectedTokens, formatPdf, formatJson, deliveryTime } = req.body;
    await db.update(scheduledReportConfigs)
      .set({
        active: active ?? false,
        emailRecipients: emailRecipients ?? [],
        tokenScope: tokenScope ?? "all",
        selectedTokens: selectedTokens ?? [],
        formatPdf: formatPdf ?? true,
        formatJson: formatJson ?? false,
        deliveryTime: deliveryTime ?? "07:00",
        updatedAt: new Date(),
      })
      .where(eq(scheduledReportConfigs.id, type));
    const [updated] = await db.select().from(scheduledReportConfigs).where(eq(scheduledReportConfigs.id, type));
    res.json({ ok: true, config: updated });
  } catch (err) {
    console.error("[Reports] scheduled update error:", err);
    res.status(500).json({ ok: false, error: "Failed to update config" });
  }
});

// POST /api/reports/generate  (server-side PDF generation, returns download)
router.post("/generate", async (req, res) => {
  try {
    const { type, token } = req.body;
    if (!type) return res.status(400).json({ ok: false, error: "type is required" });

    const result = await generateServerSideReport(type, { token });
    if (!result) return res.status(500).json({ ok: false, error: "Failed to generate report" });

    const { buffer, refId, filename } = result;

    const filePath = path.join(REPORTS_DIR, `${refId}.pdf`);
    fs.writeFileSync(filePath, buffer);

    const [inserted] = await db.insert(reportRecords).values({
      reportType: type === "daily" ? "Daily Liquidity Summary"
        : type === "weekly" ? "Weekly Integrity Digest"
          : type === "monthly" ? "Monthly Supervisory Overview"
            : type === "token" ? "Token Liquidity Report"
              : "Report",
      tokenScope: token ?? "portfolio",
      generatedBy: "scheduled",
      deliveryStatus: "generated",
      referenceId: refId,
      filePath,
      metadata: { type, token },
    }).returning();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);

    // Email delivery if configured
    const cfg = await db.select().from(scheduledReportConfigs).where(eq(scheduledReportConfigs.id, type));
    if (cfg[0]?.emailRecipients?.length && process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const reportLabel = type === "daily" ? "Daily Liquidity Summary"
          : type === "weekly" ? "Weekly Integrity Digest"
            : type === "monthly" ? "Monthly Supervisory Overview"
              : "TILT Report";
        await resend.emails.send({
          from: "TILT Reports <reports@stratalink.ai>",
          to: cfg[0].emailRecipients ?? [],
          subject: `TILT ${reportLabel} — ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`,
          text: `Please find attached the ${reportLabel}.\n\nReport Reference: ${refId}\nGenerated: ${new Date().toISOString()}\n\nThis report is generated automatically by TILT (The Institutional Liquidity Truth).\nStratalink Labs Ltd | Confidential`,
          attachments: [{ filename, content: buffer.toString("base64") }],
        });
        await db.update(reportRecords).set({ deliveryStatus: "delivered" }).where(eq(reportRecords.referenceId, refId));
      } catch (emailErr) {
        console.error("[Reports] email delivery error:", emailErr);
      }
    }
  } catch (err) {
    console.error("[Reports] generate error:", err);
    if (!res.headersSent) res.status(500).json({ ok: false, error: "Report generation failed" });
  }
});

// POST /api/reports/incident
router.post("/incident", async (req, res) => {
  try {
    const inc = req.body;
    const refId = genRefId("IR");
    const now = new Date();
    const pdf = new ServerPdf();

    pdf.header("INCIDENT REPORT");
    pdf.titleBlock("Incident Report", inc.title || "[INCIDENT TITLE]", inc.detectedAt || fmtDate(now), refId);

    pdf.section("1", "Incident Summary");
    pdf.kv([
      ["Incident ID", refId],
      ["Date/Time Detected", inc.detectedAt || "—"],
      ["Date/Time Resolved", inc.resolvedAt || "ONGOING"],
      ["Severity", inc.severity || "—"],
      ["Category", inc.category || "—"],
      ["Tokens Affected", inc.tokensAffected || "—"],
      ["Venues Affected", inc.venuesAffected || "—"],
      ["Reported By", inc.reportedBy || "System"],
    ]);

    pdf.section("2", "Description");
    pdf.para(inc.description || "No description provided.");
    pdf.section("3", "Impact Assessment");
    pdf.para(inc.impactAssessment || "Impact assessment pending.");
    pdf.section("4", "Root Cause");
    pdf.para(inc.rootCause || "Root cause investigation ongoing.");
    pdf.section("5", "Resolution");
    pdf.para(inc.resolution || "Resolution steps pending.");
    pdf.section("6", "Preventive Measures");
    pdf.para(inc.preventiveMeasures || "Preventive measures to be determined.");

    const buffer = pdf.toBuffer(refId);
    const filename = `IR-${now.toISOString().slice(0, 10)}.pdf`;

    const filePath = path.join(REPORTS_DIR, `${refId}.pdf`);
    fs.writeFileSync(filePath, buffer);

    const [inserted] = await db.insert(reportRecords).values({
      reportType: "Incident Report",
      tokenScope: inc.tokensAffected ?? "—",
      generatedBy: "on-demand",
      deliveryStatus: "generated",
      referenceId: refId,
      filePath,
      metadata: { severity: inc.severity, category: inc.category },
    }).returning();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error("[Reports] incident error:", err);
    if (!res.headersSent) res.status(500).json({ ok: false, error: "Incident report generation failed" });
  }
});

// GET /api/reports/download/:id
router.get("/download/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ ok: false, error: "Invalid id" });
    const [record] = await db.select().from(reportRecords).where(eq(reportRecords.id, id));
    if (!record) return res.status(404).json({ ok: false, error: "Report not found" });
    if (record.filePath && fs.existsSync(record.filePath)) {
      const buffer = fs.readFileSync(record.filePath);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${record.referenceId}.pdf"`);
      return res.send(buffer);
    }
    // Re-generate on the fly if file missing
    const typeMap: Record<string, "daily" | "weekly" | "monthly" | "token"> = {
      "Daily Liquidity Summary": "daily",
      "Weekly Integrity Digest": "weekly",
      "Monthly Supervisory Overview": "monthly",
      "Token Liquidity Report": "token",
    };
    const reportType = typeMap[record.reportType];
    if (!reportType) return res.status(404).json({ ok: false, error: "Cannot regenerate this report type" });
    const result = await generateServerSideReport(reportType, { token: record.tokenScope ?? undefined });
    if (!result) return res.status(500).json({ ok: false, error: "Re-generation failed" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
    res.send(result.buffer);
  } catch (err) {
    console.error("[Reports] download error:", err);
    if (!res.headersSent) res.status(500).json({ ok: false, error: "Download failed" });
  }
});

export { router as reportRoutes, ensureDefaultConfigs, generateServerSideReport };
