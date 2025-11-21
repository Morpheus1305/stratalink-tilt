import { useQuery } from "@tanstack/react-query";
import type { PortfolioData, DashboardData } from "@shared/schema";
import { DashboardHeader } from "@/components/dashboard-header";
import { PlatformTabs } from "@/components/platform-tabs";
import { LiquidityScoreGauge } from "@/components/liquidity-score-gauge";
import { StressSignalsPanel } from "@/components/stress-signals-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";

export default function Portfolio() {
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery<DashboardData>({
    queryKey: ['/api/dashboard'],
    refetchInterval: 10000,
  });

  const { data: portfolioData, isLoading: portfolioLoading } = useQuery<PortfolioData>({
    queryKey: ['/api/portfolio'],
    refetchInterval: 30000,
  });

  const isLoading = dashboardLoading || portfolioLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm font-mono">LOADING PORTFOLIO...</div>
      </div>
    );
  }

  if (!dashboardData || !portfolioData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-destructive text-sm font-mono">ERROR: FAILED TO LOAD DATA</div>
      </div>
    );
  }

  const getActionButtonVariant = (action: string) => {
    if (action === 'CRITICAL') return 'destructive';
    if (action === 'REVIEW') return 'secondary';
    return 'outline';
  };

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
        </div>

        {/* Portfolio Risk Assessment */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">PORTFOLIO RISK ASSESSMENT</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">PORTFOLIO POLI SCORE:</span>
              <span className="text-2xl font-mono font-bold text-primary" data-testid="text-portfolio-score">
                {portfolioData.portfolioPoliScore}<span className="text-sm text-muted-foreground">/100</span>
              </span>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4 border-green-500/30 bg-green-500/5" data-testid="card-healthy-assets">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">HEALTHY ASSETS</span>
                <TrendingUp className="w-4 h-4 text-green-500" data-testid="icon-healthy-trend" />
              </div>
              <div className="text-4xl font-mono font-bold text-green-500" data-testid="text-healthy-count">
                {portfolioData.summary.healthyAssets}
              </div>
            </Card>

            <Card className="p-4 border-yellow-500/30 bg-yellow-500/5" data-testid="card-warning-assets">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">WARNING ASSETS</span>
                <AlertTriangle className="w-4 h-4 text-yellow-500" data-testid="icon-warning-alert" />
              </div>
              <div className="text-4xl font-mono font-bold text-yellow-500" data-testid="text-warning-count">
                {portfolioData.summary.warningAssets}
              </div>
            </Card>

            <Card className="p-4 border-destructive/30 bg-destructive/5" data-testid="card-critical-assets">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">CRITICAL ASSETS</span>
                <TrendingDown className="w-4 h-4 text-destructive" data-testid="icon-critical-trend" />
              </div>
              <div className="text-4xl font-mono font-bold text-destructive" data-testid="text-critical-count">
                {portfolioData.summary.criticalAssets}
              </div>
            </Card>
          </div>

          {/* Multi-Token Comparison Table */}
          <Card className="p-0">
            <CardHeader className="border-b border-border p-4">
              <CardTitle className="text-sm font-semibold" data-testid="text-table-title">MULTI-TOKEN COMPARISON</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="table-portfolio-tokens">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-3 text-xs font-semibold text-muted-foreground">TOKEN</th>
                      <th className="text-right p-3 text-xs font-semibold text-muted-foreground">POLI SCORE</th>
                      <th className="text-right p-3 text-xs font-semibold text-muted-foreground">CHANGE</th>
                      <th className="text-right p-3 text-xs font-semibold text-muted-foreground">DEPTH</th>
                      <th className="text-right p-3 text-xs font-semibold text-muted-foreground">VOLATILITY</th>
                      <th className="text-right p-3 text-xs font-semibold text-muted-foreground">SPREAD</th>
                      <th className="text-right p-3 text-xs font-semibold text-muted-foreground">ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolioData.tokens.map((token, index) => (
                      <tr key={token.token} className="border-b border-border hover-elevate" data-testid={`row-token-${token.token}`}>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-primary" data-testid={`text-token-symbol-${token.token}`}>{token.token}</span>
                            <span className="text-xs text-muted-foreground">{token.name}</span>
                          </div>
                        </td>
                        <td className="text-right p-3">
                          <span className={`font-mono font-bold text-lg ${
                            token.poliScore >= 80 ? 'text-green-500' :
                            token.poliScore >= 60 ? 'text-yellow-500' :
                            'text-destructive'
                          }`} data-testid={`text-token-score-${token.token}`}>
                            {token.poliScore}
                          </span>
                        </td>
                        <td className="text-right p-3">
                          <div className={`flex items-center justify-end gap-1 ${
                            token.changePercent >= 0 ? 'text-green-500' : 'text-destructive'
                          }`}>
                            {token.changePercent >= 0 ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            <span className="font-mono text-sm" data-testid={`text-token-change-${token.token}`}>
                              {token.changePercent >= 0 ? '+' : ''}{token.changePercent.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="text-right p-3">
                          <span className="font-mono text-sm" data-testid={`text-token-depth-${token.token}`}>{token.depth}</span>
                        </td>
                        <td className="text-right p-3">
                          <span className="font-mono text-sm" data-testid={`text-token-volatility-${token.token}`}>{token.volatility}</span>
                        </td>
                        <td className="text-right p-3">
                          <span className="font-mono text-sm" data-testid={`text-token-spread-${token.token}`}>{token.spread}</span>
                        </td>
                        <td className="text-right p-3">
                          <Button 
                            size="sm" 
                            variant={getActionButtonVariant(token.action)}
                            className="font-mono text-xs"
                            data-testid={`button-action-${token.token}`}
                          >
                            {token.action}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* PoLi Score Comparison Bar Chart */}
            <Card className="p-4" data-testid="card-poli-comparison-chart">
              <CardHeader className="p-0 pb-3">
                <CardTitle className="text-sm font-semibold" data-testid="text-chart-title-comparison">POLI SCORE COMPARISON</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={portfolioData.poliComparison}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.3} />
                    <XAxis 
                      dataKey="token" 
                      stroke="#888"
                      tick={{ fill: '#888', fontSize: 12, fontFamily: 'monospace' }}
                    />
                    <YAxis 
                      stroke="#888"
                      tick={{ fill: '#888', fontSize: 12, fontFamily: 'monospace' }}
                      domain={[0, 100]}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1a1a1a', 
                        border: '1px solid #333',
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                      }}
                      labelStyle={{ color: '#F5C211' }}
                    />
                    <Bar dataKey="score" fill="#F5C211" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Multi-dimensional Analysis Radar Chart */}
            <Card className="p-4" data-testid="card-radar-analysis-chart">
              <CardHeader className="p-0 pb-3">
                <CardTitle className="text-sm font-semibold" data-testid="text-chart-title-radar">MULTI-DIMENSIONAL ANALYSIS</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={portfolioData.radarAnalysis}>
                    <PolarGrid stroke="#333" />
                    <PolarAngleAxis 
                      dataKey="dimension" 
                      tick={{ fill: '#888', fontSize: 11, fontFamily: 'sans-serif' }}
                    />
                    <PolarRadiusAxis 
                      angle={90} 
                      domain={[0, 100]}
                      tick={{ fill: '#888', fontSize: 10 }}
                    />
                    <Radar name="SOL" dataKey="sol" stroke="#F5C211" fill="#F5C211" fillOpacity={0.3} />
                    <Radar name="USDC" dataKey="usdc" stroke="#00D9FF" fill="#00D9FF" fillOpacity={0.3} />
                    <Radar name="USDT" dataKey="usdt" stroke="#4ade80" fill="#4ade80" fillOpacity={0.3} />
                    <Legend 
                      wrapperStyle={{ fontFamily: 'monospace', fontSize: '12px' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1a1a1a', 
                        border: '1px solid #333',
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
