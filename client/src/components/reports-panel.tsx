import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, FileText, Clock, AlertTriangle, ChevronRight, ChevronLeft, Check, Loader2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportRecord {
  id: number;
  reportType: string;
  tokenScope: string | null;
  generatedAt: string;
  generatedBy: string | null;
  deliveryStatus: string;
  referenceId: string;
}

interface ScheduledConfig {
  id: string;
  active: boolean;
  deliveryTime: string;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  emailRecipients: string[] | null;
  tokenScope: string;
  formatPdf: boolean;
  formatJson: boolean;
}

interface IncidentFormData {
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
}

interface ReportsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Style constants ──────────────────────────────────────────────────────────

const S = {
  panel: {
    position: "fixed" as const,
    top: 0,
    right: 0,
    height: "100vh",
    width: 400,
    background: "#0B1019",
    borderLeft: "1px solid #1A2435",
    zIndex: 1000,
    display: "flex",
    flexDirection: "column" as const,
    fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
    transition: "transform 0.2s ease-out",
  },
  mono: { fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace" },
};

function mono(size: number, color: string, weight: number | string = 400) {
  return { fontFamily: S.mono.fontFamily, fontSize: size, color, fontWeight: weight };
}

// ─── Formatted date helpers ───────────────────────────────────────────────────

function fmtTs(ts: string) {
  const d = new Date(ts);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    + " " + d.toUTCString().split(" ")[4];
}

function nextDelivery(id: string) {
  const now = new Date();
  if (id === "daily") {
    const next = new Date(now);
    next.setDate(next.getDate() + 1);
    next.setUTCHours(7, 0, 0, 0);
    return next.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) + ", 07:00 UTC";
  }
  if (id === "weekly") {
    const next = new Date(now);
    const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7;
    next.setDate(next.getDate() + daysUntilFriday);
    next.setUTCHours(7, 0, 0, 0);
    return next.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) + " (Fri), 07:00 UTC";
  }
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1, 7, 0, 0);
  return next.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) + ", 07:00 UTC";
}

const CONFIG_LABELS: Record<string, string> = {
  daily: "DAILY LIQUIDITY SUMMARY",
  weekly: "WEEKLY INTEGRITY DIGEST",
  monthly: "MONTHLY SUPERVISORY OVERVIEW",
};

// ─── Configure sub-panel ──────────────────────────────────────────────────────

function ConfigurePane({
  config,
  onBack,
  onSave,
}: {
  config: ScheduledConfig;
  onBack: () => void;
  onSave: (updated: Partial<ScheduledConfig>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    active: config.active,
    emailRecipients: (config.emailRecipients ?? []).join(", "),
    deliveryTime: config.deliveryTime ?? "07:00",
    formatPdf: config.formatPdf,
    formatJson: config.formatJson,
    tokenScope: config.tokenScope ?? "all",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        active: form.active,
        emailRecipients: form.emailRecipients
          .split(",")
          .map((e) => e.trim())
          .filter(Boolean),
        deliveryTime: form.deliveryTime,
        formatPdf: form.formatPdf,
        formatJson: form.formatJson,
        tokenScope: form.tokenScope,
      });
      setSaved(true);
      setTimeout(() => { setSaved(false); onBack(); }, 1200);
    } finally {
      setSaving(false);
    }
  };

  const inp: React.CSSProperties = {
    background: "#0F151F",
    border: "1px solid #1A2435",
    borderRadius: 2,
    padding: "5px 8px",
    color: "#D8DEE8",
    ...mono(10, "#D8DEE8"),
    width: "100%",
    boxSizing: "border-box" as const,
    outline: "none",
  };

  const lbl: React.CSSProperties = { ...mono(9, "#7B8EA3", 600), letterSpacing: "0.08em", display: "block", marginBottom: 4 };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: "1px solid #1A2435" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "#7B8EA3", padding: 0 }}>
          <ChevronLeft size={14} />
        </button>
        <span style={mono(10, "#00BFA5", 700)}>CONFIGURE · {CONFIG_LABELS[config.id]}</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Active toggle */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={lbl}>ACTIVE</span>
          <button
            onClick={() => setForm((f) => ({ ...f, active: !f.active }))}
            style={{
              width: 36, height: 18, borderRadius: 9,
              background: form.active ? "#00BFA5" : "#1A2435",
              border: "none", cursor: "pointer", position: "relative",
              transition: "background 0.2s",
            }}
          >
            <div style={{
              position: "absolute", top: 2, left: form.active ? 18 : 2,
              width: 14, height: 14, borderRadius: 7, background: "#D8DEE8",
              transition: "left 0.2s",
            }} />
          </button>
        </div>

        {/* Delivery time */}
        <div>
          <label style={lbl}>DELIVERY TIME (UTC)</label>
          <input
            type="time"
            value={form.deliveryTime}
            onChange={(e) => setForm((f) => ({ ...f, deliveryTime: e.target.value }))}
            style={inp}
          />
        </div>

        {/* Email recipients */}
        <div>
          <label style={lbl}>EMAIL RECIPIENTS (comma-separated)</label>
          <textarea
            value={form.emailRecipients}
            onChange={(e) => setForm((f) => ({ ...f, emailRecipients: e.target.value }))}
            placeholder="user@example.com, team@example.com"
            rows={3}
            style={{ ...inp, resize: "vertical" as const }}
          />
        </div>

        {/* Token scope */}
        <div>
          <label style={lbl}>TOKEN SCOPE</label>
          {["all", "selected"].map((v) => (
            <label key={v} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", marginBottom: 4 }}>
              <input
                type="radio"
                name="scope"
                value={v}
                checked={form.tokenScope === v}
                onChange={() => setForm((f) => ({ ...f, tokenScope: v }))}
                style={{ accentColor: "#00BFA5" }}
              />
              <span style={mono(9, "#D8DEE8")}>{v === "all" ? "All supervised tokens" : "Selected tokens only"}</span>
            </label>
          ))}
        </div>

        {/* Format */}
        <div>
          <label style={lbl}>OUTPUT FORMAT</label>
          <div style={{ display: "flex", gap: 12 }}>
            {(["formatPdf", "formatJson"] as const).map((key) => (
              <label key={key} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
                  style={{ accentColor: "#00BFA5" }}
                />
                <span style={mono(9, "#D8DEE8")}>{key === "formatPdf" ? "PDF" : "JSON"}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Save / Cancel */}
      <div style={{ display: "flex", gap: 8, padding: "12px 14px", borderTop: "1px solid #1A2435" }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            flex: 1, padding: "7px 0",
            background: saved ? "#00BFA5" : "#00BFA5",
            border: "none", borderRadius: 2, cursor: saving ? "wait" : "pointer",
            ...mono(10, "#0B1019", 700), letterSpacing: "0.08em",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
          }}
        >
          {saving ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> : saved ? <Check size={11} /> : null}
          {saved ? "SAVED" : saving ? "SAVING…" : "SAVE"}
        </button>
        <button
          onClick={onBack}
          style={{
            padding: "7px 16px", background: "#0F151F",
            border: "1px solid #1A2435", borderRadius: 2, cursor: "pointer",
            ...mono(10, "#7B8EA3"),
          }}
        >
          CANCEL
        </button>
      </div>
    </div>
  );
}

// ─── Incident form ────────────────────────────────────────────────────────────

function IncidentForm({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<IncidentFormData>({
    title: "",
    detectedAt: new Date().toISOString().slice(0, 16),
    resolvedAt: "",
    severity: "HIGH",
    category: "ALERT_TRIGGER",
    tokensAffected: "",
    venuesAffected: "",
    reportedBy: "System",
    description: "",
    impactAssessment: "",
    rootCause: "",
    resolution: "",
    preventiveMeasures: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof IncidentFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.title) return;
    setSubmitting(true);
    try {
      const resp = await fetch("/api/reports/incident", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (resp.ok) {
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `IR-${new Date().toISOString().slice(0, 10)}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const inp: React.CSSProperties = {
    background: "#0F151F", border: "1px solid #1A2435", borderRadius: 2,
    padding: "5px 8px", color: "#D8DEE8",
    fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
    width: "100%", boxSizing: "border-box" as const, outline: "none",
  };
  const lbl: React.CSSProperties = {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#7B8EA3",
    fontWeight: 600, letterSpacing: "0.08em", display: "block", marginBottom: 3,
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: "1px solid #1A2435" }}>
        <AlertTriangle size={12} style={{ color: "#FFB300" }} />
        <span style={mono(10, "#FFB300", 700)}>NEW INCIDENT REPORT</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div><label style={lbl}>INCIDENT TITLE *</label>
          <input value={form.title} onChange={set("title")} style={inp} placeholder="e.g. AVAX Depth Collapse 14:22 UTC" /></div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div><label style={lbl}>DETECTED AT</label>
            <input type="datetime-local" value={form.detectedAt} onChange={set("detectedAt")} style={inp} /></div>
          <div><label style={lbl}>RESOLVED AT</label>
            <input type="datetime-local" value={form.resolvedAt} onChange={set("resolvedAt")} style={inp} placeholder="Leave blank if ongoing" /></div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div><label style={lbl}>SEVERITY</label>
            <select value={form.severity} onChange={set("severity")} style={inp}>
              {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((v) => <option key={v}>{v}</option>)}
            </select></div>
          <div><label style={lbl}>CATEGORY</label>
            <select value={form.category} onChange={set("category")} style={inp}>
              {["VENUE_DISCONNECTION", "DATA_GAP", "ALERT_TRIGGER", "REGIME_CHANGE", "SYSTEM_ERROR", "SECURITY"].map((v) => <option key={v}>{v}</option>)}
            </select></div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div><label style={lbl}>TOKENS AFFECTED</label>
            <input value={form.tokensAffected} onChange={set("tokensAffected")} style={inp} placeholder="e.g. AVAX, SOL" /></div>
          <div><label style={lbl}>VENUES AFFECTED</label>
            <input value={form.venuesAffected} onChange={set("venuesAffected")} style={inp} placeholder="e.g. Binance, OKX" /></div>
        </div>

        {[
          ["DESCRIPTION", "description", "Describe what happened and the sequence of events…"],
          ["IMPACT ASSESSMENT", "impactAssessment", "Impact on data quality, PoLi scoring, supervisory implications…"],
          ["ROOT CAUSE", "rootCause", "Root cause or current hypothesis…"],
          ["RESOLUTION", "resolution", "Steps taken or planned to resolve…"],
          ["PREVENTIVE MEASURES", "preventiveMeasures", "Changes to prevent recurrence…"],
        ].map(([label, key, placeholder]) => (
          <div key={key}>
            <label style={lbl}>{label}</label>
            <textarea
              value={(form as unknown as Record<string, string>)[key]}
              onChange={set(key as keyof IncidentFormData)}
              placeholder={placeholder}
              rows={2}
              style={{ ...inp, resize: "vertical" as const }}
            />
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, padding: "12px 14px", borderTop: "1px solid #1A2435" }}>
        <button
          onClick={handleSubmit}
          disabled={submitting || !form.title}
          style={{
            flex: 1, padding: "7px 0",
            background: form.title ? "#FFB300" : "#1A2435",
            border: "none", borderRadius: 2,
            cursor: form.title && !submitting ? "pointer" : "default",
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            fontWeight: 700, letterSpacing: "0.08em",
            color: form.title ? "#0B1019" : "#4A5B6E",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
          }}
        >
          {submitting && <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} />}
          {submitting ? "GENERATING…" : "GENERATE & DOWNLOAD"}
        </button>
        <button
          onClick={onClose}
          style={{
            padding: "7px 16px", background: "#0F151F",
            border: "1px solid #1A2435", borderRadius: 2, cursor: "pointer",
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#7B8EA3",
          }}
        >
          CANCEL
        </button>
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function ReportsPanel({ isOpen, onClose }: ReportsPanelProps) {
  const [tab, setTab] = useState<"scheduled" | "history" | "incidents">("scheduled");
  const [configuring, setConfiguring] = useState<string | null>(null);
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const qc = useQueryClient();
  const overlayRef = useRef<HTMLDivElement>(null);

  const { data: historyData } = useQuery({
    queryKey: ["/api/reports/history"],
    enabled: isOpen && tab === "history",
    staleTime: 0,
  });

  const { data: scheduledData } = useQuery({
    queryKey: ["/api/reports/scheduled"],
    enabled: isOpen,
    staleTime: 30000,
  });

  const updateConfig = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ScheduledConfig> }) => {
      const resp = await fetch(`/api/reports/scheduled/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!resp.ok) throw new Error("Failed to update config");
      return resp.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/reports/scheduled"] }),
  });

  const configs: ScheduledConfig[] = scheduledData?.configs ?? [];
  const reports: ReportRecord[] = historyData?.reports ?? [];
  const incidents = reports.filter((r) => r.reportType === "Incident Report");
  const history = reports.slice(0, 20);

  const handleGenerateNow = async (type: string) => {
    setGenerating(type);
    try {
      const resp = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (resp.ok) {
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${type}-${new Date().toISOString().slice(0, 10)}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        qc.invalidateQueries({ queryKey: ["/api/reports/history"] });
      }
    } finally {
      setGenerating(null);
    }
  };

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (overlayRef.current && e.target === overlayRef.current) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeConfig = configuring ? configs.find((c) => c.id === configuring) : null;

  return (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 999,
        }}
      />

      {/* Panel */}
      <div
        data-testid="reports-panel"
        style={{
          ...S.panel,
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 14px", borderBottom: "1px solid #1A2435", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FileText size={13} style={{ color: "#00BFA5" }} />
            <span style={mono(11, "#00BFA5", 700)}>REPORTS</span>
          </div>
          <button
            data-testid="button-close-reports"
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#7B8EA3", padding: 2 }}
          >
            <X size={14} />
          </button>
        </div>

        {/* If showing incident form or configure pane */}
        {showIncidentForm ? (
          <IncidentForm onClose={() => { setShowIncidentForm(false); qc.invalidateQueries({ queryKey: ["/api/reports/history"] }); }} />
        ) : activeConfig ? (
          <ConfigurePane
            config={activeConfig}
            onBack={() => setConfiguring(null)}
            onSave={async (updated) => {
              await updateConfig.mutateAsync({ id: activeConfig.id, data: updated });
            }}
          />
        ) : (
          <>
            {/* Tab bar */}
            <div style={{
              display: "flex", borderBottom: "1px solid #1A2435", flexShrink: 0,
            }}>
              {(["scheduled", "history", "incidents"] as const).map((t) => (
                <button
                  key={t}
                  data-testid={`tab-${t}`}
                  onClick={() => setTab(t)}
                  style={{
                    flex: 1, padding: "8px 4px",
                    background: "none", border: "none",
                    borderBottom: tab === t ? "2px solid #00BFA5" : "2px solid transparent",
                    cursor: "pointer",
                    ...mono(9, tab === t ? "#00BFA5" : "#7B8EA3", tab === t ? 700 : 500),
                    letterSpacing: "0.08em",
                    transition: "color 0.15s",
                  }}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: "auto" }}>

              {/* ── SCHEDULED ──────────────────────────────── */}
              {tab === "scheduled" && (
                <div style={{ padding: "10px 0" }}>
                  {(["daily", "weekly", "monthly"] as const).map((id) => {
                    const cfg = configs.find((c) => c.id === id);
                    const isGen = generating === id;
                    return (
                      <div
                        key={id}
                        style={{
                          padding: "12px 14px",
                          borderBottom: "1px solid #0F151F",
                          background: "#0D1320",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={mono(10, "#D8DEE8", 700)}>{CONFIG_LABELS[id]}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <div style={{
                              width: 7, height: 7, borderRadius: "50%",
                              background: cfg?.active ? "#00E676" : "#4A5B6E",
                              boxShadow: cfg?.active ? "0 0 5px #00E676" : "none",
                            }} />
                            <span style={mono(8, cfg?.active ? "#00E676" : "#4A5B6E", 600)}>
                              {cfg?.active ? "ACTIVE" : "INACTIVE"}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                          <Clock size={9} style={{ color: "#7B8EA3" }} />
                          <span style={mono(9, "#7B8EA3")}>Next: {nextDelivery(id)}</span>
                        </div>

                        <div style={{ marginBottom: 3 }}>
                          <span style={mono(9, "#4A5B6E")}>
                            Recipients: {cfg?.emailRecipients?.length ? cfg.emailRecipients.join(", ").slice(0, 40) + (cfg.emailRecipients.join(", ").length > 40 ? "…" : "") : "Not configured"}
                          </span>
                        </div>

                        <div style={{ marginBottom: 10 }}>
                          <span style={mono(9, "#4A5B6E")}>
                            Scope: {cfg?.tokenScope === "all" ? "All supervised tokens" : "Selected tokens"}
                          </span>
                        </div>

                        <div style={{ display: "flex", gap: 7 }}>
                          <button
                            onClick={() => setConfiguring(id)}
                            style={{
                              padding: "4px 10px", background: "#0F151F",
                              border: "1px solid #1A2435", borderRadius: 2, cursor: "pointer",
                              ...mono(9, "#7B8EA3"), display: "flex", alignItems: "center", gap: 4,
                            }}
                          >
                            CONFIGURE <ChevronRight size={9} />
                          </button>
                          <button
                            onClick={() => handleGenerateNow(id)}
                            disabled={isGen}
                            style={{
                              padding: "4px 10px", background: "#00BFA5",
                              border: "none", borderRadius: 2,
                              cursor: isGen ? "wait" : "pointer",
                              ...mono(9, "#0B1019", 700),
                              display: "flex", alignItems: "center", gap: 4,
                            }}
                          >
                            {isGen && <Loader2 size={9} style={{ animation: "spin 1s linear infinite" }} />}
                            {isGen ? "GENERATING…" : "GENERATE NOW"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── HISTORY ────────────────────────────────── */}
              {tab === "history" && (
                <div>
                  {history.length === 0 ? (
                    <div style={{ padding: 24, textAlign: "center" }}>
                      <span style={mono(10, "#4A5B6E")}>No reports generated yet.</span>
                    </div>
                  ) : (
                    history.map((r) => (
                      <div
                        key={r.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr auto",
                          gap: 6,
                          padding: "9px 14px",
                          borderBottom: "1px solid #0F151F",
                        }}
                      >
                        <div>
                          <div style={{ ...mono(9, "#D8DEE8", 600), marginBottom: 2 }}>{r.reportType}</div>
                          <div style={mono(8, "#7B8EA3")}>{r.tokenScope ?? "portfolio"} · {r.deliveryStatus?.toUpperCase()}</div>
                          <div style={mono(8, "#4A5B6E")}>{fmtTs(r.generatedAt)} UTC</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <a
                            href={`/api/reports/download/${r.id}`}
                            target="_blank"
                            rel="noreferrer"
                            data-testid={`download-report-${r.id}`}
                            style={{
                              padding: "3px 8px", background: "#0F151F",
                              border: "1px solid #1A2435", borderRadius: 2,
                              textDecoration: "none",
                              ...mono(8, "#00BFA5", 600),
                            }}
                          >
                            DL
                          </a>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ── INCIDENTS ──────────────────────────────── */}
              {tab === "incidents" && (
                <div>
                  <div style={{ padding: "10px 14px", borderBottom: "1px solid #1A2435" }}>
                    <button
                      data-testid="button-new-incident"
                      onClick={() => setShowIncidentForm(true)}
                      style={{
                        width: "100%", padding: "7px 0",
                        background: "rgba(255,179,0,0.10)",
                        border: "1px solid rgba(255,179,0,0.25)", borderRadius: 2,
                        cursor: "pointer",
                        ...mono(10, "#FFB300", 700), letterSpacing: "0.08em",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      }}
                    >
                      <AlertTriangle size={11} />
                      NEW INCIDENT REPORT
                    </button>
                  </div>

                  {incidents.length === 0 ? (
                    <div style={{ padding: 24, textAlign: "center" }}>
                      <span style={mono(10, "#4A5B6E")}>No incident reports filed.</span>
                    </div>
                  ) : (
                    incidents.map((r) => (
                      <div
                        key={r.id}
                        style={{
                          display: "grid", gridTemplateColumns: "1fr auto", gap: 6,
                          padding: "9px 14px", borderBottom: "1px solid #0F151F",
                        }}
                      >
                        <div>
                          <div style={{ ...mono(9, "#FFB300", 600), marginBottom: 2 }}>
                            {r.referenceId}
                          </div>
                          <div style={mono(8, "#7B8EA3")}>{r.tokenScope ?? " - "} · {r.deliveryStatus?.toUpperCase()}</div>
                          <div style={mono(8, "#4A5B6E")}>{fmtTs(r.generatedAt)} UTC</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <a
                            href={`/api/reports/download/${r.id}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              padding: "3px 8px", background: "#0F151F",
                              border: "1px solid #1A2435", borderRadius: 2,
                              textDecoration: "none",
                              ...mono(8, "#FFB300", 600),
                            }}
                          >
                            DL
                          </a>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
