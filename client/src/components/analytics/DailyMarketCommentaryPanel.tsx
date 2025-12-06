import { useDailyCommentary, CommentaryDelta } from "@/hooks/useDailyCommentary";

type Props = {
  symbol: string;
};

function DeltaChip({ value, suffix = "" }: { value: number | null; suffix?: string }) {
  if (value === null) return null;
  const isPositive = value >= 0;
  const sign = isPositive ? "+" : "";
  const color = isPositive ? "text-emerald-400" : "text-rose-400";
  return (
    <span className={`font-mono text-[11px] ${color}`}>
      {sign}{value.toFixed(1)}{suffix}
    </span>
  );
}

function DeltaSection({ delta }: { delta: CommentaryDelta | null }) {
  if (!delta) {
    return (
      <div className="text-[11px] text-gray-500 italic">
        First capture — no prior data available.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px]">
      {delta.riskScoreDelta !== null && (
        <div className="flex items-center gap-1">
          <span className="text-gray-400">Risk:</span>
          <DeltaChip value={delta.riskScoreDelta} suffix=" pts" />
        </div>
      )}
      {delta.maxSize25bpsDeltaPct !== null && (
        <div className="flex items-center gap-1">
          <span className="text-gray-400">25bps Cap:</span>
          <DeltaChip value={delta.maxSize25bpsDeltaPct} suffix="%" />
        </div>
      )}
      {delta.maxSize50bpsDeltaPct !== null && (
        <div className="flex items-center gap-1">
          <span className="text-gray-400">50bps Cap:</span>
          <DeltaChip value={delta.maxSize50bpsDeltaPct} suffix="%" />
        </div>
      )}
      {delta.regimeChange && (
        <div className="flex items-center gap-1">
          <span className="text-gray-400">Regime:</span>
          <span className="text-cyan-400 font-mono">{delta.regimeChange}</span>
        </div>
      )}
      {delta.priorDate && (
        <div className="text-gray-500">
          vs {delta.priorDate}
        </div>
      )}
    </div>
  );
}

export default function DailyMarketCommentaryPanel({ symbol }: Props) {
  const { loading, error, data } = useDailyCommentary(symbol, "buy");

  return (
    <div
      className="p-4 rounded-xl bg-[#050714] border border-[#1a2337] text-gray-200 space-y-3"
      data-testid="panel-daily-commentary"
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">
            STRATA Daily Commentary
          </h3>
          <p className="text-[11px] text-gray-400">
            Institutional execution & liquidity posture for {symbol}
          </p>
        </div>
        {data && (
          <div className="flex items-center gap-3">
            <div className="text-[11px] text-gray-400">
              Risk Score:{" "}
              <span
                className={`font-mono font-semibold ${
                  data.executionRiskScore >= 80
                    ? "text-emerald-400"
                    : data.executionRiskScore >= 60
                    ? "text-yellow-400"
                    : "text-rose-400"
                }`}
                data-testid="text-risk-score"
              >
                {data.executionRiskScore}/100
              </span>
            </div>
            <div className="text-[11px] px-2 py-0.5 rounded bg-[#111827] border border-[#1f2937]">
              <span className="text-gray-400">Regime: </span>
              <span className="text-cyan-400 font-mono" data-testid="text-slippage-regime">
                {data.slippageRegime}
              </span>
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="text-xs text-gray-400" data-testid="loading-commentary">
          Computing daily market commentary…
        </div>
      )}
      {error && (
        <div className="text-xs text-red-400" data-testid="error-commentary">
          Failed to load commentary: {error}
        </div>
      )}
      {!loading && !error && data && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <span className="uppercase tracking-wide text-[10px] text-gray-500 font-medium">
                Dominant Factor
              </span>
              <p className="text-[12px] text-gray-100 leading-relaxed" data-testid="text-dominant-factor">
                {data.dominantFactor}
              </p>
            </div>
            <div className="space-y-1">
              <span className="uppercase tracking-wide text-[10px] text-gray-500 font-medium">
                Market Structure
              </span>
              <p className="text-[12px] text-gray-100 leading-relaxed" data-testid="text-market-structure">
                {data.marketStructureRegime}
              </p>
            </div>
          </div>

          <div className="border-t border-slate-700/50 pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="uppercase tracking-wide text-[10px] text-gray-500 font-medium">
                Execution Highlights
              </span>
              <span className="text-[10px] text-gray-500">
                Primary: <span className="text-white font-mono">{data.bestVenue.toUpperCase()}</span>
              </span>
            </div>
            <ul className="space-y-1 text-[12px]" data-testid="list-execution-bullets">
              {data.executionSummaryBullets.map((b, idx) => (
                <li key={idx} className="text-gray-200 flex items-start gap-2">
                  <span className="text-cyan-500 mt-0.5">•</span>
                  <span
                    dangerouslySetInnerHTML={{
                      __html: b.replace(/\*\*(.+?)\*\*/g, '<span class="text-white font-semibold">$1</span>'),
                    }}
                  />
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-slate-700/50 pt-3">
            <span className="uppercase tracking-wide text-[10px] text-gray-500 font-medium block mb-2">
              Yesterday vs Today
            </span>
            <DeltaSection delta={data.delta} />
          </div>
        </>
      )}
    </div>
  );
}
