import { useEffect, useRef, useState } from "react";
import Card from "./Card";
import { ArrowUpRight, ArrowDownRight, Minus, Droplets, Gauge } from "lucide-react";

type DepthBand = {
  bidUSD: number;
  askUSD: number;
};

type TokenDepth = {
  bands: Record<string, DepthBand>;
};

type Props = {
  depth: Record<string, TokenDepth> | undefined;
};

function VelocityGauge({ value, max }: { value: number; max: number }) {
  const normalized = Math.max(-1, Math.min(1, value / max));
  const angle = normalized * 90;
  const color = value > 0 ? '#22c55e' : value < 0 ? '#ef4444' : '#64748b';
  
  return (
    <div className="relative w-24 h-14">
      <svg viewBox="0 0 100 60" className="w-full h-full">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
        <path
          d="M 10 55 A 40 40 0 0 1 90 55"
          fill="none"
          stroke="#1e293b"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M 10 55 A 40 40 0 0 1 90 55"
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="125.6"
          strokeDashoffset="0"
          opacity="0.4"
        />
        <g transform={`rotate(${angle}, 50, 55)`}>
          <line 
            x1="50" 
            y1="55" 
            x2="50" 
            y2="22" 
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            className="transition-all duration-500"
          />
          <circle cx="50" cy="55" r="4" fill={color} className="transition-all duration-500" />
        </g>
        <text x="10" y="58" className="fill-red-400 text-[7px]">-</text>
        <text x="86" y="58" className="fill-emerald-400 text-[7px]">+</text>
      </svg>
    </div>
  );
}

function FlowStatistics({ history, delta }: { history: number[]; delta: number | null }) {
  const avgFlow = history.length > 0 ? history.reduce((a, b) => a + b, 0) / history.length : 0;
  const peakFlow = history.length > 0 ? Math.max(...history.map(Math.abs)) : 0;
  const positiveCount = history.filter(h => h > 0).length;
  const negativeCount = history.filter(h => h < 0).length;
  const flowDirection = positiveCount > negativeCount ? "Inflow Dominant" : negativeCount > positiveCount ? "Outflow Dominant" : "Neutral";
  const directionColor = positiveCount > negativeCount ? "text-emerald-400" : negativeCount > positiveCount ? "text-rose-400" : "text-neutral-400";
  
  // Stability score based on flow variance
  const variance = history.length > 1 
    ? history.reduce((sum, v) => sum + Math.pow(v - avgFlow, 2), 0) / history.length 
    : 0;
  const stability = Math.max(0, Math.min(100, 100 - Math.sqrt(variance) / 50000));
  
  return (
    <div className="pt-3 border-t border-neutral-800/60 space-y-2">
      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-neutral-900/50 rounded-lg p-2 text-center">
          <div className="text-[9px] text-neutral-500 uppercase">Avg Flow</div>
          <div className={`text-xs font-mono font-semibold ${avgFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {avgFlow >= 0 ? '+' : ''}{(avgFlow / 1_000_000).toFixed(2)}M
          </div>
        </div>
        <div className="bg-neutral-900/50 rounded-lg p-2 text-center">
          <div className="text-[9px] text-neutral-500 uppercase">Peak</div>
          <div className="text-xs font-mono font-semibold text-cyan-400">
            {(peakFlow / 1_000_000).toFixed(2)}M
          </div>
        </div>
        <div className="bg-neutral-900/50 rounded-lg p-2 text-center">
          <div className="text-[9px] text-neutral-500 uppercase">Stability</div>
          <div className={`text-xs font-mono font-semibold ${stability >= 70 ? 'text-emerald-400' : stability >= 40 ? 'text-yellow-400' : 'text-rose-400'}`}>
            {stability.toFixed(0)}%
          </div>
        </div>
      </div>
      
      {/* Flow Direction Indicator */}
      <div className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg bg-gradient-to-r from-neutral-900/80 to-neutral-800/40 border border-neutral-700/30">
        <div className="flex items-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${positiveCount >= negativeCount ? 'bg-emerald-400' : 'bg-rose-400'}`} />
          <span className="text-[10px] text-neutral-500">{positiveCount}↑</span>
        </div>
        <div className="flex items-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${negativeCount > positiveCount ? 'bg-rose-400' : 'bg-neutral-600'}`} />
          <span className="text-[10px] text-neutral-500">{negativeCount}↓</span>
        </div>
        <span className="mx-1 text-neutral-700">|</span>
        <span className={`text-[10px] font-medium ${directionColor}`}>{flowDirection}</span>
      </div>
    </div>
  );
}

function SparkLine({ history }: { history: number[] }) {
  if (history.length < 2) return null;
  
  const max = Math.max(...history.map(Math.abs), 1);
  const midY = 15;
  const points = history.map((v, i) => {
    const x = (i / (history.length - 1)) * 100;
    const y = midY - (v / max) * 12;
    return `${x},${y}`;
  }).join(' ');
  
  const latest = history[history.length - 1];
  const color = latest > 0 ? '#22c55e' : latest < 0 ? '#ef4444' : '#64748b';
  
  return (
    <svg viewBox="0 0 100 30" className="w-full h-8">
      <line x1="0" y1={midY} x2="100" y2={midY} stroke="#334155" strokeWidth="0.5" strokeDasharray="2,2" />
      <polyline 
        points={points} 
        fill="none" 
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle 
        cx="100" 
        cy={midY - (latest / max) * 12} 
        r="2.5" 
        fill={color}
        className="animate-pulse"
      />
    </svg>
  );
}

export default function LiquidityVelocityPanel({ depth }: Props) {
  const [delta, setDelta] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const prevDepthRef = useRef<number | null>(null);

  useEffect(() => {
    if (!depth || !depth["BTC"]) return;

    const ten = depth["BTC"].bands?.["10bps"];
    const total = (ten?.bidUSD ?? 0) + (ten?.askUSD ?? 0);

    if (prevDepthRef.current != null) {
      const prev = prevDepthRef.current;
      const newDelta = total - prev;
      setDelta(newDelta);
      setHistory(h => [...h.slice(-19), newDelta]);
    }

    prevDepthRef.current = total;
  }, [depth]);

  let label = "Stable";
  let color = "#64748b";
  let Icon = Minus;
  let bgGlow = "bg-neutral-700/30";

  if (delta != null) {
    if (delta < -5_000_000) {
      label = "Fast Outflows";
      color = "#ef4444";
      Icon = ArrowDownRight;
      bgGlow = "bg-red-500/20";
    } else if (delta < -1_000_000) {
      label = "Eroding Depth";
      color = "#f59e0b";
      Icon = ArrowDownRight;
      bgGlow = "bg-amber-500/20";
    } else if (delta > 5_000_000) {
      label = "Strong Inflows";
      color = "#22c55e";
      Icon = ArrowUpRight;
      bgGlow = "bg-emerald-500/20";
    } else if (delta > 1_000_000) {
      label = "Recovering";
      color = "#84cc16";
      Icon = ArrowUpRight;
      bgGlow = "bg-lime-500/20";
    }
  }

  return (
    <Card title="Liquidity Velocity (BTC 10bps)">
      <div className="flex items-center gap-4 mb-4">
        <VelocityGauge value={delta ?? 0} max={10_000_000} />
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Droplets className="w-4 h-4 text-cyan-400" />
            <span className="text-[10px] uppercase tracking-widest text-neutral-400">Flow Rate</span>
          </div>
          
          {delta == null ? (
            <div className="text-sm text-neutral-400 animate-pulse">Calibrating...</div>
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-mono font-bold" style={{ color }}>
                {delta >= 0 ? '+' : ''}{(delta / 1_000_000).toFixed(2)}M
              </span>
              <span className="text-xs text-neutral-500">/tick</span>
            </div>
          )}
        </div>
        
        <div className={`p-3 rounded-xl ${bgGlow} border border-neutral-700/50 transition-all duration-500`}>
          <Icon className="w-6 h-6 transition-all duration-500" style={{ color }} />
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <Gauge className="w-3 h-3 text-cyan-400" />
        <span className="text-[10px] uppercase tracking-widest text-neutral-400">Velocity History</span>
      </div>
      
      <div className="bg-neutral-800/40 rounded-lg p-2 mb-3">
        <SparkLine history={history} />
      </div>

      <div className="flex items-center justify-between mb-3">
        <div
          data-testid="badge-velocity"
          className="flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-500"
          style={{ borderColor: color, backgroundColor: `${color}15` }}
        >
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: color }} />
          <span className="text-xs font-medium" style={{ color }}>{label}</span>
        </div>
        
        <span className="text-[10px] text-neutral-500">
          {history.length} samples
        </span>
      </div>

      {/* Enhanced Bottom Stats */}
      <FlowStatistics history={history} delta={delta} />
    </Card>
  );
}
