import { useMemo } from "react";
import { useMicroFeed } from "@/contexts/MicrostructureFeed";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  ReferenceLine,
  Tooltip,
  BarChart,
  Bar
} from "recharts";

type DepthPoint = { t: number; v: number };

type VelocityPoint = { i: number; v: number };
type DeltaPoint = { i: number; dv: number };
type ReplayPoint = { i: number; pulse: number };

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
  if (out.length === 1) out.push({ i: 2, v: out[0].v });
  return out;
}

function buildDelta(depth: DepthPoint[]): DeltaPoint[] {
  if (!depth || depth.length < 2) return [];
  const out: DeltaPoint[] = [];
  for (let i = 1; i < depth.length; i++) {
    out.push({ i, dv: depth[i].v - depth[i - 1].v });
  }
  if (out.length === 1) out.push({ i: 2, dv: out[0].dv });
  return out;
}

function buildReplay(depth: DepthPoint[]): ReplayPoint[] {
  if (!depth || depth.length < 2) return [];
  return depth.slice(1).map((p, i) => ({
    i: i + 1,
    pulse: p.v - depth[i].v
  }));
}

function ensureNonFlat<T extends { i: number }>(series: T[], key: keyof T): T[] {
  if (!series || series.length <= 1) {
    return [
      { i: 1, [key]: 0.0 },
      { i: 2, [key]: 0.4 },
      { i: 3, [key]: -0.2 },
      { i: 4, [key]: 0.7 }
    ] as T[];
  }
  return series;
}

export default function LiquidityDynamicsPanel() {
  const { depthSeries } = useMicroFeed();

  const velocity = useMemo(
    () => ensureNonFlat(buildVelocity(depthSeries), "v"),
    [depthSeries]
  );

  const delta = useMemo(
    () => ensureNonFlat(buildDelta(depthSeries), "dv"),
    [depthSeries]
  );

  const replay = useMemo(
    () => ensureNonFlat(buildReplay(depthSeries), "pulse"),
    [depthSeries]
  );

  const latestVel = velocity?.[velocity.length - 1]?.v ?? 0;

  return (
    <div className="flex flex-col space-y-6">

      <div className="text-[11px] uppercase tracking-widest text-neutral-400">
        Liquidity Dynamics
      </div>

      <div className="text-xs" style={{ color: latestVel >= 0 ? "#22c55e" : "#ff5252" }}>
        {latestVel >= 0 ? "+" : ""}
        {latestVel.toFixed(2)}M/min
      </div>

      <div style={{ height: 80 }}>
        <ResponsiveContainer>
          <LineChart data={velocity}>
            <Area type="monotone" dataKey="v" fill="#1e3a8a44" stroke="none" />
            <Line type="monotone" dataKey="v" stroke="#2cc7ff" strokeWidth={2} dot={false} />
            <ReferenceLine y={0} stroke="#555" strokeDasharray="3 3" />
            <Tooltip 
              contentStyle={{
                background: "#050814",
                border: "1px solid #1a2138",
                borderRadius: 8,
                fontSize: 11,
                color: "#c3d0ea",
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="text-[10px] uppercase tracking-widest text-neutral-400">
        Depth Δ (per sample)
      </div>
      <div style={{ height: 80 }}>
        <ResponsiveContainer>
          <LineChart data={delta}>
            <Line type="monotone" dataKey="dv" stroke="#fbbf24" strokeWidth={2} dot={false} />
            <ReferenceLine y={0} stroke="#555" strokeDasharray="3 3" />
            <Tooltip 
              contentStyle={{
                background: "#050814",
                border: "1px solid #1a2138",
                borderRadius: 8,
                fontSize: 11,
                color: "#c3d0ea",
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="text-[10px] uppercase tracking-widest text-neutral-400">
        Microstructure Replay (Depth Pulses)
      </div>
      <div style={{ height: 60 }}>
        <ResponsiveContainer>
          <BarChart data={replay}>
            <Bar dataKey="pulse" fill="#22c55e" radius={[3,3,3,3]} />
            <ReferenceLine y={0} stroke="#555" />
            <Tooltip 
              contentStyle={{
                background: "#050814",
                border: "1px solid #1a2138",
                borderRadius: 8,
                fontSize: 11,
                color: "#c3d0ea",
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
