import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardHeader } from "@/components/dashboard-header";
import { PlatformTabs } from "@/components/platform-tabs";

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
  TslePanel,
} from "@/components/analytics";

import DepthPanel from "@/components/DepthPanel";
import MicrostructureStats from "@/components/MicrostructureStats";
import LiquidityDynamicsPanel from "@/components/LiquidityDynamicsPanel";
import DynamicDepthLadder from "@/components/DynamicDepthLadder";
import { LiquidityTimeseriesPanel } from "@/components/analytics/LiquidityTimeseriesPanel";
import { ExecutionCostCalculatorPanel } from "@/components/analytics/ExecutionCostCalculatorPanel";
import ExecutionIntelPanel from "@/components/analytics/ExecutionIntelPanel";
import DailyMarketCommentaryPanel from "@/components/analytics/DailyMarketCommentaryPanel";
import LiquidityFiveFactorPanel from "@/components/analytics/LiquidityFiveFactorPanel";
import { YesterdayVsTodayPanel } from "@/components/analytics/YesterdayVsTodayPanel";
import useLiquidityFactorsBatch from "@/hooks/useLiquidityFactorsBatch";
import TokenLiquidityTable from "@/components/analytics/TokenLiquidityTable";

/* 🔌 LIS imports */
import { fetchLiquiditySnapshot } from "@/services/lis";
import { lisSnapshotToTokenDepth } from "@/adapters/lisToTokenDepth";

/* ===================== TYPES ===================== */

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
  ts?: number;
};

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
const TRACKED_TOKENS = ["BTC", "ETH", "SOL", "LINK", "NEAR", "AVAX", "DOT", "ADA", "XRP"];

function pushSeries(map: SeriesMap, key: string, value: number): SeriesMap {
  const now = Date.now();
  const existing = map[key] || [];
  const nextArr = [...existing, { t: now, v: value }].slice(-MAX_POINTS);
  return { ...map, [key]: nextArr };
}

/* ===================== PAGE ===================== */

export default function AnalyticsPage() {
  const [selectedToken, setSelectedToken] = useState("BTC");

  /* 🔌 LIS state */
  const [lisDepth, setLisDepth] = useState<Record<string, TokenDepth>>({});
  const [lisLoading, setLisLoading] = useState(true);

  /* Existing analytics */
  const { data: batchFactors } = useLiquidityFactorsBatch(TRACKED_TOKENS);
  const liquidityFactors = batchFactors?.[selectedToken] ?? null;

  const [priceSeries, setPriceSeries] = useState<SeriesMap>({});
  const [depthSeries, setDepthSeries] = useState<SeriesMap>({});
  const [fundingSeries, setFundingSeries] = useState<SeriesMap>({});
  const lastUpdateRef = useRef<number>(0);

  /* ===================== LIS FETCH ===================== */
  useEffect(() => {
    setLisLoading(true);

    fetchLiquiditySnapshot(selectedToken, "binance")
      .then((snapshot) => {
        setLisDepth({
          [selectedToken]: lisSnapshotToTokenDepth(snapshot),
        });
        setLisLoading(false);
      })
      .catch((err) => {
        console.error("LIS fetch failed", err);
        setLisLoading(false);
      });
  }, [selectedToken]);

  /* ===================== EXISTING QUERIES ===================== */

  const { data: stress, isLoading: stressLoading } = useQuery<StressData>({
    queryKey: ["/api/analytics/stress"],
    refetchInterval: 5000,
  });

  const { data: depthData, isLoading: depthLoading } = useQuery<{
    depth: Record<string, TokenDepth>;
    summary: any;
  }>({
    queryKey: ["/api/analytics/depth"],
    refetchInterval: 5000,
  });

  const { data: fundingData, isLoading: fundingLoading } = useQuery<{
    funding: Record<string, FundingData>;
    summary: any;
  }>({
    queryKey: ["/api/analytics/funding"],
    refetchInterval: 5000,
  });

  const { data: liquidationData, isLoading: liquidationLoading } = useQuery<{
    liquidations: Record<string, LiquidationData>;
    summary: any;
  }>({
    queryKey: ["/api/analytics/liquidations"],
    refetchInterval: 5000,
  });

  const { data: status } = useQuery<IngestionStatus>({
    queryKey: ["/api/analytics/status"],
    refetchInterval: 5000,
  });

  /* ===================== SERIES UPDATES (UNCHANGED) ===================== */

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
          if (mid && mid > 0) next = pushSeries(next, sym, mid);
        }
        return next;
      });

      setDepthSeries((prev) => {
        let next = { ...prev };
        for (const sym of Object.keys(depth)) {
          const ten = depth[sym]?.bands?.["10bps"];
          const total = (ten?.bidUSD ?? 0) + (ten?.askUSD ?? 0);
          if (total > 0) next = pushSeries(next, sym, total);
        }
        return next;
      });
    }

    if (funding) {
      setFundingSeries((prev) => {
        let next = { ...prev };
        for (const sym of Object.keys(funding)) {
          next = pushSeries(next, sym, funding[sym]?.fundingRate ?? 0);
        }
        return next;
      });
    }
  }, [depthData, fundingData]);

  const isLoading =
    stressLoading || depthLoading || fundingLoading || liquidationLoading || lisLoading;

  /* ===================== RENDER ===================== */

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardHeader />
      <PlatformTabs />

      <div className="flex-1 p-6 bg-[#050814] text-[#e1e6ef]">
        {/* HEADER */}
        <div className="mb-5 flex justify-between items-center flex-wrap gap-4">
          <TokenSelector value={selectedToken} onChange={setSelectedToken} />
          <div className="flex items-center gap-4">
            <RegimePill stressScore={stress?.stressScore} regime={stress?.regime} />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <RefreshCw className={cn("h-3 w-3", status?.isIngesting && "animate-spin")} />
              <span>{status ? `${status.depthTokens} tokens tracked` : "Loading..."}</span>
            </div>
          </div>
        </div>

        {isLoading && (
          <Card className="mb-5">
            <CardContent className="p-6">
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
        )}

        {/* 🔥 THIS IS THE KEY LINE */}
        <DepthPanel depth={lisDepth} />

        {/* Everything else untouched */}
        <TokenLiquidityTable
          selectedToken={selectedToken}
          onSelectToken={setSelectedToken}
          batchFactors={batchFactors}
        />

        <footer className="mt-6 text-xs text-muted-foreground">
          STRATA • Liquidity Truth Layer — Internal institutional prototype
        </footer>
      </div>
    </div>
  );
}