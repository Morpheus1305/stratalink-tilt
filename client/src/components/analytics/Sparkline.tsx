import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";

type SparkPoint = { v: number };

type Props = {
  data: SparkPoint[];
  color?: string;
  yFormatter?: (v: number) => string;
  zeroLine?: boolean;
};

export default function Sparkline({
  data,
  color = "#5cb85c",
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
    <div style={{ width: "100%", height: 60 }}>
      <ResponsiveContainer>
        <LineChart data={chartData}>
          <XAxis dataKey="i" hide />
          <YAxis
            width={40}
            tickFormatter={yFormatter}
            tick={{ fontSize: 10, fill: "#8ea3c7" }}
            tickLine={false}
            axisLine={false}
          />
          {zeroLine && <ReferenceLine y={0} stroke="#444a63" strokeDasharray="3 3" />}
          <Tooltip
            cursor={false}
            formatter={(value: number) => [yFormatter(value), "Δ"]}
            labelFormatter={() => ""}
            contentStyle={{
              background: "#050814",
              border: "1px solid #1a2138",
              fontSize: 11,
            }}
          />
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
