import { useDailyCommentary } from "@/hooks/useDailyCommentary";
import { LiquidityFactorsData } from "@/hooks/useLiquidityFactors";
import { BatchFactorsResult } from "@/hooks/useLiquidityFactorsBatch";

type Props = {
  symbol: string;
  batchFactors?: BatchFactorsResult | null;
};

function formatUsdMillions(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return "$0M";
  const millions = value / 1_000_000;
  if (millions >= 100) return `$${millions.toFixed(0)}M`;
  if (millions >= 10) return `$${millions.toFixed(1)}M`;
  return `$${millions.toFixed(2)}M`;
}

function classifyFactor(name: string, v: number): string {
  if (v >= 80) return `${name} strong`;
  if (v >= 65) return `${name} constructive`;
  if (v >= 50) return `${name} neutral`;
  if (v >= 35) return `${name} fragile`;
  return `${name} stressed`;
}

function buildFactorCommentary(factorData: LiquidityFactorsData | undefined): string | null {
  if (!factorData || !factorData.factors) return null;

  const { symbol, composite, rating, factors, meta } = factorData;

  const depthLabel = classifyFactor("depth", factors.depthQuality);
  const execLabel = classifyFactor("execution", factors.execEfficiency);
  const stabilityLabel = classifyFactor("stability", factors.stability);
  const fragLabel = classifyFactor("fragmentation", factors.fragmentation);
  const riskLabel = classifyFactor("concentration risk", factors.riskConcentration);

  const max25 = formatUsdMillions(meta.max25bps);
  const max50 = formatUsdMillions(meta.max50bps);

  return (
    `Liquidity 5-Factor for ${symbol}: ${composite}/100 (${rating}). ` +
    `${depthLabel}, ${stabilityLabel}, ${execLabel}; ` +
    `fragmentation ${fragLabel}, ${riskLabel}. ` +
    `Max <25bps capacity ≈ ${max25}, <50bps ≈ ${max50} across ` +
    `${meta.venueCount || 0} venues (top venue ${meta.topShare ?? 0}%).`
  );
}

function buildMultiTokenNote(batch: BatchFactorsResult | undefined): string | null {
  if (!batch) return null;

  const entries = Object.entries(batch)
    .map(([sym, val]) => ({ sym, composite: val?.composite ?? 0, rating: val?.rating ?? "N/A" }))
    .filter((x) => x.composite > 0);

  if (entries.length === 0) return null;
  if (entries.length === 1) {
    const only = entries[0];
    return `${only.sym} scores ${only.composite}/100 (${only.rating}).`;
  }

  entries.sort((a, b) => b.composite - a.composite);
  const leader = entries[0];
  const laggard = entries[entries.length - 1];

  if (leader.sym === laggard.sym || leader.composite === laggard.composite) {
    return `BTC, ETH, and SOL are scoring comparably around ${leader.composite}/100.`;
  }

  const mid =
    entries.length > 2
      ? entries
          .slice(1, entries.length - 1)
          .map((e) => `${e.sym} ${e.composite}`)
          .join(", ")
      : null;

  let note = `Across BTC / ETH / SOL, ${leader.sym} currently leads liquidity at ${leader.composite}/100 (${leader.rating})`;
  if (mid) {
    note += `, with ${mid}`;
  }
  note += `, while ${laggard.sym} screens weakest at ${laggard.composite}/100 (${laggard.rating}).`;
  return note;
}

export default function DailyMarketCommentaryPanel({ symbol, batchFactors }: Props) {
  const { loading, error, data } = useDailyCommentary(symbol, "buy");
  
  const factorData = batchFactors?.[symbol] ?? undefined;
  const factorCommentary = buildFactorCommentary(factorData);
  const multiTokenNote = buildMultiTokenNote(batchFactors ?? undefined);

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

          {factorCommentary && (
            <div className="border-t border-slate-700/50 pt-3">
              <span className="uppercase tracking-wide text-[10px] text-gray-500 font-medium block mb-2">
                Liquidity 5-Factor Summary
              </span>
              <p className="text-[11px] leading-snug text-gray-200" data-testid="text-factor-commentary">
                {factorCommentary}
              </p>
            </div>
          )}

          {multiTokenNote && (
            <div className="border-t border-slate-700/50 pt-3">
              <span className="uppercase tracking-wide text-[10px] text-gray-500 font-medium block mb-2">
                Cross-Token Comparison (BTC / ETH / SOL)
              </span>
              <p className="text-[11px] leading-snug text-slate-300" data-testid="text-multi-token-note">
                {multiTokenNote}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
