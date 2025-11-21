import { Card } from "@/components/ui/card";
import { ArrowUp, ArrowDown } from "lucide-react";
import type { LiveMetric } from "@shared/schema";

interface LiveMetricsPanelProps {
  metrics: LiveMetric[];
}

export function LiveMetricsPanel({ metrics }: LiveMetricsPanelProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 p-4">
      {metrics.map((metric, index) => (
        <Card 
          key={index} 
          className="p-3 border-card-border"
          data-testid={`card-metric-${metric.label.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <div className="space-y-1.5">
            <div className="text-xs text-muted-foreground tracking-wide uppercase">
              {metric.label}
            </div>
            <div className="font-mono text-xl font-bold" data-testid={`text-value-${metric.label.toLowerCase().replace(/\s+/g, '-')}`}>
              {typeof metric.value === 'number' 
                ? metric.value.toLocaleString() 
                : metric.value}
              {metric.unit && <span className="text-sm ml-1">{metric.unit}</span>}
            </div>
            <div className="flex items-center gap-1">
              {metric.trend === 'up' && (
                <ArrowUp className="h-3 w-3 text-chart-3" />
              )}
              {metric.trend === 'down' && (
                <ArrowDown className="h-3 w-3 text-destructive" />
              )}
              <span 
                className={`text-xs font-medium ${
                  metric.trend === 'up' 
                    ? 'text-chart-3' 
                    : metric.trend === 'down'
                    ? 'text-destructive'
                    : 'text-muted-foreground'
                }`}
                data-testid={`text-change-${metric.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {metric.changePercent > 0 ? '+' : ''}{metric.changePercent.toFixed(1)}%
              </span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
