import { useState, useEffect } from "react";
import Card from "./Card";
import { Share2, Zap } from "lucide-react";

type DepthEntry = {
  source: string;
};

type Props = {
  depth: Record<string, DepthEntry> | undefined;
};

const EXCHANGE_COLORS: Record<string, string> = {
  coinbase: "#0052FF",
  kraken: "#5741D9",
  okx: "#FFFFFF",
  binance: "#F0B90B",
  bybit: "#F7A600",
  unknown: "#64748b",
};

function ExchangeBar({ name, count, total, color, index }: { name: string; count: number; total: number; color: string; index: number }) {
  const pct = (count / total) * 100;
  const [width, setWidth] = useState(0);
  
  useEffect(() => {
    const timer = setTimeout(() => setWidth(pct), 100 + index * 100);
    return () => clearTimeout(timer);
  }, [pct, index]);
  
  return (
    <div className="relative mb-2" data-testid={`item-exchange-${name}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-xs font-medium capitalize text-neutral-200">{name}</span>
        </div>
        <span className="text-xs font-mono text-neutral-400">
          {count} <span className="text-neutral-500">({pct.toFixed(0)}%)</span>
        </span>
      </div>
      <div className="h-2 bg-neutral-800/60 rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ 
            width: `${width}%`,
            background: `linear-gradient(90deg, ${color}CC, ${color}88)`
          }}
        />
      </div>
    </div>
  );
}

function DonutChart({ data }: { data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  let cumulative = 0;
  
  return (
    <svg viewBox="0 0 36 36" className="w-20 h-20">
      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e293b" strokeWidth="3" />
      {data.map((d, i) => {
        const pct = (d.value / total) * 100;
        const dashArray = `${pct} ${100 - pct}`;
        const dashOffset = 25 - cumulative;
        cumulative += pct;
        return (
          <circle
            key={i}
            cx="18"
            cy="18"
            r="15.9"
            fill="none"
            stroke={d.color}
            strokeWidth="3"
            strokeDasharray={dashArray}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className="transition-all duration-700"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        );
      })}
      <text x="18" y="18" textAnchor="middle" dy="0.35em" className="fill-white text-[6px] font-bold">
        {total}
      </text>
      <text x="18" y="22" textAnchor="middle" dy="0.35em" className="fill-neutral-400 text-[3px]">
        TOKENS
      </text>
    </svg>
  );
}

export default function ExchangeFragmentationPanel({ depth }: Props) {
  if (!depth || !Object.keys(depth).length) {
    return <Card title="Exchange Fragmentation">No data.</Card>;
  }

  const counts: Record<string, number> = {};
  for (const row of Object.values(depth)) {
    const src = (row.source || "unknown").toLowerCase();
    counts[src] = (counts[src] || 0) + 1;
  }

  const total = Object.keys(depth).length || 1;
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const chartData = entries.map(([name, value]) => ({
    name,
    value,
    color: EXCHANGE_COLORS[name] || EXCHANGE_COLORS.unknown
  }));

  const dominant = entries[0];
  const dominantPct = ((dominant[1] / total) * 100).toFixed(0);

  return (
    <Card title="Exchange Fragmentation">
      <div className="flex items-start gap-4 mb-4">
        <DonutChart data={chartData} />
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Share2 className="w-4 h-4 text-cyan-400" />
            <span className="text-[10px] uppercase tracking-widest text-neutral-400">Market Share</span>
          </div>
          
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold capitalize" style={{ color: EXCHANGE_COLORS[dominant[0]] || '#fff' }}>
              {dominant[0]}
            </span>
            <span className="text-sm text-neutral-400 font-mono">{dominantPct}%</span>
          </div>
          
          <div className="flex items-center gap-1 mt-1">
            <Zap className="w-3 h-3 text-yellow-400" />
            <span className="text-[10px] text-neutral-400">Dominant pricing source</span>
          </div>
        </div>
      </div>

      <div className="border-t border-neutral-800/60 pt-3">
        {entries.map(([name, count], index) => (
          <ExchangeBar
            key={name}
            name={name}
            count={count}
            total={total}
            color={EXCHANGE_COLORS[name] || EXCHANGE_COLORS.unknown}
            index={index}
          />
        ))}
      </div>
    </Card>
  );
}
