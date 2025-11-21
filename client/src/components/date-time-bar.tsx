import { Clock } from "lucide-react";
import { useEffect, useState } from "react";

export function DateTimeBar() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formattedTime = currentTime.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short'
  });

  return (
    <div 
      className="fixed bottom-10 left-0 right-0 z-40 border-t border-border bg-card h-8 flex items-center px-4"
      data-testid="date-time-bar"
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
        <Clock className="h-3 w-3" />
        <span data-testid="text-datetime">{formattedTime}</span>
      </div>
      <div className="ml-auto text-xs text-muted-foreground font-mono">
        STRATALINK LABS LIQUIDITY INTELLIGENCE TERMINAL
      </div>
    </div>
  );
}
