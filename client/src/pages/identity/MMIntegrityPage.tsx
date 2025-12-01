import { useQuery } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/dashboard-header";
import { DateTimeBar } from "@/components/date-time-bar";
import { BottomTicker } from "@/components/bottom-ticker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { IdentityTabs } from "./components/IdentityTabs";
import { IdentityMetricCard } from "./components/IdentityMetricCard";
import { IdentityChart } from "./components/IdentityChart";
import { 
  Shield, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";

const defaultTickerItems = [
  { id: '1', symbol: 'BTC/USD', price: '97842.50', change: 2.34, changePercent: '2.34', depth: '$42.8M', spread: '0.02%', volume: '$1.2B', timestamp: new Date().toISOString() },
  { id: '2', symbol: 'ETH/USD', price: '3654.80', change: 1.89, changePercent: '1.89', depth: '$28.2M', spread: '0.03%', volume: '$892M', timestamp: new Date().toISOString() },
  { id: '3', symbol: 'SOL/USD', price: '242.15', change: -0.78, changePercent: '-0.78', depth: '$15.1M', spread: '0.04%', volume: '$456M', timestamp: new Date().toISOString() },
];

interface MMIntegrityScore {
  entity: string;
  integrityScore: number;
  washTradingRisk: string;
  spoofingRisk: string;
  layeringRisk: string;
  avgSpreadAdherence: number;
  uptimePercentage: number;
  lastAssessment: string;
}

export default function MMIntegrityPage() {
  const { data: mmScores, isLoading } = useQuery<MMIntegrityScore[]>({
    queryKey: ['/api/identity/mm-integrity'],
    queryFn: async () => {
      const response = await fetch('/api/identity/mm-integrity');
      if (!response.ok) throw new Error('Failed to fetch MM integrity scores');
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
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const avgIntegrity = mmScores 
    ? mmScores.reduce((sum, mm) => sum + mm.integrityScore, 0) / mmScores.length 
    : 0;
  
  const highRiskCount = mmScores?.filter(mm => 
    mm.washTradingRisk === 'High' || mm.spoofingRisk === 'High'
  ).length || 0;

  const avgUptime = mmScores 
    ? mmScores.reduce((sum, mm) => sum + mm.uptimePercentage, 0) / mmScores.length 
    : 0;

  const integrityChartData = mmScores?.map(mm => ({
    name: mm.entity.split(' ')[0],
    value: mm.integrityScore,
  })) || [];

  const getRiskBadgeVariant = (risk: string) => {
    switch (risk) {
      case 'Low': return 'default';
      case 'Medium': return 'secondary';
      case 'High': return 'destructive';
      default: return 'outline';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'Low': return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'Medium': return <AlertTriangle className="h-3 w-3 text-yellow-500" />;
      case 'High': return <XCircle className="h-3 w-3 text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-[72px]">
      <DashboardHeader />
      <IdentityTabs />
      <DateTimeBar />

      <div className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-cyan-400" />
          <span className="font-semibold text-sm">MARKET MAKER INTEGRITY ASSESSMENT</span>
        </div>
        <Badge variant="outline" className="text-xs">
          {mmScores?.length || 0} MMs Monitored
        </Badge>
      </div>

      <div className="flex-1 p-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <IdentityMetricCard
            title="Avg Integrity Score"
            value={`${avgIntegrity.toFixed(0)}/100`}
            status={avgIntegrity > 75 ? 'GOOD' : avgIntegrity > 50 ? 'CAUTION' : 'CRITICAL'}
            benchmark="> 75"
            source="Arkham Analysis"
          />
          <IdentityMetricCard
            title="High Risk MMs"
            value={highRiskCount}
            status={highRiskCount === 0 ? 'GOOD' : highRiskCount < 3 ? 'CAUTION' : 'CRITICAL'}
            source="Risk Engine"
          />
          <IdentityMetricCard
            title="Avg Uptime"
            value={`${avgUptime.toFixed(1)}%`}
            status={avgUptime > 98 ? 'GOOD' : avgUptime > 95 ? 'CAUTION' : 'CRITICAL'}
            benchmark="> 98%"
            source="Exchange Data"
          />
          <IdentityMetricCard
            title="MMs Assessed"
            value={mmScores?.length || 0}
            status="GOOD"
            source="Active Coverage"
          />
        </div>

        <IdentityChart
          title="INTEGRITY SCORES BY MARKET MAKER"
          data={integrityChartData}
          type="bar"
          dataKey="value"
        />

        <Card className="bg-card border-border" data-testid="table-mm-integrity">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-semibold">MARKET MAKER INTEGRITY BREAKDOWN</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-2 px-4 font-medium text-muted-foreground">Entity</th>
                    <th className="text-center py-2 px-4 font-medium text-muted-foreground">Integrity</th>
                    <th className="text-center py-2 px-4 font-medium text-muted-foreground">Wash Trading</th>
                    <th className="text-center py-2 px-4 font-medium text-muted-foreground">Spoofing</th>
                    <th className="text-center py-2 px-4 font-medium text-muted-foreground">Layering</th>
                    <th className="text-right py-2 px-4 font-medium text-muted-foreground">Spread Adh.</th>
                    <th className="text-right py-2 px-4 font-medium text-muted-foreground">Uptime</th>
                    <th className="text-right py-2 px-4 font-medium text-muted-foreground">Last Assessed</th>
                  </tr>
                </thead>
                <tbody>
                  {mmScores?.map((mm) => (
                    <tr 
                      key={mm.entity}
                      className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                    >
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-cyan-400" />
                          <span className="font-medium">{mm.entity}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <Badge 
                          variant={mm.integrityScore > 75 ? 'default' : mm.integrityScore > 50 ? 'secondary' : 'destructive'}
                          className="text-[10px] min-w-[50px]"
                        >
                          {mm.integrityScore}/100
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {getRiskIcon(mm.washTradingRisk)}
                          <Badge variant={getRiskBadgeVariant(mm.washTradingRisk)} className="text-[10px]">
                            {mm.washTradingRisk}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {getRiskIcon(mm.spoofingRisk)}
                          <Badge variant={getRiskBadgeVariant(mm.spoofingRisk)} className="text-[10px]">
                            {mm.spoofingRisk}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {getRiskIcon(mm.layeringRisk)}
                          <Badge variant={getRiskBadgeVariant(mm.layeringRisk)} className="text-[10px]">
                            {mm.layeringRisk}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono">
                        {mm.avgSpreadAdherence.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono">
                        {mm.uptimePercentage.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span className="font-mono text-[10px]">
                            {new Date(mm.lastAssessment).toLocaleDateString()}
                          </span>
                        </div>
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
