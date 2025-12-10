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

function FactorRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-slate-800/50 last:border-b-0">
      <span className="text-[12px] text-gray-400">{label}</span>
      <span className="text-[12px] font-mono font-medium text-gray-200">{value}</span>
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
        <h3 className="text-sm font-semibold text-white">
          Liquidity 5-Factor Score
        </h3>
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
        <FactorRow label="Depth Quality" value={depthQuality} />
        <FactorRow label="Execution Efficiency" value={executionEfficiency} />
        <FactorRow label="Liquidity Stability" value={liquidityStability} />
        <FactorRow label="Market Fragmentation" value={marketFragmentation} />
        <FactorRow label="Risk Concentration" value={riskConcentration} />
      </div>
    </div>
  );
}

export { LiquidityFiveFactorPanel as default };
