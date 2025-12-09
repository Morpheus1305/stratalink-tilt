import { useEffect, useState } from "react";

type TsleBand =
  | "Ultra-Tight"
  | "Tight"
  | "Moderate"
  | "Thin"
  | "Broken";

interface TsleSnapshot {
  symbol: string;
  asOf: string;
  bands: { bps: number; capacityUsd: number }[];
  total10bps: number;
  total25bps: number;
  total50bps: number;
  total100bps: number;
  total200bps: number;
  qualityBand: TsleBand;
  fundingRegime: string;
  headlineFundingRate: number;
  venues: { venue: string; ok: boolean; rate: number | null; apr: number | null }[];
  notes: string[];
}

function fmtUsd(n: number): string {
  if (!isFinite(n) || n <= 0) return "—";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

const TslePanel: React.FC<{ symbol: string }> = ({ symbol }) => {
  const [data, setData] = useState<TsleSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch(`/api/tsle/snapshot?symbol=${symbol}`);
      if (!res.ok) throw new Error("TSLE fetch failed");
      const json = (await res.json()) as TsleSnapshot;
      setData(json);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, [symbol]);

  return (
    <div 
      className="bg-slate-950/60 border border-slate-800/70 rounded-2xl p-4 flex flex-col gap-3"
      data-testid={`panel-tsle-${symbol}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400">
            Trade Size Liquidity Engine
          </div>
          <div className="text-sm text-slate-200">{symbol} Liquidity Bands</div>
        </div>

        {data && (
          <span
            className={`px-2 py-1 rounded-full text-[11px] border ${
              data.qualityBand === "Ultra-Tight"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : data.qualityBand === "Tight"
                ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                : data.qualityBand === "Moderate"
                ? "border-amber-400/40 bg-amber-400/10 text-amber-200"
                : data.qualityBand === "Thin"
                ? "border-orange-400/40 bg-orange-400/10 text-orange-300"
                : "border-red-400/40 bg-red-400/10 text-red-300"
            }`}
          >
            {data.qualityBand}
          </span>
        )}
      </div>

      {error && (
        <div className="text-red-400 text-xs">Error loading TSLE: {error}</div>
      )}

      {data && (
        <>
          <table className="text-[11px] w-full border border-slate-800/70 rounded-xl overflow-hidden">
            <thead className="bg-slate-900/60 text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left font-normal">Impact</th>
                <th className="px-3 py-2 text-right font-normal">Max Size</th>
              </tr>
            </thead>
            <tbody>
              {data.bands.map((b) => (
                <tr key={b.bps} className="border-t border-slate-800/70">
                  <td className="px-3 py-1.5">{b.bps} bps</td>
                  <td className="px-3 py-1.5 text-right">
                    {fmtUsd(b.capacityUsd)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="text-[11px] text-slate-400 space-y-1 mt-2">
            {data.notes.map((n, i) => (
              <p key={i}>{n}</p>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default TslePanel;
