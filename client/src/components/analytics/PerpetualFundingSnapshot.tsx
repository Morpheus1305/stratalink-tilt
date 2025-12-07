import { useFundingSnapshot } from "@/hooks/useFundingSnapshot";

interface Props {
  symbol: string;
  label?: string;
}

const formatPct = (v: number | undefined) =>
  v === undefined ? "—" : `${v.toFixed(4)}%`;

const formatApr = (v: number | undefined) =>
  v === undefined ? "—" : `${v.toFixed(2)}% APR`;

export function PerpetualFundingSnapshot({ symbol, label }: Props) {
  const { data, isLoading, isError } = useFundingSnapshot(symbol);

  const titleSymbol = label ?? symbol.toUpperCase();

  let body: React.ReactNode;
  if (isLoading) {
    body = <p className="text-xs text-slate-400">Loading funding data…</p>;
  } else if (isError || !data) {
    body = (
      <p className="text-xs text-amber-400">
        Funding data unavailable for {titleSymbol}. Showing placeholder.
      </p>
    );
  } else {
    body = (
      <div className="flex flex-col gap-1 text-xs">
        <div className="flex items-baseline justify-between">
          <span className="text-slate-300">Current funding</span>
          <span className="font-mono text-slate-50">{formatPct(data.rate)}</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-slate-300">Annualised</span>
          <span className="font-mono text-slate-50">{formatApr(data.apr)}</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-slate-300">Regime</span>
          <span className="font-mono text-emerald-300">{data.regime}</span>
        </div>
        {typeof data.change24h === "number" && (
          <div className="flex items-baseline justify-between">
            <span className="text-slate-300">Δ 24h</span>
            <span
              className={
                "font-mono " + (data.change24h >= 0 ? "text-emerald-300" : "text-red-400")
              }
            >
              {data.change24h >= 0 ? "+" : ""}
              {data.change24h.toFixed(2)} bp
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3"
      data-testid={`panel-funding-snapshot-${symbol}`}
    >
      <div className="mb-1 flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Perpetual Funding — {titleSymbol}
        </div>
      </div>
      {body}
    </div>
  );
}

export default PerpetualFundingSnapshot;
