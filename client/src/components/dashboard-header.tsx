import { Button } from "@/components/ui/button";
import { Bell, Settings, Activity, LogOut, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { useUIState } from "@/contexts/UIStateContext";

function LiveOrbit() {
  return (
    <svg
      width="52"
      height="36"
      viewBox="-26 -18 52 36"
      overflow="visible"
      style={{ flexShrink: 0 }}
      aria-hidden="true"
    >
      {/* Outer orbit ring — dashed ellipse */}
      <ellipse
        cx="0" cy="0" rx="18" ry="8"
        fill="none"
        stroke="rgba(0,191,165,0.18)"
        strokeWidth="0.8"
        strokeDasharray="2 3"
      />
      {/* Inner orbit ring — faint second ellipse for depth */}
      <ellipse
        cx="0" cy="0" rx="10" ry="4.5"
        fill="none"
        stroke="rgba(0,191,165,0.09)"
        strokeWidth="0.6"
        strokeDasharray="1.5 2.5"
      />
      {/* Glow behind central planet */}
      <circle cx="0" cy="0" r="6" fill="rgba(0,191,165,0.12)">
        <animate attributeName="r" values="5;7;5" dur="2.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.12;0.22;0.12" dur="2.4s" repeatCount="indefinite" />
      </circle>
      {/* Central planet — pulsing cyan dot */}
      <circle cx="0" cy="0" r="3.8" fill="#00BFA5" opacity="0.92">
        <animate attributeName="opacity" values="0.7;1;0.7" dur="2.4s" repeatCount="indefinite" />
        <animate attributeName="r" values="3.4;4.0;3.4" dur="2.4s" repeatCount="indefinite" />
      </circle>
      {/* Outer orbiting satellite */}
      <circle r="2.8" fill="#D8DEE8">
        <animate attributeName="opacity" values="0.6;1;0.6" dur="3s" repeatCount="indefinite" />
        <animateMotion
          dur="3s"
          repeatCount="indefinite"
          path="M 18,0 A 18,8 0 1,1 17.999,0.01 Z"
        />
      </circle>
      {/* Inner orbiting satellite — opposite phase */}
      <circle r="1.8" fill="rgba(0,191,165,0.7)">
        <animateMotion
          dur="3s"
          repeatCount="indefinite"
          path="M -10,0 A 10,4.5 0 1,1 -9.999,0.01 Z"
        />
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
          {/* LIVE indicator — pushed left of the orbit */}
          <div className="flex items-center gap-1.5 mr-2">
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

          {/* Orbit — padded so overflow:visible content clears neighbours */}
          <div className="px-4 flex items-center justify-center">
            <LiveOrbit />
          </div>

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
