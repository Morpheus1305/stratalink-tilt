import useLiquidityFactorsBatch from "@/hooks/useLiquidityFactorsBatch";
import MiniFactorPill from "./MiniFactorPill";

interface TokenData {
  symbol: string;
  price?: number;
  priceFormatted?: string;
  depth10bps?: number;
  depth10bpsFormatted?: string;
  depth25bps?: number;
  skew?: number;
  skewLabel?: string;
}

interface TokenLiquiditySnapshotProps {
  tokens: TokenData[];
}

function formatUsd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function getSkewLabel(skew: number | undefined): string {
  if (skew === undefined) return "Neutral";
  if (skew > 0.15) return "Bid-Heavy";
  if (skew < -0.15) return "Ask-Heavy";
  return "Balanced";
}

export default function TokenLiquiditySnapshot({ tokens }: TokenLiquiditySnapshotProps) {
  const symbols = tokens.map((t) => t.symbol.toUpperCase()).filter(Boolean);
  const { data: factorMap, loading } = useLiquidityFactorsBatch(symbols);

  return (
    <section className="space-y-3" data-testid="section-token-snapshot">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold tracking-wide text-slate-300 uppercase">
          Token Liquidity Snapshot
        </h2>
        {loading && (
          <span className="text-[10px] text-slate-500">Loading factors...</span>
        )}
      </div>

      <div className="grid gap-3 xl:grid-cols-4 lg:grid-cols-3 md:grid-cols-2 grid-cols-1">
        {tokens.map((token) => {
          const sym = token.symbol.toUpperCase();
          const f = factorMap?.[sym];

          return (
            <div
              key={sym}
              className="rounded-xl border border-slate-700 bg-slate-900/80 p-3 flex flex-col justify-between min-h-[120px]"
              data-testid={`card-token-${sym}`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="text-[11px] font-medium text-slate-200">
                  {sym}
                </div>
                {f && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded ${
                      f.composite >= 70
                        ? "bg-emerald-900/50 text-emerald-300"
                        : f.composite >= 50
                        ? "bg-amber-900/50 text-amber-300"
                        : "bg-rose-900/50 text-rose-300"
                    }`}
                  >
                    {f.rating}
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-100 mb-1 font-mono">
                {token.priceFormatted || (token.price ? `$${token.price.toLocaleString()}` : "—")}
              </div>

              <div className="text-[10px] text-slate-400 mb-2">
                10bps Depth:{" "}
                {token.depth10bpsFormatted ||
                  (token.depth10bps ? formatUsd(token.depth10bps) : "—")}
              </div>

              <div className="mt-auto pt-1 flex items-center justify-between gap-2">
                <div className="text-[10px] text-slate-500">
                  Skew: {token.skewLabel || getSkewLabel(token.skew)}
                </div>
                <MiniFactorPill factor={f} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
