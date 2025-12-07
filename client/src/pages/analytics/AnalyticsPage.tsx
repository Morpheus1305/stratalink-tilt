import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

import {
  TokenSelector,
  RegimePill,
  StressHeatmap,
  TokenLiquidityCards,
  FundingPanel,
  WhaleImbalancePanel,
  ExchangeFragmentationPanel,
  LiquidityVelocityPanel,
  VolatilityConePanel,
  CexDexGauge,
  StablecoinFlowPanel,
  LiveSparklinesPanel,
  PerpetualFundingSnapshot,
} from "@/components/analytics";
import DepthPanel from "@/components/DepthPanel";
import MicrostructureStats from "@/components/MicrostructureStats";
import LiquidityDynamicsPanel from "@/components/LiquidityDynamicsPanel";
import DynamicDepthLadder from "@/components/DynamicDepthLadder";
import { LiquidityTimeseriesPanel } from "@/components/analytics/LiquidityTimeseriesPanel";
import { ExecutionCostCalculatorPanel } from "@/components/analytics/ExecutionCostCalculatorPanel";
import ExecutionIntelPanel from "@/components/analytics/ExecutionIntelPanel";
import DailyMarketCommentaryPanel from "@/components/analytics/DailyMarketCommentaryPanel";
import { LiquidityFiveFactorPanel } from "@/components/analytics/LiquidityFiveFactorPanel";
import { YesterdayVsTodayPanel } from "@/components/analytics/YesterdayVsTodayPanel";
import { useLiquidityFactors } from "@/hooks/useLiquidityFactors";
import TokenLiquidityTable from "@/components/analytics/TokenLiquidityTable";

type StressDriver = {
  category: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  contribution: number;
};

type StressData = {
  stressScore: number;
  regime: "LOW" | "MODERATE" | "HIGH" | "EXTREME";
  drivers: StressDriver[];
  commentary: string;
  ts: number;
};

type DepthBand = {
  bidUSD: number;
  askUSD: number;
  totalUSD: number;
  imbalance: number;
};

type TokenDepth = {
  mid: number;
  spread: number;
  spreadBps: number;
  bands: {
    "10bps": DepthBand;
    "25bps": DepthBand;
    "50bps": DepthBand;
    "100bps": DepthBand;
    "200bps": DepthBand;
  };
  source: string;
  ts: number;
};

type FundingData = {
  fundingRate: number;
  fundingRateAnnualized: number;
  source: string;
};

type LiquidationData = {
  longs: number;
  shorts: number;
  total: number;
  imbalance: number;
  regime: string;
};

type IngestionStatus = {
  isIngesting: boolean;
  lastFullIngest: number;
  depthTokens: number;
  fundingTokens: number;
  liquidationTokens: number;
};

type Point = { t: number; v: number };
type SeriesMap = Record<string, Point[]>;

const MAX_POINTS = 30;

function pushSeries(map: SeriesMap, key: string, value: number): SeriesMap {
  const now = Date.now();
  const existing = map[key] || [];
  const nextArr = [...existing, { t: now, v: value }].slice(-MAX_POINTS);
  return { ...map, [key]: nextArr };
}

export default function AnalyticsPage() {
  const [selectedToken, setSelectedToken] = useState("BTC");
  
  const { data: liquidityFactors } = useLiquidityFactors(selectedToken);
  
  const [priceSeries, setPriceSeries] = useState<SeriesMap>({});
  const [depthSeries, setDepthSeries] = useState<SeriesMap>({});
  const [fundingSeries, setFundingSeries] = useState<SeriesMap>({});
  
  const lastUpdateRef = useRef<number>(0);

  const { data: stress, isLoading: stressLoading } = useQuery<StressData>({
    queryKey: ["/api/analytics/stress"],
    refetchInterval: 5000,
  });

  const { data: depthData, isLoading: depthLoading } = useQuery<{ depth: Record<string, TokenDepth>; summary: any }>({
    queryKey: ["/api/analytics/depth"],
    refetchInterval: 5000,
  });

  const { data: fundingData, isLoading: fundingLoading } = useQuery<{ funding: Record<string, FundingData>; summary: any }>({
    queryKey: ["/api/analytics/funding"],
    refetchInterval: 5000,
  });

  const { data: liquidationData, isLoading: liquidationLoading } = useQuery<{ liquidations: Record<string, LiquidationData>; summary: any }>({
    queryKey: ["/api/analytics/liquidations"],
    refetchInterval: 5000,
  });

  const { data: status } = useQuery<IngestionStatus>({
    queryKey: ["/api/analytics/status"],
    refetchInterval: 5000,
  });

  useEffect(() => {
    const now = Date.now();
    if (now - lastUpdateRef.current < 4000) return;
    lastUpdateRef.current = now;

    const depth = depthData?.depth;
    const funding = fundingData?.funding;

    if (depth) {
      setPriceSeries((prev) => {
        let next = { ...prev };
        for (const sym of Object.keys(depth)) {
          const mid = depth[sym]?.mid;
          if (mid && mid > 0) {
            next = pushSeries(next, sym, mid);
          }
        }
        return next;
      });

      setDepthSeries((prev) => {
        let next = { ...prev };
        for (const sym of Object.keys(depth)) {
          const bands = depth[sym]?.bands;
          const ten = bands?.["10bps"];
          const total = (ten?.bidUSD ?? 0) + (ten?.askUSD ?? 0);
          if (total > 0) {
            next = pushSeries(next, sym, total);
          }
        }
        return next;
      });
    }

    if (funding) {
      setFundingSeries((prev) => {
        let next = { ...prev };
        for (const sym of Object.keys(funding)) {
          const rate = funding[sym]?.fundingRate ?? 0;
          next = pushSeries(next, sym, rate);
        }
        return next;
      });
    }
  }, [depthData, fundingData]);

  const isLoading = stressLoading || depthLoading || fundingLoading || liquidationLoading;

  const priceSeriesForToken = priceSeries[selectedToken] || [];
  const depthSeriesForToken = depthSeries[selectedToken] || [];
  const fundingSeriesForToken = fundingSeries[selectedToken] || [];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050814",
        color: "#e1e6ef",
        padding: 24,
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <header style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, letterSpacing: 3, color: "#8ea3c7" }}>
          STRATA • ANALYTICS
        </div>
        <h1 style={{ margin: "4px 0 0", fontSize: 26 }}>
          Daily Crypto Market Structure Attribution
        </h1>
      </header>

      {/* Token Selector + Regime Pill */}
      <div
        style={{
          marginBottom: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <TokenSelector value={selectedToken} onChange={setSelectedToken} />
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <RegimePill
            stressScore={stress?.stressScore}
            regime={stress?.regime}
          />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <RefreshCw className={cn("h-3 w-3", status?.isIngesting && "animate-spin")} />
            <span>
              {status ? `${status.depthTokens} tokens tracked` : "Loading..."}
            </span>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <Card className="border-border/50 mb-5">
          <CardContent className="p-6">
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      )}

      {/* Token Liquidity League Table */}
      <TokenLiquidityTable
        selectedToken={selectedToken}
        onSelectToken={setSelectedToken}
      />

      {/* Daily Market Commentary + 5-Factor Score */}
      <div className="grid grid-cols-12 gap-4 mb-5">
        <div className="col-span-12 lg:col-span-8">
          <DailyMarketCommentaryPanel symbol={selectedToken} />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <LiquidityFiveFactorPanel symbol={selectedToken} side="buy" />
        </div>
      </div>

      {/* Yesterday vs Today Comparison */}
      {depthData?.depth?.[selectedToken] && liquidityFactors && (
        <div className="mb-5">
          <YesterdayVsTodayPanel
            symbol={selectedToken}
            depth10bps={(depthData.depth[selectedToken].bands?.["10bps"]?.totalUSD || 0)}
            depth25bps={(depthData.depth[selectedToken].bands?.["25bps"]?.totalUSD || 0)}
            depth50bps={(depthData.depth[selectedToken].bands?.["50bps"]?.totalUSD || 0)}
            factorScore={liquidityFactors.composite}
            fragmentation={liquidityFactors.factors?.fragmentation || 50}
            venueCount={liquidityFactors.meta?.venueCount || 3}
            stability={liquidityFactors.factors?.stability}
            executionRisk={100 - (liquidityFactors.factors?.execEfficiency || 50)}
          />
        </div>
      )}

      {/* Live Token-Aware Sparklines */}
      <div style={{ marginBottom: 20 }}>
        <LiveSparklinesPanel
          token={selectedToken}
          price={priceSeriesForToken}
          depth={depthSeriesForToken}
          funding={fundingSeriesForToken}
        />
        <MicrostructureStats />

        {/* Liquidity Dynamics + Token-Aware Depth Ladder */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Card className="border-border/50 p-4">
            <LiquidityDynamicsPanel />
          </Card>
          <Card className="border-border/50 p-4">
            <DynamicDepthLadder />
          </Card>
        </div>
      </div>

      {/* Stress attribution + token liquidity cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 2.8fr",
          gap: 20,
          marginBottom: 20,
        }}
      >
        <StressHeatmap drivers={stress?.drivers} />
        <TokenLiquidityCards depth={depthData?.depth} />
      </div>

      {/* Depth + Funding (Token-Aware) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2.2fr 1.8fr",
          gap: 20,
          marginBottom: 20,
        }}
      >
        <DepthPanel depth={depthData?.depth} />
        <div className="space-y-4">
          <PerpetualFundingSnapshot symbol={selectedToken} />
          <FundingPanel funding={fundingData?.funding} />
        </div>
      </div>

      {/* Lower analytics: Whale imbalance + fragmentation + velocity */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1.4fr 1.2fr",
          gap: 20,
          marginBottom: 20,
        }}
      >
        <WhaleImbalancePanel liquidations={liquidationData?.liquidations} />
        <ExchangeFragmentationPanel depth={depthData?.depth} />
        <LiquidityVelocityPanel depth={depthData?.depth} />
      </div>

      {/* Planned panels: vol cone, CEX/DEX gauge, stablecoin flows */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1.4fr 1.2fr",
          gap: 20,
          marginBottom: 20,
        }}
      >
        <VolatilityConePanel />
        <CexDexGauge />
        <StablecoinFlowPanel />
      </div>

      {/* Time-Series Liquidity + Execution Cost Calculator */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4 mb-5">
        <section className="bg-[#050814] border border-[#111827] rounded-xl p-4">
          <LiquidityTimeseriesPanel token={selectedToken} />
        </section>
        <section className="bg-[#050814] border border-[#111827] rounded-xl p-4">
          <ExecutionCostCalculatorPanel token={selectedToken} />
        </section>
      </div>

      {/* Execution Intelligence Panel (side-by-side on xl) */}
      <section className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-4 mb-5">
        <ExecutionIntelPanel symbol={selectedToken} side="buy" />
        <ExecutionIntelPanel symbol={selectedToken} side="sell" />
      </section>

      {/* Footer */}
      <footer style={{ marginTop: 24, fontSize: 11, color: "#6d7da2" }}>
        STRATA • Liquidity Truth Layer — Internal institutional prototype.
      </footer>
    </div>
  );
}
