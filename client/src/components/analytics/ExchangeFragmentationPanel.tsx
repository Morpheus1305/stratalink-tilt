import { useState, useEffect } from "react";
import Card from "./Card";
import { Share2, Zap, Activity, TrendingUp, Shield, AlertTriangle } from "lucide-react";

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

function FragmentationAnalytics({ entries, total }: { entries: [string, number][]; total: number }) {
  // Calculate HHI (Herfindahl-Hirschman Index) - measure of market concentration
  // HHI = sum of squared market shares (as percentages)
  // Lower = more fragmented (better), Higher = more concentrated
  const hhi = entries.reduce((sum, [, count]) => {
    const share = (count / total) * 100;
    return sum + share * share;
  }, 0);
  
  // Normalize HHI: 10000 = monopoly, lower = fragmented
  const normalizedHhi = Math.min(hhi, 10000);
  const fragScore = Math.round(100 - (normalizedHhi / 100)); // Invert: higher = more fragmented
  
  // Determine health status
  const getHealthStatus = () => {
    if (entries.length >= 4 && fragScore >= 60) return { label: "Healthy", color: "text-emerald-400", bg: "bg-emerald-400/10", icon: Shield };
    if (entries.length >= 2 && fragScore >= 30) return { label: "Moderate", color: "text-yellow-400", bg: "bg-yellow-400/10", icon: Activity };
    return { label: "Concentrated", color: "text-rose-400", bg: "bg-rose-400/10", icon: AlertTriangle };
  };
  
  const health = getHealthStatus();
  const HealthIcon = health.icon;
  
  // Calculate venue diversity score
  const venueDiversity = Math.min(entries.length * 20, 100);
  
  // Execution risk based on concentration
  const execRisk = entries.length === 1 ? "High" : entries.length === 2 ? "Moderate" : "Low";
  const execRiskColor = execRisk === "High" ? "text-rose-400" : execRisk === "Moderate" ? "text-yellow-400" : "text-emerald-400";

  return (
    <div className="border-t border-neutral-800/60 pt-3 mt-3 space-y-3">
      {/* HHI Concentration Gauge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded ${health.bg}`}>
            <HealthIcon className={`w-3 h-3 ${health.color}`} />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wide text-neutral-500">Fragmentation Health</span>
            <div className={`text-xs font-semibold ${health.color}`}>{health.label}</div>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase tracking-wide text-neutral-500">HHI Score</span>
          <div className="text-xs font-mono text-neutral-200">{Math.round(normalizedHhi).toLocaleString()}</div>
        </div>
      </div>

      {/* Fragmentation Score Bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-neutral-500">Fragmentation Index</span>
          <span className="text-[10px] font-mono text-cyan-400">{fragScore}/100</span>
        </div>
        <div className="h-1.5 bg-neutral-800/60 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{ 
              width: `${fragScore}%`,
              background: fragScore >= 60 
                ? 'linear-gradient(90deg, #10b981, #34d399)' 
                : fragScore >= 30 
                  ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                  : 'linear-gradient(90deg, #ef4444, #f87171)'
            }}
          />
        </div>
      </div>

      {/* Mini Metrics Grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-neutral-900/50 rounded-lg p-2 text-center">
          <div className="text-[10px] text-neutral-500 mb-0.5">Venues</div>
          <div className="text-sm font-mono font-semibold text-white">{entries.length}</div>
        </div>
        <div className="bg-neutral-900/50 rounded-lg p-2 text-center">
          <div className="text-[10px] text-neutral-500 mb-0.5">Diversity</div>
          <div className="text-sm font-mono font-semibold text-cyan-400">{venueDiversity}%</div>
        </div>
        <div className="bg-neutral-900/50 rounded-lg p-2 text-center">
          <div className="text-[10px] text-neutral-500 mb-0.5">Exec Risk</div>
          <div className={`text-sm font-semibold ${execRiskColor}`}>{execRisk}</div>
        </div>
      </div>

      {/* Liquidity Quality Indicator */}
      <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-gradient-to-r from-neutral-900/80 to-neutral-800/40 border border-neutral-700/30">
        <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
        <span className="text-[11px] text-neutral-300">
          {entries.length === 1 
            ? "Single venue coverage — consider monitoring for counterparty risk"
            : entries.length >= 4
              ? "Well-distributed liquidity across venues — optimal execution conditions"
              : `Moderate fragmentation across ${entries.length} venues — acceptable execution path`
          }
        </span>
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

      {/* Enhanced Bottom Section - Fragmentation Analytics */}
      <FragmentationAnalytics entries={entries} total={total} />
    </Card>
  );
}
