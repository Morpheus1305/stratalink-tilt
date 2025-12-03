import { useState } from "react";
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
  SparklinePanel,
} from "@/components/analytics";
import DepthPanel from "@/components/DepthPanel";

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

export default function AnalyticsPage() {
  const [selectedToken, setSelectedToken] = useState("BTC");

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

  const isLoading = stressLoading || depthLoading || fundingLoading || liquidationLoading;

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

      {/* Live Sparklines */}
      <div style={{ marginBottom: 20 }}>
        <SparklinePanel
          depth={depthData?.depth}
          funding={fundingData?.funding}
          selectedToken={selectedToken}
        />
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

      {/* Depth + Funding */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2.2fr 1.8fr",
          gap: 20,
          marginBottom: 20,
        }}
      >
        <DepthPanel depth={depthData?.depth} />
        <FundingPanel funding={fundingData?.funding} />
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

      {/* Footer */}
      <footer style={{ marginTop: 24, fontSize: 11, color: "#6d7da2" }}>
        STRATA • Liquidity Truth Layer — Internal institutional prototype.
      </footer>
    </div>
  );
}
