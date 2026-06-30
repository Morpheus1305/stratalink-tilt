import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Bell, Settings, Activity, LogOut, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { useUIState } from "@/contexts/UIStateContext";
import { useQuery } from "@tanstack/react-query";
import { NotificationPanel, type AlertLogEntry } from "@/components/notification-panel";

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
    // Keep at most 500 IDs to prevent unbounded growth
    const arr = Array.from(ids).slice(-500);
    localStorage.setItem(LS_KEY, JSON.stringify(arr));
  } catch {
    // quota exceeded — ignore
  }
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

// ── DashboardHeader ─────────────────────────────────────────────────────────

export function DashboardHeader() {
  const { logout } = useAuth();
  const [, setLocation] = useLocation();
  const { openReports } = useUIState();

  const [panelOpen, setPanelOpen] = useState(false);
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(loadAckedIds);
  // Track whether the bell should flash (new HIGH/CRITICAL unread since last open)
  const [bellFlash, setBellFlash] = useState(false);
  const [prevHighIds, setPrevHighIds] = useState<Set<string>>(new Set());

  // Poll the alert log every 10 s
  const { data: logData } = useQuery<{ entries: AlertLogEntry[] }>({
    queryKey: ["/api/alerts/log"],
    refetchInterval: 10_000,
    staleTime: 5_000,
  });

  const entries: AlertLogEntry[] = logData?.entries ?? [];

  // Unread count = entries not in acknowledgedIds
  const unreadCount = entries.filter((e) => !acknowledgedIds.has(e.id)).length;

  // Flash bell when a new HIGH/CRITICAL alert arrives that hasn't been seen
  useEffect(() => {
    const highUnread = new Set(
      entries
        .filter((e) => (e.severity === "HIGH" || e.severity === "CRITICAL") && !acknowledgedIds.has(e.id))
        .map((e) => e.id)
    );
    const hasNew = Array.from(highUnread).some((id) => !prevHighIds.has(id));
    if (hasNew && highUnread.size > 0) {
      setBellFlash(true);
      const timer = setTimeout(() => setBellFlash(false), 2000);
      return () => clearTimeout(timer);
    }
    setPrevHighIds(highUnread);
  }, [entries]); // eslint-disable-line react-hooks/exhaustive-deps

  const acknowledge = useCallback((id: string) => {
    setAcknowledgedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveAckedIds(next);
      return next;
    });
  }, []);

  const acknowledgeAll = useCallback(() => {
    setAcknowledgedIds((prev) => {
      const next = new Set(prev);
      entries.forEach((e) => next.add(e.id));
      saveAckedIds(next);
      return next;
    });
  }, [entries]);

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  // Badge label
  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-card h-14 flex items-center px-4 gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span
            style={{
              fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
              fontSize: 16,
              fontWeight: 800,
              letterSpacing: "0.10em",
              color: "#D8DEE8",
              whiteSpace: "nowrap",
            }}
          >
            STRATA<span style={{ color: "#00BFA5" }}>LINK</span>{" "}
            <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.15em", color: "#7B8EA3", verticalAlign: "middle" }}>
              LABS
            </span>
          </span>
          <div className="w-px h-5 bg-border shrink-0 hidden sm:block" />
          <span
            className="hidden md:block"
            style={{
              fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
              fontSize: 9,
              letterSpacing: "0.18em",
              color: "#4A5B6E",
              whiteSpace: "nowrap",
              textTransform: "uppercase",
            }}
          >
            Institutional Liquidity Intelligence Terminal
          </span>
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <Activity className="h-3 w-3" style={{ color: "#00E676" }} />
            <span
              style={{
                fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
                fontSize: 10,
                fontWeight: 700,
                color: "#00E676",
                letterSpacing: "0.06em",
              }}
            >
              LIVE
            </span>
          </div>

          <PulseDot />

          {/* Thin separator */}
          <div className="w-px h-5 bg-border mx-1 shrink-0" />

          <div className="flex items-center gap-1">
            {/* Bell with badge */}
            <div style={{ position: "relative", display: "inline-flex" }}>
              <Button
                variant="ghost"
                size="icon"
                data-testid="button-notifications"
                onClick={() => setPanelOpen((o) => !o)}
                style={bellFlash ? { animation: "bell-flash 0.4s ease-in-out 4" } : undefined}
              >
                <Bell className="h-4 w-4" />
              </Button>
              {unreadCount > 0 && (
                <span
                  aria-label={`${unreadCount} unread notifications`}
                  style={{
                    position: "absolute",
                    top: 2,
                    right: 2,
                    minWidth: unreadCount > 9 ? 18 : 16,
                    height: 16,
                    borderRadius: 8,
                    background: "#FF5252",
                    color: "#fff",
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 9,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 3px",
                    pointerEvents: "none",
                    lineHeight: 1,
                  }}
                  data-testid="notification-badge"
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
            <Button variant="ghost" size="icon" data-testid="button-settings">
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

      {/* Slide-out notification panel */}
      {panelOpen && (
        <NotificationPanel
          entries={entries}
          acknowledgedIds={acknowledgedIds}
          onAcknowledge={acknowledge}
          onAcknowledgeAll={acknowledgeAll}
          onClose={() => setPanelOpen(false)}
        />
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
