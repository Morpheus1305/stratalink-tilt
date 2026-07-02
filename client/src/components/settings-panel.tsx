import { useState, useEffect, useRef } from "react";
import { X, Check, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSettings, DEFAULT_SETTINGS, type UserSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { ILU_CATEGORIES } from "@shared/ilu-universe";
import { formatNumber } from "@/lib/format-utils";

// ─── Shared style tokens ─────────────────────────────────────────────────────

const MONO: React.CSSProperties = { fontFamily: "JetBrains Mono, monospace" };
const COL = {
  bg: "#0B1019",
  border: "#1A2435",
  accent: "#00BFA5",
  text: "#D8DEE8",
  sub: "#7B8EA3",
  dim: "#4A5B6E",
  inputBg: "#0F151F",
  green: "#00E676",
  red: "#FF5252",
  amber: "#FFB300",
};

function inputStyle(disabled?: boolean): React.CSSProperties {
  return {
    background: disabled ? "#080D14" : COL.inputBg,
    border: `1px solid ${COL.border}`,
    borderRadius: 2,
    color: disabled ? COL.dim : COL.text,
    fontFamily: "JetBrains Mono, monospace",
    fontSize: 11,
    padding: "5px 8px",
    width: "100%",
    outline: "none",
    opacity: disabled ? 0.6 : 1,
  };
}

function labelStyle(): React.CSSProperties {
  return { ...MONO, fontSize: 9, color: COL.dim, letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 5 };
}

function sectionTitle(text: string) {
  return (
    <div style={{ ...MONO, fontSize: 10, fontWeight: 700, color: COL.accent, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 14, paddingBottom: 8, borderBottom: `1px solid ${COL.border}` }}>
      {text}
    </div>
  );
}

function fieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle()}>{label}</label>
      {children}
    </div>
  );
}

// ─── Section components ───────────────────────────────────────────────────────

function DisplaySection({ draft, onChange }: { draft: UserSettings; onChange: (p: Partial<UserSettings>) => void }) {
  const TIMEZONES = [
    { value: "UTC",                label: "UTC" },
    { value: "Europe/London",      label: "UTC+0/+1 London (GMT/BST)" },
    { value: "Asia/Dubai",         label: "UTC+4 Abu Dhabi, Dubai (GST)" },
    { value: "Asia/Singapore",     label: "UTC+8 Singapore (SGT)" },
    { value: "Asia/Hong_Kong",     label: "UTC+8 Hong Kong (HKT)" },
    { value: "America/New_York",   label: "UTC-5/-4 New York (EST/EDT)" },
    { value: "America/Chicago",    label: "UTC-6/-5 Chicago (CST/CDT)" },
    { value: "America/Los_Angeles",label: "UTC-8/-7 Los Angeles (PST/PDT)" },
    { value: "Europe/Frankfurt",   label: "UTC+1/+2 Frankfurt (CET/CEST)" },
    { value: "Asia/Tokyo",         label: "UTC+9 Tokyo (JST)" },
  ];

  const preview = formatNumber(14200000, { decimalSeparator: draft.decimalSeparator, thousandsSeparator: draft.thousandsSeparator }, { prefix: "$", decimals: 2 });
  const preview2 = formatNumber(0.08, { decimalSeparator: draft.decimalSeparator, thousandsSeparator: draft.thousandsSeparator }, { suffix: "%", decimals: 2 });
  const preview3 = formatNumber(1.4, { decimalSeparator: draft.decimalSeparator, thousandsSeparator: draft.thousandsSeparator }, { suffix: " bps", decimals: 1 });

  return (
    <div>
      {sectionTitle("Display Preferences")}

      {fieldGroup({ label: "Timezone", children: (
        <select value={draft.timezone} onChange={e => onChange({ timezone: e.target.value })} style={{ ...inputStyle(), cursor: "pointer" }}>
          {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
        </select>
      )})}
      <p style={{ ...MONO, fontSize: 10, color: COL.dim, marginTop: -10, marginBottom: 16 }}>All timestamps across the platform will display in this timezone.</p>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle()}>Number Format</label>
        <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={{ ...MONO, fontSize: 9, color: COL.dim, display: "block", marginBottom: 4 }}>Decimal separator</label>
            <select value={draft.decimalSeparator} onChange={e => onChange({ decimalSeparator: e.target.value })} style={{ ...inputStyle(), cursor: "pointer" }}>
              <option value=".">. (Period)</option>
              <option value=",">, (Comma)</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ ...MONO, fontSize: 9, color: COL.dim, display: "block", marginBottom: 4 }}>Thousands separator</label>
            <select value={draft.thousandsSeparator} onChange={e => onChange({ thousandsSeparator: e.target.value })} style={{ ...inputStyle(), cursor: "pointer" }}>
              <option value=",">, (Comma)</option>
              <option value=".">. (Period)</option>
              <option value=" ">  (Space)</option>
            </select>
          </div>
        </div>
        <div style={{ background: COL.inputBg, border: `1px solid ${COL.border}`, borderRadius: 2, padding: "6px 10px", display: "flex", gap: 16 }}>
          <span style={{ ...MONO, fontSize: 11, color: COL.accent }}>Preview:</span>
          <span style={{ ...MONO, fontSize: 11, color: COL.text }}>{preview}</span>
          <span style={{ ...MONO, fontSize: 11, color: COL.sub }}>|</span>
          <span style={{ ...MONO, fontSize: 11, color: COL.text }}>{preview2}</span>
          <span style={{ ...MONO, fontSize: 11, color: COL.sub }}>|</span>
          <span style={{ ...MONO, fontSize: 11, color: COL.text }}>{preview3}</span>
        </div>
      </div>

      {fieldGroup({ label: "Default Token on Login", children: (
        <select value={draft.defaultToken} onChange={e => onChange({ defaultToken: e.target.value })} style={{ ...inputStyle(), cursor: "pointer" }}>
          {ILU_CATEGORIES.flatMap(cat => cat.tokens.map(tok => (
            <option key={tok.symbol} value={tok.symbol}>{tok.symbol}  -  {tok.name} · {cat.shortLabel}</option>
          )))}
        </select>
      )})}
      <p style={{ ...MONO, fontSize: 10, color: COL.dim, marginTop: -10, marginBottom: 16 }}>This token will be selected when you sign in.</p>

      {fieldGroup({ label: "Theme", children: (
        <>
          <select value="dark" disabled style={{ ...inputStyle(true), cursor: "not-allowed" }}>
            <option value="dark">Dark (Default)</option>
          </select>
          <p style={{ ...MONO, fontSize: 10, color: COL.dim, marginTop: 5 }}>Additional themes coming soon.</p>
        </>
      )})}
    </div>
  );
}

function PortfolioSection({ draft, onChange }: { draft: UserSettings; onChange: (p: Partial<UserSettings>) => void }) {
  const all = ILU_CATEGORIES.flatMap(c => c.tokens.map(t => t.symbol));
  const selected = new Set(draft.supervisedTokens);

  function toggle(sym: string) {
    const next = new Set(selected);
    next.has(sym) ? next.delete(sym) : next.add(sym);
    onChange({ supervisedTokens: Array.from(next) });
  }

  return (
    <div>
      {sectionTitle("Supervised Portfolio")}
      <p style={{ ...MONO, fontSize: 10, color: COL.sub, marginBottom: 16, lineHeight: 1.6 }}>
        Select the tokens within your supervisory scope. Scheduled reports and the RCL supervisory view will focus on these tokens.
      </p>

      {ILU_CATEGORIES.map(cat => (
        <div key={cat.id} style={{ marginBottom: 16 }}>
          <div style={{ ...MONO, fontSize: 9, color: COL.dim, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8, paddingBottom: 5, borderBottom: `1px solid ${COL.border}` }}>
            {cat.label}
          </div>
          {cat.tokens.map(tok => (
            <label key={tok.symbol} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={selected.has(tok.symbol)}
                onChange={() => toggle(tok.symbol)}
                data-testid={`checkbox-supervised-${tok.symbol}`}
                style={{ accentColor: COL.accent, width: 13, height: 13, flexShrink: 0 }}
              />
              <span style={{ ...MONO, fontSize: 11, color: COL.accent, width: 40, flexShrink: 0 }}>{tok.symbol}</span>
              <span style={{ ...MONO, fontSize: 11, color: COL.sub }}>{tok.name}</span>
            </label>
          ))}
        </div>
      ))}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: `1px solid ${COL.border}` }}>
        <span style={{ ...MONO, fontSize: 10, color: COL.dim }}>Selected: {selected.size} of {all.length}</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => onChange({ supervisedTokens: all })} style={{ ...MONO, fontSize: 10, color: COL.accent, background: "none", border: "none", cursor: "pointer", padding: 0 }}>Select All</button>
          <span style={{ color: COL.border }}>|</span>
          <button onClick={() => onChange({ supervisedTokens: [] })} style={{ ...MONO, fontSize: 10, color: COL.dim, background: "none", border: "none", cursor: "pointer", padding: 0 }}>Clear All</button>
        </div>
      </div>
    </div>
  );
}

function NotificationSection({ draft, onChange }: { draft: UserSettings; onChange: (p: Partial<UserSettings>) => void }) {
  const SEV = [
    { key: "HIGH",    label: "HIGH",   desc: "Critical threshold breaches" },
    { key: "WARNING", label: "MEDIUM", desc: "Elevated conditions, regime changes" },
    { key: "INFO",    label: "LOW",    desc: "Transient events, recovered conditions" },
  ];

  function toggleSev(key: string) {
    const cur = new Set(draft.notificationSeverities);
    cur.has(key) ? cur.delete(key) : cur.add(key);
    onChange({ notificationSeverities: Array.from(cur) });
  }

  return (
    <div>
      {sectionTitle("Notification Preferences")}

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle()}>Alert Severities</label>
        <p style={{ ...MONO, fontSize: 10, color: COL.sub, marginBottom: 10 }}>Show notifications for:</p>
        {SEV.map(s => (
          <label key={s.key} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "6px 0", cursor: "pointer" }}>
            <input type="checkbox" checked={draft.notificationSeverities.includes(s.key)} onChange={() => toggleSev(s.key)} style={{ accentColor: COL.accent, width: 13, height: 13, flexShrink: 0, marginTop: 2 }} data-testid={`checkbox-severity-${s.key}`} />
            <div>
              <span style={{ ...MONO, fontSize: 11, color: COL.text }}>{s.label}</span>
              <span style={{ ...MONO, fontSize: 10, color: COL.dim, marginLeft: 8 }}>({s.desc})</span>
            </div>
          </label>
        ))}
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle()}>Notification Scope</label>
        {(["supervised", "all"] as const).map(scope => (
          <label key={scope} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0", cursor: "pointer" }}>
            <input type="radio" name="notif-scope" value={scope} checked={draft.notificationScope === scope} onChange={() => onChange({ notificationScope: scope })} style={{ accentColor: COL.accent, flexShrink: 0 }} />
            <span style={{ ...MONO, fontSize: 11, color: COL.text }}>{scope === "supervised" ? "Supervised tokens only" : "All ILU-20 tokens"}</span>
          </label>
        ))}
      </div>

      <div>
        <label style={labelStyle()}>Email Notifications</label>
        <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0", cursor: "pointer", marginBottom: 10 }}>
          <input type="checkbox" checked={draft.notificationEmailEnabled} onChange={e => onChange({ notificationEmailEnabled: e.target.checked })} style={{ accentColor: COL.accent, width: 13, height: 13 }} />
          <span style={{ ...MONO, fontSize: 11, color: COL.text }}>Send email for HIGH severity alerts</span>
        </label>
        {draft.notificationEmailEnabled && (
          <input
            type="email"
            value={draft.notificationEmail ?? ""}
            onChange={e => onChange({ notificationEmail: e.target.value || null })}
            placeholder="alerts@yourorganisation.com"
            style={inputStyle()}
          />
        )}
      </div>
    </div>
  );
}

function ReportSection({ draft, onChange }: { draft: UserSettings; onChange: (p: Partial<UserSettings>) => void }) {
  type ReportKey = "daily" | "weekly" | "monthly";
  const reports: { key: ReportKey; label: string }[] = [
    { key: "daily",   label: "Daily Liquidity Summary" },
    { key: "weekly",  label: "Weekly Integrity Digest" },
    { key: "monthly", label: "Monthly Supervisory Overview" },
  ];

  // We store scheduled report state in a sub-object inside UserSettings would require extending type.
  // For now track in local state only (the parent draft carries reportEmail / reportEmailEnabled).

  return (
    <div>
      {sectionTitle("Report Delivery")}

      {fieldGroup({ label: "Email Address", children: (
        <input type="email" value={draft.reportEmail ?? ""} onChange={e => onChange({ reportEmail: e.target.value || null })} placeholder="your@organisation.com" style={inputStyle()} />
      )})}

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle()}>Scheduled Reports</label>
        {reports.map(r => (
          <div key={r.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: `1px solid ${COL.border}` }}>
            <input type="checkbox" defaultChecked={r.key === "daily" || r.key === "weekly"} style={{ accentColor: COL.accent, width: 13, height: 13, flexShrink: 0 }} />
            <span style={{ ...MONO, fontSize: 11, color: COL.text, flex: 1 }}>{r.label}</span>
            <span style={{ ...MONO, fontSize: 10, color: COL.dim }}>07:00 UTC</span>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle()}>Report Format</label>
        {(["pdf", "pdf+json"] as const).map(fmt => (
          <label key={fmt} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0", cursor: "pointer" }}>
            <input type="radio" name="report-fmt" value={fmt} defaultChecked={fmt === "pdf"} style={{ accentColor: COL.accent }} />
            <span style={{ ...MONO, fontSize: 11, color: COL.text }}>{fmt === "pdf" ? "PDF only" : "PDF + JSON"}</span>
          </label>
        ))}
      </div>

      <div>
        <label style={labelStyle()}>Report Scope</label>
        {(["supervised", "all"] as const).map(scope => (
          <label key={scope} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0", cursor: "pointer" }}>
            <input type="radio" name="report-scope" value={scope} defaultChecked={scope === "supervised"} style={{ accentColor: COL.accent }} />
            <span style={{ ...MONO, fontSize: 11, color: COL.text }}>
              {scope === "supervised" ? `Supervised portfolio (${draft.supervisedTokens.length} tokens)` : "All ILU-20 tokens (19 tokens)"}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function SessionSection({ onClose }: { onClose: () => void }) {
  const { user, logout } = useAuth();
  const [showPwForm, setShowPwForm] = useState(false);

  return (
    <div>
      {sectionTitle("Session and Security")}

      <div style={{ marginBottom: 20, padding: 12, background: COL.inputBg, border: `1px solid ${COL.border}`, borderRadius: 2 }}>
        <div style={{ ...MONO, fontSize: 9, color: COL.dim, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>Current Session</div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ ...MONO, fontSize: 10, color: COL.sub }}>Signed in as</span>
          <span style={{ ...MONO, fontSize: 10, color: COL.text }}>{user?.email ?? " - "}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ ...MONO, fontSize: 10, color: COL.sub }}>Role</span>
          <span style={{ ...MONO, fontSize: 10, color: COL.accent, textTransform: "uppercase" }}>{user?.role ?? " - "}</span>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle()}>Password</label>
        {!showPwForm ? (
          <button onClick={() => setShowPwForm(true)} style={{ ...MONO, fontSize: 10, color: COL.accent, background: COL.inputBg, border: `1px solid ${COL.border}`, borderRadius: 2, padding: "6px 12px", cursor: "pointer" }}>
            Change Password
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input type="password" placeholder="Current password" style={inputStyle()} />
            <input type="password" placeholder="New password" style={inputStyle()} />
            <input type="password" placeholder="Confirm new password" style={inputStyle()} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowPwForm(false)} style={{ ...MONO, fontSize: 10, color: COL.dim, background: "none", border: "none", cursor: "pointer", padding: 0 }}>Cancel</button>
              <button style={{ ...MONO, fontSize: 10, color: COL.bg, background: COL.accent, border: "none", borderRadius: 2, padding: "5px 12px", cursor: "pointer" }}>Update Password</button>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle()}>Sessions</label>
        <button style={{ ...MONO, fontSize: 10, color: COL.amber, background: COL.inputBg, border: `1px solid ${COL.border}`, borderRadius: 2, padding: "6px 12px", cursor: "pointer" }}>
          Sign Out of All Sessions
        </button>
        <p style={{ ...MONO, fontSize: 10, color: COL.dim, marginTop: 6 }}>This will end all active sessions across all devices.</p>
      </div>

      <div style={{ paddingTop: 16, borderTop: `1px solid ${COL.border}` }}>
        <button
          onClick={() => { logout(); onClose(); }}
          data-testid="button-signout-settings"
          style={{ ...MONO, fontSize: 10, color: COL.red, background: COL.inputBg, border: `1px solid ${COL.border}`, borderRadius: 2, padding: "6px 12px", cursor: "pointer" }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: "ONLINE" | "OFFLINE" | "DEGRADED" | "OPERATIONAL" | "PENDING" | string }) {
  const color = status === "ONLINE" || status === "OPERATIONAL" ? COL.green
    : status === "DEGRADED" ? COL.amber
    : COL.dim;
  return <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: color, marginRight: 6 }} />;
}

function SystemSection() {
  const { data, refetch, isFetching } = useQuery<any>({
    queryKey: ["/api/system/status"],
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const p = data?.pipeline;
  const venues = data?.venues ?? [];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, paddingBottom: 8, borderBottom: `1px solid ${COL.border}` }}>
        <span style={{ ...MONO, fontSize: 10, fontWeight: 700, color: COL.accent, letterSpacing: "0.14em", textTransform: "uppercase" }}>System Status</span>
        <button onClick={() => refetch()} style={{ background: "none", border: "none", cursor: "pointer", color: COL.dim, display: "flex", alignItems: "center", gap: 4, padding: 0 }}>
          <RefreshCw size={11} style={{ animation: isFetching ? "spin 1s linear infinite" : "none" }} />
          <span style={{ ...MONO, fontSize: 9, color: COL.dim }}>Refresh</span>
        </button>
      </div>

      {!data ? (
        <div style={{ ...MONO, fontSize: 11, color: COL.dim, padding: 20, textAlign: "center" }}>Loading system status...</div>
      ) : (
        <>
          <div style={{ marginBottom: 18 }}>
            <div style={labelStyle()}>Platform</div>
            {[
              ["Version", data.platform?.version],
              ["Environment", data.platform?.environment],
            ].map(([k, v]) => (
              <div key={String(k)} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${COL.border}` }}>
                <span style={{ ...MONO, fontSize: 10, color: COL.sub }}>{k}</span>
                <span style={{ ...MONO, fontSize: 10, color: COL.text }}>{String(v ?? " - ")}</span>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={labelStyle()}>Data Pipeline</div>
            {[
              { label: `Venues Active`, value: `${p?.venuesActive ?? 0} / ${p?.venuesTotal ?? 14}`, status: "ONLINE" },
              { label: "TSLE Buffer",   value: p?.tsle?.status ?? " - ",   status: p?.tsle?.status },
              { label: "L5F Engine",    value: p?.l5f?.status ?? " - ",    status: p?.l5f?.status },
              { label: "PoLi Engine",   value: p?.poli?.status ?? " - ",   status: p?.poli?.status },
              { label: "Alert Service", value: `${p?.alerts?.status ?? " - "} (${p?.alerts?.activeRules ?? 0} rules)`, status: p?.alerts?.status },
            ].map(row => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: `1px solid ${COL.border}` }}>
                <span style={{ ...MONO, fontSize: 10, color: COL.sub }}>{row.label}</span>
                <span style={{ ...MONO, fontSize: 10, color: row.status === "OPERATIONAL" || row.status === "ONLINE" ? COL.green : COL.dim, display: "flex", alignItems: "center" }}>
                  <StatusDot status={row.status ?? ""} />{row.value}
                </span>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={labelStyle()}>Canton Network</div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${COL.border}` }}>
              <span style={{ ...MONO, fontSize: 10, color: COL.sub }}>Network Status</span>
              <span style={{ ...MONO, fontSize: 10, color: COL.sub }}>{data.canton?.networkStatus ?? " - "}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${COL.border}` }}>
              <span style={{ ...MONO, fontSize: 10, color: COL.sub }}>Last Attestation</span>
              <span style={{ ...MONO, fontSize: 10, color: COL.dim }}>{data.canton?.lastAttestation ?? "Pending  -  MVP build"}</span>
            </div>
          </div>

          <div>
            <div style={labelStyle()}>Venue Connectivity</div>
            {venues.map((v: any) => (
              <div key={v.venue} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0", borderBottom: `1px solid #0F1520` }}>
                <span style={{ ...MONO, fontSize: 10, color: COL.sub, textTransform: "capitalize", width: 110 }}>{v.venue}</span>
                <span style={{ ...MONO, fontSize: 10, color: v.status === "ONLINE" ? COL.green : v.status === "DEGRADED" ? COL.amber : COL.dim, display: "flex", alignItems: "center" }}>
                  <StatusDot status={v.status} />
                  {v.status}
                </span>
                <span style={{ ...MONO, fontSize: 10, color: COL.dim }}>
                  {v.latencyMs != null ? `${v.latencyMs}ms` : v.note ?? " - "}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Main panel ──────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: "display",       label: "DISPLAY" },
  { id: "portfolio",     label: "PORTFOLIO" },
  { id: "notifications", label: "NOTIFS" },
  { id: "reports",       label: "REPORTS" },
  { id: "session",       label: "SESSION" },
  { id: "system",        label: "SYSTEM" },
] as const;

type SectionId = typeof SECTIONS[number]["id"];

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { settings, updateSettings } = useSettings();
  const panelRef = useRef<HTMLDivElement>(null);

  const [activeSection, setActiveSection] = useState<SectionId>("display");
  const [draft, setDraft] = useState<UserSettings>({ ...settings });
  const [saved, setSaved] = useState(false);

  const isDirty = JSON.stringify(draft) !== JSON.stringify(settings);

  function changeDraft(partial: Partial<UserSettings>) {
    setDraft(prev => ({ ...prev, ...partial }));
    setSaved(false);
  }

  function handleSave() {
    updateSettings(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [onClose]);

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 999 }} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Settings"
        data-testid="settings-panel"
        style={{
          position: "fixed", top: 0, right: 0, width: 480, height: "100vh",
          zIndex: 1000, background: COL.bg, borderLeft: `1px solid ${COL.border}`,
          display: "flex", flexDirection: "column",
          animation: "settings-slide-in 0.2s ease-out",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "14px 16px 12px", borderBottom: `1px solid ${COL.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <span style={{ ...MONO, fontSize: 12, fontWeight: 700, color: COL.accent, letterSpacing: "0.12em" }}>SETTINGS</span>
          <button onClick={onClose} data-testid="button-close-settings" style={{ background: "none", border: "none", cursor: "pointer", color: COL.dim, display: "flex", alignItems: "center", padding: 2 }}>
            <X size={14} />
          </button>
        </div>

        {/* Body = left nav + content */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Left nav */}
          <div style={{ width: 110, flexShrink: 0, borderRight: `1px solid ${COL.border}`, paddingTop: 8, overflowY: "auto" }}>
            {SECTIONS.map(s => {
              const isActive = activeSection === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  data-testid={`settings-nav-${s.id}`}
                  style={{
                    width: "100%", textAlign: "left", background: isActive ? "#0F1520" : "none",
                    border: "none", borderLeft: isActive ? `2px solid ${COL.accent}` : "2px solid transparent",
                    padding: "10px 12px", cursor: "pointer",
                    ...MONO, fontSize: 10, fontWeight: isActive ? 700 : 400,
                    color: isActive ? COL.accent : COL.sub,
                    letterSpacing: "0.10em",
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px" }}>
            {activeSection === "display"       && <DisplaySection draft={draft} onChange={changeDraft} />}
            {activeSection === "portfolio"     && <PortfolioSection draft={draft} onChange={changeDraft} />}
            {activeSection === "notifications" && <NotificationSection draft={draft} onChange={changeDraft} />}
            {activeSection === "reports"       && <ReportSection draft={draft} onChange={changeDraft} />}
            {activeSection === "session"       && <SessionSection onClose={onClose} />}
            {activeSection === "system"        && <SystemSection />}
          </div>
        </div>

        {/* Footer  -  save button (not shown for session/system read-only sections) */}
        {activeSection !== "session" && activeSection !== "system" && (
          <div style={{ padding: "12px 16px", borderTop: `1px solid ${COL.border}`, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, flexShrink: 0 }}>
            {saved && (
              <span style={{ ...MONO, fontSize: 10, color: COL.green, display: "flex", alignItems: "center", gap: 4 }}>
                <Check size={11} strokeWidth={3} /> Saved
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={!isDirty && !saved}
              data-testid="button-save-settings"
              style={{
                ...MONO, fontSize: 11, color: isDirty ? COL.bg : COL.dim,
                background: isDirty ? COL.accent : "#0F1520",
                border: `1px solid ${isDirty ? COL.accent : COL.border}`,
                borderRadius: 2, padding: "6px 16px", cursor: isDirty ? "pointer" : "default",
                letterSpacing: "0.08em", fontWeight: 700,
              }}
            >
              SAVE CHANGES
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes settings-slide-in {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
