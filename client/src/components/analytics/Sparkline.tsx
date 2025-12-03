import {
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";

type DataPoint = {
  v: number;
};

type Props = {
  data: DataPoint[];
  color?: string;
};

export default function Sparkline({ data, color = "#5cb85c" }: Props) {
  if (!data || data.length < 2) {
    return (
      <div style={{ fontSize: 11, color: "#8ea3c7" }}>
        Collecting data…
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: 40 }}>
      <ResponsiveContainer>
        <LineChart data={data}>
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
