import { useQuery } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/dashboard-header";
import { DateTimeBar } from "@/components/date-time-bar";
import { BottomTicker } from "@/components/bottom-ticker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { IdentityTabs } from "./components/IdentityTabs";
import { IdentityMetricCard } from "./components/IdentityMetricCard";
import { 
  Zap, 
  TrendingUp,
  TrendingDown,
  Minus,
  Database,
  Activity
} from "lucide-react";

const defaultTickerItems = [
  { id: '1', symbol: 'BTC/USD', price: '97842.50', change: 2.34, changePercent: '2.34', depth: '$42.8M', spread: '0.02%', volume: '$1.2B', timestamp: new Date().toISOString() },
  { id: '2', symbol: 'ETH/USD', price: '3654.80', change: 1.89, changePercent: '1.89', depth: '$28.2M', spread: '0.03%', volume: '$892M', timestamp: new Date().toISOString() },
  { id: '3', symbol: 'SOL/USD', price: '242.15', change: -0.78, changePercent: '-0.78', depth: '$15.1M', spread: '0.04%', volume: '$456M', timestamp: new Date().toISOString() },
];

interface PoLiPlusMetric {
  metric: string;
  value: string;
  benchmark: string;
  status: 'GOOD' | 'CAUTION' | 'CRITICAL';
  change24h: number;
  source: string;
}

export default function PoliPlusPage() {
  const { data: metrics, isLoading } = useQuery<PoLiPlusMetric[]>({
    queryKey: ['/api/identity/poli-plus'],
    queryFn: async () => {
      const response = await fetch('/api/identity/poli-plus');
      if (!response.ok) throw new Error('Failed to fetch PoLi+ metrics');
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <DashboardHeader />
        <IdentityTabs />
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const goodMetrics = metrics?.filter(m => m.status === 'GOOD').length || 0;
  const cautionMetrics = metrics?.filter(m => m.status === 'CAUTION').length || 0;
  const criticalMetrics = metrics?.filter(m => m.status === 'CRITICAL').length || 0;

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-3 w-3" />;
    if (change < 0) return <TrendingDown className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-500';
    if (change < 0) return 'text-red-500';
    return 'text-muted-foreground';
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-[72px]">
      <DashboardHeader />
      <IdentityTabs />
      <DateTimeBar />

      <div className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className="h-5 w-5 text-green-400" />
          <div>
            <span className="font-semibold text-sm">POLI+ ENHANCED LIQUIDITY METRICS</span>
            <p className="text-[10px] text-muted-foreground">
              PoLi Score augmented with Arkham entity intelligence
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="default" className="text-[10px]">{goodMetrics} Good</Badge>
          <Badge variant="secondary" className="text-[10px]">{cautionMetrics} Caution</Badge>
          {criticalMetrics > 0 && (
            <Badge variant="destructive" className="text-[10px]">{criticalMetrics} Critical</Badge>
          )}
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4">
        <Card className="bg-gradient-to-r from-primary/10 to-cyan-400/10 border-primary/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/20">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">PoLi+ Intelligence Suite</h2>
                <p className="text-sm text-muted-foreground">
                  Enhanced liquidity metrics combining on-chain entity data with traditional market depth analysis
                </p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Activity className="h-4 w-4 text-green-500 animate-pulse" />
                <span className="text-xs font-mono text-green-500">REAL-TIME</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics?.map((metric) => (
            <IdentityMetricCard
              key={metric.metric}
              title={metric.metric}
              value={metric.value}
              status={metric.status}
              benchmark={metric.benchmark}
              change={metric.change24h}
              source={metric.source}
            />
          ))}
        </div>

        <Card className="bg-card border-border" data-testid="table-poli-plus-details">
          <CardHeader className="pb-2 pt-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">DETAILED METRICS BREAKDOWN</CardTitle>
              <Badge variant="outline" className="text-[10px]">
                <Database className="h-3 w-3 mr-1" />
                {metrics?.length || 0} Metrics
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-2 px-4 font-medium text-muted-foreground">Metric</th>
                    <th className="text-right py-2 px-4 font-medium text-muted-foreground">Value</th>
                    <th className="text-right py-2 px-4 font-medium text-muted-foreground">Benchmark</th>
                    <th className="text-center py-2 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-right py-2 px-4 font-medium text-muted-foreground">24H Change</th>
                    <th className="text-left py-2 px-4 font-medium text-muted-foreground">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics?.map((metric) => (
                    <tr 
                      key={metric.metric}
                      className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                    >
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          <Zap className="h-3.5 w-3.5 text-green-400" />
                          <span className="font-medium">{metric.metric}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-semibold">
                        {metric.value}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-muted-foreground">
                        {metric.benchmark}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <Badge 
                          variant={
                            metric.status === 'GOOD' ? 'default' : 
                            metric.status === 'CAUTION' ? 'secondary' : 'destructive'
                          }
                          className="text-[10px] min-w-[60px]"
                        >
                          {metric.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className={`flex items-center justify-end gap-1 font-mono ${getChangeColor(metric.change24h)}`}>
                          {getChangeIcon(metric.change24h)}
                          <span>{metric.change24h > 0 ? '+' : ''}{metric.change24h.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge variant="outline" className="text-[9px]">
                          {metric.source}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomTicker items={defaultTickerItems} />
    </div>
  );
}
