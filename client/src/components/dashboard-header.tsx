import { Button } from "@/components/ui/button";
import { Bell, Settings, Activity, Home, LogOut } from "lucide-react";
import { Link } from "wouter";
import stratalinkLogo from "@assets/logo_stratalink_1764604924054.png";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { ILUTokenSelector } from "@/components/ilu-token-selector";

export function DashboardHeader() {
  const { logout } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border h-14 flex items-center px-4 bg-card gap-3">
      <div className="flex items-center gap-3 shrink-0">
        <img
          src={stratalinkLogo}
          alt="StrataLink Labs"
          className="w-10 h-10 rounded-full object-cover"
          style={{ filter: "brightness(0) invert(1)" }}
        />
        <span className="font-semibold text-sm tracking-tight whitespace-nowrap">
          STRATALINK LABS LIQUIDITY INTELLIGENCE TERMINAL
        </span>
      </div>

      <nav className="ml-4 flex items-center gap-1 shrink-0">
        <Link href="/platform/tilt">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs font-medium"
            data-testid="button-nav-home"
          >
            <Home className="h-3.5 w-3.5 mr-1.5" />
            HOME
          </Button>
        </Link>
      </nav>

      {/* ILU-20 unified token selector */}
      <div className="ml-auto mr-4">
        <ILUTokenSelector />
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
          <Activity className="h-3 w-3 text-chart-3" />
          <span className="text-chart-3 font-semibold">LIVE</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            data-testid="button-notifications"
          >
            <Bell className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            data-testid="button-settings"
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
  );
}
