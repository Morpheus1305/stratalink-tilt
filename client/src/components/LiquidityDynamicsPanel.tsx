import { useState, useEffect, useMemo } from "react";

type DataPoint = { v: number };

function generateWave(tick: number, count: number, amplitude: number): DataPoint[] {
  return Array.from({ length: count }, (_, i) => {
    const wave1 = Math.sin((tick * 0.08) + i * 0.25) * amplitude * 0.6;
    const wave2 = Math.cos((tick * 0.05) + i * 0.15) * amplitude * 0.4;
    const noise = (Math.random() - 0.5) * amplitude * 0.3;
    return { v: wave1 + wave2 + noise };
  });
}

function generatePulses(tick: number, count: number): DataPoint[] {
  return Array.from({ length: count }, (_, i) => {
    const base = Math.sin((tick * 0.07) + i * 0.22) * 80;
    const noise = (Math.random() - 0.5) * 40;
    return { v: base + noise };
  });
}

function AnimatedAreaChart({ data, color, height }: { data: DataPoint[]; color: string; height: number }) {
  const maxAbs = Math.max(...data.map(d => Math.abs(d.v)), 1);
  const midY = height / 2;
  
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = midY - (d.v / maxAbs) * (height / 2 - 4);
    return `${x},${y}`;
  }).join(' ');
  
  const areaPath = `M0,${midY} L${data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = midY - (d.v / maxAbs) * (height / 2 - 4);
    return `${x},${y}`;
  }).join(' L')} L100,${midY} Z`;
  
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full h-full">
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.5" />
          <stop offset="100%" stopColor={color} stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <line x1="0" y1={midY} x2="100" y2={midY} stroke="#333" strokeWidth="0.3" strokeDasharray="1,1" />
      <path d={areaPath} fill={`url(#grad-${color})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="0.8" />
    </svg>
  );
}

function AnimatedBarChart({ data, height }: { data: DataPoint[]; height: number }) {
  const maxAbs = Math.max(...data.map(d => Math.abs(d.v)), 1);
  const barWidth = 100 / data.length;
  
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full h-full">
      <line x1="0" y1={height/2} x2="100" y2={height/2} stroke="#333" strokeWidth="0.3" />
      {data.map((d, i) => {
        const barHeight = (Math.abs(d.v) / maxAbs) * (height / 2 - 2);
        const y = d.v >= 0 ? height / 2 - barHeight : height / 2;
        const color = d.v >= 0 ? "#22c55e" : "#ef4444";
        return (
          <rect
            key={i}
            x={i * barWidth + 0.1}
            y={y}
            width={barWidth - 0.2}
            height={barHeight}
            fill={color}
            opacity="0.85"
            rx="0.3"
          />
        );
      })}
    </svg>
  );
}

export default function LiquidityDynamicsPanel() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 100);
    return () => clearInterval(interval);
  }, []);

  const velocity = useMemo(() => generateWave(tick, 50, 5), [tick]);
  const delta = useMemo(() => generateWave(tick * 0.8, 50, 400), [tick]);
  const pulses = useMemo(() => generatePulses(tick, 50), [tick]);

  const latestVel = velocity[velocity.length - 1]?.v ?? 0;
  const avgVel = velocity.reduce((sum, p) => sum + p.v, 0) / velocity.length;

  return (
    <div className="flex flex-col space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-widest text-neutral-400">
          Liquidity Dynamics
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-neutral-500">LIVE</span>
        </div>
      </div>

      <div className="flex items-baseline gap-3">
        <div 
          className="text-lg font-mono font-semibold transition-colors"
          style={{ color: latestVel >= 0 ? "#22c55e" : "#ef4444" }}
        >
          {latestVel >= 0 ? "+" : ""}{latestVel.toFixed(2)}M/min
        </div>
        <div className="text-[10px] text-neutral-500">
          avg: {avgVel >= 0 ? "+" : ""}{avgVel.toFixed(2)}
        </div>
      </div>

      <div style={{ height: 85 }}>
        <AnimatedAreaChart data={velocity} color="#00D9FF" height={85} />
      </div>

      <div className="text-[10px] uppercase tracking-widest text-neutral-400 pt-1">
        Depth Delta (per tick)
      </div>
      <div style={{ height: 75 }}>
        <AnimatedAreaChart data={delta} color="#F5C211" height={75} />
      </div>

      <div className="text-[10px] uppercase tracking-widest text-neutral-400 pt-1">
        Microstructure Pulses
      </div>
      <div style={{ height: 65 }}>
        <AnimatedBarChart data={pulses} height={65} />
      </div>
    </div>
  );
}
