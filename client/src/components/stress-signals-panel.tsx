import { AlertTriangle, Info, CheckCircle, XCircle } from "lucide-react";
import type { StressSignal } from "@shared/schema";

interface StressSignalsPanelProps {
  signals: StressSignal[];
}

export function StressSignalsPanel({ signals }: StressSignalsPanelProps) {
  const getIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <XCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />;
      case "warning":
        return <AlertTriangle className="h-3.5 w-3.5 text-primary flex-shrink-0" />;
      case "info":
        return <Info className="h-3.5 w-3.5 text-accent flex-shrink-0" />;
      case "success":
        return <CheckCircle className="h-3.5 w-3.5 text-chart-3 flex-shrink-0" />;
      default:
        return <Info className="h-3.5 w-3.5 flex-shrink-0" />;
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-destructive/10 border-destructive/20";
      case "warning":
        return "bg-primary/10 border-primary/20";
      case "info":
        return "bg-accent/10 border-accent/20";
      case "success":
        return "bg-chart-3/10 border-chart-3/20";
      default:
        return "bg-muted";
    }
  };

  return (
    <div className="p-3 space-y-2" data-testid="card-stress-signals">
      {signals.map((signal) => (
        <div
          key={signal.id}
          className={`p-2.5 rounded-md border ${getSeverityBg(signal.severity)}`}
          data-testid={`signal-${signal.id}`}
        >
          <div className="flex items-start gap-2">
            <div className="mt-0.5">{getIcon(signal.severity)}</div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-semibold leading-tight mb-0.5" data-testid={`text-signal-title-${signal.id}`}>
                {signal.title}
              </h4>
              <p className="text-xs text-muted-foreground leading-snug mb-1.5">
                {signal.description}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                <span className="font-mono">{signal.timestamp}</span>
                <span>·</span>
                <span className="uppercase tracking-wide text-[10px]">{signal.category}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
