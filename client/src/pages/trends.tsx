import { useQuery } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/dashboard-header";
import { LiquidityScoreGauge } from "@/components/liquidity-score-gauge";
import { StressSignalsPanel } from "@/components/stress-signals-panel";
import { PlatformTabs } from "@/components/platform-tabs";
import { BottomTicker } from "@/components/bottom-ticker";
import { DateTimeBar } from "@/components/date-time-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Calendar, TrendingUp, TrendingDown } from "lucide-react";
import { useState } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DashboardData, TrendsData } from "@shared/schema";

const timeframes = ["1D", "7D", "1M", "3M", "1Y"];

export default function Trends() {
  const [selectedTimeframe, setSelectedTimeframe] = useState("7D");

  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
    refetchInterval: 10000,
  });

  const { data: trendsData, isLoading: isTrendsLoading } = useQuery<TrendsData>({
    queryKey: ["/api/trends", selectedTimeframe],
    refetchInterval: 30000,
  });

  if (isDashboardLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <DashboardHeader />
        <PlatformTabs />
        <div className="p-4 space-y-4">
          <Skeleton className="h-96" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-destructive text-sm font-semibold">Failed to load data</div>
          <p className="text-muted-foreground text-xs">Please refresh the page to try again</p>
        </div>
      </div>
    );
  }

  const poliData = trendsData?.poliScoreEvolution || [];
  const depthData = trendsData?.marketDepthTrend || [];
  const volatilityData = trendsData?.volatilityTrend || [];
  const changePercent = trendsData?.changePercent || 0;

  return (
    <div className="min-h-screen bg-background flex flex-col pb-[72px]">
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
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-primary">LIQUIDITY INTELLIGENCE</h2>
            <div className="text-xs text-muted-foreground">
              Real-time risk intelligence for regulators and protocols
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <LiquidityScoreGauge scoreData={dashboardData.liquidityScore} />
            <div className="lg:col-span-2">
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

        {/* Historical Trends Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-primary">HISTORICAL TRENDS</h2>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-accent" />
              <div className="flex gap-1">
                {timeframes.map((tf) => (
                  <Button
                    key={tf}
                    data-testid={`button-timeframe-${tf.toLowerCase()}`}
                    size="sm"
                    variant={selectedTimeframe === tf ? "default" : "outline"}
                    onClick={() => setSelectedTimeframe(tf)}
                    className={selectedTimeframe === tf ? "bg-primary text-primary-foreground" : ""}
                  >
                    {tf}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* PoLi Score Evolution - Large Area Chart */}
          <Card className="p-4" data-testid="card-poli-score-chart">
            <CardHeader className="p-0 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold" data-testid="text-chart-title-poli">POLI SCORE EVOLUTION</CardTitle>
                <div className="flex items-center gap-2" data-testid="indicator-poli-change">
                  {changePercent >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-500" data-testid="icon-trending-up" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-destructive" data-testid="icon-trending-down" />
                  )}
                  <span className={`text-xs font-mono ${changePercent >= 0 ? "text-green-500" : "text-destructive"}`} data-testid="text-poli-change-percent">
                    {changePercent >= 0 ? "+" : ""}{changePercent.toFixed(2)}%
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={poliData}>
                  <defs>
                    <linearGradient id="poliGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F5C211" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#F5C211" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.3} />
                  <XAxis
                    dataKey="time"
                    stroke="#666"
                    style={{ fontSize: "10px", fontFamily: "monospace" }}
                  />
                  <YAxis
                    stroke="#666"
                    style={{ fontSize: "10px", fontFamily: "monospace" }}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f0f0f",
                      border: "1px solid #333",
                      borderRadius: "4px",
                      fontFamily: "monospace",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#F5C211"
                    strokeWidth={2}
                    fill="url(#poliGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Market Depth + Volatility - Two Line Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Market Depth Trend */}
            <Card className="p-4" data-testid="card-depth-chart">
              <CardHeader className="p-0 pb-3">
                <CardTitle className="text-sm font-semibold" data-testid="text-chart-title-depth">MARKET DEPTH TREND ($M)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={depthData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.3} />
                    <XAxis
                      dataKey="time"
                      stroke="#666"
                      style={{ fontSize: "10px", fontFamily: "monospace" }}
                    />
                    <YAxis
                      stroke="#666"
                      style={{ fontSize: "10px", fontFamily: "monospace" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f0f0f",
                        border: "1px solid #333",
                        borderRadius: "4px",
                        fontFamily: "monospace",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="depth"
                      stroke="#00D9FF"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Volatility Trend */}
            <Card className="p-4" data-testid="card-volatility-chart">
              <CardHeader className="p-0 pb-3">
                <CardTitle className="text-sm font-semibold" data-testid="text-chart-title-volatility">VOLATILITY TREND (%)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={volatilityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.3} />
                    <XAxis
                      dataKey="time"
                      stroke="#666"
                      style={{ fontSize: "10px", fontFamily: "monospace" }}
                    />
                    <YAxis
                      stroke="#666"
                      style={{ fontSize: "10px", fontFamily: "monospace" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f0f0f",
                        border: "1px solid #333",
                        borderRadius: "4px",
                        fontFamily: "monospace",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="volatility"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Bottom Date/Time Bar and Ticker */}
      <DateTimeBar />
      <BottomTicker items={dashboardData.tickerItems} />
    </div>
  );
}
