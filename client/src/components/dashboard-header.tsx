import { Button } from "@/components/ui/button";
import { Bell, Settings, Activity, LogOut, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { useUIState } from "@/contexts/UIStateContext";

function LiveOrbit() {
  return (
    <svg
      width="60"
      height="40"
      viewBox="-30 -20 60 40"
      overflow="visible"
      style={{ flexShrink: 0 }}
      aria-hidden="true"
    >
      <defs>
        {/* Paths that satellites follow — mpath is the reliable approach */}
        <path id="lo-path-outer" d="M 22,0 A 22,10 0 1,1 21.999,0.001" fill="none" />
        <path id="lo-path-inner" d="M 12,0 A 12,5.5 0 1,1 11.999,0.001" fill="none" />
        {/* Radial glow for the sun */}
        <radialGradient id="lo-sun-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00BFA5" stopOpacity="0.6" />
          <stop offset="60%" stopColor="#00BFA5" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#00BFA5" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Outer orbit ring */}
      <ellipse cx="0" cy="0" rx="22" ry="10"
        fill="none"
        stroke="rgba(0,191,165,0.40)"
        strokeWidth="0.7"
        strokeDasharray="2 2.5"
      />

      {/* Inner orbit ring */}
      <ellipse cx="0" cy="0" rx="12" ry="5.5"
        fill="none"
        stroke="rgba(0,191,165,0.25)"
        strokeWidth="0.6"
        strokeDasharray="1.5 2"
      />

      {/* Sun glow halo */}
      <circle cx="0" cy="0" r="10" fill="url(#lo-sun-glow)">
        <animate attributeName="r" values="8;11;8" dur="2.5s" repeatCount="indefinite" />
      </circle>

      {/* Sun — bright central star */}
      <circle cx="0" cy="0" r="5" fill="#00E5C8">
        <animate attributeName="r" values="4.5;5.5;4.5" dur="2.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.85;1;0.85" dur="2.5s" repeatCount="indefinite" />
      </circle>
      {/* Sun core highlight */}
      <circle cx="-1.5" cy="-1.5" r="2" fill="rgba(255,255,255,0.35)" />

      {/* Outer planet — grey-white, large */}
      <circle r="3.2" fill="#C8D4E0">
        <animateMotion dur="4s" repeatCount="indefinite" rotate="auto">
          <mpath href="#lo-path-outer" />
        </animateMotion>
      </circle>

      {/* Inner planet — cyan-tinted, small, faster */}
      <circle r="2" fill="#5EEAD4">
        <animateMotion dur="2.2s" repeatCount="indefinite" rotate="auto">
          <mpath href="#lo-path-inner" />
        </animateMotion>
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
