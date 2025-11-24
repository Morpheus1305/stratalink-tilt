import { useQuery } from "@tanstack/react-query";
import type { AlertsData, DashboardData } from "@shared/schema";
import { DashboardHeader } from "@/components/dashboard-header";
import { PlatformTabs } from "@/components/platform-tabs";
import { LiquidityScoreGauge } from "@/components/liquidity-score-gauge";
import { StressSignalsPanel } from "@/components/stress-signals-panel";
import { BottomTicker } from "@/components/bottom-ticker";
import { DateTimeBar } from "@/components/date-time-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Download, Filter } from "lucide-react";
import { TokenSelector } from "@/components/token-selector";
import { useToken } from "@/contexts/TokenContext";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function Alerts() {
  const { selectedToken, setSelectedToken } = useToken();
  const asset = selectedToken || 'BTC';

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery<DashboardData>({
    queryKey: ['/api/dashboard', asset],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard?asset=${asset}`);
      if (!response.ok) throw new Error('Failed to fetch dashboard data');
      return response.json();
    },
    refetchInterval: 10000,
  });

  const { data: alertsData, isLoading: alertsLoading } = useQuery<AlertsData>({
    queryKey: ['/api/alerts', asset],
    queryFn: async () => {
      const response = await fetch(`/api/alerts?asset=${asset}`);
      if (!response.ok) throw new Error('Failed to fetch alerts data');
      return response.json();
    },
    refetchInterval: 15000,
  });

  const isLoading = dashboardLoading || alertsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm font-mono">LOADING ALERTS...</div>
      </div>
    );
  }

  if (!dashboardData || !alertsData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-destructive text-sm font-mono">ERROR: FAILED TO LOAD DATA</div>
      </div>
    );
  }

  const getRasColor = (ras: string) => {
    if (ras === 'high') return 'bg-destructive';
    if (ras === 'medium') return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getSeverityVariant = (severity: string) => {
    if (severity === 'CRITICAL') return 'destructive';
    if (severity === 'HIGH') return 'destructive';
    if (severity === 'WARNING') return 'secondary';
    return 'outline';
  };

  const getStatusColor = (status: string) => {
    if (status === 'New') return 'text-blue-500';
    if (status === 'Acknowledged') return 'text-green-500';
    return 'text-muted-foreground';
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-[72px]">
      <DashboardHeader />
      <PlatformTabs />

      {/* Asset Selector & Status Bar */}
      <div className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">TOKEN:</span>
          <TokenSelector selectedToken={selectedToken} onChange={setSelectedToken} />
        </div>
        <div className="flex items-center gap-2" data-testid="indicator-live-status">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" data-testid="dot-live-indicator" />
          <span className="text-xs font-mono text-green-500" data-testid="text-live-status">LIVE</span>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {/* Top Row: Liquidity Intelligence + Stress Signals */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground mb-3 tracking-wide">LIQUIDITY INTELLIGENCE</h2>
              <LiquidityScoreGauge scoreData={dashboardData.liquidityScore} />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground mb-3 tracking-wide">STRESS SIGNAL DETECTION</h2>
              <StressSignalsPanel signals={dashboardData.stressSignals} />
            </div>
          </div>

          {/* Key Metrics Strip */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-3" data-testid="card-market-depth">
              <div className="text-xs text-muted-foreground mb-1">MARKET DEPTH</div>
              <div className="text-2xl font-mono font-bold text-foreground" data-testid="text-market-depth-value">
                {dashboardData.liveMetrics.find((m) => m.label === "MARKET DEPTH")?.value}
              </div>
            </Card>
            <Card className="p-3" data-testid="card-volatility">
              <div className="text-xs text-muted-foreground mb-1">VOLATILITY</div>
              <div className="text-2xl font-mono font-bold text-foreground" data-testid="text-volatility-value">
                {dashboardData.liveMetrics.find((m) => m.label === "VOLATILITY 24H")?.value}
              </div>
            </Card>
            <Card className="p-3" data-testid="card-bid-ask-spread">
              <div className="text-xs text-muted-foreground mb-1">BID-ASK SPREAD</div>
              <div className="text-2xl font-mono font-bold text-foreground" data-testid="text-spread-value">
                {dashboardData.liveMetrics.find((m) => m.label === "BID-ASK SPREAD")?.value}
              </div>
            </Card>
          </div>
        </div>

        {/* Alerts Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{asset} - ALERTS & STRESS SIGNALS</h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" data-testid="button-filter-alerts">
                <Filter className="w-4 h-4 mr-2" />
                CRITICAL
              </Button>
              <Button variant="outline" size="sm" className="bg-primary/10 text-primary border-primary" data-testid="button-export-alerts">
                <Download className="w-4 h-4 mr-2" />
                EXPORT
              </Button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            Timeline of abnormal market events, changing liquidity profile and risk
          </div>

          {/* Real-time Risk Indicators */}
          <Card className="p-0">
            <CardHeader className="border-b border-border p-4">
              <CardTitle className="text-sm font-semibold" data-testid="text-risk-indicators-title">
                REAL-TIME RISK INDICATORS - NOVEMBER 21, 2025
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="table-risk-indicators">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-3 text-xs font-semibold text-muted-foreground">INDICATOR</th>
                      <th className="text-left p-3 text-xs font-semibold text-muted-foreground">OBSERVED BEHAVIOR</th>
                      <th className="text-center p-3 text-xs font-semibold text-muted-foreground">RAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alertsData.riskIndicators.map((indicator, index) => (
                      <tr key={index} className="border-b border-border hover-elevate" data-testid={`row-indicator-${index}`}>
                        <td className="p-3">
                          <span className="text-sm" data-testid={`text-indicator-name-${index}`}>{indicator.indicator}</span>
                        </td>
                        <td className="p-3">
                          <span className="text-sm font-mono" data-testid={`text-indicator-behavior-${index}`}>{indicator.observedBehavior}</span>
                        </td>
                        <td className="p-3 flex justify-center">
                          <div className={`w-3 h-3 rounded-full ${getRasColor(indicator.ras)}`} data-testid={`dot-ras-${index}`} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Warning Capacity & Critical Assets */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4 border-yellow-500/30 bg-yellow-500/5" data-testid="card-warning-capacity">
              <div className="text-xs text-muted-foreground mb-2">ACTIVE WARNING CAPACITY</div>
              <div className="text-3xl font-mono font-bold text-yellow-500" data-testid="text-warning-capacity">
                {alertsData.activeWarningCapacity}
              </div>
              <div className="text-xs text-muted-foreground mt-2">SEVERE SESSION BEFORE COLLAPSE</div>
            </Card>
            <Card className="p-4 border-destructive/30 bg-destructive/5" data-testid="card-critical-assets">
              <div className="text-xs text-muted-foreground mb-2">CRITICAL ASSETS</div>
              <div className="text-3xl font-mono font-bold text-destructive" data-testid="text-critical-assets-count">
                {alertsData.criticalAssets.count} <span className="text-lg text-muted-foreground">/ {alertsData.criticalAssets.total}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-2">CRITICAL LIQUIDITY</div>
            </Card>
          </div>

          {/* Alert Timeline Chart */}
          <Card className="p-4" data-testid="card-alert-timeline">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-sm font-semibold" data-testid="text-timeline-title">ALERT TIMELINE - {asset}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={alertsData.alertTimeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.3} />
                  <XAxis 
                    dataKey="time" 
                    stroke="#888"
                    tick={{ fill: '#888', fontSize: 10, fontFamily: 'monospace' }}
                    interval={9}
                  />
                  <YAxis 
                    stroke="#888"
                    tick={{ fill: '#888', fontSize: 12, fontFamily: 'monospace' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1a1a1a', 
                      border: '1px solid #333',
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="critical" 
                    stackId="1"
                    stroke="#ef4444" 
                    fill="#ef4444" 
                    fillOpacity={0.6}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="warning" 
                    stackId="1"
                    stroke="#eab308" 
                    fill="#eab308" 
                    fillOpacity={0.6}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="info" 
                    stackId="1"
                    stroke="#10b981" 
                    fill="#10b981" 
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Alert Log */}
          <Card className="p-0">
            <CardHeader className="border-b border-border p-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold" data-testid="text-alert-log-title">ALERT LOG</CardTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>UTC TIMES</span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="table-alert-log">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-3 text-xs font-semibold text-muted-foreground">TIME (UTC)</th>
                      <th className="text-left p-3 text-xs font-semibold text-muted-foreground">ALERT TYPE</th>
                      <th className="text-center p-3 text-xs font-semibold text-muted-foreground">SEVERITY</th>
                      <th className="text-left p-3 text-xs font-semibold text-muted-foreground">DESCRIPTION</th>
                      <th className="text-center p-3 text-xs font-semibold text-muted-foreground">STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alertsData.alertLog.map((log) => (
                      <tr key={log.id} className="border-b border-border hover-elevate" data-testid={`row-alert-${log.id}`}>
                        <td className="p-3">
                          <span className="font-mono text-sm" data-testid={`text-alert-time-${log.id}`}>{log.timeUTC}</span>
                        </td>
                        <td className="p-3">
                          <span className="text-sm" data-testid={`text-alert-type-${log.id}`}>{log.alertType}</span>
                        </td>
                        <td className="p-3 text-center">
                          <Badge variant={getSeverityVariant(log.severity)} className="font-mono" data-testid={`badge-severity-${log.id}`}>
                            {log.severity}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <span className="text-sm" data-testid={`text-alert-desc-${log.id}`}>{log.description}</span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`text-sm font-mono ${getStatusColor(log.status)}`} data-testid={`text-alert-status-${log.id}`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Date/Time Bar and Ticker */}
      <DateTimeBar />
      <BottomTicker items={dashboardData.tickerItems} />
    </div>
  );
}
