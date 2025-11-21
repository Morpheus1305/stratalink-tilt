import { useQuery } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/dashboard-header";
import { LiveMetricsPanel } from "@/components/live-metrics-panel";
import { LiquidityScoreGauge } from "@/components/liquidity-score-gauge";
import { StressSignalsPanel } from "@/components/stress-signals-panel";
import { KeyMetricsGrid } from "@/components/key-metrics-grid";
import { LiquidityDistributionCharts } from "@/components/liquidity-distribution-charts";
import { TimeSeriesChart } from "@/components/time-series-chart";
import { ReportExportSection } from "@/components/report-export-section";
import { BottomTicker } from "@/components/bottom-ticker";
import type { DashboardData, TimeSeriesData } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

export default function Dashboard() {
  const [selectedTimeframe, setSelectedTimeframe] = useState('1D');

  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery<DashboardData>({
    queryKey: ['/api/dashboard'],
    refetchInterval: 10000, // Refresh every 10 seconds for live data
  });

  const { data: timeSeriesData, isLoading: isTimeSeriesLoading, error: timeSeriesError } = useQuery<TimeSeriesData>({
    queryKey: ['/api/time-series', selectedTimeframe],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isDashboardLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <DashboardHeader />
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Skeleton className="h-96" />
            <Skeleton className="h-96 lg:col-span-2" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-destructive text-sm font-semibold">Failed to load dashboard data</div>
          <p className="text-muted-foreground text-xs">Please refresh the page to try again</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardHeader />

      {/* Live Metrics Panel */}
      <LiveMetricsPanel metrics={dashboardData.liveMetrics} />

      {/* Main Dashboard Content */}
      <div className="flex-1 p-4 space-y-4">
        {/* Top Row: Score + Stress Signals */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <LiquidityScoreGauge scoreData={dashboardData.liquidityScore} />
          <div className="lg:col-span-2">
            <StressSignalsPanel signals={dashboardData.stressSignals} />
          </div>
        </div>

        {/* Key Metrics Grid */}
        <KeyMetricsGrid metrics={dashboardData.keyMetrics} />

        {/* Distribution Charts */}
        <LiquidityDistributionCharts 
          exchangeData={dashboardData.exchangeDistribution}
          cexDexData={dashboardData.cexDexDistribution}
        />

        {/* Time Series Chart */}
        {isTimeSeriesLoading ? (
          <Card className="p-4 h-96">
            <Skeleton className="h-8 w-64 mb-4" />
            <Skeleton className="h-80 w-full" />
          </Card>
        ) : (
          <TimeSeriesChart 
            data={timeSeriesData?.data ?? []}
            selectedTimeframe={selectedTimeframe}
            onTimeframeChange={setSelectedTimeframe}
          />
        )}

        {/* Report Export */}
        <ReportExportSection />
      </div>

      {/* Bottom Ticker */}
      <BottomTicker items={dashboardData.tickerItems} />
    </div>
  );
}
