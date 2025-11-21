import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bell, Settings, Activity, Home, Clock } from "lucide-react";
import { Link } from "wouter";

export function DashboardHeader() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formattedDateTime = currentTime.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'UTC',
    timeZoneName: 'short'
  });

  return (
    <header className="sticky top-0 z-50 border-b border-border h-14 flex items-center px-4 bg-card">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary flex items-center justify-center">
          <div className="text-primary font-bold text-sm">SL</div>
        </div>
        <span className="font-semibold text-sm tracking-tight">STRATALINK LABS LIQUIDITY INTELLIGENCE TERMINAL</span>
      </div>

      <nav className="ml-8 flex items-center gap-1">
        <Link href="/">
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
        <Link href="/platform">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs font-medium"
            data-testid="button-nav-liquidity"
          >
            OVERVIEW
          </Button>
        </Link>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-xs font-medium"
          data-testid="button-nav-analytics"
        >
          ANALYTICS
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-xs font-medium"
          data-testid="button-nav-signals"
        >
          SIGNALS
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-xs font-medium"
          data-testid="button-nav-reports"
        >
          REPORTS
        </Button>
      </nav>

      <div className="ml-auto flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs font-mono">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-foreground" data-testid="text-header-datetime">{formattedDateTime}</span>
        </div>

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
        </div>
      </div>
    </header>
  );
}
