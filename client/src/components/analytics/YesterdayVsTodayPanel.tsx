import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TT } from "@/components/tilt-tooltip";
import { formatUSD } from "@/utils/syntheticHistory";

interface YesterdayVsTodayPanelProps {
  symbol: string;
  depth10bps: number;
  depth25bps: number;
  depth50bps: number;
  factorScore: number;
  fragmentation: number;
  venueCount: number;
  stability?: number;
  executionRisk?: number;
}

function DeltaDisplay({
  value,
  prior,
  deltaPct,
  formatFn = (v: number) => v.toFixed(0),
  label,
}: {
  value: number;
  prior: number;
  deltaPct: number;
  formatFn?: (v: number) => string;
  label: string;
}) {
  const isPositive = deltaPct >= 0;
  return (
    <div data-testid={`metric-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold text-foreground font-mono">
        {formatFn(value)}
      </div>
      <div className={`text-sm font-mono ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
        {isPositive ? "▲" : "▼"} {Math.abs(deltaPct).toFixed(2)}%
        <span className="text-muted-foreground ml-1">
          vs {formatFn(prior)}
        </span>
      </div>
    </div>
  );
}

function StaticDisplay({
  value,
  formatFn = (v: number) => v.toFixed(0),
  label,
}: {
  value: number;
  formatFn?: (v: number) => string;
  label: string;
}) {
  return (
    <div data-testid={`metric-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold text-foreground font-mono">
        {formatFn(value)}
      </div>
      <div className="text-sm text-muted-foreground font-mono">—</div>
    </div>
  );
}

export function YesterdayVsTodayPanel({
  symbol,
  depth10bps,
  depth25bps,
  depth50bps,
  factorScore,
  fragmentation,
  venueCount,
}: YesterdayVsTodayPanelProps) {
  const { data: compData } = useQuery({
    queryKey: ["/api/analytics/l5f/session-comparison", symbol],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/l5f/session-comparison/${encodeURIComponent(symbol)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const hasData = compData?.hasData === true;
  const c = compData?.comparison;
  const windowLabel = compData?.windowLabel ?? "session start";

  return (
    <Card className="bg-card border-border" data-testid="panel-yesterday-vs-today">
      <CardHeader className="pb-2">
        <TT
          title="Session Comparison"
          body="Compares current depth metrics against the oldest available session window stored in the depth history buffer. Deltas reflect real structural changes. 'Collecting baseline' appears until 10+ depth snapshots have been recorded."
        >
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <span className="text-[#00D9FF]">⟳</span>
            Session Comparison — {symbol}
          </CardTitle>
        </TT>
        <p className="text-sm text-muted-foreground">
          {hasData
            ? `Liquidity posture vs ${windowLabel} (${compData?.pointCount} snapshots)`
            : compData?.reason ?? "Collecting session baseline…"}
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {!hasData ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
            <div className="w-10 h-10 rounded-full border-2 border-[#00D9FF]/30 border-t-[#00D9FF] animate-spin" />
            <div className="text-sm text-muted-foreground">
              {compData?.reason ?? "Depth history accumulating…"}
            </div>
            <div className="text-xs text-muted-foreground">
              {compData?.pointsCollected ?? 0} / 10 snapshots recorded
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-6">
              <DeltaDisplay
                value={depth10bps}
                prior={c.depth10.prior}
                deltaPct={c.depth10.deltaPct}
                formatFn={formatUSD}
                label="10bps Depth"
              />
              <DeltaDisplay
                value={depth25bps}
                prior={c.depth25.prior}
                deltaPct={c.depth25.deltaPct}
                formatFn={formatUSD}
                label="25bps Depth"
              />
              <DeltaDisplay
                value={depth50bps}
                prior={c.depth50.prior}
                deltaPct={c.depth50.deltaPct}
                formatFn={formatUSD}
                label="50bps Depth"
              />
            </div>

            <div className="grid grid-cols-3 gap-6">
              <StaticDisplay
                value={factorScore}
                formatFn={(v) => `${Math.round(v)}/100`}
                label="5-Factor Score"
              />
              <StaticDisplay
                value={fragmentation}
                formatFn={(v) => Math.round(v).toString()}
                label="Market Fragmentation"
              />
              <StaticDisplay
                value={venueCount}
                formatFn={(v) => Math.round(v).toString()}
                label="Venue Count"
              />
            </div>

            <div className="pt-4 border-t border-border">
              <div className="text-sm text-muted-foreground">
                {c.depth10.deltaPct > 0
                  ? "Depth improved across tight bands."
                  : "Depth softened, driven by reduced bid support at 10–25bps."}
                {" "}
                {c.spread.deltaPct < 0
                  ? "Spread tightened — positive liquidity signal."
                  : "Spread widened — monitor for structural deterioration."}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
