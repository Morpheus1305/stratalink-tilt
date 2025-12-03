import {
  LineChart,
  Line,
  Area,
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
  fillColor?: string;
  filled?: boolean;
  yFormatter?: (v: number) => string;
  zeroLine?: boolean;
};

export default function Sparkline({
  data,
  color = "#5cb85c",
  fillColor = "#2cc7ff40",
  filled = false,
  yFormatter = (v) => v.toFixed(2),
  zeroLine = true,
}: Props) {
  if (!data || data.length < 2) {
    return (
      <div style={{ fontSize: 11, color: "#8ea3c7" }}>
        Collecting data…
      </div>
    );
  }

  const chartData = data.map((d, idx) => ({ i: idx, v: d.v }));

  return (
    <div style={{ width: "100%", height: 70 }}>
      <ResponsiveContainer>
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="depthFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="#242b3f" strokeDasharray="3 3" vertical={false} />

          <XAxis dataKey="i" hide />

          <YAxis
            width={40}
            tickFormatter={yFormatter}
            tick={{ fontSize: 10, fill: "#8ea3c7" }}
            tickLine={false}
            axisLine={false}
          />

          {zeroLine && (
            <ReferenceLine y={0} stroke="#444a63" strokeDasharray="2 2" />
          )}

          <Tooltip
            cursor={{ stroke: "#ffffff30", strokeWidth: 1 }}
            formatter={(value: number) => [yFormatter(value), "Δ"]}
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

          {filled && (
            <Area
              type="monotone"
              dataKey="v"
              stroke="none"
              fill="url(#depthFill)"
              isAnimationActive={false}
            />
          )}

          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2.2}
            dot={false}
            isAnimationActive={false}
            strokeLinecap="round"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
