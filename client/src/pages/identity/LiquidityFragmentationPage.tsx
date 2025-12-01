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
import { IdentityChart } from "./components/IdentityChart";
import { TokenSelector } from "@/components/token-selector";
import { useToken } from "@/contexts/TokenContext";
import { 
  GitBranch, 
  TrendingUp,
  TrendingDown,
  Building2,
  Layers
} from "lucide-react";

const defaultTickerItems = [
  { id: '1', symbol: 'BTC/USD', price: '97842.50', change: 2.34, changePercent: '2.34', depth: '$42.8M', spread: '0.02%', volume: '$1.2B', timestamp: new Date().toISOString() },
  { id: '2', symbol: 'ETH/USD', price: '3654.80', change: 1.89, changePercent: '1.89', depth: '$28.2M', spread: '0.03%', volume: '$892M', timestamp: new Date().toISOString() },
  { id: '3', symbol: 'SOL/USD', price: '242.15', change: -0.78, changePercent: '-0.78', depth: '$15.1M', spread: '0.04%', volume: '$456M', timestamp: new Date().toISOString() },
];

interface FragmentationData {
  token: string;
  totalLiquidity: string;
  cexShare: number;
  dexShare: number;
  topVenues: Array<{
    name: string;
    share: number;
    volume24h: string;
  }>;
  concentrationScore: number;
}

export default function LiquidityFragmentationPage() {
  const { selectedToken, setSelectedToken } = useToken();

  const { data: fragmentation, isLoading } = useQuery<FragmentationData>({
    queryKey: ['/api/identity/fragmentation', selectedToken],
    queryFn: async () => {
      const response = await fetch(`/api/identity/fragmentation/${selectedToken}`);
      if (!response.ok) throw new Error('Failed to fetch fragmentation data');
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </div>
      </div>
    );
  }

  const venueChartData = fragmentation?.topVenues.map(v => ({
    name: v.name,
    value: v.share,
    volume24h: v.volume24h,
  })) || [];

  const cexDexData = [
    { name: 'CEX', value: fragmentation?.cexShare || 0 },
    { name: 'DEX', value: fragmentation?.dexShare || 0 },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col pb-[72px]">
      <DashboardHeader />
      <IdentityTabs />
      <DateTimeBar />

      <div className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GitBranch className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">LIQUIDITY FRAGMENTATION ANALYSIS</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">TOKEN:</span>
          <TokenSelector selectedToken={selectedToken} onChange={setSelectedToken} />
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <IdentityMetricCard
            title="Total Liquidity"
            value={fragmentation?.totalLiquidity || '$0'}
            status="GOOD"
            source="Arkham + Exchanges"
          />
          <IdentityMetricCard
            title="CEX Share"
            value={`${fragmentation?.cexShare?.toFixed(1) || 0}%`}
            status={fragmentation && fragmentation.cexShare > 80 ? 'CAUTION' : 'GOOD'}
            source="CEX Aggregated"
          />
          <IdentityMetricCard
            title="DEX Share"
            value={`${fragmentation?.dexShare?.toFixed(1) || 0}%`}
            status={fragmentation && fragmentation.dexShare < 20 ? 'CAUTION' : 'GOOD'}
            source="DEX Aggregated"
          />
          <IdentityMetricCard
            title="Concentration Score"
            value={`${fragmentation?.concentrationScore?.toFixed(0) || 0}/100`}
            status={fragmentation && fragmentation.concentrationScore > 75 ? 'CAUTION' : 'GOOD'}
            benchmark="< 75"
            source="Herfindahl Index"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <IdentityChart
            title="TOP VENUES BY MARKET SHARE"
            data={venueChartData}
            type="bar"
            dataKey="value"
          />
          <IdentityChart
            title="CEX vs DEX DISTRIBUTION"
            data={cexDexData}
            type="pie"
            dataKey="value"
            colors={['#F5C211', '#00D9FF']}
          />
        </div>

        <Card className="bg-card border-border" data-testid="table-venue-breakdown">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-semibold">VENUE BREAKDOWN</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-2 px-4 font-medium text-muted-foreground">Venue</th>
                    <th className="text-right py-2 px-4 font-medium text-muted-foreground">Market Share</th>
                    <th className="text-right py-2 px-4 font-medium text-muted-foreground">24H Volume</th>
                    <th className="text-center py-2 px-4 font-medium text-muted-foreground">Type</th>
                    <th className="text-center py-2 px-4 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {fragmentation?.topVenues.map((venue, idx) => (
                    <tr 
                      key={venue.name}
                      className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                    >
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{venue.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono">
                        <div className="flex items-center justify-end gap-2">
                          <div 
                            className="h-1.5 bg-primary rounded"
                            style={{ width: `${venue.share}px` }}
                          />
                          <span>{venue.share.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono">{venue.volume24h}</td>
                      <td className="py-2.5 px-4 text-center">
                        <Badge variant="outline" className="text-[10px]">
                          {venue.name.includes('Uniswap') || venue.name.includes('Curve') ? 'DEX' : 'CEX'}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <Badge 
                          variant={idx === 0 ? 'secondary' : 'outline'}
                          className="text-[10px]"
                        >
                          {idx === 0 ? 'DOMINANT' : 'ACTIVE'}
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
