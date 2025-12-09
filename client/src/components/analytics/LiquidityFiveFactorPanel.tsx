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

function LiquidityFiveFactorPanel({ factors }: LiquidityFiveFactorPanelProps) {
  if (!factors) {
    return (
      <div className="text-[var(--c-text-secondary)] text-sm">
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

  const bar = (value: number, colorVar: string) => (
    <div className="w-full h-2 rounded-full bg-[var(--c-surface2)]">
      <div
        className="h-full rounded-full"
        style={{ width: `${value}%`, backgroundColor: `var(${colorVar})` }}
      />
    </div>
  );

  return (
    <div className="bg-[var(--c-card)] rounded-xl p-5 shadow-sm border border-[var(--c-border)]">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[var(--c-text-primary)] text-lg font-semibold tracking-tight">
          Liquidity 5-Factor Score
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-[var(--c-text-primary)] text-xl font-semibold">
            {score}/100
          </span>
          <span className="px-2 py-1 text-xs font-semibold rounded bg-[var(--c-accent)] text-[var(--c-bg)]">
            {grade}
          </span>
        </div>
      </div>

      <div className="flex justify-between items-center py-1">
        <span className="text-sm text-[var(--c-text-secondary)]">Depth Quality</span>
        <span className="text-sm font-semibold text-[var(--c-text-primary)]">{depthQuality}</span>
      </div>
      {bar(depthQuality, "--c-blue")}

      <div className="flex justify-between items-center py-1 mt-3">
        <span className="text-sm text-[var(--c-text-secondary)]">Execution Efficiency</span>
        <span className="text-sm font-semibold text-[var(--c-text-primary)]">{executionEfficiency}</span>
      </div>
      {bar(executionEfficiency, "--c-green")}

      <div className="flex justify-between items-center py-1 mt-3">
        <span className="text-sm text-[var(--c-text-secondary)]">Liquidity Stability</span>
        <span className="text-sm font-semibold text-[var(--c-text-primary)]">{liquidityStability}</span>
      </div>
      {bar(liquidityStability, "--c-yellow")}

      <div className="flex justify-between items-center py-1 mt-3">
        <span className="text-sm text-[var(--c-text-secondary)]">Market Fragmentation</span>
        <span className="text-sm font-semibold text-[var(--c-text-primary)]">{marketFragmentation}</span>
      </div>
      {bar(marketFragmentation, "--c-red")}

      <div className="flex justify-between items-center py-1 mt-3">
        <span className="text-sm text-[var(--c-text-secondary)]">Risk Concentration</span>
        <span className="text-sm font-semibold text-[var(--c-text-primary)]">{riskConcentration}</span>
      </div>
      {bar(riskConcentration, "--c-purple")}
    </div>
  );
}

export { LiquidityFiveFactorPanel as default };
