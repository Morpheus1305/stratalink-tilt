import { Button } from "@/components/ui/button";
import { Bell, Settings, Activity, LogOut, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { useUIState } from "@/contexts/UIStateContext";

function PulseDot() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" style={{ flexShrink: 0 }} aria-hidden="true">
      <defs>
        <radialGradient id="pd-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#00E676" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#00E676" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Outer glow halo */}
      <circle cx="8" cy="8" r="7" fill="url(#pd-glow)">
        <animate attributeName="opacity" values="0.2;0.8;0.2" dur="2s" repeatCount="indefinite" />
      </circle>
      {/* Core dot */}
      <circle cx="8" cy="8" r="4" fill="#00E676">
        <animate attributeName="r"       values="3.5;4.5;3.5" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.5;1;0.5"   dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

export function DashboardHeader() {
  const { logout } = useAuth();
  const [, setLocation] = useLocation();
  const { openReports } = useUIState();

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  return (
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
            <Button variant="ghost" size="icon" data-testid="button-notifications">
              <Bell className="h-4 w-4" />
            </Button>
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
  );
}
