// Session history comparison — uses real stored depth history from the backend.
// No Math.random(). The UI shows a "Collecting baseline..." state when the
// server has insufficient history (< 10 depth snapshots recorded).

export interface MetricDelta {
  value_yesterday: number;
  delta: number;
}

export interface SessionComparison {
  depth10: MetricDelta;
  depth25: MetricDelta;
  depth50: MetricDelta;
  spread: MetricDelta;
  windowLabel: string;
  spanHours: number;
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

// Kept for backward compatibility with components that haven't migrated yet.
// @deprecated — use fetchSessionComparison() and the real API endpoint instead.
export type SyntheticYesterday = {
  depth10: MetricDelta;
  depth25: MetricDelta;
  depth50: MetricDelta;
  factorScore: MetricDelta;
  stability: MetricDelta;
  fragmentation: MetricDelta;
  executionRisk: MetricDelta;
  venues: MetricDelta;
};

export async function fetchSessionComparison(symbol: string): Promise<{
  hasData: boolean;
  reason?: string;
  comparison?: SessionComparison;
}> {
  try {
    const res = await fetch(`/api/analytics/l5f/session-comparison/${encodeURIComponent(symbol)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    if (!json.hasData) {
      return { hasData: false, reason: json.reason ?? "Collecting session baseline..." };
    }

    const c = json.comparison;
    return {
      hasData: true,
      comparison: {
        depth10:  { value_yesterday: c.depth10.prior, delta: c.depth10.deltaPct },
        depth25:  { value_yesterday: c.depth25.prior, delta: c.depth25.deltaPct },
        depth50:  { value_yesterday: c.depth50.prior, delta: c.depth50.deltaPct },
        spread:   { value_yesterday: c.spread.prior,  delta: c.spread.deltaPct },
        windowLabel: json.windowLabel ?? "session start",
        spanHours: json.spanHours ?? 0,
      },
    };
  } catch (err) {
    return { hasData: false, reason: "Session comparison unavailable" };
  }
}

export function deltaFmt(d: number): string {
  return d >= 0 ? `▲ +${d.toFixed(2)}%` : `▼ ${d.toFixed(2)}%`;
}

export function formatUSD(v: number): string {
  return `$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
