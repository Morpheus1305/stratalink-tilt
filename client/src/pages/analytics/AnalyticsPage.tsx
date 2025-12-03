import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  BarChart3,
  Zap,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

type StressDriver = {
  category: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  contribution: number;
};

type StressData = {
  stressScore: number;
  regime: "LOW" | "MODERATE" | "HIGH" | "EXTREME";
  drivers: StressDriver[];
  commentary: string;
  ts: number;
};

type DepthBand = {
  bidUSD: number;
  askUSD: number;
  totalUSD: number;
  imbalance: number;
};

type TokenDepth = {
  mid: number;
  spread: number;
  spreadBps: number;
  bands: {
    "10bps": DepthBand;
    "25bps": DepthBand;
    "50bps": DepthBand;
    "100bps": DepthBand;
    "200bps": DepthBand;
  };
  source: string;
  ts: number;
};

type FundingData = {
  fundingRate: number;
  fundingRateAnnualized: number;
  source: string;
};

type IngestionStatus = {
  isIngesting: boolean;
  lastFullIngest: number;
  depthTokens: number;
  fundingTokens: number;
  liquidationTokens: number;
};

function formatUSD(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(4)}%`;
}

function getRegimeColor(regime: string): string {
  switch (regime) {
    case "LOW": return "text-green-400";
    case "MODERATE": return "text-yellow-400";
    case "HIGH": return "text-orange-400";
    case "EXTREME": return "text-red-400";
    default: return "text-gray-400";
  }
}

function getSeverityVariant(severity: string): "default" | "secondary" | "destructive" {
  switch (severity) {
    case "HIGH": return "destructive";
    case "MEDIUM": return "secondary";
    default: return "default";
  }
}

export default function AnalyticsPage() {
  const { data: stress, isLoading: stressLoading } = useQuery<StressData>({
    queryKey: ["/api/analytics/stress"],
    refetchInterval: 5000,
  });

  const { data: depthData, isLoading: depthLoading } = useQuery<{ depth: Record<string, TokenDepth>; summary: any }>({
    queryKey: ["/api/analytics/depth"],
    refetchInterval: 5000,
  });

  const { data: fundingData, isLoading: fundingLoading } = useQuery<{ funding: Record<string, FundingData>; summary: any }>({
    queryKey: ["/api/analytics/funding"],
    refetchInterval: 5000,
  });

  const { data: status } = useQuery<IngestionStatus>({
    queryKey: ["/api/analytics/status"],
    refetchInterval: 5000,
  });

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">STRATA Analytics</h1>
          <p className="text-sm text-muted-foreground">Real-time market structure intelligence</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <RefreshCw className={cn("h-3 w-3", status?.isIngesting && "animate-spin")} />
          <span>
            {status ? `${status.depthTokens} tokens tracked` : "Loading..."}
          </span>
        </div>
      </div>

      {/* Stress Score Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-primary" />
              Stress Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stressLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : stress ? (
              <div className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-mono font-bold text-foreground">
                    {stress.stressScore}
                  </span>
                  <span className="text-muted-foreground">/100</span>
                </div>
                <Badge 
                  variant="outline" 
                  className={cn("text-xs", getRegimeColor(stress.regime))}
                  data-testid="badge-stress-regime"
                >
                  {stress.regime} STRESS
                </Badge>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {stress.commentary}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Active Stress Drivers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stressLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : stress?.drivers?.length ? (
              <div className="space-y-2">
                {stress.drivers.slice(0, 5).map((driver, i) => (
                  <div 
                    key={i} 
                    className="flex items-center justify-between p-2 rounded bg-muted/30"
                    data-testid={`row-driver-${i}`}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant={getSeverityVariant(driver.severity)} className="text-xs">
                        {driver.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{driver.description}</span>
                    </div>
                    <span className="text-xs font-mono text-foreground">+{driver.contribution}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No active stress drivers</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Depth Analysis */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Orderbook Depth (Top 10 Tokens)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {depthLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : depthData?.depth ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-2 text-muted-foreground font-medium">Token</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">Mid Price</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">Spread</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">10bps Depth</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">100bps Depth</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">Imbalance</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(depthData.depth).map(([symbol, data]) => (
                    <tr 
                      key={symbol} 
                      className="border-b border-border/30 hover:bg-muted/20"
                      data-testid={`row-depth-${symbol}`}
                    >
                      <td className="py-2 font-mono font-medium text-foreground">{symbol}</td>
                      <td className="py-2 text-right font-mono text-foreground">
                        ${data.mid.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 text-right font-mono text-muted-foreground">
                        {data.spreadBps.toFixed(2)} bps
                      </td>
                      <td className="py-2 text-right font-mono text-foreground">
                        {formatUSD(data.bands["10bps"]?.totalUSD || 0)}
                      </td>
                      <td className="py-2 text-right font-mono text-foreground">
                        {formatUSD(data.bands["100bps"]?.totalUSD || 0)}
                      </td>
                      <td className="py-2 text-right">
                        <span className={cn(
                          "font-mono",
                          data.bands["10bps"]?.imbalance > 0 ? "text-green-400" : "text-red-400"
                        )}>
                          {data.bands["10bps"]?.imbalance > 0 ? (
                            <TrendingUp className="inline h-3 w-3 mr-1" />
                          ) : (
                            <TrendingDown className="inline h-3 w-3 mr-1" />
                          )}
                          {(data.bands["10bps"]?.imbalance * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2 text-right text-muted-foreground capitalize">
                        {data.source}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No depth data available</p>
          )}
        </CardContent>
      </Card>

      {/* Funding Rates */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Perpetual Funding Rates
          </CardTitle>
        </CardHeader>
        <CardContent>
          {fundingLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : fundingData?.funding ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(fundingData.funding).map(([symbol, data]) => (
                <div 
                  key={symbol} 
                  className="p-4 rounded-lg bg-muted/30 space-y-2"
                  data-testid={`card-funding-${symbol}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-medium text-foreground">{symbol}</span>
                    <Badge variant="outline" className="text-xs capitalize">
                      {data.source}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Current Rate</span>
                      <span className={cn(
                        "font-mono",
                        data.fundingRate >= 0 ? "text-green-400" : "text-red-400"
                      )}>
                        {formatPercent(data.fundingRate)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Annualized</span>
                      <span className={cn(
                        "font-mono",
                        data.fundingRateAnnualized >= 0 ? "text-green-400" : "text-red-400"
                      )}>
                        {data.fundingRateAnnualized.toFixed(2)}% APR
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No funding data available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
