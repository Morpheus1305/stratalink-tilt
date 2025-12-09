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

function computeDepthQuality(depthData: any): number {
  if (!depthData || !depthData.aggregate || !depthData.aggregate.levels) {
    return 0;
  }

  const lv = depthData.aggregate.levels;

  const d10 = lv["10"]?.totalUsd ?? 0;
  const d25 = lv["25"]?.totalUsd ?? 0;

  const max10 = 40_000_000;
  const max25 = 80_000_000;

  const score10 = Math.min((d10 / max10) * 100, 100);
  const score25 = Math.min((d25 / max25) * 100, 100);

  return Math.round((score10 * 0.4) + (score25 * 0.6));
}

function computeExecutionEfficiency(fundingData: any): number {
  if (!fundingData) return 50;
  const rate = Math.abs(fundingData.headlineRate ?? 0);
  if (rate < 0.00002) return 90;
  if (rate < 0.00005) return 75;
  if (rate < 0.0001) return 55;
  return 30;
}

function computeLiquidityStability(depthData: any): number {
  if (!depthData?.venues) return 40;

  const okVenues = depthData.venues.filter((v: any) => v.ok);
  if (okVenues.length <= 1) return 25;

  return 55;
}

function computeMarketFragmentation(depthData: any): number {
  if (!depthData?.venues) return 40;

  const okVenues = depthData.venues.filter((v: any) => v.ok);
  if (okVenues.length === 0) return 20;

  const spreads = okVenues.map((v: any) => {
    const mid = v.mid ?? 0;
    return mid > 0 ? Math.abs(mid - depthData.aggregate.mid) / mid : 0;
  });

  const avgSpread = spreads.reduce((a: number, b: number) => a + b, 0) / spreads.length;

  if (avgSpread < 0.0003) return 85;
  if (avgSpread < 0.0007) return 65;
  return 40;
}

function computeRiskConcentration(depthData: any): number {
  if (!depthData?.venues) return 50;

  const ok = depthData.venues.filter((v: any) => v.ok && v.levels);
  if (ok.length === 0) return 20;

  const totals = ok.map((v: any) => v.levels?.["25"]?.totalUsd ?? 0);
  const sum = totals.reduce((a: number, b: number) => a + b, 0);
  if (sum === 0) return 30;

  const topShare = Math.max(...totals) / sum;

  if (topShare < 0.45) return 70;
  if (topShare < 0.65) return 55;
  return 30;
}

function computeFiveFactorScore(dq: number, ee: number, ls: number, mf: number, rc: number): number {
  return Math.round(
    dq * 0.35 +
    ee * 0.20 +
    ls * 0.15 +
    mf * 0.15 +
    rc * 0.15
  );
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

interface LiquidityFiveFactorPanelProps {
  symbol?: string;
  depthData?: any;
  fundingData?: any;
  side?: "buy" | "sell";
}

export function LiquidityFiveFactorPanel({ symbol = "BTC", depthData, fundingData }: LiquidityFiveFactorPanelProps) {
  const { tsleData } = useLiquidityStore();
  const storeData = tsleData[symbol];

  const depthQuality = depthData ? computeDepthQuality(depthData) : (storeData?.fiveFactor?.factors?.depthQuality ?? 0);
  const executionEfficiency = fundingData ? computeExecutionEfficiency(fundingData) : (storeData?.fiveFactor?.factors?.executionEfficiency ?? 0);
  const liquidityStability = depthData ? computeLiquidityStability(depthData) : (storeData?.fiveFactor?.factors?.liquidityStability ?? 0);
  const marketFragmentation = depthData ? computeMarketFragmentation(depthData) : (storeData?.fiveFactor?.factors?.marketFragmentation ?? 0);
  const riskConcentration = depthData ? computeRiskConcentration(depthData) : (storeData?.fiveFactor?.factors?.riskConcentration ?? 0);

  const totalScore = (depthData || fundingData) 
    ? computeFiveFactorScore(depthQuality, executionEfficiency, liquidityStability, marketFragmentation, riskConcentration)
    : (storeData?.fiveFactor?.score ?? 0);

  return (
    <FiveFactorCard
      score={totalScore}
      depthQuality={depthQuality}
      executionEfficiency={executionEfficiency}
      liquidityStability={liquidityStability}
      marketFragmentation={marketFragmentation}
      riskConcentration={riskConcentration}
    />
  );
}

export default LiquidityFiveFactorPanel;
