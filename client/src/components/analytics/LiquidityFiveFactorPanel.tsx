import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLiquidityStore } from "@/state/useLiquidityStore";
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
  const { tsleData } = useLiquidityStore();
  const data = tsleData[symbol];

  const getRating = (score: number): string => {
    if (score >= 90) return "AAA";
    if (score >= 80) return "AA";
    if (score >= 70) return "A";
    if (score >= 60) return "BBB";
    if (score >= 50) return "BB";
    return "B";
  };

  if (!data || !data.fiveFactor) {
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

  const score = data.fiveFactor.score;
  const factors = data.fiveFactor.factors;
  const rating = getRating(score);

  return (
    <Card className="border-border/50" data-testid="panel-liquidity-five-factor">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Liquidity 5-Factor Score — {symbol}
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xl font-bold text-foreground" data-testid="text-composite-score">
              {score}/100
            </span>
            <Badge className={`${getRatingColor(rating)} font-mono`} data-testid="badge-rating">
              {rating}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <FactorBar
            label="Depth Quality"
            value={Math.round(factors.depthQuality)}
            icon={<Layers className="h-3.5 w-3.5" />}
          />
          <FactorBar
            label="Execution Efficiency"
            value={Math.round(factors.executionEfficiency)}
            icon={<Target className="h-3.5 w-3.5" />}
          />
          <FactorBar
            label="Liquidity Stability"
            value={Math.round(factors.liquidityStability)}
            icon={<Shield className="h-3.5 w-3.5" />}
          />
          <FactorBar
            label="Market Fragmentation"
            value={Math.round(factors.marketFragmentation)}
            icon={<Grid3x3 className="h-3.5 w-3.5" />}
          />
          <FactorBar
            label="Risk Concentration"
            value={Math.round(factors.riskConcentration)}
            icon={<Activity className="h-3.5 w-3.5" />}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-border/50">
          <div>
            <div className="text-xs text-muted-foreground">TSLE Score</div>
            <div className="font-mono text-sm text-foreground" data-testid="text-tsle-score">
              {data.tsle}/100
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Regime</div>
            <div className="font-mono text-sm text-foreground" data-testid="text-regime">
              {data.regime}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Depth Score</div>
            <div className="font-mono text-sm text-foreground" data-testid="text-depth-score">
              {Math.round(data.depthScore)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Funding Score</div>
            <div className="font-mono text-sm text-foreground" data-testid="text-funding-score">
              {Math.round(data.fundingScore)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
