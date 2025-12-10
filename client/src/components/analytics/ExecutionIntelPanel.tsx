import { useExecutionIntel } from "@/hooks/useExecutionIntel";
import { useTsleDepth, formatUSD, getRegimeColor as getTsleRegimeColor } from "@/utils/tsleDepth";
import { Activity, TrendingUp, AlertTriangle, CheckCircle2, XCircle, Zap } from "lucide-react";

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
    case "Normal":
      return "text-cyan-400";
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

export default function ExecutionIntelPanel({ symbol, side }: ExecutionIntelPanelProps) {
  const { loading, error, intel } = useExecutionIntel(symbol, side);
  const { data: tsle, loading: tsleLoading } = useTsleDepth(symbol, { side, size: 100_000 });

  const tsleRegimeLabel = tsle
    ? `${tsle.regime} · ${tsle.score}/100`
    : "Collecting liquidity data...";

  if (loading) {
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

  if (error) {
    return (
      <div
        className="p-4 rounded-xl bg-[#080b1a] border border-red-900/50 text-red-400"
        data-testid="panel-execution-intel-error"
      >
        <div className="text-xs">Error: {error}</div>
      </div>
    );
  }

  if (!intel) return null;

  return (
    <div
      className="p-4 rounded-xl bg-[#080b1a] border border-[#141b2e] text-gray-200 space-y-4"
      data-testid="panel-execution-intel"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          Execution Intelligence
        </h3>
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">
          {intel.symbol} / {intel.side.toUpperCase()}
        </span>
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
      {tsleLoading && (
        <div className="text-[10px] text-gray-500">Loading TSLE depth...</div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Slippage Regime</div>
          <div className={`text-sm font-mono font-semibold ${getRegimeColor(intel.slippageRegime)}`}>
            {intel.slippageRegime}
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Execution Risk</div>
          <div className="flex items-center gap-2">
            {getRiskIcon(intel.executionRiskScore)}
            <span className={`text-sm font-mono font-semibold ${getRiskColor(intel.executionRiskScore)}`}>
              {intel.executionRiskScore}/100
            </span>
          </div>
        </div>

        <div className="space-y-1 col-span-2">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Best Venue</div>
          <div className="text-sm">
            <span className="text-[#F5C211] font-semibold capitalize">{intel.bestVenue}</span>
            <span className="text-gray-400 text-xs ml-2">— {intel.venueSummary}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider">Max Tradeable Size (Aggregated)</div>
        <div className="grid grid-cols-5 gap-2">
          {[
            { label: "<10bps", value: tsle?.totals?.depth10bps ?? intel.maxSizeSignals.bps10 },
            { label: "<25bps", value: tsle?.maxSizeAt25bps ?? intel.maxSizeSignals.bps25 },
            { label: "<50bps", value: tsle?.maxSizeAt50bps ?? intel.maxSizeSignals.bps50 },
            { label: "<100bps", value: tsle?.maxSizeAt100bps ?? intel.maxSizeSignals.bps100 },
            { label: "<200bps", value: tsle?.totals?.depth200bps ?? (intel.maxSizeSignals.bps100 * 2.5) },
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
          {intel.commentary}
        </div>
      </div>
    </div>
  );
}
