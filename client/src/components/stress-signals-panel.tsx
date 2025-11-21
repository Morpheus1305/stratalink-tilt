import { Card } from "@/components/ui/card";
import { AlertTriangle, Info, CheckCircle, XCircle } from "lucide-react";
import type { StressSignal } from "@shared/schema";

interface StressSignalsPanelProps {
  signals: StressSignal[];
}

export function StressSignalsPanel({ signals }: StressSignalsPanelProps) {
  const getIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-primary" />;
      case 'info':
        return <Info className="h-4 w-4 text-accent" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-chart-3" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-destructive/10 border-destructive/20';
      case 'warning':
        return 'bg-primary/10 border-primary/20';
      case 'info':
        return 'bg-accent/10 border-accent/20';
      case 'success':
        return 'bg-chart-3/10 border-chart-3/20';
      default:
        return 'bg-muted';
    }
  };

  return (
    <Card className="p-4 border-card-border" data-testid="card-stress-signals">
      <h3 className="text-sm font-semibold mb-4 tracking-wide">STRESS SIGNAL DETECTION</h3>
      
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {signals.map((signal) => (
          <div
            key={signal.id}
            className={`p-3 rounded-md border ${getSeverityBg(signal.severity)}`}
            data-testid={`signal-${signal.id}`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">{getIcon(signal.severity)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-semibold" data-testid={`text-signal-title-${signal.id}`}>
                    {signal.title}
                  </h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                  {signal.description}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="font-mono">{signal.timestamp}</span>
                  <span>•</span>
                  <span className="uppercase tracking-wide">{signal.category}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
