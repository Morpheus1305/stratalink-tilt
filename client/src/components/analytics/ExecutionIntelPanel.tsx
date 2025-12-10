import { useExecutionIntel } from "@/hooks/useExecutionIntel";
import { useTsleDepth, formatUSD, getRegimeColor as getTsleRegimeColor } from "@/utils/tsleDepth";
import { Activity, TrendingUp, AlertTriangle, CheckCircle2, XCircle, Zap, RefreshCw } from "lucide-react";

interface ExecutionIntelPanelProps {
  symbol: string;
  side: "buy" | "sell";
}

function getRegimeColor(regime: string): string {
  switch (regime) {
    case "Ultra-Tight":
      return "text-emerald-400";
    case "Tight":
      return "text-green-400";
    case "Neutral":
    case "Normal":
      return "text-cyan-400";
    case "Stressed":
    case "Wide":
      return "text-amber-400";
    case "Broken":
      return "text-red-400";
    default:
      return "text-gray-400";
  }
}

function getRiskIcon(score: number) {
  if (score > 85) return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
  if (score > 65) return <TrendingUp className="w-4 h-4 text-green-400" />;
  if (score > 45) return <Activity className="w-4 h-4 text-amber-400" />;
  if (score > 25) return <AlertTriangle className="w-4 h-4 text-orange-400" />;
  return <XCircle className="w-4 h-4 text-red-400" />;
}

function getRiskColor(score: number): string {
  if (score > 85) return "text-emerald-400";
  if (score > 65) return "text-green-400";
  if (score > 45) return "text-amber-400";
  if (score > 25) return "text-orange-400";
  return "text-red-400";
}

function generateDynamicCommentary(
  symbol: string,
  side: "buy" | "sell",
  tsleScore: number,
  regime: string,
  bestVenue: string,
  maxSize25bps: number,
  riskScore: number
): string {
  const interpretation = riskScore > 85
    ? "Excellent execution conditions with deep, stable books across major venues."
    : riskScore > 65
    ? "Healthy liquidity, moderate fragmentation, acceptable slippage across venues."
    : riskScore > 45
    ? "Execution risk rising — watch venue imbalances and depth decay."
    : riskScore > 25
    ? "Poor liquidity environment — wide spreads and inconsistent depth across venues."
    : "Severely impaired liquidity — expect strong price impact and unreliable execution.";

  return `Execution environment for ${symbol} (${side}):
• Slippage regime: ${regime}
• Best venue at $100k: ${bestVenue}
• Max tradeable size <25bps: $${(maxSize25bps / 1_000_000).toFixed(2)}M
• Risk Score: ${riskScore}/100

${interpretation}`;
}

export default function ExecutionIntelPanel({ symbol, side }: ExecutionIntelPanelProps) {
  const { loading, error, intel, lastUpdated } = useExecutionIntel(symbol, side);
  const { data: tsle, loading: tsleLoading, lastUpdated: tsleLastUpdated } = useTsleDepth(symbol, { side, size: 100_000 });

  const effectiveRegime = tsle?.regime || intel?.slippageRegime || "Unknown";
  const effectiveScore = tsle?.score ?? 0;
  const effectiveRiskScore = intel?.executionRiskScore ?? 50;
  const effectiveBestVenue = intel?.bestVenue || "coinbase";
  const effectiveMaxSize25bps = tsle?.maxSizeAt25bps ?? intel?.maxSizeSignals?.bps25 ?? 500000;

  const tsleRegimeLabel = tsle
    ? `${tsle.regime} · ${tsle.score}/100`
    : "Collecting liquidity data...";

  const dynamicCommentary = tsle && intel
    ? generateDynamicCommentary(
        symbol,
        side,
        effectiveScore,
        effectiveRegime,
        effectiveBestVenue,
        effectiveMaxSize25bps,
        effectiveRiskScore
      )
    : intel?.commentary || "";

  const lastUpdate = tsleLastUpdated || lastUpdated;
  const updateTime = lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : null;

  if (loading && !intel) {
    return (
      <div
        className="p-4 rounded-xl bg-[#080b1a] border border-[#141b2e] text-gray-400"
        data-testid="panel-execution-intel-loading"
      >
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">Loading execution intelligence...</span>
        </div>
      </div>
    );
  }

  if (error && !intel) {
    return (
      <div
        className="p-4 rounded-xl bg-[#080b1a] border border-red-900/50 text-red-400"
        data-testid="panel-execution-intel-error"
      >
        <div className="text-xs">Error: {error}</div>
      </div>
    );
  }

  if (!intel && !tsle) return null;

  return (
    <div
      className="p-4 rounded-xl bg-[#080b1a] border border-[#141b2e] text-gray-200 space-y-4"
      data-testid={`panel-execution-intel-${side}`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          Execution Intelligence
        </h3>
        <div className="flex items-center gap-2">
          {updateTime && (
            <span className="text-[9px] text-gray-600 flex items-center gap-1">
              <RefreshCw className="w-2.5 h-2.5" />
              {updateTime}
            </span>
          )}
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">
            {symbol} / {side.toUpperCase()}
          </span>
        </div>
      </div>

      {/* TSLE Live Regime Badge */}
      {tsle && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-[#0a0e1a] border border-[#1a2237]">
          <Zap className="w-3 h-3 text-[#F5C211]" />
          <span className="text-[10px] text-gray-400 uppercase tracking-wider">TSLE Live:</span>
          <span className={`text-xs font-mono font-semibold ${getTsleRegimeColor(tsle.regime)}`}>
            {tsleRegimeLabel}
          </span>
          <span className="text-[10px] text-gray-500 ml-auto">
            Impact: ~{tsle.estImpactBps.toFixed(1)}bps @ $100K
          </span>
        </div>
      )}
      {tsleLoading && !tsle && (
        <div className="text-[10px] text-gray-500 flex items-center gap-2">
          <div className="w-3 h-3 border border-cyan-400 border-t-transparent rounded-full animate-spin" />
          Loading TSLE depth...
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Slippage Regime</div>
          <div className={`text-sm font-mono font-semibold ${getRegimeColor(effectiveRegime)}`}>
            {effectiveRegime}
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Execution Risk</div>
          <div className="flex items-center gap-2">
            {getRiskIcon(effectiveRiskScore)}
            <span className={`text-sm font-mono font-semibold ${getRiskColor(effectiveRiskScore)}`}>
              {effectiveRiskScore}/100
            </span>
          </div>
        </div>

        <div className="space-y-1 col-span-2">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Best Venue</div>
          <div className="text-sm">
            <span className="text-[#F5C211] font-semibold capitalize">{effectiveBestVenue}</span>
            <span className="text-gray-400 text-xs ml-2">— {effectiveBestVenue} currently offers the most stable + deepest execution conditions.</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider">Max Tradeable Size (Aggregated)</div>
        <div className="grid grid-cols-5 gap-2">
          {[
            { label: "<10bps", value: tsle?.totals?.depth10bps ?? intel?.maxSizeSignals?.bps10 ?? 0 },
            { label: "<25bps", value: tsle?.maxSizeAt25bps ?? intel?.maxSizeSignals?.bps25 ?? 0 },
            { label: "<50bps", value: tsle?.maxSizeAt50bps ?? intel?.maxSizeSignals?.bps50 ?? 0 },
            { label: "<100bps", value: tsle?.maxSizeAt100bps ?? intel?.maxSizeSignals?.bps100 ?? 0 },
            { label: "<200bps", value: tsle?.totals?.depth200bps ?? ((intel?.maxSizeSignals?.bps100 ?? 0) * 2.5) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[#0a0e1a] rounded-lg p-2 text-center">
              <div className="text-[9px] text-gray-500">{label}</div>
              <div className="text-xs font-mono text-cyan-400">
                {formatUSD(value)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-[#1a2237]">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Analysis</div>
        <div className="text-xs text-gray-300 whitespace-pre-line leading-relaxed font-mono">
          {dynamicCommentary}
        </div>
      </div>
    </div>
  );
}
