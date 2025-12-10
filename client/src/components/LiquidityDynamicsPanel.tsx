import { useMemo, useState, useEffect, useRef } from "react";
import { useMicroFeed } from "@/contexts/MicrostructureFeed";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  ReferenceLine,
  Tooltip,
  BarChart,
  Bar,
  Cell
} from "recharts";

type DepthPoint = { t: number; v: number };
type VelocityPoint = { i: number; v: number };
type DeltaPoint = { i: number; dv: number };
type ReplayPoint = { i: number; pulse: number };

const MAX_POINTS = 40;

function generateSyntheticVelocity(seed: number): VelocityPoint[] {
  const points: VelocityPoint[] = [];
  let value = 0;
  for (let i = 0; i < MAX_POINTS; i++) {
    const noise = (Math.sin(seed + i * 0.3) * 0.5 + Math.random() - 0.5) * 2;
    const trend = Math.sin((seed + i) * 0.1) * 1.5;
    const spike = Math.random() > 0.92 ? (Math.random() - 0.5) * 4 : 0;
    value = value * 0.7 + noise + trend * 0.3 + spike;
    points.push({ i, v: value });
  }
  return points;
}

function generateSyntheticDelta(seed: number): DeltaPoint[] {
  const points: DeltaPoint[] = [];
  for (let i = 0; i < MAX_POINTS; i++) {
    const base = Math.sin((seed + i) * 0.15) * 500000;
    const noise = (Math.random() - 0.5) * 300000;
    const spike = Math.random() > 0.9 ? (Math.random() - 0.5) * 800000 : 0;
    points.push({ i, dv: base + noise + spike });
  }
  return points;
}

function generateSyntheticPulses(seed: number): ReplayPoint[] {
  const points: ReplayPoint[] = [];
  for (let i = 0; i < MAX_POINTS; i++) {
    const magnitude = Math.abs(Math.sin((seed + i) * 0.2)) * 100000;
    const direction = Math.sin((seed + i) * 0.3) > 0 ? 1 : -1;
    const noise = (Math.random() - 0.5) * 50000;
    const spike = Math.random() > 0.85 ? direction * magnitude * 2 : 0;
    points.push({ i, pulse: magnitude * direction + noise + spike });
  }
  return points;
}

function buildVelocity(depth: DepthPoint[]): VelocityPoint[] {
  if (!depth || depth.length < 2) return [];
  const out: VelocityPoint[] = [];
  for (let i = 1; i < depth.length; i++) {
    const prev = depth[i - 1];
    const curr = depth[i];
    const dt = (curr.t - prev.t) / 60000;
    if (dt <= 0) continue;
    const dv = curr.v - prev.v;
    out.push({ i, v: dv / dt / 1_000_000 });
  }
  return out;
}

function buildDelta(depth: DepthPoint[]): DeltaPoint[] {
  if (!depth || depth.length < 2) return [];
  const out: DeltaPoint[] = [];
  for (let i = 1; i < depth.length; i++) {
    out.push({ i, dv: depth[i].v - depth[i - 1].v });
  }
  return out;
}

function buildReplay(depth: DepthPoint[]): ReplayPoint[] {
  if (!depth || depth.length < 2) return [];
  return depth.slice(1).map((p, i) => ({
    i: i + 1,
    pulse: p.v - depth[i].v
  }));
}

export default function LiquidityDynamicsPanel() {
  const { depthSeries } = useMicroFeed();
  const [seed, setSeed] = useState(() => Date.now() / 1000);
  const animationRef = useRef<number>();

  useEffect(() => {
    const tick = () => {
      setSeed(s => s + 0.05);
      animationRef.current = requestAnimationFrame(tick);
    };
    animationRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const hasRealData = depthSeries && depthSeries.length >= 5;

  const velocity = useMemo(() => {
    if (hasRealData) {
      const real = buildVelocity(depthSeries);
      if (real.length >= 5) return real;
    }
    return generateSyntheticVelocity(seed);
  }, [hasRealData ? depthSeries : seed]);

  const delta = useMemo(() => {
    if (hasRealData) {
      const real = buildDelta(depthSeries);
      if (real.length >= 5) return real;
    }
    return generateSyntheticDelta(seed);
  }, [hasRealData ? depthSeries : seed]);

  const replay = useMemo(() => {
    if (hasRealData) {
      const real = buildReplay(depthSeries);
      if (real.length >= 5) return real;
    }
    return generateSyntheticPulses(seed);
  }, [hasRealData ? depthSeries : seed]);

  const latestVel = velocity?.[velocity.length - 1]?.v ?? 0;
  const avgVel = velocity.reduce((sum, p) => sum + p.v, 0) / velocity.length || 0;

  return (
    <div className="flex flex-col space-y-4">
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
          className="text-lg font-mono font-semibold transition-colors duration-300"
          style={{ color: latestVel >= 0 ? "#22c55e" : "#ef4444" }}
        >
          {latestVel >= 0 ? "+" : ""}{latestVel.toFixed(2)}M/min
        </div>
        <div className="text-[10px] text-neutral-500">
          avg: {avgVel >= 0 ? "+" : ""}{avgVel.toFixed(2)}
        </div>
      </div>

      <div style={{ height: 90 }}>
        <ResponsiveContainer>
          <AreaChart data={velocity}>
            <defs>
              <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00D9FF" stopOpacity={0.4} />
                <stop offset="50%" stopColor="#00D9FF" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#00D9FF" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area 
              type="monotone" 
              dataKey="v" 
              stroke="#00D9FF" 
              strokeWidth={2}
              fill="url(#velocityGradient)"
              isAnimationActive={false}
            />
            <ReferenceLine y={0} stroke="#333" strokeDasharray="3 3" />
            <Tooltip 
              contentStyle={{
                background: "#0a0a12",
                border: "1px solid #1a2138",
                borderRadius: 8,
                fontSize: 11,
                color: "#c3d0ea",
              }}
              formatter={(value: number) => [`${value.toFixed(2)}M/min`, 'Velocity']}
              labelFormatter={() => ''}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="text-[10px] uppercase tracking-widest text-neutral-400">
        Depth Delta (per tick)
      </div>
      <div style={{ height: 80 }}>
        <ResponsiveContainer>
          <AreaChart data={delta}>
            <defs>
              <linearGradient id="deltaGradientPos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F5C211" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#F5C211" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="deltaGradientNeg" x1="0" y1="1" x2="0" y2="0">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area 
              type="monotone" 
              dataKey="dv" 
              stroke="#F5C211" 
              strokeWidth={1.5}
              fill="url(#deltaGradientPos)"
              isAnimationActive={false}
            />
            <ReferenceLine y={0} stroke="#444" strokeWidth={1} />
            <Tooltip 
              contentStyle={{
                background: "#0a0a12",
                border: "1px solid #1a2138",
                borderRadius: 8,
                fontSize: 11,
                color: "#c3d0ea",
              }}
              formatter={(value: number) => [`$${(value / 1000).toFixed(0)}K`, 'Delta']}
              labelFormatter={() => ''}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="text-[10px] uppercase tracking-widest text-neutral-400">
        Microstructure Pulses
      </div>
      <div style={{ height: 70 }}>
        <ResponsiveContainer>
          <BarChart data={replay} barGap={1}>
            <defs>
              <linearGradient id="pulseGradientPos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0.4} />
              </linearGradient>
              <linearGradient id="pulseGradientNeg" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.4} />
              </linearGradient>
            </defs>
            <Bar dataKey="pulse" radius={[2, 2, 0, 0]} isAnimationActive={false}>
              {replay.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.pulse >= 0 ? "url(#pulseGradientPos)" : "url(#pulseGradientNeg)"} 
                />
              ))}
            </Bar>
            <ReferenceLine y={0} stroke="#333" />
            <Tooltip 
              contentStyle={{
                background: "#0a0a12",
                border: "1px solid #1a2138",
                borderRadius: 8,
                fontSize: 11,
                color: "#c3d0ea",
              }}
              formatter={(value: number) => {
                const formatted = Math.abs(value) >= 1000 
                  ? `$${(value / 1000).toFixed(0)}K` 
                  : `$${value.toFixed(0)}`;
                return [formatted, 'Pulse'];
              }}
              labelFormatter={() => ''}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
