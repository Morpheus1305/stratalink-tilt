import { useState, useMemo, useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard-header";
import { PlatformTabs } from "@/components/platform-tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  ChevronDown, 
  ChevronUp, 
  ChevronRight,
  Search, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Zap,
  BarChart3,
  FileText,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

type MemberStatus = "healthy" | "caution" | "alert";
type TsleStatus = "clear" | "anomaly";
type DataConfidence = "high" | "medium" | "low";
type StressScenario = "normal" | "moderate" | "stressed" | "extreme";
type RightPanelTab = "alerts" | "trends";
type CollateralView = "overview" | "poli" | "tsle" | "dact";

interface Collateral {
  id: string;
  asset: string;
  type: string;
  nominal: number;
  haircut: number;
  strataValue: number;
  poliScore: number;
  tsleStatus: TsleStatus;
  venues: number;
  depth: string;
  liquidityProfile: Record<string, number>;
  proxySource: string;
  dataConfidence: DataConfidence;
}

interface ClearingMember {
  name: string;
  memberId: string;
  riskTier: string;
  strataScore: number;
  strataStatus: MemberStatus;
  totalPosted: number;
  traditionalValue: number;
  strataAdjusted: number;
  marginGap: number;
  collateral: Collateral[];
}

interface TsleAlert {
  id: number;
  time: string;
  severity: "high" | "medium" | "low";
  asset: string;
  member: string;
  message: string;
  type: string;
}

const members: Record<string, ClearingMember> = {
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
        proxySource: "AAPL microstructure + RWA data",
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
        proxySource: "US Treasury 2Y + stablecoin correlation",
        dataConfidence: "high"
      }
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
    collateral: [
      {
        id: "tsry-5y",
        asset: "UST 5Y Token",
        type: "Treasury",
        nominal: 500000000,
        haircut: 475000000,
        strataValue: 465000000,
        poliScore: 94,
        tsleStatus: "clear",
        venues: 4,
        depth: "Deep",
        liquidityProfile: { "24h": 1.0, "12h": 0.98, "4h": 0.93, "1h": 0.86 },
        proxySource: "US Treasury 5Y + institutional flow",
        dataConfidence: "high"
      },
      {
        id: "usdc-tok",
        asset: "USDC Token",
        type: "Stablecoin",
        nominal: 400000000,
        haircut: 396000000,
        strataValue: 392000000,
        poliScore: 98,
        tsleStatus: "clear",
        venues: 8,
        depth: "Deep",
        liquidityProfile: { "24h": 1.0, "12h": 0.99, "4h": 0.98, "1h": 0.95 },
        proxySource: "Circle reserves + DEX pools",
        dataConfidence: "high"
      },
      {
        id: "spx-etf",
        asset: "S&P 500 ETF Token",
        type: "Equity ETF",
        nominal: 350000000,
        haircut: 316750000,
        strataValue: 286750000,
        poliScore: 87,
        tsleStatus: "clear",
        venues: 5,
        depth: "Good",
        liquidityProfile: { "24h": 1.0, "12h": 0.95, "4h": 0.87, "1h": 0.74 },
        proxySource: "SPY ETF + RWA patterns",
        dataConfidence: "medium"
      }
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
    collateral: [
      {
        id: "eth-tok",
        asset: "ETH Token",
        type: "Crypto",
        nominal: 200000000,
        haircut: 170000000,
        strataValue: 142000000,
        poliScore: 58,
        tsleStatus: "anomaly",
        venues: 6,
        depth: "Volatile",
        liquidityProfile: { "24h": 1.0, "12h": 0.78, "4h": 0.55, "1h": 0.38 },
        proxySource: "ETH spot + perps data",
        dataConfidence: "medium"
      },
      {
        id: "btc-tok",
        asset: "BTC Token",
        type: "Crypto",
        nominal: 150000000,
        haircut: 135000000,
        strataValue: 112500000,
        poliScore: 64,
        tsleStatus: "clear",
        venues: 7,
        depth: "Moderate",
        liquidityProfile: { "24h": 1.0, "12h": 0.82, "4h": 0.62, "1h": 0.45 },
        proxySource: "BTC spot + futures basis",
        dataConfidence: "medium"
      },
      {
        id: "sol-tok",
        asset: "SOL Token",
        type: "Crypto",
        nominal: 75000000,
        haircut: 98750000,
        strataValue: 64250000,
        poliScore: 45,
        tsleStatus: "anomaly",
        venues: 4,
        depth: "Thin",
        liquidityProfile: { "24h": 1.0, "12h": 0.68, "4h": 0.42, "1h": 0.28 },
        proxySource: "SOL DEX + CEX combined",
        dataConfidence: "low"
      }
    ]
  }
};

const stressMultipliers: Record<StressScenario, { label: string; factor: number; timeframe: string; color: string }> = {
  normal: { label: "Normal Market", factor: 1.0, timeframe: "24h+", color: "#10b981" },
  moderate: { label: "12h Liquidation", factor: 0.92, timeframe: "12h", color: "#f59e0b" },
  stressed: { label: "4h Liquidation", factor: 0.78, timeframe: "4h", color: "#ef4444" },
  extreme: { label: "1h Fire Sale", factor: 0.61, timeframe: "1h", color: "#dc2626" }
};

const tsleAlerts: TsleAlert[] = [
  { id: 1, time: "14:32:07", severity: "high", asset: "Russell 1000 ETF Token", member: "Acme Capital", message: "Volume spike inconsistent with order book depth on Venue B", type: "wash_trading" },
  { id: 2, time: "14:28:45", severity: "medium", asset: "ETH Token", member: "Vertex Trading", message: "Bid-ask spread widening beyond 2\u03C3 threshold", type: "spread_anomaly" },
  { id: 3, time: "14:25:12", severity: "high", asset: "SOL Token", member: "Vertex Trading", message: "Concentrated selling pressure from single venue", type: "venue_concentration" },
  { id: 4, time: "14:22:33", severity: "low", asset: "AAPL Token", member: "Acme Capital", message: "Minor latency spike detected in price feed", type: "latency" },
  { id: 5, time: "14:18:56", severity: "medium", asset: "BTC Token", member: "Vertex Trading", message: "Funding rate divergence across venues", type: "funding_divergence" }
];

const historicalData = [
  { day: 1, strata: 82, traditional: 95, gap: 13 },
  { day: 5, strata: 79, traditional: 95, gap: 16 },
  { day: 10, strata: 75, traditional: 95, gap: 20 },
  { day: 15, strata: 78, traditional: 95, gap: 17 },
  { day: 20, strata: 71, traditional: 95, gap: 24 },
  { day: 25, strata: 74, traditional: 95, gap: 21 },
  { day: 30, strata: 73, traditional: 95, gap: 22 }
];

const replacementOptions = [
  { id: "usdc-tok", asset: "USDC Token", type: "Stablecoin", poliScore: 98, improvement: 12 },
  { id: "tsry-5y", asset: "UST 5Y Token", type: "Treasury", poliScore: 94, improvement: 8 },
  { id: "spx-etf", asset: "S&P 500 ETF Token", type: "Equity ETF", poliScore: 87, improvement: 5 },
  { id: "msft-tok", asset: "MSFT Token", type: "Equity", poliScore: 86, improvement: 4 }
];

const dataProvenance = {
  modelVersion: "Synthetic Model v1.2",
  lastUpdated: "2025-01-24",
  methodology: "LTF-conformant simulation using historical TradFi + DeFi liquidity patterns",
  proxies: [
    { token: "UST 10Y Token", proxy: "US Treasury 10Y yields + institutional OTC depth estimates", source: "Bloomberg, Refinitiv" },
    { token: "Russell 1000 ETF Token", proxy: "IWB ETF liquidity profile + DEX fragmentation patterns", source: "NYSE, Uniswap, Curve" },
    { token: "AAPL Token", proxy: "AAPL equity microstructure + tokenized equity venue patterns", source: "NASDAQ, historical RWA data" },
    { token: "UST 2Y Token", proxy: "US Treasury 2Y yields + stablecoin liquidity correlations", source: "Bloomberg, on-chain analytics" }
  ],
  disclaimer: "Simulated environment using proxy instruments. Production deployment pending Canton Network venue integration and DTC tokenization service launch (H2 2026)."
};

const formatCurrency = (value: number): string => {
  if (value >= 1000000000) return `$${(value / 1000000000).toFixed(2)}B`;
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  return `$${value.toLocaleString()}`;
};

const getScoreColor = (score: number): string => {
  if (score >= 85) return "#10b981";
  if (score >= 70) return "#f59e0b";
  return "#ef4444";
};

const getStatusStyle = (status: MemberStatus | TsleStatus) => {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    healthy: { bg: "rgba(16, 185, 129, 0.2)", color: "#34d399", label: "HEALTHY" },
    caution: { bg: "rgba(251, 191, 36, 0.2)", color: "#fbbf24", label: "CAUTION" },
    alert: { bg: "rgba(239, 68, 68, 0.2)", color: "#f87171", label: "ALERT" },
    clear: { bg: "rgba(16, 185, 129, 0.2)", color: "#34d399", label: "CLEAR" },
    anomaly: { bg: "rgba(251, 191, 36, 0.2)", color: "#fbbf24", label: "ANOMALY" }
  };
  return styles[status];
};

const getSeverityStyle = (severity: "high" | "medium" | "low") => {
  const styles = {
    high: { bg: "rgba(239, 68, 68, 0.15)", border: "rgba(239, 68, 68, 0.4)", dot: "#ef4444" },
    medium: { bg: "rgba(251, 191, 36, 0.15)", border: "rgba(251, 191, 36, 0.4)", dot: "#fbbf24" },
    low: { bg: "rgba(59, 130, 246, 0.15)", border: "rgba(59, 130, 246, 0.4)", dot: "#3b82f6" }
  };
  return styles[severity];
};

const getConfidenceColor = (confidence: DataConfidence): string => {
  const colors = { high: "#10b981", medium: "#f59e0b", low: "#ef4444" };
  return colors[confidence];
};

export default function CCPMarginPage() {
  const [selectedMember, setSelectedMember] = useState<string>("acme-capital");
  const [selectedCollateral, setSelectedCollateral] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<CollateralView>("overview");
  const [stressScenario, setStressScenario] = useState<StressScenario>("normal");
  const [showSimulator, setShowSimulator] = useState(false);
  const [simulatorSwaps, setSimulatorSwaps] = useState<Record<string, string>>({});
  const [rightPanel, setRightPanel] = useState<RightPanelTab>("alerts");
  const [showDataProvenance, setShowDataProvenance] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const member = members[selectedMember];

  const getStressedValue = (baseValue: number, collateral?: Collateral): number => {
    if (stressScenario === "normal") return baseValue;
    const timeframeMap: Record<string, string> = { moderate: "12h", stressed: "4h", extreme: "1h" };
    const timeframe = timeframeMap[stressScenario];
    if (collateral?.liquidityProfile && timeframe) {
      return Math.round(baseValue * collateral.liquidityProfile[timeframe]);
    }
    return Math.round(baseValue * stressMultipliers[stressScenario].factor);
  };

  const stressedStrataAdjusted = useMemo(() => {
    if (stressScenario === "normal") return member.strataAdjusted;
    return member.collateral.reduce((sum, c) => sum + getStressedValue(c.strataValue, c), 0);
  }, [member, stressScenario]);

  const stressedMarginGap = member.traditionalValue - stressedStrataAdjusted;

  const simulatedScore = useMemo(() => {
    if (Object.keys(simulatorSwaps).length === 0) return member.strataScore;
    let improvement = 0;
    Object.values(simulatorSwaps).forEach((replacementId) => {
      const replacement = replacementOptions.find(r => r.id === replacementId);
      if (replacement) improvement += replacement.improvement;
    });
    return Math.min(100, member.strataScore + improvement);
  }, [simulatorSwaps, member.strataScore]);

  const filteredMembers = Object.entries(members).filter(([_, m]) =>
    m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
    m.memberId.toLowerCase().includes(memberSearch.toLowerCase())
  );

  const lowScoreCollateral = member.collateral.filter(c => c.poliScore < 85);

  const handleSwap = (collateralId: string, replacementId: string) => {
    setSimulatorSwaps(prev => ({ ...prev, [collateralId]: replacementId }));
  };

  const handleRemoveSwap = (collateralId: string) => {
    setSimulatorSwaps(prev => {
      const next = { ...prev };
      delete next[collateralId];
      return next;
    });
  };

  const alertCounts = {
    high: tsleAlerts.filter(a => a.severity === "high").length,
    medium: tsleAlerts.filter(a => a.severity === "medium").length,
    low: tsleAlerts.filter(a => a.severity === "low").length
  };

  return (
    <div className="min-h-screen bg-black flex flex-col" data-testid="ccp-margin-page">
      <DashboardHeader />
      <PlatformTabs />

      <div 
        className="border-b px-4 py-2 flex items-center justify-between"
        style={{ borderColor: "rgba(255,255,255,0.1)", background: "#0a0a0a" }}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-black"
              style={{ background: "linear-gradient(135deg, #fbbf24, #f59e0b)" }}
            >
              S
            </div>
            <div>
              <div className="text-sm font-semibold text-white">STRATALINK</div>
              <div className="text-[10px] text-slate-500">LIQUIDITY TRUTH LAYER</div>
            </div>
          </div>
          <div className="h-6 w-px bg-white/10" />
          <span className="text-xs font-medium text-slate-400">CCP Margin Verification Console</span>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDataProvenance(!showDataProvenance)}
            className="text-xs text-amber-400 border-amber-400/30 bg-amber-400/10"
            data-testid="btn-provenance-toggle"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            SYNTHETIC DATA | Proxy Model v1.2
            {showDataProvenance ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>

          <div 
            className="flex items-center gap-2 px-3 py-1.5 rounded text-xs" 
            style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)" }}
            data-testid="status-network"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 font-semibold">LIVE</span>
            <span className="text-slate-400">Canton Network</span>
          </div>

          <div className="text-xs font-mono text-slate-400" data-testid="text-timestamp">
            {currentTime.toISOString().slice(0, 19).replace("T", " ")} UTC
          </div>
        </div>
      </div>

      {showDataProvenance && (
        <div 
          className="border-b px-6 py-4"
          style={{ background: "rgba(251, 191, 36, 0.05)", borderColor: "rgba(251, 191, 36, 0.2)" }}
        >
          <div className="max-w-7xl mx-auto grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-amber-400 border-amber-400/40 bg-amber-400/10">
                  SIMULATION MODE
                </Badge>
                <span className="text-xs text-slate-500">{dataProvenance.modelVersion} | Updated {dataProvenance.lastUpdated}</span>
              </div>
              <p className="text-xs text-slate-400">{dataProvenance.methodology}</p>
              <div className="grid grid-cols-2 gap-2">
                {dataProvenance.proxies.slice(0, 4).map((p, i) => (
                  <div key={i} className="p-2 rounded text-[10px]" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <div className="font-medium text-white">{p.token}</div>
                    <div className="text-slate-500">{p.proxy}</div>
                    <div className="text-slate-600 mt-1">Source: {p.source}</div>
                  </div>
                ))}
              </div>
            </div>
            <div 
              className="p-4 rounded-lg"
              style={{ background: "rgba(251, 191, 36, 0.08)", border: "1px solid rgba(251, 191, 36, 0.2)" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold text-amber-400">IMPORTANT DISCLAIMER</span>
              </div>
              <p className="text-xs text-slate-400">{dataProvenance.disclaimer}</p>
              <p className="text-xs text-slate-500 mt-2">
                Production data sources: Canton Network venues, DTC tokenization feed, institutional OTC aggregators
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden" style={{ marginBottom: "48px" }}>
        <div className="w-[280px] border-r p-4 space-y-3 overflow-y-auto" style={{ borderColor: "rgba(255,255,255,0.1)", background: "#0a0a0a" }}>
          <div className="text-[11px] font-semibold tracking-wider text-slate-500 mb-2">CLEARING MEMBERS</div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search members..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              className="pl-9 h-8 text-xs bg-black/50 border-white/10"
              data-testid="input-member-search"
            />
          </div>

          <div className="space-y-2">
            {filteredMembers.map(([id, m]) => {
              const isSelected = selectedMember === id;
              const statusStyle = getStatusStyle(m.strataStatus);
              return (
                <button
                  key={id}
                  onClick={() => setSelectedMember(id)}
                  className={cn(
                    "w-full p-3 rounded-lg text-left transition-all",
                    isSelected ? "border-l-2" : "border-l-2 border-transparent"
                  )}
                  style={{
                    background: isSelected ? "rgba(59, 130, 246, 0.1)" : "rgba(255,255,255,0.02)",
                    borderLeftColor: isSelected ? "#3b82f6" : "transparent",
                    borderTop: "1px solid rgba(255,255,255,0.05)",
                    borderRight: "1px solid rgba(255,255,255,0.05)",
                    borderBottom: "1px solid rgba(255,255,255,0.05)"
                  }}
                  data-testid={`member-${id}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-white truncate pr-2">{m.name}</span>
                    <Badge 
                      variant="outline" 
                      className="text-[10px] px-1.5 py-0"
                      style={{ background: statusStyle.bg, borderColor: statusStyle.color, color: statusStyle.color }}
                    >
                      {statusStyle.label}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Posted: {formatCurrency(m.totalPosted)}</span>
                    <span 
                      className="text-lg font-bold font-mono"
                      style={{ color: getScoreColor(m.strataScore) }}
                    >
                      {m.strataScore}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto space-y-4" style={{ background: "#000000" }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white" data-testid="text-member-name">{member.name}</h1>
                <Badge 
                  variant="outline"
                  className="text-xs"
                  style={{ 
                    background: getStatusStyle(member.strataStatus).bg, 
                    borderColor: getStatusStyle(member.strataStatus).color, 
                    color: getStatusStyle(member.strataStatus).color 
                  }}
                >
                  {getStatusStyle(member.strataStatus).label}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-1" data-testid="text-member-details">{member.memberId} | Risk Tier: {member.riskTier}</p>
            </div>
            <Button
              onClick={() => setShowSimulator(!showSimulator)}
              variant={showSimulator ? "default" : "outline"}
              className="text-xs"
              style={showSimulator ? { background: "linear-gradient(135deg, #8b5cf6, #3b82f6)" } : {}}
              data-testid="btn-simulator-toggle"
            >
              <Zap className="w-4 h-4 mr-1" />
              Margin Call Simulator
            </Button>
          </div>

          <Card className="border-white/10 bg-[#111111]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-xs font-semibold text-slate-500 tracking-wider">STRESS SCENARIO</span>
                  <p className="text-[10px] text-slate-600 mt-0.5">Select liquidation timeframe to stress test collateral values</p>
                </div>
                <div className="flex gap-1">
                  {(Object.keys(stressMultipliers) as StressScenario[]).map((scenario) => {
                    const s = stressMultipliers[scenario];
                    const isActive = stressScenario === scenario;
                    return (
                      <button
                        key={scenario}
                        onClick={() => setStressScenario(scenario)}
                        className={cn(
                          "px-3 py-1.5 rounded text-xs font-medium transition-all",
                          isActive ? "text-white" : "text-slate-400"
                        )}
                        style={{
                          background: isActive ? `${s.color}20` : "transparent",
                          border: `1px solid ${isActive ? s.color : "rgba(255,255,255,0.1)"}`
                        }}
                        data-testid={`stress-${scenario}`}
                      >
                        {s.label} ({s.timeframe})
                      </button>
                    );
                  })}
                </div>
              </div>
              {stressScenario !== "normal" && (
                <div 
                  className="flex items-center gap-2 p-2 rounded text-xs"
                  style={{ 
                    background: `${stressMultipliers[stressScenario].color}10`,
                    border: `1px solid ${stressMultipliers[stressScenario].color}40`
                  }}
                >
                  <AlertTriangle className="w-4 h-4" style={{ color: stressMultipliers[stressScenario].color }} />
                  <span style={{ color: stressMultipliers[stressScenario].color }}>
                    Stress scenario active: {(stressMultipliers[stressScenario].factor * 100).toFixed(0)}% recovery rate assumed for {stressMultipliers[stressScenario].timeframe} liquidation window
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {showSimulator && (
            <Card 
              className="border-purple-500/30"
              style={{ background: "linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)" }}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-purple-400" />
                    <span className="font-semibold text-white">Margin Call Simulator</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs text-slate-500">Current Score</div>
                      <span className="text-2xl font-bold font-mono" style={{ color: getScoreColor(member.strataScore) }}>
                        {member.strataScore}
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-500" />
                    <div className="text-right">
                      <div className="text-xs text-slate-500">Projected Score</div>
                      <span className="text-2xl font-bold font-mono" style={{ color: getScoreColor(simulatedScore) }}>
                        {simulatedScore}
                      </span>
                    </div>
                    {simulatedScore > member.strataScore && (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40">
                        +{simulatedScore - member.strataScore}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs font-semibold text-slate-500 mb-2">SELECT COLLATERAL TO REPLACE</div>
                    <div className="space-y-2">
                      {lowScoreCollateral.map(c => {
                        const isSwapped = simulatorSwaps[c.id];
                        return (
                          <div 
                            key={c.id}
                            className={cn(
                              "p-2 rounded flex items-center justify-between transition-all",
                              isSwapped ? "opacity-50" : ""
                            )}
                            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                          >
                            <div>
                              <div className="text-sm font-medium text-white">{c.asset}</div>
                              <div className="text-xs text-slate-500">{c.type}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono" style={{ color: getScoreColor(c.poliScore) }}>
                                {c.poliScore}
                              </span>
                              {isSwapped && (
                                <button onClick={() => handleRemoveSwap(c.id)} className="text-red-400 hover:text-red-300">
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {lowScoreCollateral.length === 0 && (
                        <div className="text-xs text-slate-500 p-2">All collateral scores are above 85</div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-500 mb-2">AVAILABLE REPLACEMENTS</div>
                    <div className="space-y-2">
                      {replacementOptions.map(r => {
                        const isUsed = Object.values(simulatorSwaps).includes(r.id);
                        const nextAvailable = lowScoreCollateral.find(c => !simulatorSwaps[c.id]);
                        return (
                          <button 
                            key={r.id}
                            onClick={() => nextAvailable && handleSwap(nextAvailable.id, r.id)}
                            disabled={isUsed || !nextAvailable}
                            className={cn(
                              "w-full p-2 rounded flex items-center justify-between transition-all text-left",
                              isUsed ? "opacity-50" : "hover-elevate"
                            )}
                            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                          >
                            <div>
                              <div className="text-sm font-medium text-white">{r.asset}</div>
                              <div className="text-xs text-slate-500">{r.type}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono" style={{ color: getScoreColor(r.poliScore) }}>
                                {r.poliScore}
                              </span>
                              <Badge className="text-[10px] bg-emerald-500/20 text-emerald-400 border-emerald-500/40">
                                +{r.improvement}
                              </Badge>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10">
                  <Button variant="outline" size="sm" onClick={() => setSimulatorSwaps({})}>
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Reset
                  </Button>
                  <Button 
                    size="sm" 
                    disabled={Object.keys(simulatorSwaps).length === 0}
                    style={{ background: "linear-gradient(135deg, #8b5cf6, #3b82f6)" }}
                  >
                    <FileText className="w-3 h-3 mr-1" />
                    Generate Margin Call with Recommendations
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-4 gap-4">
            <Card 
              className="border-0"
              style={{ background: "linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.15))" }}
              data-testid="card-strata-score"
            >
              <CardContent className="p-4">
                <div className="text-[10px] font-semibold text-slate-400 tracking-wider mb-2">STRATA SCORE</div>
                <div 
                  className="text-4xl font-bold font-mono"
                  style={{ color: getScoreColor(member.strataScore) }}
                  data-testid="value-strata-score"
                >
                  {member.strataScore}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Collateral Confidence Index</div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-[#111111]" data-testid="card-haircut">
              <CardContent className="p-4">
                <div className="text-[10px] font-semibold text-slate-400 tracking-wider mb-2">TRADITIONAL HAIRCUT</div>
                <div className="text-2xl font-bold font-mono text-white" data-testid="value-haircut">
                  {formatCurrency(member.traditionalValue)}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Standard 5% haircut applied</div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-[#111111]" data-testid="card-strata-adjusted">
              <CardContent className="p-4">
                <div className="text-[10px] font-semibold text-slate-400 tracking-wider mb-2">STRATA-ADJUSTED VALUE</div>
                <div 
                  className="text-2xl font-bold font-mono"
                  style={{ color: stressScenario === "normal" ? "#10b981" : stressMultipliers[stressScenario].color }}
                  data-testid="value-strata-adjusted"
                >
                  {formatCurrency(stressedStrataAdjusted)}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Real-time liquidity verified</div>
              </CardContent>
            </Card>

            <Card 
              className="border-0"
              style={{ background: "linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.15))" }}
              data-testid="card-margin-gap"
            >
              <CardContent className="p-4">
                <div className="text-[10px] font-semibold text-red-400 tracking-wider mb-2">MARGIN GAP DETECTED</div>
                <div className="text-2xl font-bold font-mono text-red-400" data-testid="value-margin-gap">
                  {formatCurrency(stressedMarginGap)}
                </div>
                <div className="text-[10px] text-red-400/70 mt-1">
                  {((stressedMarginGap / member.traditionalValue) * 100).toFixed(1)}% below traditional estimate
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-white/10 bg-[#111111]">
            <CardContent className="p-0">
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div>
                  <h3 className="text-sm font-semibold text-white">Posted Collateral</h3>
                  <p className="text-[10px] text-slate-500">Real-time liquidity verification via DACT consolidated tape</p>
                </div>
                <div className="flex gap-1">
                  {(["overview", "poli", "tsle", "dact"] as CollateralView[]).map(view => (
                    <Button
                      key={view}
                      variant={activeView === view ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setActiveView(view)}
                      className="text-xs uppercase"
                      data-testid={`btn-view-${view}`}
                    >
                      {view}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-slate-500">
                      <th className="p-3 font-medium">ASSET</th>
                      <th className="p-3 font-medium text-right">NOMINAL</th>
                      <th className="p-3 font-medium text-right">HAIRCUT VALUE</th>
                      <th className="p-3 font-medium text-right">STRATA VALUE</th>
                      <th className="p-3 font-medium text-right">DELTA</th>
                      <th className="p-3 font-medium text-center">PoLi</th>
                      <th className="p-3 font-medium text-center">TSLE</th>
                      <th className="p-3 font-medium text-center">VENUES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {member.collateral.map(c => {
                      const stressedValue = getStressedValue(c.strataValue, c);
                      const delta = stressedValue - c.haircut;
                      const isExpanded = selectedCollateral === c.id;
                      const tsleStyle = getStatusStyle(c.tsleStatus);

                      return (
                        <>
                          <tr 
                            key={c.id}
                            onClick={() => setSelectedCollateral(isExpanded ? null : c.id)}
                            className="border-b border-white/5 hover-elevate cursor-pointer transition-colors"
                            data-testid={`collateral-row-${c.id}`}
                          >
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                {isExpanded ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
                                <div>
                                  <div className="font-medium text-white">{c.asset}</div>
                                  <div className="text-[10px] text-slate-500">{c.type}</div>
                                </div>
                                <Badge 
                                  variant="outline" 
                                  className="text-[9px] ml-1"
                                  style={{ borderColor: getConfidenceColor(c.dataConfidence), color: getConfidenceColor(c.dataConfidence) }}
                                >
                                  {c.dataConfidence.toUpperCase()}
                                </Badge>
                              </div>
                            </td>
                            <td className="p-3 text-right font-mono text-white">{formatCurrency(c.nominal)}</td>
                            <td className="p-3 text-right font-mono text-white">{formatCurrency(c.haircut)}</td>
                            <td className="p-3 text-right font-mono" style={{ color: stressScenario === "normal" ? "#fff" : stressMultipliers[stressScenario].color }}>
                              {formatCurrency(stressedValue)}
                            </td>
                            <td className="p-3 text-right font-mono" style={{ color: delta >= 0 ? "#10b981" : "#ef4444" }}>
                              {delta >= 0 ? "+" : ""}{formatCurrency(Math.abs(delta))}
                            </td>
                            <td className="p-3 text-center">
                              <span 
                                className="inline-block px-2 py-0.5 rounded text-xs font-bold"
                                style={{ background: `${getScoreColor(c.poliScore)}20`, color: getScoreColor(c.poliScore) }}
                              >
                                {c.poliScore}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <Badge 
                                variant="outline"
                                className="text-[10px]"
                                style={{ background: tsleStyle.bg, borderColor: tsleStyle.color, color: tsleStyle.color }}
                              >
                                {tsleStyle.label}
                              </Badge>
                            </td>
                            <td className="p-3 text-center text-white">{c.venues}</td>
                          </tr>

                          {isExpanded && (
                            <tr key={`${c.id}-detail`}>
                              <td colSpan={8} className="p-0">
                                <div className="p-4 bg-black/30 border-b border-white/10">
                                  <div className="grid grid-cols-3 gap-6">
                                    <div>
                                      <div className="text-[10px] font-semibold text-slate-500 tracking-wider mb-3">PoLi VERIFICATION</div>
                                      <div className="flex items-center gap-3 mb-3">
                                        <span className="text-3xl font-bold" style={{ color: getScoreColor(c.poliScore) }}>{c.poliScore}</span>
                                        <div className="text-[10px] text-slate-500">Proof of Liquidity Score</div>
                                      </div>
                                      <div className="space-y-2">
                                        {[
                                          { label: "Market Depth", weight: 30, value: Math.min(100, c.poliScore + 5) },
                                          { label: "Bid-Ask Spread", weight: 25, value: Math.min(100, c.poliScore - 3) },
                                          { label: "Volume Consistency", weight: 20, value: Math.min(100, c.poliScore + 2) },
                                          { label: "CEX/DEX Balance", weight: 15, value: Math.min(100, c.poliScore - 5) },
                                          { label: "Volatility Score", weight: 10, value: Math.min(100, c.poliScore + 8) }
                                        ].map((item, i) => (
                                          <div key={i} className="flex items-center gap-2">
                                            <div className="w-28 text-[10px] text-slate-500">{item.label} ({item.weight}%)</div>
                                            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                              <div 
                                                className="h-full rounded-full"
                                                style={{ width: `${item.value}%`, background: getScoreColor(item.value) }}
                                              />
                                            </div>
                                            <span className="text-[10px] font-mono w-8 text-right" style={{ color: getScoreColor(item.value) }}>{item.value}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    <div>
                                      <div className="text-[10px] font-semibold text-slate-500 tracking-wider mb-3">TSLE ANALYSIS</div>
                                      <Badge 
                                        variant="outline" 
                                        className="mb-3"
                                        style={{ background: tsleStyle.bg, borderColor: tsleStyle.color, color: tsleStyle.color }}
                                      >
                                        {tsleStyle.label}
                                      </Badge>
                                      {c.tsleStatus === "anomaly" ? (
                                        <div className="p-2 rounded text-xs" style={{ background: "rgba(251, 191, 36, 0.1)", border: "1px solid rgba(251, 191, 36, 0.3)" }}>
                                          <div className="text-amber-400 font-medium mb-1">Anomaly Detected</div>
                                          <div className="text-slate-400">Volume patterns indicate potential market manipulation or thin liquidity conditions.</div>
                                        </div>
                                      ) : (
                                        <div className="p-2 rounded text-xs" style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                                          <div className="text-emerald-400 font-medium mb-1">All Clear</div>
                                          <div className="text-slate-400">No anomalies detected. Liquidity patterns within expected ranges.</div>
                                        </div>
                                      )}
                                      <div className="mt-3">
                                        <div className="text-[10px] text-slate-500 mb-2">Liquidation Stress Profile</div>
                                        <div className="flex gap-1">
                                          {Object.entries(c.liquidityProfile).map(([tf, val]) => (
                                            <div key={tf} className="flex-1">
                                              <div className="h-16 bg-white/5 rounded relative overflow-hidden">
                                                <div 
                                                  className="absolute bottom-0 left-0 right-0 rounded"
                                                  style={{ 
                                                    height: `${val * 100}%`, 
                                                    background: val >= 0.85 ? "#10b981" : val >= 0.65 ? "#f59e0b" : "#ef4444"
                                                  }}
                                                />
                                              </div>
                                              <div className="text-[9px] text-slate-500 text-center mt-1">{tf}</div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>

                                    <div>
                                      <div className="text-[10px] font-semibold text-slate-500 tracking-wider mb-3">DACT VENUE DISTRIBUTION</div>
                                      <div className="text-xs text-slate-400 mb-3">{c.depth} depth across {c.venues} venues</div>
                                      <div className="space-y-2">
                                        {["Canton DEX", "Venue B", "Venue C", "OTC Pool"].slice(0, c.venues).map((venue, i) => {
                                          const pct = Math.round(100 / c.venues) + (i === 0 ? (100 % c.venues) : 0);
                                          return (
                                            <div key={venue} className="flex items-center gap-2">
                                              <div className="w-20 text-[10px] text-slate-500">{venue}</div>
                                              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                                                <div 
                                                  className="h-full rounded-full bg-blue-500"
                                                  style={{ width: `${pct}%` }}
                                                />
                                              </div>
                                              <span className="text-[10px] font-mono w-8 text-right text-slate-400">{pct}%</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                      <div className="mt-3 p-2 rounded text-xs" style={{ background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.3)" }}>
                                        <div className="text-blue-400 font-medium">Executable Depth</div>
                                        <div className="text-slate-400">{formatCurrency(c.strataValue * 0.1)} @ 10% slippage</div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
                                    <Badge variant="outline" className="text-[10px] text-purple-400 border-purple-400/40">
                                      LTF-CONFORMANT VERIFICATION | EVIDENCE LEVEL L4
                                    </Badge>
                                    <Button variant="ghost" size="sm" className="text-xs text-blue-400">
                                      View Full Audit Trail <ChevronRight className="w-3 h-3 ml-1" />
                                    </Button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {member.strataStatus !== "healthy" && (
            <div 
              className="flex items-center justify-between p-4 rounded-lg"
              style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)" }}
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <div>
                  <div className="text-sm font-semibold text-red-400">Action Required: Margin Call Recommended</div>
                  <div className="text-xs text-red-400/70">
                    STRATA-verified collateral value is {formatCurrency(stressedMarginGap)} below traditional haircut estimate
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="text-xs" data-testid="btn-export-report">
                  <FileText className="w-3 h-3 mr-1" />
                  Export Report
                </Button>
                <Button size="sm" className="text-xs" variant="destructive" data-testid="btn-initiate-margin-call">
                  Initiate Margin Call
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="w-[340px] border-l p-4 overflow-y-auto" style={{ borderColor: "rgba(255,255,255,0.1)", background: "#0a0a0a" }}>
          <div className="flex gap-1 mb-4">
            <Button
              variant={rightPanel === "alerts" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setRightPanel("alerts")}
              className="flex-1 text-xs"
              data-testid="btn-panel-alerts"
            >
              TSLE ALERTS
            </Button>
            <Button
              variant={rightPanel === "trends" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setRightPanel("trends")}
              className="flex-1 text-xs"
              data-testid="btn-panel-trends"
            >
              STRATA TRENDS
            </Button>
          </div>

          {rightPanel === "alerts" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-500 tracking-wider">LIVE MANIPULATION FEED</span>
                <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-400/40 bg-emerald-400/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />
                  MONITORING
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 rounded text-center" style={{ background: "rgba(239, 68, 68, 0.1)" }}>
                  <div className="text-xl font-bold text-red-400">{alertCounts.high}</div>
                  <div className="text-[10px] text-red-400">HIGH</div>
                </div>
                <div className="p-2 rounded text-center" style={{ background: "rgba(251, 191, 36, 0.1)" }}>
                  <div className="text-xl font-bold text-amber-400">{alertCounts.medium}</div>
                  <div className="text-[10px] text-amber-400">MEDIUM</div>
                </div>
                <div className="p-2 rounded text-center" style={{ background: "rgba(59, 130, 246, 0.1)" }}>
                  <div className="text-xl font-bold text-blue-400">{alertCounts.low}</div>
                  <div className="text-[10px] text-blue-400">LOW</div>
                </div>
              </div>

              <div className="space-y-2">
                {tsleAlerts.map(alert => {
                  const style = getSeverityStyle(alert.severity);
                  return (
                    <div 
                      key={alert.id}
                      className="p-3 rounded"
                      style={{ background: style.bg, border: `1px solid ${style.border}` }}
                      data-testid={`alert-${alert.id}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ background: style.dot }} />
                          <span className="text-xs font-medium text-white">{alert.asset}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">{alert.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mb-1">{alert.message}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500">{alert.member}</span>
                        <Badge variant="outline" className="text-[9px] uppercase">
                          {alert.type.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {rightPanel === "trends" && (
            <div className="space-y-4">
              <div className="text-[10px] font-semibold text-slate-500 tracking-wider">30-DAY MARGIN GAP TREND</div>

              <Card className="border-white/10 bg-[#111111]">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-[10px] text-slate-500">Current Gap</div>
                      <div className="text-2xl font-bold text-red-400">22%</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-500">30D Change</div>
                      <div className="flex items-center gap-1 text-red-400">
                        <TrendingUp className="w-4 h-4" />
                        <span className="font-bold">+9%</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-end gap-0.5 h-12">
                    {historicalData.map((d, i) => (
                      <div 
                        key={i}
                        className="flex-1 rounded-t"
                        style={{ 
                          height: `${(d.gap / 30) * 100}%`,
                          background: d.gap >= 22 ? "#ef4444" : d.gap >= 18 ? "#f59e0b" : "#3b82f6"
                        }}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div 
                className="p-3 rounded"
                style={{ background: "rgba(251, 191, 36, 0.1)", border: "1px solid rgba(251, 191, 36, 0.3)" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-400">Widening Gap Detected</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  The margin gap has increased by 9 percentage points over the past 30 days, indicating deteriorating collateral quality or increased market stress.
                </p>
              </div>

              <div>
                <div className="text-[10px] font-semibold text-slate-500 tracking-wider mb-2">KEY INSIGHTS</div>
                <div className="space-y-2">
                  {[
                    { label: "Peak Gap", value: "24%", detail: "Day 20", color: "#ef4444" },
                    { label: "Minimum Gap", value: "13%", detail: "Day 1", color: "#10b981" },
                    { label: "Average Gap", value: "19%", detail: "30D Avg", color: "#f59e0b" },
                    { label: "Volatility", value: "High", detail: "\u03C3 = 4.2%", color: "#8b5cf6" }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded" style={{ background: "rgba(255,255,255,0.03)" }}>
                      <span className="text-xs text-slate-400">{item.label}</span>
                      <div className="text-right">
                        <span className="text-sm font-bold" style={{ color: item.color }}>{item.value}</span>
                        <span className="text-[10px] text-slate-500 ml-1">({item.detail})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-semibold text-slate-500 tracking-wider mb-2">PEER COMPARISON</div>
                <div className="space-y-2">
                  {Object.entries(members).map(([id, m]) => {
                    const gap = ((m.traditionalValue - m.strataAdjusted) / m.traditionalValue) * 100;
                    const isSelected = selectedMember === id;
                    return (
                      <div key={id} className="flex items-center gap-2">
                        <div className="w-24 text-[10px] text-slate-400 truncate">{m.name.split(" ")[0]}</div>
                        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full"
                            style={{ 
                              width: `${gap * 3}%`,
                              background: isSelected ? "#3b82f6" : gap >= 15 ? "#ef4444" : gap >= 8 ? "#f59e0b" : "#10b981"
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-mono w-10 text-right" style={{ color: gap >= 15 ? "#ef4444" : gap >= 8 ? "#f59e0b" : "#10b981" }}>
                          {gap.toFixed(1)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div 
        className="fixed bottom-0 left-0 right-0 px-6 py-2 flex items-center justify-between z-50"
        style={{ background: "rgba(0, 0, 0, 0.95)", borderTop: "1px solid rgba(251, 191, 36, 0.2)" }}
      >
        <div className="flex items-center gap-3">
          <Badge className="text-[10px] bg-amber-500/20 text-amber-400 border-amber-500/40">
            SIMULATION
          </Badge>
          <span className="text-[10px] text-slate-500">
            This console uses synthetic data based on proxy instruments. Not for production trading decisions.
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-500">
            Production: Canton Network + DTC Tokenization (H2 2026)
          </span>
          <Badge variant="outline" className="text-[10px] text-purple-400 border-purple-400/40">
            LTF v2.1 Methodology
          </Badge>
        </div>
      </div>
    </div>
  );
}
