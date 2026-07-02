import { TT } from "@/components/tilt-tooltip";

const L5F_PANEL_TIPS: Record<string, string> = {
  "Depth Quality":       "Absolute and relative order book depth within the 10/25/50 bps bands. High score = substantial executable liquidity near mid-price. Weight: 30% of composite.",
  "Execution Efficiency":"Quality and cost of order execution at current conditions. Incorporates spread stability and fill probability at institutional size. Weight: 20%.",
  "Liquidity Stability": "Stability of depth and spread over the current session. Low stability = depth is fluctuating rapidly, making execution planning unreliable. Weight: 20%.",
  "Market Fragmentation":"Inverted HHI score. High score = liquidity is well-distributed across venues. Low = concentrated at 1-2 venues. Weight: 15%.",
  "Risk Concentration":  "Measures over-reliance on any single venue or instrument for total liquidity. High concentration = single-point dependency risk. Weight: 15%.",
};

interface FactorsData {
  depthQuality?: number;
  executionEfficiency?: number;
  liquidityStability?: number;
  marketFragmentation?: number;
  riskConcentration?: number;
  score?: number;
  grade?: string;
}

interface LiquidityFiveFactorPanelProps {
  factors?: FactorsData | null;
}

function FactorRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="py-2 border-b border-slate-800/50 last:border-b-0">
      <div className="flex justify-between items-center mb-1">
        <TT title={label} body={L5F_PANEL_TIPS[label] ?? label}>
          <span className="text-[12px] text-gray-400">{label}</span>
        </TT>
        <span className="text-[12px] font-mono font-medium text-gray-200">{value}</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-slate-800/60">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function LiquidityFiveFactorPanel({ factors }: LiquidityFiveFactorPanelProps) {
  if (!factors) {
    return (
      <div className="text-gray-400 text-[11px]">
        No liquidity factors available.
      </div>
    );
  }

  const {
    depthQuality = 0,
    executionEfficiency = 0,
    liquidityStability = 0,
    marketFragmentation = 0,
    riskConcentration = 0,
    score = 0,
    grade = "N/A",
  } = factors;

  return (
    <div
      className="p-4 rounded-xl bg-[#050714] border border-[#1a2337] text-gray-200"
      data-testid="panel-liquidity-five-factor"
    >
      <div className="flex justify-between items-center mb-3">
        <TT title="Liquidity 5-Factor Score (L5F)" body="Institutional liquidity quality model with five independently-weighted factors. Each factor probes a distinct structural property of market microstructure. The composite score (0-100) drives PoLi ratings and risk capacity estimates across the platform.">
          <h3 className="text-sm font-semibold text-white">
            Liquidity 5-Factor Score
          </h3>
        </TT>
        <div className="flex items-center gap-2">
          <span className="text-lg font-mono font-semibold text-white">
            {score}/100
          </span>
          <span className="px-2 py-0.5 text-[11px] font-mono font-semibold rounded bg-[#111827] border border-[#1f2937] text-cyan-400">
            {grade}
          </span>
        </div>
      </div>

      <div className="space-y-0">
        <FactorRow label="Depth Quality" value={depthQuality} color="#3b82f6" />
        <FactorRow label="Execution Efficiency" value={executionEfficiency} color="#22c55e" />
        <FactorRow label="Liquidity Stability" value={liquidityStability} color="#eab308" />
        <FactorRow label="Market Fragmentation" value={marketFragmentation} color="#f97316" />
        <FactorRow label="Risk Concentration" value={riskConcentration} color="#a855f7" />
      </div>
    </div>
  );
}

export { LiquidityFiveFactorPanel as default };
