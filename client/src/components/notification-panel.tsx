import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { X, Check } from "lucide-react";

export interface AlertLogEntry {
  id: string;
  timeUTC: string;
  alertType: string;
  severity: "CRITICAL" | "HIGH" | "WARNING" | "INFO";
  description: string;
  status: string;
  ts: number;
}

function extractSymbol(desc: string): string | null {
  const first = (desc ?? "").split(/[\s:|]/)[0];
  return /^[A-Z]{2,6}$/.test(first) ? first : null;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  const absDate = new Date(ts);
  return `${String(absDate.getUTCHours()).padStart(2, "0")}:${String(absDate.getUTCMinutes()).padStart(2, "0")} UTC`;
}

const SEV_COLOR: Record<string, string> = {
  CRITICAL: "#FF5252",
  HIGH: "#FF5252",
  WARNING: "#FFB300",
  INFO: "#448AFF",
};

const SEV_LABEL: Record<string, string> = {
  CRITICAL: "HIGH",
  HIGH: "HIGH",
  WARNING: "MEDIUM",
  INFO: "LOW",
};

interface NotificationPanelProps {
  entries: AlertLogEntry[];
  acknowledgedIds: Set<string>;
  onAcknowledge: (id: string) => void;
  onAcknowledgeAll: () => void;
  onClose: () => void;
}

export function NotificationPanel({
  entries,
  acknowledgedIds,
  onAcknowledge,
  onAcknowledgeAll,
  onClose,
}: NotificationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [onClose]);

  const unacked = entries
    .filter((e) => !acknowledgedIds.has(e.id))
    .sort((a, b) => b.ts - a.ts);
  const acked = entries
    .filter((e) => acknowledgedIds.has(e.id))
    .sort((a, b) => b.ts - a.ts);
  const sorted = [...unacked, ...acked];
  const unreadCount = unacked.length;

  return (
    <>
      <div
        style={{ position: "fixed", inset: 0, zIndex: 999 }}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Notifications"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: 400,
          height: "100vh",
          zIndex: 1000,
          background: "#0B1019",
          borderLeft: "1px solid #1A2435",
          display: "flex",
          flexDirection: "column",
          animation: "notif-slide-in 0.2s ease-out",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.6)",
        }}
        data-testid="notification-panel"
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <div
          style={{
            padding: "14px 16px 12px",
            borderBottom: "1px solid #1A2435",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 12,
              fontWeight: 700,
              color: "#00BFA5",
              letterSpacing: "0.12em",
            }}
          >
            NOTIFICATIONS
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {unreadCount > 0 && (
              <button
                onClick={onAcknowledgeAll}
                data-testid="button-mark-all-read"
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 10,
                  color: "#4A5B6E",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Mark All Read
              </button>
            )}
            <button
              onClick={onClose}
              data-testid="button-close-notifications"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#4A5B6E",
                display: "flex",
                alignItems: "center",
                padding: 2,
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {sorted.length === 0 ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 11,
                color: "#4A5B6E",
              }}
            >
              No notifications
            </div>
          ) : (
            sorted.map((entry) => {
              const isAcked = acknowledgedIds.has(entry.id);
              const symbol = extractSymbol(entry.description);
              const sevColor = SEV_COLOR[entry.severity] ?? "#448AFF";
              const sevLabel = SEV_LABEL[entry.severity] ?? "LOW";

              return (
                <div
                  key={entry.id}
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid #1A2435",
                    opacity: isAcked ? 0.55 : 1,
                    transition: "opacity 0.2s",
                  }}
                  data-testid={`notification-entry-${entry.id}`}
                >
                  {/* Row 1: severity · symbol · type · time */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 5,
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        minWidth: 0,
                        overflow: "hidden",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: sevColor,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: 10,
                          fontWeight: 700,
                          color: sevColor,
                          flexShrink: 0,
                        }}
                      >
                        {sevLabel}
                      </span>
                      {symbol && (
                        <span
                          style={{
                            fontFamily: "JetBrains Mono, monospace",
                            fontSize: 11,
                            color: "#00BFA5",
                            flexShrink: 0,
                          }}
                        >
                          {symbol}
                        </span>
                      )}
                      <span
                        style={{
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: 10,
                          color: "#4A5B6E",
                          textTransform: "uppercase",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {entry.alertType}
                      </span>
                    </div>
                    <span
                      style={{
                        fontFamily: "JetBrains Mono, monospace",
                        fontSize: 10,
                        color: "#4A5B6E",
                        flexShrink: 0,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {timeAgo(entry.ts)}
                    </span>
                  </div>

                  {/* Row 2: description */}
                  <div
                    style={{
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: 11,
                      color: isAcked ? "#4A5B6E" : "#7B8EA3",
                      lineHeight: 1.5,
                      marginBottom: 8,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {entry.description}
                  </div>

                  {/* Row 3: actions */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      gap: 10,
                    }}
                  >
                    {isAcked ? (
                      <span
                        style={{
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: 10,
                          color: "#00E676",
                          display: "flex",
                          alignItems: "center",
                          gap: 3,
                        }}
                      >
                        <Check size={10} strokeWidth={3} />
                        Acknowledged
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => onAcknowledge(entry.id)}
                          data-testid={`button-acknowledge-${entry.id}`}
                          style={{
                            fontFamily: "JetBrains Mono, monospace",
                            fontSize: 10,
                            color: "#4A5B6E",
                            background: "#0F151F",
                            border: "1px solid #1A2435",
                            borderRadius: 2,
                            padding: "3px 8px",
                            cursor: "pointer",
                          }}
                        >
                          Acknowledge
                        </button>
                        <button
                          onClick={() => {
                            onClose();
                            setLocation("/platform/alerts");
                          }}
                          data-testid={`button-view-detail-${entry.id}`}
                          style={{
                            fontFamily: "JetBrains Mono, monospace",
                            fontSize: 10,
                            color: "#00BFA5",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: 0,
                          }}
                        >
                          View Detail
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────── */}
        <div
          style={{
            padding: "10px 16px",
            borderTop: "1px solid #1A2435",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 10,
              color: "#4A5B6E",
            }}
          >
            Showing {sorted.length} notification
            {sorted.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={() => {
              onClose();
              setLocation("/platform/alerts");
            }}
            data-testid="button-view-all-alerts"
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 10,
              color: "#00BFA5",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            View All in Alerts →
          </button>
        </div>
      </div>

      <style>{`
        @keyframes notif-slide-in {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
