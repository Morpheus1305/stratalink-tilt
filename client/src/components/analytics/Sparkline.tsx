import { useMemo } from "react";
import {
  LineChart,
  Line,
  Area,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts";

type SparkPoint = { v: number };

type Props = {
  data: SparkPoint[];
  color?: string;
  filled?: boolean;
  dynamicFill?: boolean;
  labelFormatter?: (v: number) => string;
  yFormatter?: (v: number) => string;
  zeroLine?: boolean;
  animate?: boolean;
  barEnabled?: boolean;
  stale?: boolean;
};

function computeDynamicColor(series: SparkPoint[], baseColor: string) {
  if (series.length < 2) return baseColor;
  const prev = series[series.length - 2].v;
  const last = series[series.length - 1].v;

  if (last > prev) return "#23e07b";
  if (last < prev) return "#ff5252";
  return baseColor;
}

export default function Sparkline({
  data,
  color = "#5cb85c",
  filled = false,
  dynamicFill = false,
  labelFormatter = (v) => v.toFixed(2),
  yFormatter = (v) => v.toFixed(2),
  zeroLine = true,
  animate = false,
  barEnabled = false,
  stale = false,
}: Props) {
  if (!data || data.length < 2) {
    return (
      <div style={{ fontSize: 11, color: "#8ea3c7" }}>Collecting data…</div>
    );
  }

  const values = data.map((d) => d.v);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const volFactor = Math.min(1, Math.max(0.15, range / 5));

  const baseColor = dynamicFill ? computeDynamicColor(data, color) : color;

  const chartData = data.map((d, idx) => {
    const prev = idx > 0 ? data[idx - 1].v : d.v;
    const mag = Math.abs(d.v - prev);
    return { i: idx, v: d.v, b: mag };
  });

  const lastIndex = chartData.length - 1;
  const opacity = stale ? 0.35 : 1;

  return (
    <div style={{ width: "100%", height: 80, opacity }}>
      <ResponsiveContainer>
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            stroke="#242b3f"
            strokeDasharray="2 3"
            vertical={false}
          />

          <XAxis
            dataKey="i"
            tickFormatter={(i) =>
              i === 0 ? "t-30s" : i === lastIndex ? "t-0" : ""
            }
            ticks={[0, lastIndex]}
            tick={{ fill: "#6d7da2", fontSize: 9 }}
            axisLine={false}
            tickLine={false}
          />

          <YAxis
            width={40}
            tickFormatter={yFormatter}
            tick={{ fontSize: 10, fill: "#8ea3c7" }}
            axisLine={false}
            tickLine={false}
          />

          {zeroLine && (
            <ReferenceLine y={0} stroke="#444a63" strokeDasharray="3 2" />
          )}

          <Tooltip
            formatter={(value: number) => [labelFormatter(value), "Δ"]}
            labelFormatter={() => ""}
            contentStyle={{
              background: "#050814",
              border: "1px solid #1a2138",
              borderRadius: 8,
              padding: "6px 8px",
              fontSize: 11,
              color: "#c3d0ea",
            }}
          />

          {barEnabled && (
            <Bar
              dataKey="b"
              fill="#2cc7ff60"
              barSize={3}
              isAnimationActive={animate}
            />
          )}

          {filled && (
            <Area
              type="monotone"
              dataKey="v"
              stroke="none"
              fill={baseColor}
              fillOpacity={0.15 + volFactor * 0.5}
              isAnimationActive={animate}
            />
          )}

          <Line
            type="monotone"
            dataKey="v"
            stroke={baseColor}
            strokeWidth={2.4}
            dot={false}
            strokeLinecap="round"
            isAnimationActive={animate}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
