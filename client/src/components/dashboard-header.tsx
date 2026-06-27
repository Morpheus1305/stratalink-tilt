import { Button } from "@/components/ui/button";
import { Bell, Settings, Activity, LogOut } from "lucide-react";
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
    <header className="sticky top-0 z-50 border-b border-border bg-card h-14 flex items-center px-4 gap-4">
      {/* Brand — fixed narrow footprint */}
      <div className="flex items-center gap-2 shrink-0">
        <span
          className="font-bold text-xs tracking-widest"
          style={{ fontFamily: "var(--tilt-mono, monospace)", letterSpacing: "0.12em" }}
        >
          STRATA<span style={{ color: "var(--tilt-accent, #00BFA5)" }}>LINK</span>
        </span>
        <span className="text-muted-foreground text-xs hidden md:block" style={{ fontFamily: "var(--tilt-mono, monospace)", fontSize: 8, letterSpacing: "0.08em" }}>
          LIQUIDITY INTELLIGENCE TERMINAL
        </span>
      </div>

      <div className="w-px h-5 bg-border shrink-0" />

      {/* ILU-20 token selector — always centred, always accessible */}
      <div className="flex-1 flex justify-center">
        <ILUTokenSelector />
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <Activity className="h-3 w-3 text-chart-3" />
          <span className="text-chart-3 font-semibold">LIVE</span>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" data-testid="button-notifications">
            <Bell className="h-4 w-4" />
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
