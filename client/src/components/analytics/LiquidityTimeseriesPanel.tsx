import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useLiquidityTimeseries } from "@/hooks/useLiquidityTimeseries";
import { format } from "date-fns";

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

export const LiquidityTimeseriesPanel: React.FC<Props> = ({ token }) => {
  const [window, setWindow] = useState<"1h" | "24h" | "7d" | "30d">("24h");
  const { loading, error, points, stabilityScore, halfLifeMinutes } =
    useLiquidityTimeseries(token, window);

  const depthTrendPct =
    points.length > 1
      ? ((points[points.length - 1].depthUsd50bps /
          points[0].depthUsd50bps -
          1) *
          100)
      : 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-[11px] uppercase tracking-[0.16em] text-neutral-400">
          Time-Series Liquidity – {token}
        </div>
        <div className="flex gap-1">
          {WINDOWS.map((w) => (
            <button
              key={w.value}
              data-testid={`button-window-${w.value}`}
              className={`px-2 py-[2px] text-[10px] rounded border ${
                window === w.value
                  ? "border-cyan-400 text-cyan-300 bg-[#06101f]"
                  : "border-[#1a2335] text-neutral-400 bg-[#050814]"
              }`}
              onClick={() => setWindow(w.value)}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ height: 160 }}>
        {loading ? (
          <div className="text-[11px] text-neutral-500 flex items-center h-full">
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
          <ResponsiveContainer>
            <LineChart data={points}>
              <CartesianGrid
                stroke="#1a2237"
                strokeDasharray="2 3"
                vertical={false}
              />
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
              />
              <Tooltip
                labelFormatter={(ts) => format(new Date(ts), "MMM d, HH:mm")}
                formatter={(value: any) => [
                  `$${(value / 1_000_000).toFixed(2)}M`,
                  "Depth (50bps)",
                ]}
                contentStyle={{
                  background: "#050814",
                  border: "1px solid #1a2237",
                  borderRadius: 8,
                  padding: "6px 8px",
                  fontSize: 11,
                  color: "#c3d0ea",
                }}
                labelStyle={{ color: "#8a8a8a", fontSize: 10, marginBottom: 4 }}
              />
              <Line
                type="monotone"
                dataKey="depthUsd50bps"
                stroke="#2cc7ff"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="flex flex-wrap gap-4 text-[11px] text-neutral-300">
        <div>
          Trend ({window}):{" "}
          <span
            className={
              depthTrendPct > 0 ? "text-emerald-400" : "text-red-400"
            }
          >
            {depthTrendPct >= 0 ? "+" : ""}
            {depthTrendPct.toFixed(1)}%
          </span>
        </div>
        <div>
          Stability score:{" "}
          <span className="text-cyan-300">
            {stabilityScore != null ? stabilityScore.toFixed(1) : "—"}
          </span>
        </div>
        <div>
          Liquidity half-life:{" "}
          <span className="text-cyan-300">
            {halfLifeMinutes != null ? `${halfLifeMinutes.toFixed(0)} min` : "—"}
          </span>
        </div>
      </div>

      <div className="text-[10px] text-neutral-500">
        Shows how executable liquidity at 50bps depth is evolving over time for{" "}
        {token}. Backend must implement{" "}
        <code>/api/liquidity/timeseries</code> for live data.
      </div>
    </div>
  );
};
