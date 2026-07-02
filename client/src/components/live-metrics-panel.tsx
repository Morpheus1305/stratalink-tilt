import { Card } from "@/components/ui/card";
import { ArrowUp, ArrowDown } from "lucide-react";
import type { LiveMetric } from "@shared/schema";
import { TT } from "@/components/tilt-tooltip";

const LIVE_METRIC_TIPS: Record<string, string> = {
  "MARKET DEPTH":   "Total order book depth within 10 bps of mid-price across all active venues. Higher = more liquidity available without materially moving the price.",
  "BID-ASK SPREAD": "Best bid minus best ask price, averaged across venues. Tighter spread = better execution conditions and lower slippage for institutional orders.",
  "VOLATILITY 24H": "24-hour realised price volatility. Rising volatility often precedes or accompanies liquidity withdrawal. Low vol during fragmentation is a structural warning sign.",
  "CEX/DEX RATIO":  "Centralised vs decentralised exchange liquidity split. High CEX = more lit-venue depth. High DEX = more AMM-sourced liquidity, which is less reliable under stress.",
  "LIQUIDITY SCORE":"Overall PoLi composite score (0-100) derived from the L5F 5-factor model. Below 50 = fragile. Below 25 = emergency conditions. Refreshes every 10 seconds.",
  "POLI RATING":    "Letter rating derived from PoLi score. AAA = institutional-grade. CCC and below = unreliable at scale. Analogous to credit ratings applied to market liquidity.",
};

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
            <TT title={metric.label} body={LIVE_METRIC_TIPS[metric.label] ?? `Live ${metric.label.toLowerCase()} metric. Refreshes every 10 seconds.`}>
              <div className="text-xs text-muted-foreground tracking-wide uppercase">
                {metric.label}
              </div>
            </TT>
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
