import { useDailyCommentary } from "@/hooks/useDailyCommentary";

type Props = {
  symbol: string;
};

export default function DailyMarketCommentaryPanel({ symbol }: Props) {
  const { loading, error, data } = useDailyCommentary(symbol, "buy");

  return (
    <div className="p-4 rounded-xl bg-[#050714] border border-[#1a2337] text-gray-200 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">
            STRATA Summary Commentary for the Day
          </h3>
          <p className="text-[11px] text-gray-400">
            Auto-generated execution & liquidity view for {symbol}.
          </p>
        </div>
        {data && (
          <div className="text-[11px] text-gray-400">
            Risk Score:{" "}
            <span
              className={`font-mono ${
                data.executionRiskScore >= 80
                  ? "text-emerald-400"
                  : data.executionRiskScore >= 60
                  ? "text-yellow-400"
                  : "text-rose-400"
              }`}
            >
              {data.executionRiskScore}/100
            </span>
          </div>
        )}
      </div>

      {loading && (
        <div className="text-xs text-gray-400">
          Computing daily market commentary…
        </div>
      )}
      {error && (
        <div className="text-xs text-red-400">
          Failed to load commentary: {error}
        </div>
      )}
      {!loading && !error && data && (
        <>
          <div className="space-y-1 text-xs">
            <div>
              <span className="uppercase tracking-wide text-[10px] text-gray-400">
                Dominant Factor Today
              </span>
              <p className="text-[12px] text-gray-100">
                {data.dominantFactor}
              </p>
            </div>
            <div>
              <span className="uppercase tracking-wide text-[10px] text-gray-400">
                Market-Structure Regime
              </span>
              <p className="text-[12px] text-gray-100">
                {data.marketStructureRegime}
              </p>
            </div>
          </div>

          <div className="border-t border-slate-700 pt-2">
            <span className="uppercase tracking-wide text-[10px] text-gray-400">
              Execution Highlights
            </span>
            <ul className="mt-1 space-y-1 text-[12px] list-disc list-inside">
              {data.executionSummaryBullets.map((b, idx) => (
                <li key={idx} className="text-gray-200">
                  <span
                    dangerouslySetInnerHTML={{ __html: b.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }}
                  />
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
