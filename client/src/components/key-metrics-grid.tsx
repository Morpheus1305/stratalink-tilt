import { Card } from "@/components/ui/card";
import { ArrowUp, ArrowDown } from "lucide-react";
import type { KeyMetric } from "@shared/schema";

interface KeyMetricsGridProps {
  metrics: KeyMetric[];
}

export function KeyMetricsGrid({ metrics }: KeyMetricsGridProps) {
  return (
    <div className="space-y-3 p-4">
      <h3 className="text-sm font-semibold tracking-wide">KEY LIQUIDITY METRICS</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {metrics.map((metric) => (
          <Card 
            key={metric.id} 
            className="p-4 border-card-border"
            data-testid={`card-key-metric-${metric.id}`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground tracking-wide uppercase">
                  {metric.label}
                </span>
                {metric.trend === 'up' ? (
                  <ArrowUp className="h-3 w-3 text-chart-3" />
                ) : metric.trend === 'down' ? (
                  <ArrowDown className="h-3 w-3 text-destructive" />
                ) : null}
              </div>
              
              <div className="font-mono text-3xl font-bold" data-testid={`text-metric-value-${metric.id}`}>
                {typeof metric.value === 'number' 
                  ? metric.value.toLocaleString() 
                  : metric.value}
                {metric.unit && <span className="text-base ml-1">{metric.unit}</span>}
              </div>
              
              <div className="flex items-center gap-1">
                <span 
                  className={`text-xs font-medium ${
                    metric.trend === 'up' 
                      ? 'text-chart-3' 
                      : metric.trend === 'down'
                      ? 'text-destructive'
                      : 'text-muted-foreground'
                  }`}
                  data-testid={`text-metric-change-${metric.id}`}
                >
                  {metric.changePercent > 0 ? '+' : ''}{metric.changePercent.toFixed(1)}%
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
