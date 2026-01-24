import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Search,
  AlertTriangle,
  CheckCircle,
  Eye,
  FileText,
  Bell,
  RefreshCw,
  Layers,
  ArrowRightLeft,
  CircleDot,
  Target,
  BarChart3,
  Scale,
  Ghost,
  BookOpen
} from "lucide-react";

interface Asset {
  id: string;
  name: string;
  type: string;
  tsleState: "clear" | "watch" | "elevated" | "critical";
  integrity: number;
  alerts: number;
}

interface DetectedPattern {
  type: string;
  severity: "high" | "medium" | "low";
  venue: string;
  description: string;
  artificialVolume?: number;
  volumePct?: number;
  duration?: string;
  orderCancelRate?: string;
  confidence: number;
  firstDetected: string;
}

interface AssetData {
  name: string;
  type: string;
  tsleState: "clear" | "watch" | "elevated" | "critical";
  overallIntegrity: number;
  venues: { name: string; status: string; integrity: number; volume: number }[];
  detectedPatterns: DetectedPattern[];
  anomalyTimeline: { time: string; events: string[] }[];
  collateralImpact: {
    nominalValue: number;
    adjustedValue: number;
    discount: number;
    discountPct: number;
    affectedMembers: string[];
  };
}

const summary = {
  monitoredAssets: 47,
  activeAlerts: 12,
  confirmedManipulation: 3,
  marketIntegrity: 91
};

const assets: Asset[] = [
  { id: "russ-etf", name: "Russell 1000 ETF Token", type: "Equity ETF", tsleState: "elevated", integrity: 72, alerts: 3 },
  { id: "eth-tok", name: "ETH Token", type: "Crypto", tsleState: "watch", integrity: 81, alerts: 1 },
  { id: "sol-tok", name: "SOL Token", type: "Crypto", tsleState: "elevated", integrity: 68, alerts: 2 },
  { id: "aapl-tok", name: "AAPL Token", type: "Equity", tsleState: "clear", integrity: 94, alerts: 0 },
  { id: "ust-10y", name: "UST 10Y Token", type: "Treasury", tsleState: "clear", integrity: 97, alerts: 0 },
  { id: "btc-tok", name: "BTC Token", type: "Crypto", tsleState: "watch", integrity: 79, alerts: 2 },
  { id: "ust-2y", name: "UST 2Y Token", type: "Treasury", tsleState: "clear", integrity: 98, alerts: 0 },
  { id: "msft-tok", name: "MSFT Token", type: "Equity", tsleState: "clear", integrity: 92, alerts: 0 }
];

const assetData: Record<string, AssetData> = {
  "russ-etf": {
    name: "Russell 1000 ETF Token",
    type: "Equity ETF",
    tsleState: "elevated",
    overallIntegrity: 72,
    venues: [
      { name: "Canton DEX", status: "clear", integrity: 96, volume: 45 },
      { name: "Venue B (CEX)", status: "anomaly", integrity: 61, volume: 34 },
      { name: "Venue C (RFQ)", status: "clear", integrity: 89, volume: 21 }
    ],
    detectedPatterns: [
      {
        type: "wash_trading",
        severity: "high",
        venue: "Venue B",
        description: "Circular order flow between 3 wallets",
        artificialVolume: 12400000,
        volumePct: 34,
        confidence: 94,
        firstDetected: "14:32:07"
      },
      {
        type: "depth_imbalance",
        severity: "medium",
        venue: "Venue B",
        description: "Bid-side depth 4.2x ask-side",
        duration: "2.3 hours",
        confidence: 78,
        firstDetected: "12:15:33"
      },
      {
        type: "price_divergence",
        severity: "medium",
        venue: "Venue B vs Canton",
        description: "Price spread exceeds 0.8% for sustained period",
        duration: "45 mins",
        confidence: 82,
        firstDetected: "15:22:18"
      }
    ],
    anomalyTimeline: [
      { time: "06:00", events: [] },
      { time: "09:00", events: ["volume_spike"] },
      { time: "12:00", events: ["depth_imbalance"] },
      { time: "15:00", events: ["price_divergence", "wash_trading"] },
      { time: "18:00", events: ["depth_imbalance"] }
    ],
    collateralImpact: {
      nominalValue: 350000000,
      adjustedValue: 267800000,
      discount: 82200000,
      discountPct: 23.5,
      affectedMembers: ["Acme Capital", "Vertex Trading"]
    }
  },
  "sol-tok": {
    name: "SOL Token",
    type: "Crypto",
    tsleState: "elevated",
    overallIntegrity: 68,
    venues: [
      { name: "Canton DEX", status: "clear", integrity: 91, volume: 38 },
      { name: "Venue B (CEX)", status: "anomaly", integrity: 52, volume: 47 },
      { name: "OTC Pool", status: "watch", integrity: 74, volume: 15 }
    ],
    detectedPatterns: [
      {
        type: "venue_concentration",
        severity: "high",
        venue: "Venue B",
        description: "Concentrated selling pressure from single venue",
        confidence: 88,
        firstDetected: "14:25:12"
      },
      {
        type: "spoofing",
        severity: "medium",
        venue: "Venue B",
        description: "Large orders cancelled within 2 seconds of placement",
        orderCancelRate: "87%",
        confidence: 71,
        firstDetected: "13:45:33"
      }
    ],
    anomalyTimeline: [
      { time: "06:00", events: [] },
      { time: "09:00", events: [] },
      { time: "12:00", events: ["spoofing"] },
      { time: "15:00", events: ["venue_concentration"] },
      { time: "18:00", events: [] }
    ],
    collateralImpact: {
      nominalValue: 89000000,
      adjustedValue: 62300000,
      discount: 26700000,
      discountPct: 30.0,
      affectedMembers: ["Vertex Trading"]
    }
  }
};

const patternLibrary = [
  {
    id: "wash_trading",
    name: "Wash Trading",
    icon: RefreshCw,
    description: "Simultaneous buying and selling to create artificial volume",
    color: "#ef4444"
  },
  {
    id: "spoofing",
    name: "Spoofing",
    icon: Eye,
    description: "Placing orders with intent to cancel before execution",
    color: "#f59e0b"
  },
  {
    id: "layering",
    name: "Layering",
    icon: Layers,
    description: "Multiple non-bona fide orders to create false impression",
    color: "#8b5cf6"
  },
  {
    id: "circular_orders",
    name: "Circular Orders",
    icon: ArrowRightLeft,
    description: "Orders routed through multiple venues to obscure origin",
    color: "#3b82f6"
  }
];

export function ManipulationDetection() {
  const [selectedAsset, setSelectedAsset] = useState("russ-etf");
  const [assetFilter, setAssetFilter] = useState<"all" | "flagged">("all");

  const asset = assetData[selectedAsset] || assetData["russ-etf"];
  const filteredAssets = assetFilter === "all" ? assets : assets.filter(a => a.tsleState !== "clear");

  const formatCurrency = (value: number) => {
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(2)}B`;
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    return `$${value.toLocaleString()}`;
  };

  const getIntegrityColor = (score: number) => {
    if (score >= 90) return "#10b981";
    if (score >= 75) return "#f59e0b";
    return "#ef4444";
  };

  const getTsleStateStyle = (state: string) => {
    const styles: Record<string, { bg: string; color: string; label: string }> = {
      clear: { bg: "#064e3b", color: "#34d399", label: "CLEAR" },
      watch: { bg: "#1e3a5f", color: "#60a5fa", label: "WATCH" },
      elevated: { bg: "#78350f", color: "#fbbf24", label: "ELEVATED" },
      critical: { bg: "#7f1d1d", color: "#f87171", label: "CRITICAL" }
    };
    return styles[state] || styles.watch;
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = { high: "#ef4444", medium: "#f59e0b", low: "#3b82f6" };
    return colors[severity] || colors.medium;
  };

  const getVenueStatusIcon = (status: string) => {
    if (status === "clear") return { Icon: CheckCircle, color: "#10b981" };
    if (status === "anomaly") return { Icon: AlertTriangle, color: "#f59e0b" };
    return { Icon: CircleDot, color: "#60a5fa" };
  };

  const getPatternIcon = (type: string) => {
    const icons: Record<string, typeof RefreshCw> = {
      wash_trading: RefreshCw,
      spoofing: Ghost,
      layering: BookOpen,
      circular_orders: ArrowRightLeft,
      depth_imbalance: Scale,
      price_divergence: BarChart3,
      venue_concentration: Target
    };
    return icons[type] || AlertTriangle;
  };

  return (
    <div className="flex h-full" style={{ background: "#000000" }}>
      {/* Left Sidebar - Asset Watchlist */}
      <aside className="w-[280px] flex-shrink-0 border-r border-white/10" style={{ background: "rgba(10, 10, 10, 0.8)" }}>
        <div className="p-5">
          <div className="text-[11px] text-slate-500 tracking-wider mb-3">ASSET WATCHLIST</div>
          
          <div className="flex gap-2 mb-4">
            <Button
              variant={assetFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setAssetFilter("all")}
              className="flex-1 text-xs"
              data-testid="btn-filter-all-assets"
            >
              ALL ({assets.length})
            </Button>
            <Button
              variant={assetFilter === "flagged" ? "default" : "outline"}
              size="sm"
              onClick={() => setAssetFilter("flagged")}
              className="flex-1 text-xs"
              style={assetFilter === "flagged" ? { background: "#f59e0b", color: "#000" } : {}}
              data-testid="btn-filter-flagged-assets"
            >
              FLAGGED ({assets.filter(a => a.tsleState !== "clear").length})
            </Button>
          </div>
        </div>

        <div className="space-y-0">
          {filteredAssets.map((a) => {
            const stateStyle = getTsleStateStyle(a.tsleState);
            return (
              <div
                key={a.id}
                onClick={() => setSelectedAsset(a.id)}
                className="px-5 py-4 cursor-pointer transition-colors"
                style={{
                  background: selectedAsset === a.id ? "rgba(59, 130, 246, 0.1)" : "transparent",
                  borderLeft: selectedAsset === a.id ? "3px solid #3b82f6" : "3px solid transparent"
                }}
                data-testid={`asset-row-${a.id}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-semibold text-sm text-white">{a.name}</span>
                  <Badge 
                    variant="outline" 
                    className="text-[10px]"
                    style={{ background: stateStyle.bg, color: stateStyle.color, borderColor: stateStyle.color }}
                  >
                    {stateStyle.label}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">{a.type}</span>
                  <div className="flex items-center gap-2">
                    {a.alerts > 0 && (
                      <Badge 
                        variant="outline" 
                        className="text-[10px]"
                        style={{ background: "rgba(239, 68, 68, 0.2)", color: "#ef4444", borderColor: "#ef4444" }}
                      >
                        {a.alerts}
                      </Badge>
                    )}
                    <span 
                      className="text-base font-bold"
                      style={{ color: getIntegrityColor(a.integrity) }}
                    >
                      {a.integrity}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto">
        {/* Market Integrity Summary */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="border-white/10 bg-[#111111]">
            <CardContent className="p-5">
              <div className="text-[11px] text-slate-500 tracking-wider mb-2">MONITORED ASSETS</div>
              <div className="text-3xl font-bold text-white">{summary.monitoredAssets}</div>
              <div className="text-[11px] text-slate-500 mt-1">Across all venues</div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-[#111111]">
            <CardContent className="p-5">
              <div className="text-[11px] text-amber-400 tracking-wider mb-2">ACTIVE ALERTS</div>
              <div className="text-3xl font-bold text-amber-400">{summary.activeAlerts}</div>
              <div className="text-[11px] text-slate-500 mt-1">Requiring review</div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-[#111111]">
            <CardContent className="p-5">
              <div className="text-[11px] text-red-400 tracking-wider mb-2">CONFIRMED MANIPULATION</div>
              <div className="text-3xl font-bold text-red-400">{summary.confirmedManipulation}</div>
              <div className="text-[11px] text-slate-500 mt-1">Last 24 hours</div>
            </CardContent>
          </Card>

          <Card 
            className="border-0"
            style={{ background: "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.15) 100%)" }}
          >
            <CardContent className="p-5">
              <div className="text-[11px] text-emerald-400 tracking-wider mb-2">MARKET INTEGRITY</div>
              <div className="text-3xl font-bold text-emerald-400">{summary.marketIntegrity}%</div>
              <div className="text-[11px] text-slate-500 mt-1">Portfolio-wide</div>
            </CardContent>
          </Card>
        </div>

        {/* Selected Asset Detail */}
        {asset && (
          <>
            <Card className="border-white/10 bg-[#111111] mb-6">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="text-[11px] text-slate-500 tracking-wider mb-2">SELECTED ASSET</div>
                    <div className="text-2xl font-bold text-white mb-1">{asset.name}</div>
                    <div className="text-sm text-slate-400">{asset.type}</div>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant="outline" 
                      className="text-xs mb-2"
                      style={{ 
                        background: getTsleStateStyle(asset.tsleState).bg, 
                        color: getTsleStateStyle(asset.tsleState).color,
                        borderColor: getTsleStateStyle(asset.tsleState).color
                      }}
                    >
                      {getTsleStateStyle(asset.tsleState).label}
                    </Badge>
                    <div className="text-[11px] text-slate-500">Integrity Score</div>
                    <div 
                      className="text-3xl font-bold"
                      style={{ color: getIntegrityColor(asset.overallIntegrity) }}
                    >
                      {asset.overallIntegrity}%
                    </div>
                  </div>
                </div>

                {/* Anomaly Timeline */}
                <div className="mb-6">
                  <div className="text-[11px] text-slate-500 tracking-wider mb-4">ANOMALY TIMELINE (24H)</div>
                  <div 
                    className="flex items-end h-20 rounded-lg p-4 gap-2"
                    style={{ background: "#0a0a0a" }}
                  >
                    {asset.anomalyTimeline.map((point, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center">
                        <div className="flex-1 flex flex-col justify-end items-center gap-1">
                          {point.events.map((event, j) => (
                            <div 
                              key={j}
                              className="w-3 h-3 rounded-full cursor-pointer"
                              style={{ 
                                background: event.includes("wash") ? "#ef4444" : 
                                            event.includes("price") ? "#f59e0b" : "#3b82f6"
                              }}
                              title={event}
                            />
                          ))}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-2">{point.time}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Venue Analysis */}
                <div className="mb-6">
                  <div className="text-[11px] text-slate-500 tracking-wider mb-4">VENUE ANALYSIS</div>
                  <div className="space-y-3">
                    {asset.venues.map((venue, i) => {
                      const statusIcon = getVenueStatusIcon(venue.status);
                      return (
                        <div 
                          key={i}
                          className="flex items-center p-4 rounded-lg"
                          style={{ 
                            background: "#0a0a0a",
                            border: venue.status === "anomaly" ? "1px solid rgba(245, 158, 11, 0.3)" : "1px solid rgba(255, 255, 255, 0.05)"
                          }}
                        >
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center mr-4"
                            style={{ background: `${statusIcon.color}20` }}
                          >
                            <statusIcon.Icon className="w-4 h-4" style={{ color: statusIcon.color }} />
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-white mb-1">{venue.name}</div>
                            <div className="text-xs text-slate-500">{venue.volume}% of volume</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[11px] text-slate-500 mb-1">Integrity</div>
                            <div 
                              className="text-lg font-bold"
                              style={{ color: getIntegrityColor(venue.integrity) }}
                            >
                              {venue.integrity}%
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Detected Patterns */}
                <div className="mb-6">
                  <div className="text-[11px] text-slate-500 tracking-wider mb-4">DETECTED PATTERNS</div>
                  <div className="space-y-3">
                    {asset.detectedPatterns.map((pattern, i) => (
                      <div 
                        key={i}
                        className="p-4 rounded-lg"
                        style={{ 
                          background: "#0a0a0a",
                          borderLeft: `3px solid ${getSeverityColor(pattern.severity)}`
                        }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {(() => { const PatternIcon = getPatternIcon(pattern.type); return <PatternIcon className="w-5 h-5 text-slate-400" />; })()}
                            <div>
                              <div className="font-semibold text-white capitalize">
                                {pattern.type.replace(/_/g, " ")}
                              </div>
                              <div className="text-xs text-slate-500">{pattern.venue}</div>
                            </div>
                          </div>
                          <Badge 
                            variant="outline"
                            className="text-[10px] uppercase"
                            style={{ 
                              background: `${getSeverityColor(pattern.severity)}20`,
                              color: getSeverityColor(pattern.severity),
                              borderColor: getSeverityColor(pattern.severity)
                            }}
                          >
                            {pattern.severity}
                          </Badge>
                        </div>
                        <div className="text-sm text-slate-300 mb-2">{pattern.description}</div>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          {pattern.artificialVolume && (
                            <span>Est. artificial: {formatCurrency(pattern.artificialVolume)} ({pattern.volumePct}%)</span>
                          )}
                          {pattern.duration && <span>Duration: {pattern.duration}</span>}
                          {pattern.orderCancelRate && <span>Cancel rate: {pattern.orderCancelRate}</span>}
                          <span>Confidence: {pattern.confidence}%</span>
                          <span>First detected: {pattern.firstDetected}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Collateral Impact */}
                <div>
                  <div className="text-[11px] text-slate-500 tracking-wider mb-4">IMPACT ON COLLATERAL VALUATION</div>
                  <div 
                    className="p-4 rounded-lg"
                    style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)" }}
                  >
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <div className="text-[11px] text-slate-500 mb-1">Nominal Market Value</div>
                        <div className="text-lg font-bold text-white">{formatCurrency(asset.collateralImpact.nominalValue)}</div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-500 mb-1">TSLE-Adjusted Value</div>
                        <div className="text-lg font-bold text-amber-400">{formatCurrency(asset.collateralImpact.adjustedValue)}</div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-500 mb-1">Manipulation Discount</div>
                        <div className="text-lg font-bold text-red-400">
                          -{formatCurrency(asset.collateralImpact.discount)} (-{asset.collateralImpact.discountPct}%)
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                      <div className="text-sm text-slate-400">
                        Members Affected: {asset.collateralImpact.affectedMembers.join(", ")}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="text-xs" data-testid="btn-generate-report">
                          <FileText className="w-3 h-3 mr-1" />
                          Generate Report
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs" data-testid="btn-notify-compliance">
                          <Bell className="w-3 h-3 mr-1" />
                          Notify Compliance
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>

      {/* Right Sidebar - Pattern Library */}
      <aside className="w-[240px] flex-shrink-0 border-l border-white/10 p-5" style={{ background: "rgba(10, 10, 10, 0.8)" }}>
        <div className="text-[11px] text-slate-500 tracking-wider mb-4">PATTERN LIBRARY</div>
        <div className="space-y-3">
          {patternLibrary.map((pattern) => {
            const Icon = pattern.icon;
            return (
              <div 
                key={pattern.id}
                className="p-3 rounded-lg"
                style={{ background: "#111111", border: "1px solid rgba(255, 255, 255, 0.05)" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="w-6 h-6 rounded flex items-center justify-center"
                    style={{ background: `${pattern.color}20` }}
                  >
                    <Icon className="w-3 h-3" style={{ color: pattern.color }} />
                  </div>
                  <span className="text-sm font-semibold text-white">{pattern.name}</span>
                </div>
                <div className="text-[11px] text-slate-500">{pattern.description}</div>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
