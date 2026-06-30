import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Bell, Settings, Activity, LogOut, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { useUIState } from "@/contexts/UIStateContext";
import { useQuery } from "@tanstack/react-query";
import { useSettings } from "@/contexts/SettingsContext";
import { NotificationPanel, type AlertLogEntry } from "@/components/notification-panel";
import { SettingsPanel } from "@/components/settings-panel";

// ── localStorage helpers ────────────────────────────────────────────────────

const LS_KEY = "strata_notif_acked_v1";

function loadAckedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveAckedIds(ids: Set<string>) {
  try {
    const arr = Array.from(ids).slice(-500);
    localStorage.setItem(LS_KEY, JSON.stringify(arr));
  } catch {}
}

// ── Symbol extraction (mirrors notification-panel.tsx) ─────────────────────

function extractSymbol(desc: string): string | null {
  const first = (desc ?? "").split(/[\s:|]/)[0];
  return /^[A-Z]{2,6}$/.test(first) ? first : null;
}

// ── PulseDot ────────────────────────────────────────────────────────────────

function PulseDot() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" style={{ flexShrink: 0 }} aria-hidden="true">
      <defs>
        <radialGradient id="pd-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#00E676" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#00E676" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="8" cy="8" r="7" fill="url(#pd-glow)">
        <animate attributeName="opacity" values="0.2;0.8;0.2" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="8" cy="8" r="4" fill="#00E676">
        <animate attributeName="r"       values="3.5;4.5;3.5" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.5;1;0.5"   dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

// ── Severity mapping ────────────────────────────────────────────────────────
// Alert entry severity → settings key used for filtering

function entryMatchesSeverityFilter(entry: AlertLogEntry, severities: string[]): boolean {
  // CRITICAL + HIGH → "HIGH" filter key; WARNING → "WARNING"; INFO → "INFO"
  if ((entry.severity === "CRITICAL" || entry.severity === "HIGH") && severities.includes("HIGH")) return true;
  if (entry.severity === "WARNING" && severities.includes("WARNING")) return true;
  if (entry.severity === "INFO" && severities.includes("INFO")) return true;
  return false;
}

// ── DashboardHeader ─────────────────────────────────────────────────────────

export function DashboardHeader() {
  const { logout } = useAuth();
  const [, setLocation] = useLocation();
  const { openReports } = useUIState();
  const { settings } = useSettings();

  const [notifOpen, setNotifOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(loadAckedIds);
  const [bellFlash, setBellFlash] = useState(false);
  // Use a ref so updating "seen" HIGH IDs never causes a re-render
  const prevHighIdsRef = useRef<Set<string>>(new Set());

  // Poll alert log every 10 s
  const { data: logData } = useQuery<{ entries: AlertLogEntry[] }>({
    queryKey: ["/api/alerts/log"],
    refetchInterval: 10_000,
    staleTime: 5_000,
  });

  const allEntries: AlertLogEntry[] = logData?.entries ?? [];

  // Stringify arrays so useMemo doesn't thrash on every render
  const sevKey = settings.notificationSeverities.join(",");
  const scopeKey = settings.notificationScope;
  const supKey = settings.supervisedTokens.join(",");

  // Apply notification filters from settings
  const filteredEntries = useMemo(() => {
    return allEntries.filter(entry => {
      if (!entryMatchesSeverityFilter(entry, settings.notificationSeverities)) return false;
      if (settings.notificationScope === "supervised") {
        const sym = extractSymbol(entry.description);
        if (sym && !settings.supervisedTokens.includes(sym)) return false;
      }
      return true;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allEntries, sevKey, scopeKey, supKey]);

  const unreadCount = filteredEntries.filter(e => !acknowledgedIds.has(e.id)).length;

  // Bell flash on new HIGH/CRITICAL unread — ref-based, no state loop
  useEffect(() => {
    const highUnread = new Set(
      filteredEntries
        .filter(e => (e.severity === "HIGH" || e.severity === "CRITICAL") && !acknowledgedIds.has(e.id))
        .map(e => e.id)
    );
    const hasNew = Array.from(highUnread).some(id => !prevHighIdsRef.current.has(id));
    prevHighIdsRef.current = highUnread;
    if (hasNew && highUnread.size > 0) {
      setBellFlash(true);
      const t = setTimeout(() => setBellFlash(false), 2000);
      return () => clearTimeout(t);
    }
  }, [filteredEntries, acknowledgedIds]);

  const acknowledge = useCallback((id: string) => {
    setAcknowledgedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      saveAckedIds(next);
      return next;
    });
  }, []);

  const acknowledgeAll = useCallback(() => {
    setAcknowledgedIds(prev => {
      const next = new Set(prev);
      filteredEntries.forEach(e => next.add(e.id));
      saveAckedIds(next);
      return next;
    });
  }, [filteredEntries]);

  const handleLogout = () => { logout(); setLocation("/"); };

  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-card h-14 flex items-center px-4 gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 800, letterSpacing: "0.10em", color: "#D8DEE8", whiteSpace: "nowrap" }}>
            STRATA<span style={{ color: "#00BFA5" }}>LINK</span>{" "}
            <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.15em", color: "#7B8EA3", verticalAlign: "middle" }}>LABS</span>
          </span>
          <div className="w-px h-5 bg-border shrink-0 hidden sm:block" />
          <span className="hidden md:block" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.18em", color: "#4A5B6E", whiteSpace: "nowrap", textTransform: "uppercase" }}>
            Institutional Liquidity Intelligence Terminal
          </span>
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <Activity className="h-3 w-3" style={{ color: "#00E676" }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, color: "#00E676", letterSpacing: "0.06em" }}>LIVE</span>
          </div>

          <PulseDot />

          <div className="w-px h-5 bg-border mx-1 shrink-0" />

          <div className="flex items-center gap-1">
            {/* Notification bell with badge */}
            <div style={{ position: "relative", display: "inline-flex" }}>
              <Button
                variant="ghost"
                size="icon"
                data-testid="button-notifications"
                onClick={() => { setNotifOpen(o => !o); setSettingsOpen(false); }}
                style={bellFlash ? { animation: "bell-flash 0.4s ease-in-out 4" } : undefined}
              >
                <Bell className="h-4 w-4" />
              </Button>
              {unreadCount > 0 && (
                <span
                  aria-label={`${unreadCount} unread notifications`}
                  data-testid="notification-badge"
                  style={{
                    position: "absolute", top: 2, right: 2,
                    minWidth: unreadCount > 9 ? 18 : 16, height: 16,
                    borderRadius: 8, background: "#FF5252", color: "#fff",
                    fontFamily: "JetBrains Mono, monospace", fontSize: 9, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "0 3px", pointerEvents: "none", lineHeight: 1,
                  }}
                >
                  {badgeLabel}
                </span>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              data-testid="button-reports"
              title="Reports"
              onClick={openReports}
            >
              <FileText className="h-4 w-4" />
            </Button>

            {/* Settings cog */}
            <Button
              variant="ghost"
              size="icon"
              data-testid="button-settings"
              onClick={() => { setSettingsOpen(o => !o); setNotifOpen(false); }}
            >
              <Settings className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              data-testid="button-logout"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Panels */}
      {notifOpen && (
        <NotificationPanel
          entries={filteredEntries}
          acknowledgedIds={acknowledgedIds}
          onAcknowledge={acknowledge}
          onAcknowledgeAll={acknowledgeAll}
          onClose={() => setNotifOpen(false)}
        />
      )}
      {settingsOpen && (
        <SettingsPanel onClose={() => setSettingsOpen(false)} />
      )}

      <style>{`
        @keyframes bell-flash {
          0%   { color: inherit; }
          50%  { color: #FF5252; filter: drop-shadow(0 0 4px #FF5252); }
          100% { color: inherit; }
        }
      `}</style>
    </>
  );
}
