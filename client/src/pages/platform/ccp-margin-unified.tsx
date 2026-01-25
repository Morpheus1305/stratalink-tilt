import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardHeader } from "@/components/dashboard-header";
import { PlatformTabs } from "@/components/platform-tabs";
import { DateTimeBar } from "@/components/date-time-bar";
import { BottomTicker } from "@/components/bottom-ticker";
import { useQuery } from "@tanstack/react-query";
import type { DashboardData } from "@shared/schema";
import {
  Search,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Activity,
  BarChart3,
  Users,
  Eye,
  FileText,
  ArrowRightLeft,
  Building2,
  Wallet,
  Target,
  Zap,
  Clock,
  MapPin,
  Layers,
  GitBranch,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  CircleDot,
  Gauge,
  Scale,
  Percent,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Info
} from "lucide-react";

type ViewType = "pretrade" | "margin" | "manipulation" | "member-risk";
type StressScenario = "normal" | "moderate" | "stressed" | "extreme";

interface RiskFactor {
  score: number;
  weight: number;
  label: string;
}

interface Collateral {
  id: string;
  asset: string;
  type: string;
  nominal: number;
  haircut: number;
  strataValue: number;
  poliScore: number;
  tsleStatus: string;
  venues: number;
  depth: string;
  liquidityProfile: Record<string, number>;
  proxySource: string;
  dataConfidence: string;
}

interface VenueExposure {
  venue: string;
  amount: number;
  pct: number;
  status: string;
  note: string;
}

interface Recommendation {
  priority: number;
  action: string;
  impact: string;
}

interface Member {
  name: string;
  memberId: string;
  riskTier: string;
  strataScore: number;
  strataStatus: string;
  totalPosted: number;
  traditionalValue: number;
  strataAdjusted: number;
  marginGap: number;
  overallRisk: { score: number; label: string; trend: string };
  collateral: Collateral[];
  venueExposure: VenueExposure[];
  riskFactors: Record<string, RiskFactor>;
  recommendations: Recommendation[];
}

interface PendingTrade {
  id: string;
  counterparty: string;
  counterpartyName: string;
  direction: string;
  asset: string;
  assetType: string;
  notional: number;
  settlementDate: string;
  status: string;
  riskFlags: string[];
  settlementProbability: number;
  coverageRatio: number;
}

interface ManipulationAsset {
  id: string;
  name: string;
  type: string;
  tsleState: string;
  integrity: number;
  alerts: number;
}

interface TSLEAlert {
  id: number;
  time: string;
  severity: string;
  asset: string;
  member: string;
  message: string;
  type: string;
}

export default function CCPMarginUnified() {
  const [activeView, setActiveView] = useState<ViewType>("margin");
  const [showDataProvenance, setShowDataProvenance] = useState(false);
  const [selectedMember, setSelectedMember] = useState("acme-capital");
  const [stressScenario, setStressScenario] = useState<StressScenario>("normal");
  const [selectedTrade, setSelectedTrade] = useState("TRD-2026-0124-0847");
  const [selectedAsset, setSelectedAsset] = useState("russ-etf");
  const [selectedCollateral, setSelectedCollateral] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [rightPanelTab, setRightPanelTab] = useState<"alerts" | "trends">("alerts");

  const members: Record<string, Member> = {
    "acme-capital": {
      name: "Acme Capital LLC",
      memberId: "ACMECAPITAL",
      riskTier: "Standard",
      strataScore: 73,
      strataStatus: "caution",
      totalPosted: 847500000,
      traditionalValue: 805125000,
      strataAdjusted: 731250000,
      marginGap: 73875000,
      overallRisk: { score: 67, label: "MODERATE", trend: "stable" },
      collateral: [
        {
          id: "tsry-10y",
          asset: "UST 10Y Token",
          type: "Treasury",
          nominal: 250000000,
          haircut: 237500000,
          strataValue: 228750000,
          poliScore: 91,
          tsleStatus: "clear",
          venues: 4,
          depth: "Strong",
          liquidityProfile: { "24h": 1.0, "12h": 0.97, "4h": 0.91, "1h": 0.82 },
          proxySource: "US Treasury 10Y + OTC depth",
          dataConfidence: "high"
        },
        {
          id: "russ-etf",
          asset: "Russell 1000 ETF Token",
          type: "Equity ETF",
          nominal: 350000000,
          haircut: 315000000,
          strataValue: 267750000,
          poliScore: 68,
          tsleStatus: "anomaly",
          venues: 3,
          depth: "Fragmented",
          liquidityProfile: { "24h": 1.0, "12h": 0.88, "4h": 0.65, "1h": 0.42 },
          proxySource: "IWB ETF + DEX patterns",
          dataConfidence: "medium"
        },
        {
          id: "aapl-tok",
          asset: "AAPL Token",
          type: "Equity",
          nominal: 150000000,
          haircut: 142500000,
          strataValue: 138000000,
          poliScore: 84,
          tsleStatus: "clear",
          venues: 5,
          depth: "Good",
          liquidityProfile: { "24h": 1.0, "12h": 0.94, "4h": 0.85, "1h": 0.71 },
          proxySource: "AAPL microstructure + RWA",
          dataConfidence: "medium"
        },
        {
          id: "tsry-2y",
          asset: "UST 2Y Token",
          type: "Treasury",
          nominal: 97500000,
          haircut: 95062500,
          strataValue: 96750000,
          poliScore: 96,
          tsleStatus: "clear",
          venues: 4,
          depth: "Deep",
          liquidityProfile: { "24h": 1.0, "12h": 0.98, "4h": 0.94, "1h": 0.88 },
          proxySource: "US Treasury 2Y + stablecoin",
          dataConfidence: "high"
        }
      ],
      venueExposure: [
        { venue: "Canton DEX", amount: 568000000, pct: 67, status: "healthy", note: "Primary venue" },
        { venue: "Venue B (CEX)", amount: 263000000, pct: 31, status: "warning", note: "TSLE anomalies" },
        { venue: "Venue C (RFQ)", amount: 17000000, pct: 2, status: "healthy", note: "Minimal" }
      ],
      riskFactors: {
        venueConcentration: { score: 43, weight: 35, label: "HIGH" },
        assetConcentration: { score: 71, weight: 25, label: "MEDIUM" },
        liquidityRisk: { score: 58, weight: 28, label: "HIGH" },
        counterpartyRisk: { score: 85, weight: 12, label: "LOW" }
      },
      recommendations: [
        { priority: 1, action: "Reduce Venue B exposure (TSLE anomalies)", impact: "HIGH" },
        { priority: 2, action: "Diversify Russell 1000 ETF across venues", impact: "MEDIUM" },
        { priority: 3, action: "Increase Treasury allocation", impact: "MEDIUM" }
      ]
    },
    "meridian-fund": {
      name: "Meridian Fund Services",
      memberId: "MERIDIANFUND",
      riskTier: "Standard",
      strataScore: 89,
      strataStatus: "healthy",
      totalPosted: 1250000000,
      traditionalValue: 1187500000,
      strataAdjusted: 1143750000,
      marginGap: 43750000,
      overallRisk: { score: 89, label: "LOW", trend: "improving" },
      collateral: [
        {
          id: "tsry-10y",
          asset: "UST 10Y Token",
          type: "Treasury",
          nominal: 450000000,
          haircut: 427500000,
          strataValue: 418500000,
          poliScore: 93,
          tsleStatus: "clear",
          venues: 5,
          depth: "Deep",
          liquidityProfile: { "24h": 1.0, "12h": 0.98, "4h": 0.93, "1h": 0.85 },
          proxySource: "US Treasury 10Y + OTC depth",
          dataConfidence: "high"
        },
        {
          id: "spx-etf",
          asset: "S&P 500 ETF Token",
          type: "Equity ETF",
          nominal: 500000000,
          haircut: 475000000,
          strataValue: 457500000,
          poliScore: 87,
          tsleStatus: "clear",
          venues: 4,
          depth: "Strong",
          liquidityProfile: { "24h": 1.0, "12h": 0.95, "4h": 0.87, "1h": 0.75 },
          proxySource: "SPY ETF + DEX patterns",
          dataConfidence: "high"
        }
      ],
      venueExposure: [
        { venue: "Canton DEX", amount: 625000000, pct: 50, status: "healthy", note: "Well-balanced" },
        { venue: "Venue B (CEX)", amount: 375000000, pct: 30, status: "healthy", note: "Diversified" },
        { venue: "Venue C (RFQ)", amount: 187500000, pct: 15, status: "healthy", note: "Institutional" },
        { venue: "OTC Pool", amount: 62500000, pct: 5, status: "healthy", note: "Strategic" }
      ],
      riskFactors: {
        venueConcentration: { score: 82, weight: 35, label: "LOW" },
        assetConcentration: { score: 88, weight: 25, label: "LOW" },
        liquidityRisk: { score: 91, weight: 28, label: "LOW" },
        counterpartyRisk: { score: 94, weight: 12, label: "LOW" }
      },
      recommendations: [
        { priority: 1, action: "Maintain current diversification", impact: "LOW" }
      ]
    },
    "vertex-trading": {
      name: "Vertex Trading Corp",
      memberId: "VERTEXTRADING",
      riskTier: "Enhanced",
      strataScore: 52,
      strataStatus: "alert",
      totalPosted: 425000000,
      traditionalValue: 403750000,
      strataAdjusted: 318750000,
      marginGap: 85000000,
      overallRisk: { score: 52, label: "HIGH", trend: "worsening" },
      collateral: [
        {
          id: "btc-tok",
          asset: "BTC Token",
          type: "Crypto",
          nominal: 200000000,
          haircut: 160000000,
          strataValue: 140000000,
          poliScore: 58,
          tsleStatus: "anomaly",
          venues: 3,
          depth: "Volatile",
          liquidityProfile: { "24h": 1.0, "12h": 0.75, "4h": 0.52, "1h": 0.35 },
          proxySource: "BTC spot + perps",
          dataConfidence: "medium"
        },
        {
          id: "eth-tok",
          asset: "ETH Token",
          type: "Crypto",
          nominal: 150000000,
          haircut: 120000000,
          strataValue: 105000000,
          poliScore: 62,
          tsleStatus: "watch",
          venues: 4,
          depth: "Moderate",
          liquidityProfile: { "24h": 1.0, "12h": 0.78, "4h": 0.55, "1h": 0.38 },
          proxySource: "ETH spot + DeFi",
          dataConfidence: "medium"
        }
      ],
      venueExposure: [
        { venue: "Venue B (CEX)", amount: 298000000, pct: 70, status: "critical", note: "Excessive concentration" },
        { venue: "Canton DEX", amount: 102000000, pct: 24, status: "healthy", note: "Secondary" },
        { venue: "OTC Pool", amount: 25000000, pct: 6, status: "healthy", note: "Minimal" }
      ],
      riskFactors: {
        venueConcentration: { score: 38, weight: 35, label: "CRITICAL" },
        assetConcentration: { score: 45, weight: 25, label: "HIGH" },
        liquidityRisk: { score: 42, weight: 28, label: "HIGH" },
        counterpartyRisk: { score: 71, weight: 12, label: "MEDIUM" }
      },
      recommendations: [
        { priority: 1, action: "Immediately reduce Venue B below 50%", impact: "CRITICAL" },
        { priority: 2, action: "Diversify crypto holdings", impact: "HIGH" },
        { priority: 3, action: "Increase Treasury to 30%", impact: "HIGH" }
      ]
    }
  };

  const pendingTrades: PendingTrade[] = [
    {
      id: "TRD-2026-0124-0847",
      counterparty: "acme-capital",
      counterpartyName: "Acme Capital LLC",
      direction: "BUY",
      asset: "Russell 1000 ETF Token",
      assetType: "Equity ETF",
      notional: 45000000,
      settlementDate: "2026-01-25",
      status: "pending_verification",
      riskFlags: ["low_liquidity_asset", "large_notional"],
      settlementProbability: 0.87,
      coverageRatio: 2.69
    },
    {
      id: "TRD-2026-0124-0846",
      counterparty: "meridian-fund",
      counterpartyName: "Meridian Fund Services",
      direction: "SELL",
      asset: "UST 10Y Token",
      assetType: "Treasury",
      notional: 125000000,
      settlementDate: "2026-01-25",
      status: "approved",
      riskFlags: [],
      settlementProbability: 0.96,
      coverageRatio: 4.12
    },
    {
      id: "TRD-2026-0124-0845",
      counterparty: "vertex-trading",
      counterpartyName: "Vertex Trading Corp",
      direction: "BUY",
      asset: "AAPL Token",
      assetType: "Equity",
      notional: 28000000,
      settlementDate: "2026-01-25",
      status: "flagged",
      riskFlags: ["counterparty_alert_status", "concentration_risk"],
      settlementProbability: 0.58,
      coverageRatio: 1.34
    }
  ];

  const manipulationAssets: ManipulationAsset[] = [
    { id: "russ-etf", name: "Russell 1000 ETF Token", type: "Equity ETF", tsleState: "elevated", integrity: 72, alerts: 3 },
    { id: "eth-tok", name: "ETH Token", type: "Crypto", tsleState: "watch", integrity: 81, alerts: 1 },
    { id: "sol-tok", name: "SOL Token", type: "Crypto", tsleState: "elevated", integrity: 68, alerts: 2 },
    { id: "aapl-tok", name: "AAPL Token", type: "Equity", tsleState: "clear", integrity: 94, alerts: 0 },
    { id: "ust-10y", name: "UST 10Y Token", type: "Treasury", tsleState: "clear", integrity: 97, alerts: 0 },
    { id: "btc-tok", name: "BTC Token", type: "Crypto", tsleState: "watch", integrity: 79, alerts: 2 }
  ];

  const tsleAlerts: TSLEAlert[] = [
    { id: 1, time: "14:32:07", severity: "high", asset: "Russell 1000 ETF Token", member: "Acme Capital", message: "Volume spike inconsistent with order book depth on Venue B", type: "wash_trading" },
    { id: 2, time: "14:28:45", severity: "medium", asset: "ETH Token", member: "Vertex Trading", message: "Bid-ask spread widening beyond 2sigma threshold", type: "spread_anomaly" },
    { id: 3, time: "14:25:12", severity: "high", asset: "SOL Token", member: "Vertex Trading", message: "Concentrated selling pressure from single venue", type: "venue_concentration" },
    { id: 4, time: "14:22:33", severity: "low", asset: "AAPL Token", member: "Acme Capital", message: "Minor latency spike detected in price feed", type: "latency" },
    { id: 5, time: "14:18:56", severity: "medium", asset: "BTC Token", member: "Vertex Trading", message: "Funding rate divergence across venues", type: "funding_divergence" }
  ];

  const stressMultipliers = {
    normal: { label: "Normal Market", timeframe: "24h+", factor: 1.0, color: "#10b981" },
    moderate: { label: "12h Liquidation", timeframe: "12h", factor: 0.92, color: "#f59e0b" },
    stressed: { label: "4h Liquidation", timeframe: "4h", factor: 0.78, color: "#ef4444" },
    extreme: { label: "1h Fire Sale", timeframe: "1h", factor: 0.61, color: "#dc2626" }
  };

  const viewTabs: { id: ViewType; label: string; Icon: typeof BarChart3; question: string }[] = [
    { id: "pretrade", label: "Pre-Trade Verification", Icon: ArrowRightLeft, question: "Can they settle?" },
    { id: "margin", label: "Margin Accuracy", Icon: Scale, question: "Is collateral liquid?" },
    { id: "manipulation", label: "Manipulation Detection", Icon: Eye, question: "Is liquidity gamed?" },
    { id: "member-risk", label: "Member Risk", Icon: Users, question: "Aggregate exposure?" }
  ];

  const formatCurrency = (value: number) => {
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(2)}B`;
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    return `$${value.toLocaleString()}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "#10b981";
    if (score >= 70) return "#f59e0b";
    return "#ef4444";
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; color: string; label?: string }> = {
      healthy: { bg: "#064e3b", color: "#34d399", label: "HEALTHY" },
      caution: { bg: "#78350f", color: "#fbbf24", label: "CAUTION" },
      alert: { bg: "#7f1d1d", color: "#f87171", label: "ALERT" },
      clear: { bg: "#064e3b", color: "#34d399", label: "CLEAR" },
      anomaly: { bg: "#78350f", color: "#fbbf24", label: "ANOMALY" },
      elevated: { bg: "#78350f", color: "#fbbf24", label: "ELEVATED" },
      watch: { bg: "#1e3a5f", color: "#60a5fa", label: "WATCH" },
      approved: { bg: "#064e3b", color: "#34d399", label: "APPROVED" },
      pending_verification: { bg: "#1e3a5f", color: "#60a5fa", label: "PENDING" },
      flagged: { bg: "#78350f", color: "#fbbf24", label: "FLAGGED" },
      warning: { bg: "#78350f", color: "#fbbf24", label: "WARNING" },
      critical: { bg: "#7f1d1d", color: "#f87171", label: "CRITICAL" },
      LOW: { bg: "#064e3b", color: "#34d399" },
      MODERATE: { bg: "#78350f", color: "#fbbf24" },
      MEDIUM: { bg: "#78350f", color: "#fbbf24" },
      HIGH: { bg: "#7f1d1d", color: "#f87171" },
      CRITICAL: { bg: "#450a0a", color: "#fca5a5" }
    };
    return styles[status] || styles.caution;
  };

  const getSeverityStyle = (severity: string) => {
    const styles: Record<string, { bg: string; border: string; dot: string }> = {
      high: { bg: "rgba(239, 68, 68, 0.15)", border: "rgba(239, 68, 68, 0.4)", dot: "#ef4444" },
      medium: { bg: "rgba(245, 158, 11, 0.15)", border: "rgba(245, 158, 11, 0.4)", dot: "#f59e0b" },
      low: { bg: "rgba(59, 130, 246, 0.15)", border: "rgba(59, 130, 246, 0.4)", dot: "#3b82f6" }
    };
    return styles[severity] || styles.medium;
  };

  const member = members[selectedMember];

  const getStressedValue = (baseValue: number, collateral?: Collateral) => {
    if (stressScenario === "normal") return baseValue;
    const timeframeMap: Record<string, string> = { moderate: "12h", stressed: "4h", extreme: "1h" };
    const timeframe = timeframeMap[stressScenario];
    if (collateral?.liquidityProfile?.[timeframe]) {
      return Math.round(baseValue * collateral.liquidityProfile[timeframe]);
    }
    return Math.round(baseValue * stressMultipliers[stressScenario].factor);
  };

  const totalStressedValue = useMemo(() => {
    if (!member?.collateral?.length) return member?.strataAdjusted || 0;
    return member.collateral.reduce((sum, c) => sum + getStressedValue(c.strataValue, c), 0);
  }, [selectedMember, stressScenario]);

  const stressedMarginGap = member ? member.traditionalValue - totalStressedValue : 0;

  const filteredMembers = Object.entries(members).filter(([_, m]) =>
    m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
    m.memberId.toLowerCase().includes(memberSearch.toLowerCase())
  );

  const { data: dashboardData } = useQuery<DashboardData>({
    queryKey: ['/api/dashboard', 'BTC'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard?asset=BTC');
      if (!response.ok) throw new Error('Failed to fetch dashboard data');
      return response.json();
    },
    refetchInterval: 10000,
  });

  return (
    <div className="min-h-screen flex flex-col bg-background pb-[72px]">
      {/* Standard App Navigation Headers */}
      <DashboardHeader />
      <PlatformTabs />

      {/* CCP Margin Page Sub-Header */}
      <div
        className="flex justify-between items-center px-4 py-3 border-b border-border bg-card"
      >
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-foreground">CCP Margin Verification Console</span>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-muted-foreground">LIVE</span>
            <span className="text-foreground">Canton Network</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDataProvenance(!showDataProvenance)}
            className="text-xs gap-2 bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
            data-testid="btn-toggle-provenance"
          >
            <CircleDot className="w-2 h-2" />
            <span className="font-semibold">SYNTHETIC DATA</span>
            <span className="text-muted-foreground">|</span>
            <span className="text-amber-600">Proxy Model v1.2</span>
            {showDataProvenance ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
          <div className="text-xs text-muted-foreground font-mono">
            {new Date().toISOString().slice(0, 19).replace("T", " ")} UTC
          </div>
        </div>
      </div>

      {/* Data Provenance Panel */}
      {showDataProvenance && (
        <div
          className="px-4 py-4 bg-amber-500/5 border-b border-amber-500/20"
        >
          <div className="grid grid-cols-3 gap-8 max-w-7xl mx-auto">
            <div className="col-span-2">
              <div className="text-[11px] text-amber-400 tracking-widest mb-3">
                SIMULATION MODE — PROXY METHODOLOGY
              </div>
              <div className="text-sm text-slate-400 mb-4">
                LTF-conformant simulation using historical TradFi + DeFi liquidity patterns
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { token: "UST 10Y Token", proxy: "US Treasury 10Y yields + institutional OTC depth", source: "Bloomberg, Refinitiv" },
                  { token: "Russell 1000 ETF Token", proxy: "IWB ETF liquidity + DEX fragmentation", source: "NYSE, Uniswap, Curve" },
                  { token: "AAPL Token", proxy: "AAPL microstructure + tokenized equity patterns", source: "NASDAQ, RWA data" },
                  { token: "UST 2Y Token", proxy: "Treasury 2Y + stablecoin correlations", source: "Bloomberg, on-chain" }
                ].map((item, i) => (
                  <div key={i} className="p-3 rounded-lg" style={{ background: "#111111" }}>
                    <div className="text-xs font-semibold mb-1">{item.token}</div>
                    <div className="text-[11px] text-slate-400 mb-1">{item.proxy}</div>
                    <div className="text-[10px] text-slate-500">{item.source}</div>
                  </div>
                ))}
              </div>
            </div>
            <div
              className="p-4 rounded-lg"
              style={{ background: "rgba(251, 191, 36, 0.1)", border: "1px solid rgba(251, 191, 36, 0.2)" }}
            >
              <div className="flex items-center gap-2 text-[11px] text-amber-400 font-semibold mb-2">
                <AlertTriangle className="w-4 h-4" />
                IMPORTANT DISCLAIMER
              </div>
              <div className="text-xs text-slate-400 leading-relaxed">
                Simulated environment using proxy instruments. Production deployment pending Canton Network venue integration and DTC tokenization service launch (H2 2026).
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Switcher */}
      <div
        className="px-4 py-3 flex gap-2 bg-card/90 border-b border-border"
      >
        {viewTabs.map((tab) => {
          const isActive = activeView === tab.id;
          return (
            <Button
              key={tab.id}
              variant={isActive ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveView(tab.id)}
              className={cn(
                "text-xs gap-2 px-5",
                isActive
                  ? "text-slate-100"
                  : "text-slate-500"
              )}
              style={isActive ? {
                background: "linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)",
                border: "1px solid rgba(59, 130, 246, 0.4)"
              } : undefined}
              data-testid={`btn-view-${tab.id}`}
            >
              <tab.Icon className="w-4 h-4" />
              <div className="text-left">
                <div className="font-semibold">{tab.label}</div>
                <div className="text-[10px] font-normal opacity-70">{tab.question}</div>
              </div>
            </Button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Member Sidebar - Shared across views */}
        <aside
          className="w-[280px] flex-shrink-0 p-4 overflow-y-auto bg-card/80 border-r border-border"
        >
          <div className="text-[11px] text-slate-500 tracking-widest mb-3">CLEARING MEMBERS</div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search members..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              className="pl-9 h-9 text-xs bg-black/50 border-white/10"
              data-testid="input-member-search"
            />
          </div>
          <div className="space-y-2">
            {filteredMembers.map(([key, m]) => {
              const statusStyle = getStatusBadge(m.strataStatus);
              const isSelected = selectedMember === key;
              return (
                <div
                  key={key}
                  onClick={() => setSelectedMember(key)}
                  className={cn(
                    "p-4 rounded-lg cursor-pointer transition-all",
                    isSelected ? "border-l-[3px]" : "border-l-[3px] border-transparent"
                  )}
                  style={{
                    background: isSelected ? "rgba(59, 130, 246, 0.1)" : "transparent",
                    borderLeftColor: isSelected ? "#3b82f6" : "transparent"
                  }}
                  data-testid={`member-${key}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">{m.name}</span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded font-semibold"
                      style={{ background: statusStyle.bg, color: statusStyle.color }}
                    >
                      {statusStyle.label || m.strataStatus.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-slate-500">{m.memberId}</span>
                    <span
                      className="text-lg font-bold"
                      style={{ color: getScoreColor(m.strataScore) }}
                    >
                      {m.strataScore}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* View Content */}
        {activeView === "pretrade" && <PreTradeView
          trades={pendingTrades}
          members={members}
          selectedTrade={selectedTrade}
          setSelectedTrade={setSelectedTrade}
          formatCurrency={formatCurrency}
          getScoreColor={getScoreColor}
          getStatusBadge={getStatusBadge}
        />}
        {activeView === "margin" && <MarginAccuracyView
          member={member}
          stressScenario={stressScenario}
          setStressScenario={setStressScenario}
          stressMultipliers={stressMultipliers}
          selectedCollateral={selectedCollateral}
          setSelectedCollateral={setSelectedCollateral}
          formatCurrency={formatCurrency}
          getScoreColor={getScoreColor}
          getStatusBadge={getStatusBadge}
          getStressedValue={getStressedValue}
          totalStressedValue={totalStressedValue}
          stressedMarginGap={stressedMarginGap}
        />}
        {activeView === "manipulation" && <ManipulationView
          assets={manipulationAssets}
          selectedAsset={selectedAsset}
          setSelectedAsset={setSelectedAsset}
          formatCurrency={formatCurrency}
          getScoreColor={getScoreColor}
          getStatusBadge={getStatusBadge}
        />}
        {activeView === "member-risk" && <MemberRiskView
          member={member}
          formatCurrency={formatCurrency}
          getScoreColor={getScoreColor}
          getStatusBadge={getStatusBadge}
        />}

        {/* Right Panel - TSLE Alerts */}
        <aside
          className="w-[320px] flex-shrink-0 p-4 overflow-y-auto bg-card/80 border-l border-border"
        >
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant={rightPanelTab === "alerts" ? "default" : "ghost"}
              size="sm"
              onClick={() => setRightPanelTab("alerts")}
              className={cn("text-xs", rightPanelTab === "alerts" ? "bg-white/10" : "")}
              data-testid="btn-tab-alerts"
            >
              TSLE Alerts
            </Button>
            <Button
              variant={rightPanelTab === "trends" ? "default" : "ghost"}
              size="sm"
              onClick={() => setRightPanelTab("trends")}
              className={cn("text-xs", rightPanelTab === "trends" ? "bg-white/10" : "")}
              data-testid="btn-tab-trends"
            >
              STRATA Trends
            </Button>
          </div>

          {rightPanelTab === "alerts" && (
            <div className="space-y-3">
              {tsleAlerts.map((alert) => {
                const style = getSeverityStyle(alert.severity);
                return (
                  <div
                    key={alert.id}
                    className="p-3 rounded-lg"
                    style={{ background: style.bg, border: `1px solid ${style.border}` }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: style.dot }} />
                        <span className="text-[10px] font-mono text-slate-400">{alert.time}</span>
                      </div>
                      <Badge variant="outline" className="text-[9px]" style={{ color: style.dot, borderColor: style.dot }}>
                        {alert.severity.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-xs font-semibold mb-1">{alert.asset}</div>
                    <div className="text-[11px] text-slate-400 mb-1">{alert.message}</div>
                    <div className="text-[10px] text-slate-500">{alert.member}</div>
                  </div>
                );
              })}
            </div>
          )}

          {rightPanelTab === "trends" && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg" style={{ background: "#111111" }}>
                <div className="text-[11px] text-slate-500 tracking-widest mb-3">30-DAY MARGIN GAP TREND</div>
                <div className="h-32 flex items-end gap-1">
                  {Array.from({ length: 30 }, (_, i) => {
                    const height = 30 + Math.random() * 70;
                    const isToday = i === 29;
                    return (
                      <div
                        key={i}
                        className="flex-1 rounded-t"
                        style={{
                          height: `${height}%`,
                          background: isToday ? "#3b82f6" : height > 60 ? "#ef4444" : height > 40 ? "#f59e0b" : "#10b981",
                          opacity: isToday ? 1 : 0.6
                        }}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-slate-500">
                  <span>30d ago</span>
                  <span>Today</span>
                </div>
              </div>
              <div className="p-4 rounded-lg" style={{ background: "#111111" }}>
                <div className="text-[11px] text-slate-500 tracking-widest mb-3">AVG. POLI BY ASSET CLASS</div>
                {[
                  { label: "Treasury", score: 94, color: "#10b981" },
                  { label: "Equity ETF", score: 76, color: "#f59e0b" },
                  { label: "Equity", score: 82, color: "#10b981" },
                  { label: "Crypto", score: 58, color: "#ef4444" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <span className="text-xs">{item.label}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 rounded bg-black/50 overflow-hidden">
                        <div className="h-full rounded" style={{ width: `${item.score}%`, background: item.color }} />
                      </div>
                      <span className="text-xs font-bold" style={{ color: item.color }}>{item.score}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Standard App Footer */}
      <DateTimeBar />
      <BottomTicker items={dashboardData?.tickerItems || []} />
    </div>
  );
}

// ============================================================================
// PRE-TRADE VERIFICATION VIEW
// ============================================================================

interface PreTradeViewProps {
  trades: PendingTrade[];
  members: Record<string, Member>;
  selectedTrade: string;
  setSelectedTrade: (id: string) => void;
  formatCurrency: (value: number) => string;
  getScoreColor: (score: number) => string;
  getStatusBadge: (status: string) => { bg: string; color: string; label?: string };
}

function PreTradeView({ trades, members, selectedTrade, setSelectedTrade, formatCurrency, getScoreColor, getStatusBadge }: PreTradeViewProps) {
  const trade = trades.find(t => t.id === selectedTrade);
  const counterparty = trade ? members[trade.counterparty] : null;

  return (
    <main className="flex-1 p-6 overflow-y-auto">
      <div className="flex gap-6">
        {/* Trade Queue */}
        <div
          className="w-[280px] flex-shrink-0 p-4 rounded-xl"
          style={{ background: "rgba(17, 17, 17, 0.9)", border: "1px solid rgba(255, 255, 255, 0.1)" }}
        >
          <div className="text-[11px] text-slate-500 tracking-widest mb-4">PENDING TRADES QUEUE</div>
          <div className="space-y-2">
            {trades.map((t) => {
              const statusStyle = getStatusBadge(t.status);
              const isSelected = selectedTrade === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTrade(t.id)}
                  className="p-3 rounded-lg cursor-pointer transition-all"
                  style={{
                    background: isSelected ? "rgba(59, 130, 246, 0.15)" : "#111111",
                    border: isSelected ? "1px solid rgba(59, 130, 246, 0.4)" : "1px solid transparent"
                  }}
                  data-testid={`trade-${t.id}`}
                >
                  <div className="flex justify-between mb-1">
                    <span className="text-[11px] text-slate-500 font-mono">{t.id.slice(-8)}</span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded font-semibold"
                      style={{ background: statusStyle.bg, color: statusStyle.color }}
                    >
                      {statusStyle.label}
                    </span>
                  </div>
                  <div className="text-sm font-semibold mb-1">{t.asset}</div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-slate-400">{t.direction} • {formatCurrency(t.notional)}</span>
                    <span className="text-sm font-bold" style={{ color: getScoreColor(t.settlementProbability * 100) }}>
                      {Math.round(t.settlementProbability * 100)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Trade Detail */}
        {trade && counterparty && (
          <div className="flex-1 space-y-6">
            {/* Trade Header */}
            <div
              className="p-6 rounded-xl"
              style={{ background: "rgba(17, 17, 17, 0.9)", border: "1px solid rgba(255, 255, 255, 0.1)" }}
            >
              <div className="flex justify-between mb-5">
                <div>
                  <div className="text-2xl font-bold mb-1">{trade.asset}</div>
                  <div className="text-sm text-slate-400">{trade.id} • T+1 Settlement</div>
                </div>
                <span
                  className="text-xs px-4 py-2 rounded-md font-bold"
                  style={{ background: getStatusBadge(trade.status).bg, color: getStatusBadge(trade.status).color }}
                >
                  {getStatusBadge(trade.status).label}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-4">
                {[
                  { label: "COUNTERPARTY", value: trade.counterpartyName },
                  { label: "DIRECTION", value: trade.direction, color: trade.direction === "BUY" ? "#10b981" : "#ef4444" },
                  { label: "NOTIONAL", value: formatCurrency(trade.notional) },
                  { label: "TYPE", value: trade.assetType },
                  { label: "SETTLEMENT", value: trade.settlementDate }
                ].map((item, i) => (
                  <div key={i}>
                    <div className="text-[10px] text-slate-500 mb-1">{item.label}</div>
                    <div className="text-sm font-semibold" style={{ color: item.color || "#e2e8f0" }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Settlement Metrics */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "AVAILABLE BALANCE", value: formatCurrency(counterparty.totalPosted * 0.15), sub: "Liquid assets" },
                { label: "REQUIRED MARGIN", value: formatCurrency(trade.notional * 0.35), sub: "For this trade" },
                { label: "COVERAGE RATIO", value: `${trade.coverageRatio.toFixed(2)}x`, sub: trade.coverageRatio >= 2 ? "Healthy" : "At Risk", color: getScoreColor(trade.coverageRatio * 40) },
                { label: "SETTLEMENT PROB.", value: `${Math.round(trade.settlementProbability * 100)}%`, sub: trade.settlementProbability >= 0.9 ? "Very Likely" : "Monitor", color: getScoreColor(trade.settlementProbability * 100), highlight: true }
              ].map((metric, i) => (
                <div
                  key={i}
                  className="p-5 rounded-xl"
                  style={{
                    background: metric.highlight
                      ? `linear-gradient(135deg, ${getScoreColor(trade.settlementProbability * 100)}20 0%, ${getScoreColor(trade.settlementProbability * 100)}10 100%)`
                      : "rgba(17, 17, 17, 0.9)",
                    border: `1px solid ${metric.highlight ? getScoreColor(trade.settlementProbability * 100) + "40" : "rgba(255, 255, 255, 0.1)"}`
                  }}
                >
                  <div className="text-[10px] text-slate-500 tracking-widest mb-2">{metric.label}</div>
                  <div className="text-2xl font-bold" style={{ color: metric.color || "#e2e8f0" }}>{metric.value}</div>
                  <div className="text-[11px] text-slate-500">{metric.sub}</div>
                </div>
              ))}
            </div>

            {/* Risk Flags */}
            {trade.riskFlags.length > 0 && (
              <div
                className="p-4 rounded-xl"
                style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-400">RISK FLAGS DETECTED</span>
                </div>
                <div className="flex gap-2">
                  {trade.riskFlags.map((flag, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30">
                      {flag.replace(/_/g, " ").toUpperCase()}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Verification Actions */}
            <div
              className="p-6 rounded-xl"
              style={{ background: "rgba(17, 17, 17, 0.9)", border: "1px solid rgba(255, 255, 255, 0.1)" }}
            >
              <div className="text-[11px] text-slate-500 tracking-widest mb-4">VERIFICATION DECISION</div>
              <div className="flex gap-4">
                <Button className="flex-1 h-12 text-sm font-bold bg-emerald-500 hover:bg-emerald-600" data-testid="btn-approve-trade">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  APPROVE TRADE
                </Button>
                <Button className="flex-1 h-12 text-sm font-bold bg-amber-500 hover:bg-amber-600 text-black" data-testid="btn-flag-trade">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  FLAG FOR REVIEW
                </Button>
                <Button className="flex-1 h-12 text-sm font-bold bg-red-500 hover:bg-red-600" data-testid="btn-reject-trade">
                  <XCircle className="w-4 h-4 mr-2" />
                  REJECT
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// ============================================================================
// MARGIN ACCURACY VIEW
// ============================================================================

interface MarginAccuracyViewProps {
  member: Member;
  stressScenario: StressScenario;
  setStressScenario: (scenario: StressScenario) => void;
  stressMultipliers: Record<StressScenario, { label: string; timeframe: string; factor: number; color: string }>;
  selectedCollateral: string | null;
  setSelectedCollateral: (id: string | null) => void;
  formatCurrency: (value: number) => string;
  getScoreColor: (score: number) => string;
  getStatusBadge: (status: string) => { bg: string; color: string; label?: string };
  getStressedValue: (baseValue: number, collateral?: Collateral) => number;
  totalStressedValue: number;
  stressedMarginGap: number;
}

function MarginAccuracyView({
  member,
  stressScenario,
  setStressScenario,
  stressMultipliers,
  selectedCollateral,
  setSelectedCollateral,
  formatCurrency,
  getScoreColor,
  getStatusBadge,
  getStressedValue,
  totalStressedValue,
  stressedMarginGap
}: MarginAccuracyViewProps) {
  return (
    <main className="flex-1 p-6 overflow-y-auto">
      {/* Stress Scenario Selector */}
      <div className="flex gap-2 mb-6">
        {(Object.entries(stressMultipliers) as [StressScenario, typeof stressMultipliers[StressScenario]][]).map(([key, scenario]) => (
          <Button
            key={key}
            variant={stressScenario === key ? "default" : "ghost"}
            size="sm"
            onClick={() => setStressScenario(key)}
            className="text-xs gap-2"
            style={stressScenario === key ? { background: scenario.color + "30", borderColor: scenario.color } : undefined}
            data-testid={`btn-stress-${key}`}
          >
            <Clock className="w-3 h-3" style={{ color: scenario.color }} />
            <span style={{ color: stressScenario === key ? scenario.color : undefined }}>{scenario.label}</span>
          </Button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "STRATA SCORE", value: member.strataScore.toString(), color: getScoreColor(member.strataScore), sub: member.strataStatus.toUpperCase() },
          { label: "TRADITIONAL HAIRCUT", value: formatCurrency(member.traditionalValue), sub: "Standard methodology" },
          { label: "STRATA-ADJUSTED VALUE", value: formatCurrency(totalStressedValue), color: stressMultipliers[stressScenario].color, sub: stressMultipliers[stressScenario].label },
          { label: "MARGIN GAP", value: formatCurrency(stressedMarginGap), color: stressedMarginGap > 50000000 ? "#ef4444" : "#f59e0b", sub: "Liquidity risk not captured", highlight: stressedMarginGap > 50000000 }
        ].map((card, i) => (
          <div
            key={i}
            className="p-5 rounded-xl"
            style={{
              background: card.highlight ? "rgba(239, 68, 68, 0.1)" : "rgba(17, 17, 17, 0.9)",
              border: `1px solid ${card.highlight ? "rgba(239, 68, 68, 0.3)" : "rgba(255, 255, 255, 0.1)"}`
            }}
          >
            <div className="text-[10px] text-slate-500 tracking-widest mb-2">{card.label}</div>
            <div className="text-2xl font-bold" style={{ color: card.color || "#e2e8f0" }}>{card.value}</div>
            <div className="text-[11px] text-slate-500">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Collateral Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "rgba(17, 17, 17, 0.9)", border: "1px solid rgba(255, 255, 255, 0.1)" }}
      >
        <div className="px-6 py-4 border-b border-white/10">
          <div className="text-[11px] text-slate-500 tracking-widest">COLLATERAL HOLDINGS</div>
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-[10px] text-slate-500 border-b border-white/5">
              <th className="text-left p-4 font-medium">ASSET</th>
              <th className="text-right p-4 font-medium">NOMINAL</th>
              <th className="text-right p-4 font-medium">HAIRCUT</th>
              <th className="text-right p-4 font-medium">STRATA VALUE</th>
              <th className="text-right p-4 font-medium">DELTA</th>
              <th className="text-right p-4 font-medium">PoLi</th>
              <th className="text-right p-4 font-medium">TSLE</th>
              <th className="text-right p-4 font-medium">VENUES</th>
            </tr>
          </thead>
          <tbody>
            {member.collateral.map((c) => {
              const stressedValue = getStressedValue(c.strataValue, c);
              const delta = stressedValue - c.haircut;
              const statusStyle = getStatusBadge(c.tsleStatus);
              return (
                <tr
                  key={c.id}
                  className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                  onClick={() => setSelectedCollateral(selectedCollateral === c.id ? null : c.id)}
                  data-testid={`collateral-${c.id}`}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{c.asset}</span>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded"
                        style={{
                          background: c.dataConfidence === "high" ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)",
                          color: c.dataConfidence === "high" ? "#34d399" : "#fbbf24"
                        }}
                      >
                        {c.dataConfidence.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">{c.type}</div>
                  </td>
                  <td className="p-4 text-right font-mono">{formatCurrency(c.nominal)}</td>
                  <td className="p-4 text-right font-mono">{formatCurrency(c.haircut)}</td>
                  <td className="p-4 text-right font-mono" style={{ color: stressScenario !== "normal" ? stressMultipliers[stressScenario].color : "#e2e8f0" }}>
                    {formatCurrency(stressedValue)}
                  </td>
                  <td className="p-4 text-right font-mono" style={{ color: delta < 0 ? "#ef4444" : "#10b981" }}>
                    {delta < 0 ? "" : "+"}{formatCurrency(Math.abs(delta))}
                  </td>
                  <td className="p-4 text-right">
                    <span
                      className="text-xs px-2 py-1 rounded font-bold"
                      style={{ background: getScoreColor(c.poliScore) + "20", color: getScoreColor(c.poliScore) }}
                    >
                      {c.poliScore}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <span
                      className="text-[11px] px-2 py-1 rounded font-semibold"
                      style={{ background: statusStyle.bg, color: statusStyle.color }}
                    >
                      {c.tsleStatus.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4 text-right text-slate-400">{c.venues}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Action Footer */}
      {stressedMarginGap > 50000000 && (
        <div
          className="mt-6 p-5 rounded-xl flex justify-between items-center"
          style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)" }}
        >
          <div>
            <div className="text-sm font-semibold text-red-300 mb-1">Action Required: Margin Call Recommended</div>
            <div className="text-xs text-slate-400">
              STRATA analysis reveals {formatCurrency(stressedMarginGap)} liquidity gap not captured by traditional haircuts
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" className="text-xs" data-testid="btn-export-report">
              <FileText className="w-4 h-4 mr-2" />
              Export Report
            </Button>
            <Button className="text-xs bg-red-500 hover:bg-red-600" data-testid="btn-margin-call">
              <AlertCircle className="w-4 h-4 mr-2" />
              Initiate Margin Call
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}

// ============================================================================
// MANIPULATION DETECTION VIEW
// ============================================================================

interface ManipulationViewProps {
  assets: ManipulationAsset[];
  selectedAsset: string;
  setSelectedAsset: (id: string) => void;
  formatCurrency: (value: number) => string;
  getScoreColor: (score: number) => string;
  getStatusBadge: (status: string) => { bg: string; color: string; label?: string };
}

function ManipulationView({ assets, selectedAsset, setSelectedAsset, formatCurrency, getScoreColor, getStatusBadge }: ManipulationViewProps) {
  const asset = assets.find(a => a.id === selectedAsset) || assets[0];

  return (
    <main className="flex-1 p-6 overflow-y-auto">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "MONITORED ASSETS", value: "47", sub: "Across all venues" },
          { label: "ACTIVE ALERTS", value: "12", sub: "Requiring review", color: "#f59e0b" },
          { label: "CONFIRMED MANIPULATION", value: "3", sub: "Last 24 hours", color: "#ef4444" },
          { label: "MARKET INTEGRITY", value: "91%", sub: "Portfolio-wide", color: "#10b981", highlight: true }
        ].map((card, i) => (
          <div
            key={i}
            className="p-5 rounded-xl"
            style={{
              background: card.highlight
                ? "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.15) 100%)"
                : "rgba(17, 17, 17, 0.9)",
              border: `1px solid ${card.highlight ? "rgba(16, 185, 129, 0.3)" : "rgba(255, 255, 255, 0.1)"}`
            }}
          >
            <div className="text-[10px] tracking-widest mb-2" style={{ color: card.color || "#64748b" }}>{card.label}</div>
            <div className="text-3xl font-bold" style={{ color: card.color || "#e2e8f0" }}>{card.value}</div>
            <div className="text-[11px] text-slate-500">{card.sub}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Asset Watchlist */}
        <div
          className="w-[260px] flex-shrink-0 p-4 rounded-xl"
          style={{ background: "rgba(17, 17, 17, 0.9)", border: "1px solid rgba(255, 255, 255, 0.1)" }}
        >
          <div className="text-[11px] text-slate-500 tracking-widest mb-4">ASSET WATCHLIST</div>
          <div className="space-y-2">
            {assets.map((a) => {
              const statusStyle = getStatusBadge(a.tsleState);
              const isSelected = selectedAsset === a.id;
              return (
                <div
                  key={a.id}
                  onClick={() => setSelectedAsset(a.id)}
                  className="p-3 rounded-lg cursor-pointer transition-all"
                  style={{
                    background: isSelected ? "rgba(59, 130, 246, 0.15)" : "#111111",
                    border: isSelected ? "1px solid rgba(59, 130, 246, 0.4)" : "1px solid transparent"
                  }}
                  data-testid={`asset-${a.id}`}
                >
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-semibold">{a.name}</span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded font-semibold"
                      style={{ background: statusStyle.bg, color: statusStyle.color }}
                    >
                      {a.tsleState.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-slate-500">{a.type}</span>
                    <span className="text-sm font-bold" style={{ color: getScoreColor(a.integrity) }}>{a.integrity}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Asset Detail */}
        <div className="flex-1 space-y-6">
          <div
            className="p-6 rounded-xl"
            style={{ background: "rgba(17, 17, 17, 0.9)", border: "1px solid rgba(255, 255, 255, 0.1)" }}
          >
            <div className="flex justify-between mb-5">
              <div>
                <div className="text-2xl font-bold mb-1">{asset.name}</div>
                <div className="text-sm text-slate-400">{asset.type}</div>
              </div>
              <div className="text-right">
                <span
                  className="text-xs px-3 py-1 rounded-md font-bold"
                  style={{ background: getStatusBadge(asset.tsleState).bg, color: getStatusBadge(asset.tsleState).color }}
                >
                  TSLE: {asset.tsleState.toUpperCase()}
                </span>
                <div className="text-4xl font-extrabold mt-2" style={{ color: getScoreColor(asset.integrity) }}>
                  {asset.integrity}%
                </div>
                <div className="text-[11px] text-slate-500">Integrity Score</div>
              </div>
            </div>

            {/* Detected Patterns */}
            {asset.tsleState !== "clear" && (
              <div
                className="p-4 rounded-lg mb-5"
                style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)" }}
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-red-300 mb-2">
                  <AlertCircle className="w-4 h-4" />
                  WASH TRADING DETECTED (Venue B)
                </div>
                <div className="text-xs text-slate-400 mb-2">
                  Circular order flow between 3 wallets. Est. artificial volume: $12.4M (34%)
                </div>
                <div className="text-[11px] text-slate-500">Confidence: 94% • First detected: 14:32:07</div>
              </div>
            )}

            {/* Venue Integrity */}
            <div className="text-[11px] text-slate-500 tracking-widest mb-3">VENUE INTEGRITY</div>
            <div className="space-y-2">
              {[
                { name: "Canton DEX", status: "clear", integrity: 96 },
                { name: "Venue B (CEX)", status: "anomaly", integrity: 61 },
                { name: "Venue C (RFQ)", status: "clear", integrity: 89 }
              ].map((venue, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center p-3 rounded-lg"
                  style={{
                    background: "#111111",
                    border: venue.status === "anomaly" ? "1px solid rgba(245, 158, 11, 0.3)" : "1px solid transparent"
                  }}
                >
                  <div className="flex items-center gap-2">
                    {venue.status === "clear" ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    )}
                    <span className="font-semibold">{venue.name}</span>
                  </div>
                  <span className="text-base font-bold" style={{ color: getScoreColor(venue.integrity) }}>
                    {venue.integrity}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button className="flex-1 h-11 text-xs font-semibold bg-red-500 hover:bg-red-600" data-testid="btn-manipulation-report">
              <FileText className="w-4 h-4 mr-2" />
              Generate Manipulation Report
            </Button>
            <Button variant="outline" className="flex-1 h-11 text-xs font-semibold" data-testid="btn-notify-compliance">
              <Shield className="w-4 h-4 mr-2" />
              Notify Compliance
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}

// ============================================================================
// MEMBER RISK VIEW
// ============================================================================

interface MemberRiskViewProps {
  member: Member;
  formatCurrency: (value: number) => string;
  getScoreColor: (score: number) => string;
  getStatusBadge: (status: string) => { bg: string; color: string; label?: string };
}

function MemberRiskView({ member, formatCurrency, getScoreColor, getStatusBadge }: MemberRiskViewProps) {
  const getImpactStyle = (impact: string) => {
    const styles: Record<string, { bg: string; color: string }> = {
      CRITICAL: { bg: "rgba(239, 68, 68, 0.2)", color: "#ef4444" },
      HIGH: { bg: "rgba(245, 158, 11, 0.2)", color: "#f59e0b" },
      MEDIUM: { bg: "rgba(59, 130, 246, 0.2)", color: "#60a5fa" },
      LOW: { bg: "rgba(16, 185, 129, 0.2)", color: "#34d399" }
    };
    return styles[impact] || styles.MEDIUM;
  };

  return (
    <main className="flex-1 p-6 overflow-y-auto">
      {/* Risk Profile Header */}
      <div
        className="p-6 rounded-xl mb-6"
        style={{ background: "rgba(17, 17, 17, 0.9)", border: "1px solid rgba(255, 255, 255, 0.1)" }}
      >
        <div className="flex justify-between mb-6">
          <div>
            <div className="text-[11px] text-slate-500 tracking-widest mb-2">RISK PROFILE</div>
            <div className="text-2xl font-bold mb-1">{member.name}</div>
            <div className="text-sm text-slate-400">Member ID: {member.memberId}</div>
          </div>
          <div className="text-right">
            <span
              className="text-xs px-3 py-1 rounded-md font-bold"
              style={{ background: getStatusBadge(member.overallRisk.label).bg, color: getStatusBadge(member.overallRisk.label).color }}
            >
              {member.overallRisk.label} RISK
            </span>
            <div className="text-5xl font-extrabold mt-2" style={{ color: getScoreColor(member.overallRisk.score) }}>
              {member.overallRisk.score}
            </div>
          </div>
        </div>

        {/* Risk Factor Cards */}
        <div className="grid grid-cols-4 gap-4">
          {Object.entries(member.riskFactors).map(([key, factor]) => (
            <div key={key} className="p-4 rounded-lg" style={{ background: "#111111" }}>
              <div className="text-[10px] text-slate-500 mb-2 uppercase">
                {key.replace(/([A-Z])/g, " $1").trim()}
              </div>
              <div className="flex justify-between items-end">
                <div className="text-2xl font-bold" style={{ color: getScoreColor(factor.score) }}>{factor.score}</div>
                <span
                  className="text-[10px] px-2 py-0.5 rounded font-bold"
                  style={{ background: getStatusBadge(factor.label).bg, color: getStatusBadge(factor.label).color }}
                >
                  {factor.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Venue Exposure */}
      <div
        className="p-6 rounded-xl mb-6"
        style={{ background: "rgba(17, 17, 17, 0.9)", border: "1px solid rgba(255, 255, 255, 0.1)" }}
      >
        <div className="text-[11px] text-slate-500 tracking-widest mb-5">VENUE EXPOSURE MAP</div>
        <div className="space-y-4">
          {member.venueExposure.map((venue, i) => (
            <div key={i}>
              <div className="flex justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{venue.venue}</span>
                  {venue.status !== "healthy" && (
                    <span
                      className="text-[10px] px-2 py-0.5 rounded font-semibold"
                      style={{
                        background: venue.status === "critical" ? "rgba(239, 68, 68, 0.2)" : "rgba(245, 158, 11, 0.2)",
                        color: venue.status === "critical" ? "#ef4444" : "#f59e0b"
                      }}
                    >
                      {venue.status.toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="text-slate-400">{venue.pct}% ({formatCurrency(venue.amount)})</span>
              </div>
              <div className="h-5 rounded overflow-hidden mb-1" style={{ background: "#111111" }}>
                <div
                  className="h-full rounded"
                  style={{
                    width: `${venue.pct}%`,
                    background: venue.status === "healthy" ? "#10b981" : venue.status === "warning" ? "#f59e0b" : "#ef4444"
                  }}
                />
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                {venue.status === "healthy" ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                {venue.note}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div
        className="p-6 rounded-xl"
        style={{ background: "rgba(17, 17, 17, 0.9)", border: "1px solid rgba(255, 255, 255, 0.1)" }}
      >
        <div className="flex justify-between items-center mb-5">
          <div className="text-[11px] text-slate-500 tracking-widest">RECOMMENDATIONS</div>
          <Button size="sm" className="text-xs bg-purple-500 hover:bg-purple-600" data-testid="btn-rebalancing">
            <RefreshCw className="w-4 h-4 mr-2" />
            Generate Rebalancing Proposal
          </Button>
        </div>
        <div className="space-y-3">
          {member.recommendations.map((rec, i) => {
            const impactStyle = getImpactStyle(rec.impact);
            return (
              <div
                key={i}
                className="flex items-center p-4 rounded-lg"
                style={{ background: "#111111" }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs mr-4"
                  style={{ background: impactStyle.bg, color: impactStyle.color }}
                >
                  {rec.priority}
                </div>
                <div className="flex-1 text-sm">{rec.action}</div>
                <span
                  className="text-[10px] px-2 py-1 rounded font-semibold"
                  style={{ background: impactStyle.bg, color: impactStyle.color }}
                >
                  {rec.impact}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
