import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLiquidityFactors, type LiquidityFactorsData } from "@/hooks/useLiquidityFactors";
import { Activity, Layers, Shield, Grid3x3, Target } from "lucide-react";

interface FactorBarProps {
  label: string;
  value: number;
  icon: React.ReactNode;
}

function FactorBar({ label, value, icon }: FactorBarProps) {
  const getBarColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    if (score >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        <span className="font-mono text-foreground">{value}</span>
      </div>
      <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getBarColor(value)}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function formatUsd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function getRatingColor(rating: string): string {
  switch (rating) {
    case "AAA": return "bg-green-600 text-white";
    case "AA": return "bg-green-500 text-white";
    case "A": return "bg-lime-500 text-white";
    case "BBB": return "bg-yellow-500 text-black";
    case "BB": return "bg-orange-500 text-white";
    case "B": return "bg-red-500 text-white";
    default: return "bg-muted text-foreground";
  }
}

interface LiquidityFiveFactorPanelProps {
  symbol?: string;
  side?: "buy" | "sell";
}

export function LiquidityFiveFactorPanel({ symbol = "BTC", side = "buy" }: LiquidityFiveFactorPanelProps) {
  const { data, isLoading, error } = useLiquidityFactors(symbol, side);

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Liquidity 5-Factor Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            Loading factors...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Liquidity 5-Factor Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            Failed to load factors
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50" data-testid="panel-liquidity-five-factor">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Liquidity 5-Factor Score — {data.symbol}
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xl font-bold text-foreground" data-testid="text-composite-score">
              {data.composite}/100
            </span>
            <Badge className={`${getRatingColor(data.rating)} font-mono`} data-testid="badge-rating">
              {data.rating}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <FactorBar
            label="Depth Quality"
            value={data.factors.depthQuality}
            icon={<Layers className="h-3.5 w-3.5" />}
          />
          <FactorBar
            label="Execution Efficiency"
            value={data.factors.execEfficiency}
            icon={<Target className="h-3.5 w-3.5" />}
          />
          <FactorBar
            label="Liquidity Stability"
            value={data.factors.stability}
            icon={<Shield className="h-3.5 w-3.5" />}
          />
          <FactorBar
            label="Market Fragmentation"
            value={data.factors.fragmentation}
            icon={<Grid3x3 className="h-3.5 w-3.5" />}
          />
          <FactorBar
            label="Risk Concentration"
            value={data.factors.riskConcentration}
            icon={<Activity className="h-3.5 w-3.5" />}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-border/50">
          <div>
            <div className="text-xs text-muted-foreground">Max &lt;10bps</div>
            <div className="font-mono text-sm text-foreground" data-testid="text-max-10bps">
              {formatUsd(data.meta.max10bps)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Max &lt;25bps</div>
            <div className="font-mono text-sm text-foreground" data-testid="text-max-25bps">
              {formatUsd(data.meta.max25bps)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Venues</div>
            <div className="font-mono text-sm text-foreground" data-testid="text-venue-count">
              {data.meta.venueCount}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Top Venue Share</div>
            <div className="font-mono text-sm text-foreground" data-testid="text-top-share">
              {data.meta.topShare}%
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
