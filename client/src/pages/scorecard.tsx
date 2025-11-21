import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ScorecardData, DashboardData } from "@shared/schema";
import { DashboardHeader } from "@/components/dashboard-header";
import { PlatformTabs } from "@/components/platform-tabs";
import { LiquidityScoreGauge } from "@/components/liquidity-score-gauge";
import { StressSignalsPanel } from "@/components/stress-signals-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Download, FileText } from "lucide-react";

export default function Scorecard() {
  const [activeTab, setActiveTab] = useState<'tokenomics' | 'liquidity'>('tokenomics');

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery<DashboardData>({
    queryKey: ['/api/dashboard'],
    refetchInterval: 10000,
  });

  const { data: scorecardData, isLoading: scorecardLoading } = useQuery<ScorecardData>({
    queryKey: ['/api/scorecard', activeTab],
    queryFn: async () => {
      const response = await fetch(`/api/scorecard?type=${activeTab}`);
      if (!response.ok) {
        throw new Error('Failed to fetch scorecard data');
      }
      return response.json();
    },
    refetchInterval: 30000,
  });

  const isLoading = dashboardLoading || scorecardLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm font-mono">LOADING SCORECARD...</div>
      </div>
    );
  }

  if (!dashboardData || !scorecardData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-destructive text-sm font-mono">ERROR: FAILED TO LOAD DATA</div>
      </div>
    );
  }

  const getStatusVariant = (status: string) => {
    if (status === 'GOOD') return 'default';
    if (status === 'CAUTION') return 'secondary';
    return 'destructive';
  };

  const getStatusColor = (status: string) => {
    if (status === 'GOOD') return 'text-green-500 border-green-500 bg-green-500/10';
    if (status === 'CAUTION') return 'text-yellow-500 border-yellow-500 bg-yellow-500/10';
    return 'text-destructive border-destructive bg-destructive/10';
  };

  const currentMetrics = activeTab === 'tokenomics' 
    ? scorecardData.tokenomicsMetrics 
    : scorecardData.liquidityMetrics;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardHeader />
      <PlatformTabs />

      {/* Asset Selector & Status Bar */}
      <div className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">TOKEN:</span>
          <Button data-testid="button-asset-selector" variant="outline" size="sm" className="font-mono text-xs">
            <span className="text-primary font-semibold">SOL</span>
            <span className="ml-2 text-muted-foreground">Solana</span>
          </Button>
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

        {/* Scorecard Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">TOKEN SCORECARD</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Comprehensive analysis of token health, liquidity metrics, and tokenomics health
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" data-testid="button-export-scorecard">
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button variant="outline" size="sm" className="bg-primary/10 text-primary border-primary" data-testid="button-export-pdf">
                <FileText className="w-4 h-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>

          {/* Metrics Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'tokenomics' | 'liquidity')} data-testid="tabs-metrics">
            <TabsList className="bg-muted/30">
              <TabsTrigger 
                value="tokenomics" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                data-testid="tab-tokenomics"
              >
                <span className="font-mono text-xs">Tokenomics Metrics ({scorecardData.tokenomicsMetrics.length})</span>
              </TabsTrigger>
              <TabsTrigger 
                value="liquidity"
                className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
                data-testid="tab-liquidity"
              >
                <span className="font-mono text-xs">Liquidity Metrics ({scorecardData.liquidityMetrics.length})</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              <Card className="p-0">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full" data-testid="table-scorecard-metrics">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="text-left p-3 text-xs font-semibold text-muted-foreground w-1/4">METRIC</th>
                          <th className="text-left p-3 text-xs font-semibold text-muted-foreground w-1/4">VALUE</th>
                          <th className="text-left p-3 text-xs font-semibold text-muted-foreground w-1/4">INDUSTRY BENCHMARK</th>
                          <th className="text-center p-3 text-xs font-semibold text-muted-foreground w-1/4">STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentMetrics.map((metric, index) => (
                          <tr key={index} className="border-b border-border hover-elevate" data-testid={`row-metric-${index}`}>
                            <td className="p-3">
                              <div className="flex flex-col">
                                <span className="font-semibold text-sm" data-testid={`text-metric-name-${index}`}>{metric.metric}</span>
                                <span className="text-xs text-muted-foreground mt-1">{metric.description}</span>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className="font-mono text-sm" data-testid={`text-metric-value-${index}`}>{metric.value}</span>
                            </td>
                            <td className="p-3">
                              <span className="font-mono text-sm text-muted-foreground" data-testid={`text-metric-benchmark-${index}`}>
                                {metric.industryBenchmark}
                              </span>
                            </td>
                            <td className="p-3 flex justify-center">
                              <Badge 
                                variant={getStatusVariant(metric.status)} 
                                className={`font-mono ${getStatusColor(metric.status)}`}
                                data-testid={`badge-status-${index}`}
                              >
                                {metric.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Summary Cards */}
          <div>
            <h3 className="text-sm font-semibold mb-3">TOKENOMICS & LIQUIDITY METRICS SUMMARY</h3>
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4 border-green-500/30 bg-green-500/5" data-testid="card-summary-good">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-xs text-muted-foreground">GOOD</span>
                </div>
                <div className="text-4xl font-mono font-bold text-green-500" data-testid="text-good-count">
                  {scorecardData.summary.good}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {scorecardData.summary.goodPercent}% of metrics performing well
                </div>
              </Card>

              <Card className="p-4 border-yellow-500/30 bg-yellow-500/5" data-testid="card-summary-caution">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="text-xs text-muted-foreground">CAUTION</span>
                </div>
                <div className="text-4xl font-mono font-bold text-yellow-500" data-testid="text-caution-count">
                  {scorecardData.summary.caution}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {scorecardData.summary.cautionPercent}% of metrics need attention
                </div>
              </Card>

              <Card className="p-4 border-destructive/30 bg-destructive/5" data-testid="card-summary-risk">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-3 h-3 rounded-full bg-destructive" />
                  <span className="text-xs text-muted-foreground">RISK</span>
                </div>
                <div className="text-4xl font-mono font-bold text-destructive" data-testid="text-risk-count">
                  {scorecardData.summary.risk}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {scorecardData.summary.riskPercent}% of metrics at risk
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
