import type { PoLiMetric } from "@shared/poli";

interface Props {
  metric: PoLiMetric;
}

export default function MetricRow({ metric }: Props) {
  const formattedValue = typeof metric.value === 'number'
    ? metric.value.toFixed(metric.unit === '%' || metric.unit === 'bps' ? 1 : 2)
    : metric.value;

  return (
    <div 
      className="flex justify-between items-center py-2 border-b border-border/50 last:border-0"
      data-testid={`metric-row-${metric.key}`}
    >
      <span className="text-sm text-muted-foreground">{metric.label}</span>
      <span className="font-mono text-sm">
        {formattedValue}
        {metric.unit && (
          <span className="text-muted-foreground ml-1">{metric.unit}</span>
        )}
      </span>
    </div>
  );
}
