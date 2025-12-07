export interface MetricDelta {
  value_yesterday: number;
  delta: number;
}

export interface SyntheticYesterday {
  depth10: MetricDelta;
  depth25: MetricDelta;
  depth50: MetricDelta;
  factorScore: MetricDelta;
  stability: MetricDelta;
  fragmentation: MetricDelta;
  executionRisk: MetricDelta;
  venues: MetricDelta;
}

export interface TodayMetrics {
  depth10: number;
  depth25: number;
  depth50: number;
  factorScore: number;
  stability: number;
  fragmentation: number;
  executionRisk: number;
  venues: number;
}

export function generateSyntheticYesterday(today: TodayMetrics): SyntheticYesterday {
  const jitter = (value: number, pct: number = 0.08): MetricDelta => {
    const delta = (Math.random() * 2 - 1) * pct;
    return {
      value_yesterday: value * (1 + delta),
      delta: delta * 100,
    };
  };

  return {
    depth10: jitter(today.depth10),
    depth25: jitter(today.depth25),
    depth50: jitter(today.depth50),
    factorScore: jitter(today.factorScore, 0.05),
    stability: jitter(today.stability, 0.05),
    fragmentation: jitter(today.fragmentation, 0.10),
    executionRisk: jitter(today.executionRisk, 0.03),
    venues: jitter(today.venues, 0.10),
  };
}

export function deltaFmt(d: number): string {
  return d >= 0 ? `▲ +${d.toFixed(2)}%` : `▼ ${d.toFixed(2)}%`;
}

export function formatUSD(v: number): string {
  return `$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
