import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TT } from "@/components/tilt-tooltip";
import { generateSyntheticYesterday, formatUSD, type TodayMetrics, type SyntheticYesterday } from "@/utils/syntheticHistory";

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
  yesterday, 
  formatFn = (v: number) => v.toFixed(0),
  label 
}: { 
  value: number; 
  yesterday: { value_yesterday: number; delta: number }; 
  formatFn?: (v: number) => string;
  label: string;
}) {
  const isPositive = yesterday.delta >= 0;
  return (
    <div data-testid={`metric-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold text-foreground font-mono">
        {formatFn(value)}
      </div>
      <div className={`text-sm font-mono ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
        {isPositive ? "▲" : "▼"} {Math.abs(yesterday.delta).toFixed(2)}%
        <span className="text-muted-foreground ml-1">
          vs {formatFn(yesterday.value_yesterday)}
        </span>
      </div>
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
  stability = 50,
  executionRisk = 50,
}: YesterdayVsTodayPanelProps) {
  const yesterday: SyntheticYesterday = useMemo(() => {
    const today: TodayMetrics = {
      depth10: depth10bps,
      depth25: depth25bps,
      depth50: depth50bps,
      factorScore,
      stability,
      fragmentation,
      executionRisk,
      venues: venueCount,
    };
    return generateSyntheticYesterday(today);
  }, [depth10bps, depth25bps, depth50bps, factorScore, stability, fragmentation, executionRisk, venueCount]);

  return (
    <Card className="bg-card border-border" data-testid="panel-yesterday-vs-today">
      <CardHeader className="pb-2">
        <TT title="Yesterday vs Today Comparison" body="Synthetic comparison of current session metrics against simulated prior-session baselines. Highlights structural changes in depth, execution quality, fragmentation, and stability. A negative delta across multiple factors simultaneously is a strong structural deterioration signal.">
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <span className="text-[#00D9FF]">⟳</span>
            Yesterday vs Today  -  {symbol}
          </CardTitle>
        </TT>
        <p className="text-sm text-muted-foreground">
          Comparative liquidity & execution posture relative to the previous session.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-6">
          <DeltaDisplay
            value={depth10bps}
            yesterday={yesterday.depth10}
            formatFn={formatUSD}
            label="10bps Depth"
          />
          <DeltaDisplay
            value={depth25bps}
            yesterday={yesterday.depth25}
            formatFn={formatUSD}
            label="25bps Depth"
          />
          <DeltaDisplay
            value={depth50bps}
            yesterday={yesterday.depth50}
            formatFn={formatUSD}
            label="50bps Depth"
          />
        </div>

        <div className="grid grid-cols-3 gap-6">
          <DeltaDisplay
            value={factorScore}
            yesterday={yesterday.factorScore}
            formatFn={(v) => `${Math.round(v)}/100`}
            label="5-Factor Score"
          />
          <DeltaDisplay
            value={fragmentation}
            yesterday={yesterday.fragmentation}
            formatFn={(v) => Math.round(v).toString()}
            label="Market Fragmentation"
          />
          <DeltaDisplay
            value={venueCount}
            yesterday={yesterday.venues}
            formatFn={(v) => Math.round(v).toString()}
            label="Venue Count"
          />
        </div>

        <div className="pt-4 border-t border-border">
          <div className="text-sm text-muted-foreground">
            {yesterday.depth10.delta > 0
              ? "Depth improved modestly across tight bands."
              : "Depth softened, driven by reduced bid support at 10 - 25bps."}
            {" "}
            {yesterday.factorScore.delta > 0
              ? "Composite liquidity quality strengthened."
              : "Factor score deteriorated, led by stability and fragmentation pressure."}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
