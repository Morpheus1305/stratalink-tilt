import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { stressBadgeColor, stressTextColor, getTsleScoreBadgeColor } from "@/utils/tsleDepth";

type DepthBands = {
  "10": number;
  "25": number;
  "50": number;
  "100": number;
  "200": number;
};

type TsleSnapshot = {
  symbol: string;
  depthBands: DepthBands;
  depthScore: number;
  fundingScore: number;
  tsleScore: number;
  regime: string;
  stressBucket: string;
  notes: string;
};

const BANDS: { key: keyof DepthBands; label: string }[] = [
  { key: "10", label: "10bps" },
  { key: "25", label: "25bps" },
  { key: "50", label: "50bps" },
  { key: "100", label: "100bps" },
  { key: "200", label: "200bps" },
];

function regimeColor(regime: string): string {
  const r = regime.toLowerCase();
  if (r.includes("ultra")) return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
  if (r.includes("tight")) return "bg-lime-500/20 text-lime-300 border-lime-500/40";
  if (r.includes("constructive")) return "bg-sky-500/15 text-sky-300 border-sky-500/40";
  if (r.includes("patchy")) return "bg-amber-500/15 text-amber-300 border-amber-500/40";
  if (r.includes("thin")) return "bg-orange-500/15 text-orange-300 border-orange-500/40";
  return "bg-red-500/15 text-red-300 border-red-500/40";
}

function regimeBarColor(regime: string): string {
  const r = regime.toLowerCase();
  if (r.includes("ultra")) return "bg-emerald-500";
  if (r.includes("tight")) return "bg-lime-500";
  if (r.includes("constructive")) return "bg-sky-500";
  if (r.includes("patchy")) return "bg-amber-500";
  if (r.includes("thin")) return "bg-orange-500";
  return "bg-red-500";
}

const TslePanel: React.FC<{ symbol: string }> = ({ symbol }) => {
  const [data, setData] = useState<TsleSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await fetch(`/api/tsle/snapshot?symbol=${symbol}`);
      if (!res.ok) throw new Error("TSLE fetch failed");
      const json = (await res.json()) as TsleSnapshot;
      setData(json);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, [symbol]);

  if (loading && !data) {
    return (
      <div 
        className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-400"
        data-testid={`panel-tsle-${symbol}`}
      >
        <div className="font-medium text-slate-200 mb-1">Trade Size Liquidity Engine</div>
        <div>Loading TSLE snapshot...</div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div 
        className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-xs text-red-400"
        data-testid={`panel-tsle-${symbol}`}
      >
        <div className="font-medium text-slate-200 mb-1">Trade Size Liquidity Engine</div>
        <div>Error: {error}</div>
      </div>
    );
  }

  if (!data) return null;

  const { depthBands, tsleScore, regime, stressBucket, notes, depthScore, fundingScore } = data;
  const maxBand = Math.max(...BANDS.map(b => depthBands[b.key] || 0), 1);

  return (
    <div 
      className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 flex flex-col gap-3"
      data-testid={`panel-tsle-${symbol}`}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[11px] font-medium tracking-[0.16em] uppercase text-slate-400">
            Trade Size Liquidity Engine
          </div>
          <div className="text-sm text-slate-200 mt-[2px]">
            {symbol} liquidity bands by impact (10-200bps)
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div 
            className={cn("px-2 py-1 rounded-full border text-[10px] font-medium", regimeColor(regime))}
            data-testid={`badge-tsle-regime-${symbol}`}
          >
            TSLE · {regime} · {tsleScore}/100
          </div>
          <div 
            className={cn("px-2 py-1 rounded-full border text-[10px] font-medium", stressBadgeColor(stressBucket))}
            data-testid={`badge-tsle-stress-${symbol}`}
          >
            Stress · {stressBucket}
          </div>
        </div>
      </div>

      <div className="mt-1">
        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
          <span>Liquidity Quality Score</span>
          <span>
            Depth {depthScore}/90 · Funding {fundingScore}/22
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", regimeBarColor(regime))}
            style={{ width: `${Math.min(100, tsleScore)}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] mt-1">
        <span className="text-slate-300">
          Intraday Liquidity Stress:&nbsp;
          <span className={cn("font-semibold", stressTextColor(stressBucket))}>
            {stressBucket}
          </span>
        </span>
        <span className="text-slate-500 text-[10px]">
          Updated every 60s
        </span>
      </div>

      <div className="mt-2 grid grid-cols-5 gap-2 text-[10px]">
        {BANDS.map(({ key, label }) => {
          const v = depthBands[key] || 0;
          const pct = Math.max(4, Math.min(100, (v / maxBand) * 100));
          return (
            <div
              key={key}
              className="rounded-xl border border-slate-800 bg-slate-950/70 px-2 py-2 flex flex-col gap-1"
              data-testid={`tsle-band-${key}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400">{label}</span>
                <span className="text-[10px] text-slate-300 font-mono">
                  {v >= 1_000_000_000 
                    ? `${(v / 1_000_000_000).toFixed(1)}B` 
                    : v >= 1_000_000 
                    ? `${(v / 1_000_000).toFixed(1)}M` 
                    : `${(v / 1_000).toFixed(0)}k`}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-900 overflow-hidden">
                <div
                  className="h-full rounded-full bg-sky-400/80"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div 
        className="mt-1 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-[10px] text-slate-300 leading-snug"
        data-testid={`tsle-notes-${symbol}`}
      >
        {notes}
      </div>
    </div>
  );
};

export default TslePanel;
