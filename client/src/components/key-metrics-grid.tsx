import { Card } from "@/components/ui/card";
import { ArrowUp, ArrowDown } from "lucide-react";
import type { KeyMetric } from "@shared/schema";
import { TT } from "@/components/tilt-tooltip";

const KEY_METRIC_TIPS: Record<string, string> = {
  "TOTAL DEPTH":       "Aggregate order book depth across all venues and bands. Measures available liquidity from $0 to the 50 bps band.",
  "DEPTH AT 10BPS":    "Order book depth within 10 basis points of mid-price. This is the most actionable liquidity band for institutional execution.",
  "SPREAD SIGMA":      "Spread volatility - how much the bid-ask spread is fluctuating over the past hour. High sigma means unstable execution costs.",
  "FRAGMENTATION IDX": "Herfindahl-Hirschman Index (HHI) measuring how concentrated liquidity is across venues. Above 0.35 = concentrated/fragmented.",
  "RESILIENCE SCORE":  "Measures how quickly order book depth recovers after a large trade. Low resilience means depth does not replenish quickly after execution.",
  "REGIME STABILITY":  "Composite score measuring whether the current market regime (vol, volume, correlations) is stable. Low stability = elevated risk of sudden regime change.",
  "EXECUTION QUALITY": "Composite measure of whether institutional-size orders can be executed cleanly at current market conditions. Below 0.5 = degraded.",
  "VENUE COUNT":       "Number of venues currently contributing live data. Below 10 active venues means coverage is partial and aggregate metrics may not be reliable.",
};

interface KeyMetricsGridProps {
  metrics: KeyMetric[];
}

export function KeyMetricsGrid({ metrics }: KeyMetricsGridProps) {
  return (
    <div className="space-y-3 p-4">
      <TT title="Key Liquidity Metrics" body="Detailed breakdown of the individual liquidity dimensions that feed into the PoLi composite score. Each card shows the current value, trend direction, and 24-hour change. These metrics are computed from live venue data refreshed every 10 seconds.">
        <h3 className="text-sm font-semibold tracking-wide">KEY LIQUIDITY METRICS</h3>
      </TT>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {metrics.map((metric) => (
          <Card 
            key={metric.id} 
            className="p-4 border-card-border"
            data-testid={`card-key-metric-${metric.id}`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <TT title={metric.label} body={KEY_METRIC_TIPS[metric.label] ?? `${metric.label.toLowerCase()} — a key liquidity indicator derived from live venue data.`}>
                  <span className="text-xs text-muted-foreground tracking-wide uppercase">
                    {metric.label}
                  </span>
                </TT>
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
