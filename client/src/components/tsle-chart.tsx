import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Activity } from "lucide-react";

interface TSLEPoint {
  ts: number;
  depth25: number;
  depth50: number;
  imbalance2550: number;
  poli: number;
}

interface TSLETrend {
  direction: "rising" | "falling" | "stable" | "insufficient_data";
  poliChange: number;
  poliVelocity: number;
  depthChange: number;
  depthVelocity: number;
  imbalanceShift: number;
  momentum: "accelerating" | "decelerating" | "neutral";
  confidence: number;
}

interface TSLESignal {
  type: string;
  severity: "low" | "medium" | "high";
  message: string;
  value: number;
  threshold: number;
}

interface TSLEDashboardData {
  venue: string;
  symbol: string;
  history: TSLEPoint[];
  trend: TSLETrend;
  signals: TSLESignal[];
  stats: {
    count: number;
    avgPoli: number | null;
    minPoli: number | null;
    maxPoli: number | null;
  };
  latest: TSLEPoint | null;
}

interface TSLEChartProps {
  venue: string;
  symbol: string;
  pollTick: number;
}

export default function TSLEChart({ venue, symbol, pollTick }: TSLEChartProps) {
  const [data, setData] = useState<TSLEDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [prevVenueSymbol, setPrevVenueSymbol] = useState(`${venue}:${symbol}`);

  // Reset loading state when venue/symbol changes
  const currentKey = `${venue}:${symbol}`;
  if (currentKey !== prevVenueSymbol) {
    setData(null);
    setLoading(true);
    setPrevVenueSymbol(currentKey);
  }

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        const res = await fetch(
          `/api/lis/tsle/dashboard?venue=${venue}&symbol=${symbol}&limit=60`
        );
        if (res.ok && !cancelled) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("[TSLE Chart] Fetch error:", err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [venue, symbol, pollTick]);

  if (loading || !data) {
    return (
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
          <Activity className="h-4 w-4 animate-pulse mr-2" />
          Loading TSLE data...
        </div>
      </Card>
    );
  }

  if (data.history.length < 3) {
    return (
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
          <Activity className="h-4 w-4 mr-2" />
          Collecting data... ({data.history.length}/3 points minimum)
        </div>
      </Card>
    );
  }

  const chartData = data.history.map((point) => ({
    time: new Date(point.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    ts: point.ts,
    poli: point.poli,
    depth: (point.depth25 + point.depth50) / 2 / 1e6, // in millions
    imbalance: point.imbalance2550 * 100, // as percentage
  }));

  const TrendIcon = data.trend.direction === "rising" 
    ? TrendingUp 
    : data.trend.direction === "falling" 
    ? TrendingDown 
    : Minus;

  const trendColor = data.trend.direction === "rising"
    ? "text-chart-3"
    : data.trend.direction === "falling"
    ? "text-destructive"
    : "text-muted-foreground";

  const momentumLabel = data.trend.momentum === "accelerating"
    ? "Accelerating"
    : data.trend.momentum === "decelerating"
    ? "Decelerating"
    : "Neutral";

  return (
    <Card className="col-span-12 p-4 bg-card border-border" data-testid="card-tsle-chart">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">
            TSLE Time-Series
          </h3>
          <Badge variant="outline" className="text-xs font-mono">
            {data.stats.count} pts
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <TrendIcon className={cn("h-3.5 w-3.5", trendColor)} />
            <span className={cn("text-xs font-medium", trendColor)}>
              {data.trend.direction === "insufficient_data" 
                ? "Collecting..." 
                : data.trend.direction.charAt(0).toUpperCase() + data.trend.direction.slice(1)}
            </span>
          </div>

          <Badge 
            variant="outline" 
            className={cn(
              "text-xs",
              data.trend.momentum === "accelerating" && "border-chart-3/50 text-chart-3",
              data.trend.momentum === "decelerating" && "border-destructive/50 text-destructive"
            )}
          >
            {momentumLabel}
          </Badge>

          {data.signals.length > 0 && (
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs",
                data.signals.some(s => s.severity === "high") 
                  ? "border-destructive/50 text-destructive" 
                  : "border-amber-500/50 text-amber-500"
              )}
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              {data.signals.length} signal{data.signals.length > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </div>

      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="poliGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FBBF24" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#FBBF24" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
              interval="preserveStartEnd"
            />
            <YAxis 
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
                fontSize: "11px",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
              formatter={(value: number, name: string) => {
                if (name === "poli") return [`${value}`, "PoLi Score"];
                if (name === "depth") return [`$${value.toFixed(2)}M`, "Avg Depth"];
                if (name === "imbalance") return [`${value.toFixed(1)}%`, "Imbalance"];
                return [value, name];
              }}
            />
            <ReferenceLine y={75} stroke="hsl(var(--chart-3))" strokeDasharray="3 3" strokeOpacity={0.5} />
            <ReferenceLine y={50} stroke="hsl(var(--primary))" strokeDasharray="3 3" strokeOpacity={0.5} />
            <ReferenceLine y={25} stroke="hsl(var(--destructive))" strokeDasharray="3 3" strokeOpacity={0.5} />
            <Area
              type="monotone"
              dataKey="poli"
              stroke="transparent"
              fill="url(#poliGradient)"
            />
            <Line
              type="monotone"
              dataKey="poli"
              stroke="#FBBF24"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#FBBF24" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-4 gap-3 mt-3 pt-3 border-t border-border">
        <div className="text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Avg PoLi</div>
          <div className="text-sm font-mono font-medium">{data.stats.avgPoli ?? "—"}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Velocity</div>
          <div className={cn(
            "text-sm font-mono font-medium",
            data.trend.poliVelocity > 0 ? "text-chart-3" : data.trend.poliVelocity < 0 ? "text-destructive" : ""
          )}>
            {data.trend.poliVelocity > 0 ? "+" : ""}{data.trend.poliVelocity}/min
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Depth Δ</div>
          <div className={cn(
            "text-sm font-mono font-medium",
            data.trend.depthChange > 0 ? "text-chart-3" : data.trend.depthChange < 0 ? "text-destructive" : ""
          )}>
            {data.trend.depthChange > 0 ? "+" : ""}{data.trend.depthChange}%
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Confidence</div>
          <div className="text-sm font-mono font-medium">{Math.round(data.trend.confidence * 100)}%</div>
        </div>
      </div>

      {data.signals.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border space-y-1">
          {data.signals.slice(0, 3).map((signal, idx) => (
            <div 
              key={idx}
              className={cn(
                "flex items-center gap-2 text-xs px-2 py-1 rounded",
                signal.severity === "high" && "bg-destructive/10 text-destructive",
                signal.severity === "medium" && "bg-amber-500/10 text-amber-500",
                signal.severity === "low" && "bg-chart-3/10 text-chart-3"
              )}
            >
              <AlertTriangle className="h-3 w-3 shrink-0" />
              <span>{signal.message}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
