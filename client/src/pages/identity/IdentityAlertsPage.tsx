import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard-header";
import { DateTimeBar } from "@/components/date-time-bar";
import { BottomTicker } from "@/components/bottom-ticker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { IdentityTabs } from "./components/IdentityTabs";
import { IdentityMetricCard } from "./components/IdentityMetricCard";
import { 
  AlertTriangle, 
  Filter,
  Clock,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";

const defaultTickerItems = [
  { id: '1', symbol: 'BTC/USD', price: '97842.50', change: 2.34, changePercent: '2.34', depth: '$42.8M', spread: '0.02%', volume: '$1.2B', timestamp: new Date().toISOString() },
  { id: '2', symbol: 'ETH/USD', price: '3654.80', change: 1.89, changePercent: '1.89', depth: '$28.2M', spread: '0.03%', volume: '$892M', timestamp: new Date().toISOString() },
  { id: '3', symbol: 'SOL/USD', price: '242.15', change: -0.78, changePercent: '-0.78', depth: '$15.1M', spread: '0.04%', volume: '$456M', timestamp: new Date().toISOString() },
];

interface IdentityAlert {
  id: string;
  timestamp: string;
  entityId: string;
  entityName: string;
  alertType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  transactionHash?: string;
  amount?: string;
  status: 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED';
}

export default function IdentityAlertsPage() {
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  const { data: alerts, isLoading } = useQuery<IdentityAlert[]>({
    queryKey: ['/api/identity/alerts'],
    queryFn: async () => {
      const response = await fetch('/api/identity/alerts');
      if (!response.ok) throw new Error('Failed to fetch identity alerts');
      return response.json();
    },
    refetchInterval: 15000,
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

  const filteredAlerts = alerts?.filter(alert => 
    severityFilter === 'ALL' || alert.severity === severityFilter
  ) || [];

  const criticalCount = alerts?.filter(a => a.severity === 'CRITICAL').length || 0;
  const highCount = alerts?.filter(a => a.severity === 'HIGH').length || 0;
  const newCount = alerts?.filter(a => a.status === 'NEW').length || 0;
  const acknowledgedCount = alerts?.filter(a => a.status === 'ACKNOWLEDGED').length || 0;

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'destructive';
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'secondary';
      case 'LOW': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'NEW': return <AlertCircle className="h-4 w-4 text-primary" />;
      case 'ACKNOWLEDGED': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'RESOLVED': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return null;
    }
  };

  const truncateHash = (hash: string) => {
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-[72px]">
      <DashboardHeader />
      <IdentityTabs />
      <DateTimeBar />

      <div className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-400" />
          <span className="font-semibold text-sm">IDENTITY ALERTS & ACTIVITY MONITORING</span>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((severity) => (
            <Button
              key={severity}
              variant={severityFilter === severity ? 'secondary' : 'ghost'}
              size="sm"
              className="text-xs h-7"
              onClick={() => setSeverityFilter(severity)}
              data-testid={`filter-${severity.toLowerCase()}`}
            >
              {severity}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <IdentityMetricCard
            title="Critical Alerts"
            value={criticalCount}
            status={criticalCount > 0 ? 'CRITICAL' : 'GOOD'}
            source="Real-time"
          />
          <IdentityMetricCard
            title="High Priority"
            value={highCount}
            status={highCount > 2 ? 'CAUTION' : 'GOOD'}
            source="Real-time"
          />
          <IdentityMetricCard
            title="New Alerts"
            value={newCount}
            status={newCount > 5 ? 'CAUTION' : 'GOOD'}
            source="Unprocessed"
          />
          <IdentityMetricCard
            title="Acknowledged"
            value={acknowledgedCount}
            status="GOOD"
            source="In Review"
          />
        </div>

        <Card className="bg-card border-border" data-testid="table-identity-alerts">
          <CardHeader className="pb-2 pt-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">ALERT LOG</CardTitle>
              <Badge variant="outline" className="text-[10px]">
                {filteredAlerts.length} Alerts
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-2 px-4 font-medium text-muted-foreground">Time</th>
                    <th className="text-center py-2 px-4 font-medium text-muted-foreground">Severity</th>
                    <th className="text-left py-2 px-4 font-medium text-muted-foreground">Entity</th>
                    <th className="text-left py-2 px-4 font-medium text-muted-foreground">Type</th>
                    <th className="text-left py-2 px-4 font-medium text-muted-foreground">Description</th>
                    <th className="text-right py-2 px-4 font-medium text-muted-foreground">Amount</th>
                    <th className="text-center py-2 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-center py-2 px-4 font-medium text-muted-foreground">TX</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAlerts.map((alert) => (
                    <tr 
                      key={alert.id}
                      className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${
                        alert.severity === 'CRITICAL' ? 'bg-red-500/5' : ''
                      }`}
                    >
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {new Date(alert.timestamp).toLocaleString()}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <Badge 
                          variant={getSeverityBadgeVariant(alert.severity)}
                          className="text-[10px] min-w-[60px]"
                        >
                          {alert.severity}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 font-medium">{alert.entityName}</td>
                      <td className="py-2.5 px-4">
                        <Badge variant="outline" className="text-[10px]">
                          {alert.alertType}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground max-w-[200px] truncate">
                        {alert.description}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-semibold text-primary">
                        {alert.amount || '-'}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {getStatusIcon(alert.status)}
                          <span className="text-[10px] text-muted-foreground">{alert.status}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {alert.transactionHash && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2 text-[10px] font-mono text-primary"
                          >
                            {truncateHash(alert.transactionHash)}
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        )}
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
