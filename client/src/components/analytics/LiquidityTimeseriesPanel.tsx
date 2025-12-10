import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import { useLiquidityTimeseries } from "@/hooks/useLiquidityTimeseries";
import { format } from "date-fns";
import { Activity, TrendingUp, TrendingDown, Zap, Clock, Gauge, BarChart3 } from "lucide-react";

type Props = {
  token: string;
};

type WindowType = "1h" | "24h" | "7d" | "30d";

const WINDOWS: { label: string; value: WindowType }[] = [
  { label: "1h", value: "1h" },
  { label: "24h", value: "24h" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
];

function formatTimeLabel(ts: number, window: WindowType): string {
  const date = new Date(ts);
  switch (window) {
    case "1h":
      return format(date, "HH:mm");
    case "24h":
      return format(date, "HH:mm");
    case "7d":
      return format(date, "MMM d");
    case "30d":
      return format(date, "MMM d");
    default:
      return format(date, "MMM d HH:mm");
  }
}

function formatCompact(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function getStabilityColor(score: number): string {
  if (score >= 85) return "#4ade80";
  if (score >= 70) return "#00D9FF";
  if (score >= 50) return "#fbbf24";
  return "#ef4444";
}

function getStabilityLabel(score: number): string {
  if (score >= 85) return "STABLE";
  if (score >= 70) return "FIRM";
  if (score >= 50) return "VARIABLE";
  return "VOLATILE";
}

export const LiquidityTimeseriesPanel: React.FC<Props> = ({ token }) => {
  const [window, setWindow] = useState<WindowType>("24h");
  const { loading, error, points, stabilityScore, halfLifeMinutes, volatility, meanDepth, minDepth, maxDepth, metadata, currentSnapshot, usingFallback } =
    useLiquidityTimeseries(token, window);

  const { depthTrendPct, avgDepth, chartMin, chartMax, spreadRange } = useMemo(() => {
    if (points.length < 2) {
      return { depthTrendPct: 0, avgDepth: 0, chartMin: 0, chartMax: 0, spreadRange: { min: 0, max: 0, avg: 0 } };
    }
    
    const depths = points.map(p => p.depthUsd50bps);
    const spreads = points.map(p => p.spreadBps);
    const avg = depths.reduce((a, b) => a + b, 0) / depths.length;
    const min = Math.min(...depths);
    const max = Math.max(...depths);
    const trend = ((points[points.length - 1].depthUsd50bps / points[0].depthUsd50bps - 1) * 100);
    
    const chartPadding = (max - min) * 0.15;
    
    return {
      depthTrendPct: trend,
      avgDepth: avg,
      chartMin: Math.max(0, min - chartPadding),
      chartMax: max + chartPadding,
      spreadRange: {
        min: Math.min(...spreads),
        max: Math.max(...spreads),
        avg: spreads.reduce((a, b) => a + b, 0) / spreads.length,
      },
    };
  }, [points]);
  
  const liveIndicator = currentSnapshot && Date.now() - currentSnapshot.ts < 60_000;

  return (
    <div className="flex flex-col gap-3 bg-[#050714] border border-[#1a2337] rounded-xl p-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="text-[11px] uppercase tracking-[0.16em] text-neutral-400">
            Time-Series Liquidity – {token}
          </div>
          {liveIndicator && (
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] uppercase text-emerald-400 tracking-wider">LIVE</span>
            </div>
          )}
          {metadata?.hasRealData && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-900/40 border border-cyan-700/50 text-cyan-400">
              {metadata.realDataPoints} pts · {metadata.coverage}
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {WINDOWS.map((w) => (
            <button
              key={w.value}
              data-testid={`button-window-${w.value}`}
              className={`px-2 py-[2px] text-[10px] rounded border transition-all ${
                window === w.value
                  ? "border-cyan-400 text-cyan-300 bg-[#06101f] shadow-[0_0_8px_rgba(0,217,255,0.2)]"
                  : "border-[#1a2335] text-neutral-400 bg-[#050814] hover:border-[#2a3345]"
              }`}
              onClick={() => setWindow(w.value)}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>
      
      {currentSnapshot && (
        <div className="grid grid-cols-4 gap-2 py-2 border-y border-[#1a2337]/50">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase text-neutral-500">Current Depth</span>
            <span className="text-sm font-mono text-cyan-300">{formatCompact(currentSnapshot.depth50bps)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] uppercase text-neutral-500">Spread</span>
            <span className="text-sm font-mono text-white">{currentSnapshot.spreadBps.toFixed(2)} bps</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] uppercase text-neutral-500">Mid Price</span>
            <span className="text-sm font-mono text-white">${currentSnapshot.mid.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] uppercase text-neutral-500">Source</span>
            <span className="text-sm font-mono text-emerald-400 capitalize">{currentSnapshot.source}</span>
          </div>
        </div>
      )}

      <div style={{ height: 180 }} className="relative">
        {loading && points.length === 0 ? (
          <div className="text-[11px] text-neutral-500 flex items-center justify-center h-full gap-2">
            <Activity className="w-4 h-4 animate-pulse text-cyan-500" />
            Loading liquidity timeseries…
          </div>
        ) : error ? (
          <div className="text-[11px] text-red-400 flex items-center h-full">
            {error}
          </div>
        ) : points.length === 0 ? (
          <div className="text-[11px] text-neutral-500 flex items-center h-full">
            No timeseries data available.
          </div>
        ) : (
          <>
            <ResponsiveContainer>
              <AreaChart data={points} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="depthGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00D9FF" stopOpacity={0.4} />
                    <stop offset="50%" stopColor="#00D9FF" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#00D9FF" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#00D9FF" stopOpacity={0.6} />
                    <stop offset="50%" stopColor="#00D9FF" stopOpacity={1} />
                    <stop offset="100%" stopColor="#2cc7ff" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="#1a2237"
                  strokeDasharray="2 3"
                  vertical={false}
                />
                {meanDepth && (
                  <ReferenceLine
                    y={meanDepth}
                    stroke="#F5C211"
                    strokeDasharray="4 4"
                    strokeOpacity={0.5}
                  />
                )}
                {minDepth && maxDepth && (
                  <ReferenceArea
                    y1={minDepth}
                    y2={maxDepth}
                    fill="#00D9FF"
                    fillOpacity={0.03}
                  />
                )}
                <XAxis
                  dataKey="ts"
                  tick={{ fill: "#6d7da2", fontSize: 9 }}
                  tickFormatter={(ts) => formatTimeLabel(ts, window)}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={40}
                />
                <YAxis
                  tick={{ fill: "#6d7da2", fontSize: 10 }}
                  tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`}
                  axisLine={false}
                  tickLine={false}
                  domain={[chartMin, chartMax]}
                />
                <Tooltip
                  labelFormatter={(ts) => format(new Date(ts), "MMM d, HH:mm")}
                  formatter={(value: any) => [
                    `$${(value / 1_000_000).toFixed(2)}M`,
                    "Depth (50bps)",
                  ]}
                  contentStyle={{
                    background: "rgba(5, 7, 20, 0.95)",
                    border: "1px solid #1a2237",
                    borderRadius: 8,
                    padding: "8px 10px",
                    fontSize: 11,
                    color: "#c3d0ea",
                    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
                  }}
                  labelStyle={{ color: "#8a8a8a", fontSize: 10, marginBottom: 4 }}
                />
                <Area
                  type="monotone"
                  dataKey="depthUsd50bps"
                  stroke="url(#lineGradient)"
                  strokeWidth={2}
                  fill="url(#depthGradient)"
                  dot={false}
                  animationDuration={500}
                />
              </AreaChart>
            </ResponsiveContainer>
            
            {avgDepth > 0 && (
              <div className="absolute top-2 right-2 text-[9px] px-2 py-1 rounded bg-[#0a0f1a]/80 border border-[#1a2337] flex items-center gap-1.5">
                <span className="text-neutral-500">AVG:</span>
                <span className="text-yellow-400 font-mono">{formatCompact(avgDepth)}</span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2">
        <div className="flex items-center gap-2 bg-[#0a0f1a] rounded-lg px-3 py-2 border border-[#1a2337]/50">
          {depthTrendPct >= 0 ? (
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-400" />
          )}
          <div className="flex flex-col">
            <span className="text-[9px] uppercase text-neutral-500">Trend ({window})</span>
            <span className={`text-xs font-mono ${depthTrendPct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {depthTrendPct >= 0 ? "+" : ""}{depthTrendPct.toFixed(2)}%
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-[#0a0f1a] rounded-lg px-3 py-2 border border-[#1a2337]/50">
          <Gauge className="w-4 h-4" style={{ color: getStabilityColor(stabilityScore || 0) }} />
          <div className="flex flex-col">
            <span className="text-[9px] uppercase text-neutral-500">Stability</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono" style={{ color: getStabilityColor(stabilityScore || 0) }}>
                {stabilityScore != null ? stabilityScore.toFixed(1) : "—"}
              </span>
              <span className="text-[8px] px-1 py-0.5 rounded" style={{ 
                backgroundColor: `${getStabilityColor(stabilityScore || 0)}20`,
                color: getStabilityColor(stabilityScore || 0)
              }}>
                {getStabilityLabel(stabilityScore || 0)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-[#0a0f1a] rounded-lg px-3 py-2 border border-[#1a2337]/50">
          <Clock className="w-4 h-4 text-cyan-400" />
          <div className="flex flex-col">
            <span className="text-[9px] uppercase text-neutral-500">Half-Life</span>
            <span className="text-xs font-mono text-cyan-300">
              {halfLifeMinutes != null ? `${halfLifeMinutes.toFixed(0)} min` : "—"}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-[#0a0f1a] rounded-lg px-3 py-2 border border-[#1a2337]/50">
          <BarChart3 className="w-4 h-4 text-yellow-400" />
          <div className="flex flex-col">
            <span className="text-[9px] uppercase text-neutral-500">Volatility</span>
            <span className="text-xs font-mono text-white">
              {volatility != null ? `${volatility.toFixed(1)}%` : "—"}
            </span>
          </div>
        </div>
      </div>

      {minDepth && maxDepth && (
        <div className="flex items-center gap-4 text-[10px] py-2 border-t border-[#1a2337]/50">
          <div className="flex items-center gap-2">
            <Zap className="w-3 h-3 text-cyan-500" />
            <span className="text-neutral-500">Range:</span>
            <span className="font-mono text-white">
              {formatCompact(minDepth)} – {formatCompact(maxDepth)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-neutral-500">Spread:</span>
            <span className="font-mono text-white">
              {spreadRange.min.toFixed(1)} – {spreadRange.max.toFixed(1)} bps
            </span>
            <span className="text-neutral-600">(avg {spreadRange.avg.toFixed(1)})</span>
          </div>
        </div>
      )}
      
      {usingFallback && (
        <div className="text-[9px] text-amber-500/70 flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-amber-500" />
          Synthetic data – real-time collection in progress
        </div>
      )}
    </div>
  );
};
