import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Layers, Shield, Grid3x3, Target } from "lucide-react";
import { useLiquidityStore } from "@/state/useLiquidityStore";

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

interface FiveFactorCardProps {
  score: number;
  depthQuality: number;
  executionEfficiency: number;
  liquidityStability: number;
  marketFragmentation: number;
  riskConcentration: number;
}

export function FiveFactorCard({
  score,
  depthQuality,
  executionEfficiency,
  liquidityStability,
  marketFragmentation,
  riskConcentration,
}: FiveFactorCardProps) {
  const getRating = (s: number): string => {
    if (s >= 90) return "AAA";
    if (s >= 80) return "AA";
    if (s >= 70) return "A";
    if (s >= 60) return "BBB";
    if (s >= 50) return "BB";
    return "B";
  };

  const rating = getRating(score);

  return (
    <Card className="border-border/50" data-testid="panel-liquidity-five-factor">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Liquidity 5-Factor Score
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
            value={Math.round(depthQuality)}
            icon={<Layers className="h-3.5 w-3.5" />}
          />
          <FactorBar
            label="Execution Efficiency"
            value={Math.round(executionEfficiency)}
            icon={<Target className="h-3.5 w-3.5" />}
          />
          <FactorBar
            label="Liquidity Stability"
            value={Math.round(liquidityStability)}
            icon={<Shield className="h-3.5 w-3.5" />}
          />
          <FactorBar
            label="Market Fragmentation"
            value={Math.round(marketFragmentation)}
            icon={<Grid3x3 className="h-3.5 w-3.5" />}
          />
          <FactorBar
            label="Risk Concentration"
            value={Math.round(riskConcentration)}
            icon={<Activity className="h-3.5 w-3.5" />}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Wrapper component for backward compatibility - uses store internally
interface LiquidityFiveFactorPanelProps {
  symbol?: string;
  side?: "buy" | "sell";
}

export function LiquidityFiveFactorPanel({ symbol = "BTC" }: LiquidityFiveFactorPanelProps) {
  const { tsleData } = useLiquidityStore();
  const data = tsleData[symbol];

  return (
    <FiveFactorCard
      score={data?.fiveFactor?.score ?? 0}
      depthQuality={data?.fiveFactor?.factors?.depthQuality ?? 0}
      executionEfficiency={data?.fiveFactor?.factors?.executionEfficiency ?? 0}
      liquidityStability={data?.fiveFactor?.factors?.liquidityStability ?? 0}
      marketFragmentation={data?.fiveFactor?.factors?.marketFragmentation ?? 0}
      riskConcentration={data?.fiveFactor?.factors?.riskConcentration ?? 0}
    />
  );
}

export default LiquidityFiveFactorPanel;
