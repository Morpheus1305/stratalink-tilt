import { useQuery } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/dashboard-header";
import { DateTimeBar } from "@/components/date-time-bar";
import { BottomTicker } from "@/components/bottom-ticker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { IdentityTabs } from "./components/IdentityTabs";
import { IdentityMetricCard } from "./components/IdentityMetricCard";
import { IdentityChart } from "./components/IdentityChart";
import { 
  Eye, 
  Shield,
  AlertTriangle,
  Globe,
  FileSearch,
  Clock
} from "lucide-react";

const defaultTickerItems = [
  { id: '1', symbol: 'BTC/USD', price: '97842.50', change: 2.34, changePercent: '2.34', depth: '$42.8M', spread: '0.02%', volume: '$1.2B', timestamp: new Date().toISOString() },
  { id: '2', symbol: 'ETH/USD', price: '3654.80', change: 1.89, changePercent: '1.89', depth: '$28.2M', spread: '0.03%', volume: '$892M', timestamp: new Date().toISOString() },
  { id: '3', symbol: 'SOL/USD', price: '242.15', change: -0.78, changePercent: '-0.78', depth: '$15.1M', spread: '0.04%', volume: '$456M', timestamp: new Date().toISOString() },
];

interface RegSurveillanceSnapshot {
  totalEntitiesMonitored: number;
  highRiskEntities: number;
  sanctionedAddresses: number;
  pendingInvestigations: number;
  complianceScore: number;
  recentViolations: Array<{
    id: string;
    type: string;
    entity: string;
    timestamp: string;
    severity: string;
  }>;
  jurisdictionCoverage: Array<{
    region: string;
    coverage: number;
  }>;
}

export default function RegSurveillancePage() {
  const { data: surveillance, isLoading } = useQuery<RegSurveillanceSnapshot>({
    queryKey: ['/api/identity/surveillance'],
    queryFn: async () => {
      const response = await fetch('/api/identity/surveillance');
      if (!response.ok) throw new Error('Failed to fetch surveillance data');
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <DashboardHeader />
        <IdentityTabs />
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </div>
      </div>
    );
  }

  const jurisdictionData = surveillance?.jurisdictionCoverage.map(j => ({
    name: j.region,
    value: j.coverage,
  })) || [];

  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'secondary';
      case 'LOW': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-[72px]">
      <DashboardHeader />
      <IdentityTabs />
      <DateTimeBar />

      <div className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Eye className="h-5 w-5 text-purple-400" />
          <div>
            <span className="font-semibold text-sm">REGULATORY SURVEILLANCE DASHBOARD</span>
            <p className="text-[10px] text-muted-foreground">
              OFAC, EU & global sanctions compliance monitoring
            </p>
          </div>
        </div>
        <Badge 
          variant={surveillance && surveillance.complianceScore > 90 ? 'default' : 'secondary'}
          className="text-xs"
        >
          <Shield className="h-3 w-3 mr-1" />
          Compliance Score: {surveillance?.complianceScore}/100
        </Badge>
      </div>

      <div className="flex-1 p-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <IdentityMetricCard
            title="Entities Monitored"
            value={surveillance?.totalEntitiesMonitored?.toLocaleString() || '0'}
            status="GOOD"
            source="Global Coverage"
          />
          <IdentityMetricCard
            title="High Risk Entities"
            value={surveillance?.highRiskEntities || 0}
            status={surveillance && surveillance.highRiskEntities > 300 ? 'CRITICAL' : 'CAUTION'}
            source="Risk Engine"
          />
          <IdentityMetricCard
            title="Sanctioned Addresses"
            value={surveillance?.sanctionedAddresses?.toLocaleString() || '0'}
            status="CAUTION"
            source="OFAC + EU"
          />
          <IdentityMetricCard
            title="Pending Investigations"
            value={surveillance?.pendingInvestigations || 0}
            status={surveillance && surveillance.pendingInvestigations > 20 ? 'CRITICAL' : 'GOOD'}
            source="Compliance Team"
          />
          <IdentityMetricCard
            title="Compliance Score"
            value={`${surveillance?.complianceScore || 0}/100`}
            status={surveillance && surveillance.complianceScore > 90 ? 'GOOD' : 'CAUTION'}
            benchmark="> 90"
            source="Aggregated"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <IdentityChart
            title="JURISDICTION COVERAGE"
            data={jurisdictionData}
            type="bar"
            dataKey="value"
          />

          <Card className="bg-card border-border" data-testid="card-jurisdiction-details">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Globe className="h-4 w-4 text-purple-400" />
                JURISDICTION COMPLIANCE STATUS
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="space-y-4">
                {surveillance?.jurisdictionCoverage.map((jurisdiction) => (
                  <div key={jurisdiction.region} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{jurisdiction.region}</span>
                      <span className={`font-mono ${
                        jurisdiction.coverage > 95 ? 'text-green-500' : 
                        jurisdiction.coverage > 90 ? 'text-yellow-500' : 'text-red-500'
                      }`}>
                        {jurisdiction.coverage}%
                      </span>
                    </div>
                    <Progress 
                      value={jurisdiction.coverage} 
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card border-border" data-testid="table-recent-violations">
          <CardHeader className="pb-2 pt-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
                RECENT COMPLIANCE VIOLATIONS
              </CardTitle>
              <Badge variant="outline" className="text-[10px]">
                <FileSearch className="h-3 w-3 mr-1" />
                {surveillance?.recentViolations.length || 0} Violations
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-2 px-4 font-medium text-muted-foreground">ID</th>
                    <th className="text-left py-2 px-4 font-medium text-muted-foreground">Type</th>
                    <th className="text-left py-2 px-4 font-medium text-muted-foreground">Entity</th>
                    <th className="text-center py-2 px-4 font-medium text-muted-foreground">Severity</th>
                    <th className="text-right py-2 px-4 font-medium text-muted-foreground">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {surveillance?.recentViolations.map((violation) => (
                    <tr 
                      key={violation.id}
                      className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${
                        violation.severity === 'HIGH' ? 'bg-red-500/5' : ''
                      }`}
                    >
                      <td className="py-2.5 px-4 font-mono text-primary">{violation.id}</td>
                      <td className="py-2.5 px-4">
                        <Badge variant="outline" className="text-[10px]">
                          {violation.type}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 font-medium">{violation.entity}</td>
                      <td className="py-2.5 px-4 text-center">
                        <Badge 
                          variant={getSeverityVariant(violation.severity)}
                          className="text-[10px] min-w-[50px]"
                        >
                          {violation.severity}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1 text-muted-foreground font-mono text-[11px]">
                          <Clock className="h-3 w-3" />
                          {new Date(violation.timestamp).toLocaleString()}
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
