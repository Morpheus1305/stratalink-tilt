import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  FileText
} from "lucide-react";

interface RiskFactor {
  score: number;
  weight: number;
  label: string;
}

interface VenueExposure {
  venue: string;
  amount: number;
  pct: number;
  status: "healthy" | "warning" | "critical";
  note: string;
}

interface AssetClass {
  class: string;
  exposure: number;
  poliAvg: number;
  riskAdjusted: number;
  warning?: boolean;
}

interface StressScenario {
  scenario: string;
  value: number;
  vsHaircut: number;
}

interface Recommendation {
  priority: number;
  action: string;
  impact: string;
}

interface MemberRisk {
  name: string;
  memberId: string;
  overallRisk: { score: number; label: string; trend: "improving" | "stable" | "worsening" };
  riskFactors: Record<string, RiskFactor>;
  venueExposure: VenueExposure[];
  assetClassBreakdown: AssetClass[];
  concentrationMatrix: {
    singleVenue: { lowLiq: number; medLiq: number; highLiq: number };
    multiVenue: { lowLiq: number; medLiq: number; highLiq: number };
  };
  stressComparison: StressScenario[];
  recommendations: Recommendation[];
}

const memberRiskData: Record<string, MemberRisk> = {
  "vertex-trading": {
    name: "Vertex Trading Corp",
    memberId: "VERTEXTRADING",
    overallRisk: { score: 52, label: "HIGH", trend: "worsening" },
    riskFactors: {
      venueConcentration: { score: 38, weight: 35, label: "CRITICAL" },
      assetConcentration: { score: 45, weight: 25, label: "HIGH" },
      liquidityRisk: { score: 42, weight: 28, label: "HIGH" },
      counterpartyRisk: { score: 71, weight: 12, label: "MEDIUM" }
    },
    venueExposure: [
      { venue: "Venue B (CEX)", amount: 298000000, pct: 70, status: "critical", note: "Excessive concentration - TSLE anomalies active" },
      { venue: "Canton DEX", amount: 102000000, pct: 24, status: "healthy", note: "Secondary venue - adequate" },
      { venue: "OTC Pool", amount: 25000000, pct: 6, status: "healthy", note: "Minimal exposure" }
    ],
    assetClassBreakdown: [
      { class: "Crypto", exposure: 215000000, poliAvg: 58, riskAdjusted: 142900000, warning: true },
      { class: "Equity Tokens", exposure: 125000000, poliAvg: 64, riskAdjusted: 93750000, warning: true },
      { class: "Treasuries", exposure: 85000000, poliAvg: 92, riskAdjusted: 80750000 }
    ],
    concentrationMatrix: {
      singleVenue: { lowLiq: 28, medLiq: 32, highLiq: 40 },
      multiVenue: { lowLiq: 15, medLiq: 25, highLiq: 60 }
    },
    stressComparison: [
      { scenario: "Normal Market", value: 317400000, vsHaircut: -21.2 },
      { scenario: "12h Liquidation", value: 268700000, vsHaircut: -33.3 },
      { scenario: "4h Liquidation", value: 203500000, vsHaircut: -49.5 },
      { scenario: "1h Fire Sale", value: 147200000, vsHaircut: -63.5 }
    ],
    recommendations: [
      { priority: 1, action: "Immediately reduce Venue B exposure below 50%", impact: "CRITICAL" },
      { priority: 2, action: "Diversify crypto holdings across multiple venues", impact: "HIGH" },
      { priority: 3, action: "Increase Treasury allocation to minimum 30%", impact: "HIGH" }
    ]
  },
  "acme-capital": {
    name: "Acme Capital LLC",
    memberId: "ACMECAPITAL",
    overallRisk: { score: 67, label: "MODERATE", trend: "stable" },
    riskFactors: {
      venueConcentration: { score: 43, weight: 35, label: "HIGH" },
      assetConcentration: { score: 71, weight: 25, label: "MEDIUM" },
      liquidityRisk: { score: 58, weight: 28, label: "HIGH" },
      counterpartyRisk: { score: 85, weight: 12, label: "LOW" }
    },
    venueExposure: [
      { venue: "Canton DEX", amount: 568000000, pct: 67, status: "healthy", note: "Primary venue - healthy diversification" },
      { venue: "Venue B (CEX)", amount: 263000000, pct: 31, status: "warning", note: "TSLE anomalies detected - elevated risk" },
      { venue: "Venue C (RFQ)", amount: 17000000, pct: 2, status: "healthy", note: "Minimal exposure" }
    ],
    assetClassBreakdown: [
      { class: "Treasuries", exposure: 347500000, poliAvg: 93, riskAdjusted: 338200000 },
      { class: "Equity ETFs", exposure: 350000000, poliAvg: 68, riskAdjusted: 267800000, warning: true },
      { class: "Single Equities", exposure: 150000000, poliAvg: 84, riskAdjusted: 138000000 }
    ],
    concentrationMatrix: {
      singleVenue: { lowLiq: 12, medLiq: 28, highLiq: 60 },
      multiVenue: { lowLiq: 8, medLiq: 35, highLiq: 57 }
    },
    stressComparison: [
      { scenario: "Normal Market", value: 744000000, vsHaircut: -7.6 },
      { scenario: "12h Liquidation", value: 685300000, vsHaircut: -14.9 },
      { scenario: "4h Liquidation", value: 580100000, vsHaircut: -27.9 },
      { scenario: "1h Fire Sale", value: 453800000, vsHaircut: -43.6 }
    ],
    recommendations: [
      { priority: 1, action: "Reduce Venue B exposure (TSLE anomalies)", impact: "HIGH" },
      { priority: 2, action: "Diversify Russell 1000 ETF across more venues", impact: "MEDIUM" },
      { priority: 3, action: "Increase Treasury allocation for stability", impact: "MEDIUM" }
    ]
  },
  "meridian-fund": {
    name: "Meridian Fund Services",
    memberId: "MERIDIANFUND",
    overallRisk: { score: 89, label: "LOW", trend: "improving" },
    riskFactors: {
      venueConcentration: { score: 82, weight: 35, label: "LOW" },
      assetConcentration: { score: 88, weight: 25, label: "LOW" },
      liquidityRisk: { score: 91, weight: 28, label: "LOW" },
      counterpartyRisk: { score: 94, weight: 12, label: "LOW" }
    },
    venueExposure: [
      { venue: "Canton DEX", amount: 625000000, pct: 50, status: "healthy", note: "Well-balanced primary venue" },
      { venue: "Venue B (CEX)", amount: 375000000, pct: 30, status: "healthy", note: "Diversified secondary exposure" },
      { venue: "Venue C (RFQ)", amount: 187500000, pct: 15, status: "healthy", note: "Institutional RFQ access" },
      { venue: "OTC Pool", amount: 62500000, pct: 5, status: "healthy", note: "Strategic OTC relationships" }
    ],
    assetClassBreakdown: [
      { class: "Treasuries", exposure: 625000000, poliAvg: 95, riskAdjusted: 609375000 },
      { class: "Investment Grade", exposure: 312500000, poliAvg: 91, riskAdjusted: 296875000 },
      { class: "Equity ETFs", exposure: 187500000, poliAvg: 86, riskAdjusted: 171875000 },
      { class: "Single Equities", exposure: 125000000, poliAvg: 83, riskAdjusted: 112500000 }
    ],
    concentrationMatrix: {
      singleVenue: { lowLiq: 5, medLiq: 18, highLiq: 77 },
      multiVenue: { lowLiq: 3, medLiq: 12, highLiq: 85 }
    },
    stressComparison: [
      { scenario: "Normal Market", value: 1190625000, vsHaircut: -4.8 },
      { scenario: "12h Liquidation", value: 1130093750, vsHaircut: -9.6 },
      { scenario: "4h Liquidation", value: 1011531250, vsHaircut: -19.1 },
      { scenario: "1h Fire Sale", value: 869156250, vsHaircut: -30.5 }
    ],
    recommendations: [
      { priority: 1, action: "Maintain current diversification strategy", impact: "LOW" },
      { priority: 2, action: "Consider expanding RFQ relationships", impact: "LOW" }
    ]
  }
};

export function MemberRiskAssessment() {
  const [selectedMember, setSelectedMember] = useState("acme-capital");
  const [sortBy, setSortBy] = useState("risk");

  const sortedMembers = Object.entries(memberRiskData).sort((a, b) => {
    if (sortBy === "risk") return a[1].overallRisk.score - b[1].overallRisk.score;
    return b[1].overallRisk.score - a[1].overallRisk.score;
  });

  const member = memberRiskData[selectedMember];

  const formatCurrency = (value: number) => {
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(2)}B`;
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    return `$${value.toLocaleString()}`;
  };

  const getRiskColor = (score: number) => {
    if (score >= 80) return "#10b981";
    if (score >= 60) return "#f59e0b";
    return "#ef4444";
  };

  const getRiskLabelStyle = (label: string) => {
    const styles: Record<string, { bg: string; color: string }> = {
      LOW: { bg: "#064e3b", color: "#34d399" },
      MODERATE: { bg: "#78350f", color: "#fbbf24" },
      HIGH: { bg: "#7f1d1d", color: "#f87171" },
      CRITICAL: { bg: "#450a0a", color: "#fca5a5" },
      MEDIUM: { bg: "#78350f", color: "#fbbf24" }
    };
    return styles[label] || styles.MODERATE;
  };

  const getTrendIcon = (trend: string) => {
    if (trend === "improving") return { Icon: TrendingUp, color: "#10b981" };
    if (trend === "worsening") return { Icon: TrendingDown, color: "#ef4444" };
    return { Icon: Minus, color: "#64748b" };
  };

  const getVenueStatusColor = (status: string) => {
    const colors: Record<string, string> = { healthy: "#10b981", warning: "#f59e0b", critical: "#ef4444" };
    return colors[status] || colors.warning;
  };

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
    <div className="flex h-full" style={{ background: "#000000" }}>
      {/* Left Sidebar - Members List */}
      <aside className="w-[280px] flex-shrink-0 border-r border-white/10" style={{ background: "rgba(10, 10, 10, 0.8)" }}>
        <div className="p-5">
          <div className="text-[11px] text-slate-500 tracking-wider mb-3">MEMBERS BY RISK</div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="bg-[#111111] border-white/15 text-white text-sm" data-testid="select-sort">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="risk">Highest Risk First</SelectItem>
              <SelectItem value="score">Lowest Risk First</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-0">
          {sortedMembers.map(([key, m]) => {
            const trend = getTrendIcon(m.overallRisk.trend);
            const riskStyle = getRiskLabelStyle(m.overallRisk.label);
            return (
              <div
                key={key}
                onClick={() => setSelectedMember(key)}
                className="px-5 py-4 cursor-pointer transition-colors"
                style={{
                  background: selectedMember === key ? "rgba(59, 130, 246, 0.1)" : "transparent",
                  borderLeft: selectedMember === key ? "3px solid #3b82f6" : "3px solid transparent"
                }}
                data-testid={`member-row-${key}`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-sm text-white">{m.name}</span>
                  <Badge 
                    variant="outline" 
                    className="text-[10px]"
                    style={{ background: riskStyle.bg, color: riskStyle.color, borderColor: riskStyle.color }}
                  >
                    {m.overallRisk.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all"
                      style={{ width: `${m.overallRisk.score}%`, background: getRiskColor(m.overallRisk.score) }}
                    />
                  </div>
                  <span 
                    className="text-lg font-bold"
                    style={{ color: getRiskColor(m.overallRisk.score) }}
                  >
                    {m.overallRisk.score}
                  </span>
                  <trend.Icon className="w-4 h-4" style={{ color: trend.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto">
        {member && (
          <>
            {/* Risk Profile Header */}
            <Card className="border-white/10 bg-[#111111] mb-6">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="text-[11px] text-slate-500 tracking-wider mb-2">RISK PROFILE</div>
                    <div className="text-2xl font-bold text-white mb-1">{member.name}</div>
                    <div className="text-sm text-slate-400">Member ID: {member.memberId}</div>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant="outline" 
                      className="text-xs mb-2"
                      style={{ 
                        background: getRiskLabelStyle(member.overallRisk.label).bg, 
                        color: getRiskLabelStyle(member.overallRisk.label).color,
                        borderColor: getRiskLabelStyle(member.overallRisk.label).color
                      }}
                    >
                      {member.overallRisk.label} RISK
                    </Badge>
                    <div 
                      className="text-5xl font-bold"
                      style={{ color: getRiskColor(member.overallRisk.score) }}
                    >
                      {member.overallRisk.score}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  {Object.entries(member.riskFactors).map(([key, factor]) => {
                    const style = getRiskLabelStyle(factor.label);
                    return (
                      <div key={key} className="p-4 rounded-lg" style={{ background: "#0a0a0a" }}>
                        <div className="text-[11px] text-slate-500 mb-2 uppercase">
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </div>
                        <div className="flex justify-between items-end">
                          <div 
                            className="text-2xl font-bold"
                            style={{ color: getRiskColor(factor.score) }}
                          >
                            {factor.score}
                          </div>
                          <Badge 
                            variant="outline" 
                            className="text-[10px]"
                            style={{ background: style.bg, color: style.color, borderColor: style.color }}
                          >
                            {factor.label}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Venue Exposure Map */}
            <Card className="border-white/10 bg-[#111111] mb-6">
              <CardContent className="p-6">
                <div className="text-[11px] text-slate-500 tracking-wider mb-5">VENUE EXPOSURE MAP</div>
                {member.venueExposure.map((venue, i) => (
                  <div key={i} className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{venue.venue}</span>
                        {venue.status !== "healthy" && (
                          <Badge 
                            variant="outline"
                            className="text-[10px] uppercase"
                            style={{ 
                              background: venue.status === "critical" ? "rgba(239, 68, 68, 0.2)" : "rgba(245, 158, 11, 0.2)",
                              color: getVenueStatusColor(venue.status),
                              borderColor: getVenueStatusColor(venue.status)
                            }}
                          >
                            {venue.status}
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm text-slate-400">{venue.pct}% ({formatCurrency(venue.amount)})</span>
                    </div>
                    <div className="h-6 bg-[#0a0a0a] rounded overflow-hidden mb-1">
                      <div 
                        className="h-full transition-all"
                        style={{ width: `${venue.pct}%`, background: getVenueStatusColor(venue.status) }}
                      />
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      {venue.status === "healthy" ? (
                        <CheckCircle className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                      )}
                      {venue.note}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Asset Class & Stress Test Row */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              {/* Asset Class Breakdown */}
              <Card className="border-white/10 bg-[#111111]">
                <CardContent className="p-6">
                  <div className="text-[11px] text-slate-500 tracking-wider mb-5">ASSET CLASS BREAKDOWN</div>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left pb-3 text-[11px] text-slate-500 font-medium">CLASS</th>
                        <th className="text-right pb-3 text-[11px] text-slate-500 font-medium">EXPOSURE</th>
                        <th className="text-right pb-3 text-[11px] text-slate-500 font-medium">PoLi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {member.assetClassBreakdown.map((asset, i) => (
                        <tr key={i} className="border-b border-white/5">
                          <td className="py-3 text-sm text-white">
                            {asset.class}
                            {asset.warning && <AlertTriangle className="inline w-3 h-3 text-amber-400 ml-1" />}
                          </td>
                          <td className="py-3 text-sm text-right text-white font-mono">{formatCurrency(asset.exposure)}</td>
                          <td className="py-3 text-right">
                            <Badge 
                              variant="outline"
                              className="text-xs font-mono"
                              style={{ 
                                background: `${getRiskColor(asset.poliAvg)}20`,
                                color: getRiskColor(asset.poliAvg),
                                borderColor: getRiskColor(asset.poliAvg)
                              }}
                            >
                              {asset.poliAvg}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {/* Stress Test Comparison */}
              <Card className="border-white/10 bg-[#111111]">
                <CardContent className="p-6">
                  <div className="text-[11px] text-slate-500 tracking-wider mb-5">STRESS TEST COMPARISON</div>
                  {member.stressComparison.map((scenario, i) => (
                    <div 
                      key={i}
                      className="flex justify-between items-center py-3"
                      style={{ borderBottom: i < member.stressComparison.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}
                    >
                      <span className="text-sm text-white">{scenario.scenario}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-white font-mono">{formatCurrency(scenario.value)}</span>
                        <Badge 
                          variant="outline"
                          className="text-[11px] font-mono"
                          style={{ 
                            background: scenario.vsHaircut < -20 ? "rgba(239, 68, 68, 0.2)" : 
                                        scenario.vsHaircut < -10 ? "rgba(245, 158, 11, 0.2)" : "rgba(16, 185, 129, 0.2)",
                            color: scenario.vsHaircut < -20 ? "#ef4444" : 
                                   scenario.vsHaircut < -10 ? "#f59e0b" : "#10b981",
                            borderColor: scenario.vsHaircut < -20 ? "#ef4444" : 
                                         scenario.vsHaircut < -10 ? "#f59e0b" : "#10b981"
                          }}
                        >
                          {scenario.vsHaircut}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Recommendations */}
            <Card className="border-white/10 bg-[#111111]">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-5">
                  <div className="text-[11px] text-slate-500 tracking-wider">RECOMMENDATIONS</div>
                  <Button 
                    size="sm" 
                    className="text-xs"
                    style={{ background: "#8b5cf6" }}
                    data-testid="btn-generate-proposal"
                  >
                    <FileText className="w-3 h-3 mr-1" />
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
                        style={{ background: "#0a0a0a" }}
                      >
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center mr-4 text-sm font-bold"
                          style={{ background: impactStyle.bg, color: impactStyle.color }}
                        >
                          {rec.priority}
                        </div>
                        <div className="flex-1 text-sm text-white">{rec.action}</div>
                        <Badge 
                          variant="outline"
                          className="text-[10px]"
                          style={{ background: impactStyle.bg, color: impactStyle.color, borderColor: impactStyle.color }}
                        >
                          {rec.impact}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
