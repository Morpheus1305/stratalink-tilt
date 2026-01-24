import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Search,
  ArrowUp,
  ArrowDown
} from "lucide-react";

interface PendingTrade {
  id: string;
  counterparty: string;
  counterpartyName: string;
  direction: "BUY" | "SELL";
  asset: string;
  assetType: string;
  notional: number;
  settlementDate: string;
  settlementType: string;
  status: "pending_verification" | "approved" | "flagged" | "rejected";
  riskFlags: string[];
  settlementProbability: number;
  coverageRatio: number;
}

interface SettlementCapability {
  availableBalance: number;
  requiredMargin: number;
  coverageRatio: number;
  liquidityScore: number;
  settlementProbability: number;
  sources: { type: string; amount: number; pct: number; poliAvg: number }[];
  warnings: string[];
}

interface SettlementAlert {
  id: number;
  time: string;
  severity: "high" | "medium" | "low";
  tradeId: string;
  counterparty: string;
  message: string;
  type: string;
}

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
    settlementType: "T+1",
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
    settlementType: "T+1",
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
    settlementType: "T+1",
    status: "flagged",
    riskFlags: ["counterparty_alert_status", "concentration_risk"],
    settlementProbability: 0.58,
    coverageRatio: 1.34
  },
  {
    id: "TRD-2026-0124-0844",
    counterparty: "acme-capital",
    counterpartyName: "Acme Capital LLC",
    direction: "SELL",
    asset: "UST 2Y Token",
    assetType: "Treasury",
    notional: 75000000,
    settlementDate: "2026-01-25",
    settlementType: "T+1",
    status: "approved",
    riskFlags: [],
    settlementProbability: 0.94,
    coverageRatio: 3.85
  },
  {
    id: "TRD-2026-0124-0843",
    counterparty: "vertex-trading",
    counterpartyName: "Vertex Trading Corp",
    direction: "BUY",
    asset: "ETH Token",
    assetType: "Crypto",
    notional: 15000000,
    settlementDate: "2026-01-25",
    settlementType: "T+1",
    status: "pending_verification",
    riskFlags: ["volatile_asset"],
    settlementProbability: 0.72,
    coverageRatio: 1.89
  }
];

const settlementCapability: Record<string, SettlementCapability> = {
  "acme-capital": {
    availableBalance: 127300000,
    requiredMargin: 47200000,
    coverageRatio: 2.69,
    liquidityScore: 73,
    settlementProbability: 0.87,
    sources: [
      { type: "Cash & Stablecoins", amount: 52100000, pct: 41, poliAvg: 97 },
      { type: "Treasury Tokens", amount: 48700000, pct: 38, poliAvg: 93 },
      { type: "Equity Tokens", amount: 26500000, pct: 21, poliAvg: 74 }
    ],
    warnings: ["21% in equity tokens with PoLi < 80"]
  },
  "meridian-fund": {
    availableBalance: 892000000,
    requiredMargin: 156000000,
    coverageRatio: 5.72,
    liquidityScore: 89,
    settlementProbability: 0.96,
    sources: [
      { type: "Cash & Stablecoins", amount: 412000000, pct: 46, poliAvg: 98 },
      { type: "Treasury Tokens", amount: 356000000, pct: 40, poliAvg: 94 },
      { type: "Equity Tokens", amount: 124000000, pct: 14, poliAvg: 82 }
    ],
    warnings: []
  },
  "vertex-trading": {
    availableBalance: 89500000,
    requiredMargin: 66800000,
    coverageRatio: 1.34,
    liquidityScore: 52,
    settlementProbability: 0.58,
    sources: [
      { type: "Cash & Stablecoins", amount: 22400000, pct: 25, poliAvg: 96 },
      { type: "Treasury Tokens", amount: 18700000, pct: 21, poliAvg: 91 },
      { type: "Equity Tokens", amount: 48400000, pct: 54, poliAvg: 61 }
    ],
    warnings: ["Coverage ratio below 1.5x threshold", "54% in low-liquidity equity tokens", "Counterparty on ALERT status"]
  }
};

const settlementAlerts: SettlementAlert[] = [
  {
    id: 1,
    time: "19:41:33",
    severity: "high",
    tradeId: "TRD-2026-0124-0845",
    counterparty: "Vertex Trading",
    message: "Settlement probability dropped below 60% threshold",
    type: "settlement_risk"
  },
  {
    id: 2,
    time: "19:38:17",
    severity: "medium",
    tradeId: "TRD-2026-0124-0847",
    counterparty: "Acme Capital",
    message: "Collateral rebalancing detected - monitoring coverage ratio",
    type: "collateral_movement"
  },
  {
    id: 3,
    time: "19:35:02",
    severity: "low",
    tradeId: "TRD-2026-0124-0846",
    counterparty: "Meridian Fund",
    message: "Large incoming transfer verified - coverage improved",
    type: "positive_signal"
  },
  {
    id: 4,
    time: "19:28:45",
    severity: "high",
    tradeId: "TRD-2026-0124-0843",
    counterparty: "Vertex Trading",
    message: "Asset volatility spike detected on ETH Token",
    type: "volatility_alert"
  },
  {
    id: 5,
    time: "19:22:11",
    severity: "medium",
    tradeId: "TRD-2026-0124-0847",
    counterparty: "Acme Capital",
    message: "Russell 1000 ETF liquidity fragmentation increased",
    type: "liquidity_change"
  }
];

export function PreTradeVerification() {
  const [selectedTrade, setSelectedTrade] = useState("TRD-2026-0124-0847");
  const [tradeFilter, setTradeFilter] = useState<"all" | "flagged">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const trade = pendingTrades.find(t => t.id === selectedTrade);
  const capability = trade ? settlementCapability[trade.counterparty] : null;

  const filteredTrades = pendingTrades.filter(t => {
    const matchesFilter = tradeFilter === "all" || t.status === "flagged" || t.status === "pending_verification";
    const matchesSearch = searchQuery === "" || 
      t.asset.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.counterpartyName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

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

  const getProbabilityColor = (prob: number) => {
    if (prob >= 0.9) return "#10b981";
    if (prob >= 0.75) return "#f59e0b";
    return "#ef4444";
  };

  const getStatusStyle = (status: string) => {
    const styles: Record<string, { bg: string; color: string; label: string }> = {
      approved: { bg: "#064e3b", color: "#34d399", label: "APPROVED" },
      pending_verification: { bg: "#1e3a5f", color: "#60a5fa", label: "PENDING" },
      flagged: { bg: "#78350f", color: "#fbbf24", label: "FLAGGED" },
      rejected: { bg: "#7f1d1d", color: "#f87171", label: "REJECTED" }
    };
    return styles[status] || styles.pending_verification;
  };

  const getSeverityStyle = (severity: string) => {
    const styles: Record<string, { bg: string; border: string; dot: string }> = {
      high: { bg: "rgba(239, 68, 68, 0.15)", border: "rgba(239, 68, 68, 0.4)", dot: "#ef4444" },
      medium: { bg: "rgba(245, 158, 11, 0.15)", border: "rgba(245, 158, 11, 0.4)", dot: "#f59e0b" },
      low: { bg: "rgba(59, 130, 246, 0.15)", border: "rgba(59, 130, 246, 0.4)", dot: "#3b82f6" }
    };
    return styles[severity] || styles.low;
  };

  const getRiskFlagLabel = (flag: string) => {
    const labels: Record<string, string> = {
      "low_liquidity_asset": "Low Liquidity Asset",
      "large_notional": "Large Notional",
      "counterparty_alert_status": "Counterparty Alert",
      "concentration_risk": "Concentration Risk",
      "volatile_asset": "Volatile Asset"
    };
    return labels[flag] || flag;
  };

  return (
    <div className="flex h-full" style={{ background: "#000000" }}>
      {/* Left Sidebar - Pending Trades Queue */}
      <aside className="w-[300px] flex-shrink-0 border-r border-white/10" style={{ background: "rgba(10, 10, 10, 0.8)" }}>
        <div className="p-5">
          <div className="text-[11px] text-slate-500 tracking-wider mb-3">PENDING TRADES QUEUE</div>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search trades..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-[#111111] border-white/10 text-white text-sm"
              data-testid="input-search-trades"
            />
          </div>

          <div className="flex gap-2 mb-4">
            <Button
              variant={tradeFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setTradeFilter("all")}
              className="flex-1 text-xs"
              data-testid="btn-filter-all"
            >
              ALL ({pendingTrades.length})
            </Button>
            <Button
              variant={tradeFilter === "flagged" ? "default" : "outline"}
              size="sm"
              onClick={() => setTradeFilter("flagged")}
              className="flex-1 text-xs"
              style={tradeFilter === "flagged" ? { background: "#f59e0b", color: "#000" } : {}}
              data-testid="btn-filter-review"
            >
              REVIEW ({pendingTrades.filter(t => t.status === "flagged" || t.status === "pending_verification").length})
            </Button>
          </div>
        </div>

        <div className="space-y-0">
          {filteredTrades.map((t) => {
            const statusStyle = getStatusStyle(t.status);
            return (
              <div
                key={t.id}
                onClick={() => setSelectedTrade(t.id)}
                className="px-5 py-4 cursor-pointer transition-colors"
                style={{
                  background: selectedTrade === t.id ? "rgba(59, 130, 246, 0.1)" : "transparent",
                  borderLeft: selectedTrade === t.id ? "3px solid #3b82f6" : "3px solid transparent"
                }}
                data-testid={`trade-row-${t.id}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs text-slate-500 font-mono">{t.id.slice(-8)}</span>
                  <Badge 
                    variant="outline" 
                    className="text-[10px]"
                    style={{ background: statusStyle.bg, color: statusStyle.color, borderColor: statusStyle.color }}
                  >
                    {statusStyle.label}
                  </Badge>
                </div>
                <div className="font-semibold text-sm text-white mb-1">{t.asset}</div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">
                    {t.direction} • {formatCurrency(t.notional)}
                  </span>
                  <span 
                    className="text-sm font-bold"
                    style={{ color: getProbabilityColor(t.settlementProbability) }}
                  >
                    {Math.round(t.settlementProbability * 100)}%
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">{t.counterpartyName}</div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto">
        {trade && capability && (
          <>
            {/* Trade Detail Header */}
            <Card className="border-white/10 bg-[#111111] mb-6">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <div className="text-[11px] text-slate-500 tracking-wider mb-2">TRADE DETAIL</div>
                    <div className="text-2xl font-bold text-white mb-1">{trade.asset}</div>
                    <div className="text-sm text-slate-400">{trade.id} • {trade.settlementType} Settlement</div>
                  </div>
                  <Badge 
                    variant="outline"
                    className="text-xs"
                    style={{ 
                      background: getStatusStyle(trade.status).bg, 
                      color: getStatusStyle(trade.status).color,
                      borderColor: getStatusStyle(trade.status).color
                    }}
                  >
                    {getStatusStyle(trade.status).label}
                  </Badge>
                </div>

                <div className="grid grid-cols-5 gap-6">
                  <div>
                    <div className="text-[11px] text-slate-500 mb-1">COUNTERPARTY</div>
                    <div className="text-sm font-semibold text-white">{trade.counterpartyName}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 mb-1">DIRECTION</div>
                    <div className="flex items-center gap-1">
                      {trade.direction === "BUY" ? (
                        <ArrowUp className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <ArrowDown className="w-4 h-4 text-red-400" />
                      )}
                      <span className={`text-sm font-semibold ${trade.direction === "BUY" ? "text-emerald-400" : "text-red-400"}`}>
                        {trade.direction}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 mb-1">NOTIONAL</div>
                    <div className="text-sm font-semibold text-white">{formatCurrency(trade.notional)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 mb-1">ASSET TYPE</div>
                    <div className="text-sm font-semibold text-white">{trade.assetType}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 mb-1">SETTLEMENT DATE</div>
                    <div className="text-sm font-semibold text-white">{trade.settlementDate}</div>
                  </div>
                </div>

                {trade.riskFlags.length > 0 && (
                  <div className="mt-4 flex gap-2 flex-wrap">
                    {trade.riskFlags.map((flag, i) => (
                      <Badge 
                        key={i}
                        variant="outline"
                        className="text-[11px]"
                        style={{ 
                          background: "rgba(245, 158, 11, 0.1)", 
                          color: "#fbbf24",
                          borderColor: "rgba(245, 158, 11, 0.3)"
                        }}
                      >
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {getRiskFlagLabel(flag)}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Settlement Capability Metrics */}
            <div className="grid grid-cols-5 gap-4 mb-6">
              <Card className="border-white/10 bg-[#111111]">
                <CardContent className="p-5">
                  <div className="text-[11px] text-slate-500 tracking-wider mb-2">AVAILABLE BALANCE</div>
                  <div className="text-2xl font-bold font-mono text-white">{formatCurrency(capability.availableBalance)}</div>
                  <div className="text-[11px] text-slate-500 mt-1">Liquid assets held</div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-[#111111]">
                <CardContent className="p-5">
                  <div className="text-[11px] text-slate-500 tracking-wider mb-2">REQUIRED MARGIN</div>
                  <div className="text-2xl font-bold font-mono text-white">{formatCurrency(capability.requiredMargin)}</div>
                  <div className="text-[11px] text-slate-500 mt-1">For this trade</div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-[#111111]">
                <CardContent className="p-5">
                  <div className="text-[11px] text-slate-500 tracking-wider mb-2">COVERAGE RATIO</div>
                  <div 
                    className="text-2xl font-bold font-mono"
                    style={{ color: capability.coverageRatio >= 2 ? "#10b981" : capability.coverageRatio >= 1.5 ? "#f59e0b" : "#ef4444" }}
                  >
                    {capability.coverageRatio.toFixed(2)}x
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {capability.coverageRatio >= 2 ? "Healthy" : capability.coverageRatio >= 1.5 ? "Adequate" : "Below threshold"}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-[#111111]">
                <CardContent className="p-5">
                  <div className="text-[11px] text-slate-500 tracking-wider mb-2">LIQUIDITY SCORE</div>
                  <div 
                    className="text-2xl font-bold font-mono"
                    style={{ color: getScoreColor(capability.liquidityScore) }}
                  >
                    {capability.liquidityScore}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Weighted PoLi avg</div>
                </CardContent>
              </Card>

              <Card 
                className="border-0"
                style={{ 
                  background: capability.settlementProbability >= 0.75 
                    ? "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.15) 100%)"
                    : "linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.15) 100%)"
                }}
              >
                <CardContent className="p-5">
                  <div 
                    className="text-[11px] tracking-wider mb-2"
                    style={{ color: capability.settlementProbability >= 0.75 ? "#34d399" : "#fca5a5" }}
                  >
                    SETTLEMENT PROBABILITY
                  </div>
                  <div 
                    className="text-2xl font-bold font-mono"
                    style={{ color: capability.settlementProbability >= 0.75 ? "#10b981" : "#ef4444" }}
                  >
                    {Math.round(capability.settlementProbability * 100)}%
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {capability.settlementProbability >= 0.75 ? "Likely to settle" : "Settlement at risk"}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Liquidity Source Breakdown */}
            <Card className="border-white/10 bg-[#111111] mb-6">
              <CardContent className="p-6">
                <div className="text-[11px] text-slate-500 tracking-wider mb-4">LIQUIDITY SOURCE BREAKDOWN</div>
                <div className="space-y-4">
                  {capability.sources.map((source, i) => (
                    <div key={i}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-white">{source.type}</span>
                        <span className="text-sm font-mono text-slate-400">
                          {formatCurrency(source.amount)} ({source.pct}%)
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full"
                            style={{ 
                              width: `${source.pct}%`,
                              background: source.poliAvg >= 85 ? "#10b981" : source.poliAvg >= 70 ? "#f59e0b" : "#ef4444"
                            }}
                          />
                        </div>
                        <Badge 
                          variant="outline" 
                          className="text-[10px] font-mono"
                          style={{ 
                            background: `${getScoreColor(source.poliAvg)}20`,
                            color: getScoreColor(source.poliAvg),
                            borderColor: getScoreColor(source.poliAvg)
                          }}
                        >
                          PoLi {source.poliAvg}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>

                {capability.warnings.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    {capability.warnings.map((warning, i) => (
                      <div key={i} className="flex items-center gap-2 text-amber-400 text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        {warning}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Verification Decision */}
            <Card className="border-white/10 bg-[#111111]">
              <CardContent className="p-6">
                <div className="text-[11px] text-slate-500 tracking-wider mb-4">VERIFICATION DECISION</div>
                <div className="flex gap-4">
                  <Button 
                    className="flex-1" 
                    style={{ background: "#10b981" }}
                    data-testid="btn-approve-trade"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    APPROVE TRADE
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1 border-amber-400/50 text-amber-400 hover:bg-amber-400/10"
                    data-testid="btn-flag-trade"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    FLAG FOR REVIEW
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1 border-red-400/50 text-red-400 hover:bg-red-400/10"
                    data-testid="btn-reject-trade"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    REJECT
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>

      {/* Right Sidebar - Settlement Risk Feed */}
      <aside className="w-[280px] flex-shrink-0 border-l border-white/10 p-5" style={{ background: "rgba(10, 10, 10, 0.8)" }}>
        <div className="text-[11px] text-slate-500 tracking-wider mb-4">SETTLEMENT RISK FEED</div>
        <div className="space-y-3">
          {settlementAlerts.map((alert) => {
            const style = getSeverityStyle(alert.severity);
            return (
              <div 
                key={alert.id}
                className="p-3 rounded-lg"
                style={{ background: style.bg, border: `1px solid ${style.border}` }}
                data-testid={`alert-${alert.id}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span 
                    className="w-2 h-2 rounded-full"
                    style={{ background: style.dot }}
                  />
                  <span className="text-xs font-mono text-slate-400">{alert.time}</span>
                </div>
                <div className="text-xs text-white font-medium mb-1">{alert.counterparty}</div>
                <div className="text-[11px] text-slate-400">{alert.message}</div>
                <div className="text-[10px] text-slate-500 mt-1 font-mono">{alert.tradeId}</div>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
