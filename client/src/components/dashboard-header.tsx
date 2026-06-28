import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, Settings, Activity, LogOut, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { ReportsPanel } from "./reports-panel";

export function DashboardHeader() {
  const { logout } = useAuth();
  const [, setLocation] = useLocation();
  const [showReports, setShowReports] = useState(false);

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

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
        <div className="flex items-center gap-3 shrink-0">
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

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" data-testid="button-notifications">
              <Bell className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              data-testid="button-reports"
              title="Reports"
              onClick={() => setShowReports(true)}
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

      <ReportsPanel isOpen={showReports} onClose={() => setShowReports(false)} />
    </>
  );
}
