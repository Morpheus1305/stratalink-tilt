import { useEffect, useState, useMemo } from "react";
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
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Activity, Shield, Zap, Target } from "lucide-react";

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

type LiquidityHorizon = "now" | "session" | "baseline";

interface RegimeState {
  label: string;
  description: string;
  severity: "stable" | "strengthening" | "fragile" | "critical";
  icon: typeof Shield;
}

function getRegimeState(
  trend: TSLETrend,
  signals: TSLESignal[],
  latestPoli: number
): RegimeState {
  const hasHighSeveritySignal = signals.some(s => s.severity === "high");
  const hasPoliDrop = signals.some(s => s.type === "poli_drop");
  const hasDepthErosion = signals.some(s => s.type === "depth_erosion");
  const hasTrendWarning = signals.some(s => s.type === "trend_warning");

  if (hasTrendWarning || (hasPoliDrop && hasDepthErosion)) {
    return {
      label: "Critical",
      description: "Liquidity deteriorating beneath stable price — execution risk rising",
      severity: "critical",
      icon: AlertTriangle,
    };
  }

  if (hasHighSeveritySignal || (trend.direction === "falling" && trend.momentum === "decelerating")) {
    return {
      label: "Fragile",
      description: "PoLi declining while depth eroding",
      severity: "fragile",
      icon: AlertTriangle,
    };
  }

  if (trend.direction === "rising" && trend.momentum === "accelerating") {
    return {
      label: "Strengthening",
      description: "Two-sided depth improving",
      severity: "strengthening",
      icon: TrendingUp,
    };
  }

  if (latestPoli >= 70 && trend.direction !== "falling") {
    return {
      label: "Stable",
      description: "Liquidity holding above 25–50 bps",
      severity: "stable",
      icon: Shield,
    };
  }

  if (latestPoli >= 50) {
    return {
      label: "Moderate",
      description: "Adequate liquidity with normal execution conditions",
      severity: "stable",
      icon: Target,
    };
  }

  return {
    label: "Thin",
    description: "Limited depth — execution may face slippage",
    severity: "fragile",
    icon: Zap,
  };
}

function downsamplePoints(points: TSLEPoint[], targetCount: number): TSLEPoint[] {
  if (points.length <= targetCount) return points;
  
  const result: TSLEPoint[] = [];
  const step = points.length / targetCount;
  
  for (let i = 0; i < targetCount; i++) {
    const startIdx = Math.floor(i * step);
    const endIdx = Math.floor((i + 1) * step);
    const chunk = points.slice(startIdx, endIdx);
    
    if (chunk.length === 0) continue;
    
    const avgPoli = chunk.reduce((s, p) => s + p.poli, 0) / chunk.length;
    const avgDepth25 = chunk.reduce((s, p) => s + p.depth25, 0) / chunk.length;
    const avgDepth50 = chunk.reduce((s, p) => s + p.depth50, 0) / chunk.length;
    const avgImbalance = chunk.reduce((s, p) => s + p.imbalance2550, 0) / chunk.length;
    
    result.push({
      ts: chunk[Math.floor(chunk.length / 2)].ts,
      poli: Math.round(avgPoli * 10) / 10,
      depth25: avgDepth25,
      depth50: avgDepth50,
      imbalance2550: avgImbalance,
    });
  }
  
  return result;
}

export default function TSLEChart({ venue, symbol, pollTick }: TSLEChartProps) {
  const [data, setData] = useState<TSLEDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [prevVenueSymbol, setPrevVenueSymbol] = useState(`${venue}:${symbol}`);
  const [horizon, setHorizon] = useState<LiquidityHorizon>("now");

  const currentKey = `${venue}:${symbol}`;
  if (currentKey !== prevVenueSymbol) {
    setData(null);
    setLoading(true);
    setPrevVenueSymbol(currentKey);
  }

  const pointLimit = horizon === "now" ? 60 : horizon === "session" ? 200 : 300;

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        const res = await fetch(
          `/api/lis/tsle/dashboard?venue=${venue}&symbol=${symbol}&limit=${pointLimit}`
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
  }, [venue, symbol, pollTick, pointLimit]);

  const processedData = useMemo(() => {
    if (!data || data.history.length < 3) return null;

    let points = data.history;
    
    if (horizon === "session") {
      points = downsamplePoints(points, 20);
    } else if (horizon === "baseline") {
      points = downsamplePoints(points, 10);
    }

    return points.map((point) => ({
      time: new Date(point.ts).toLocaleTimeString([], { 
        hour: "2-digit", 
        minute: "2-digit",
        ...(horizon === "now" ? { second: "2-digit" } : {})
      }),
      ts: point.ts,
      poli: point.poli,
      depth: (point.depth25 + point.depth50) / 2 / 1e6,
      imbalance: point.imbalance2550 * 100,
    }));
  }, [data, horizon]);

  const baselinePoli = useMemo(() => {
    if (!data || data.history.length === 0) return null;
    return Math.round(data.history.reduce((s, p) => s + p.poli, 0) / data.history.length);
  }, [data]);

  const baselineDelta = useMemo(() => {
    if (!data?.latest || baselinePoli === null) return null;
    return Math.round(data.latest.poli - baselinePoli);
  }, [data, baselinePoli]);

  const regime = useMemo(() => {
    if (!data?.latest || !data.trend) return null;
    return getRegimeState(data.trend, data.signals, data.latest.poli);
  }, [data]);

  if (loading || !data) {
    return (
      <Card className="col-span-12 p-4 bg-card border-border">
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
          <Activity className="h-4 w-4 animate-pulse mr-2" />
          Loading TSLE data...
        </div>
      </Card>
    );
  }

  if (data.history.length < 3) {
    return (
      <Card className="col-span-12 p-4 bg-card border-border">
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
          <Activity className="h-4 w-4 mr-2" />
          Collecting data... ({data.history.length}/3 points minimum)
        </div>
      </Card>
    );
  }

  const RegimeIcon = regime?.icon || Shield;

  const velocityDisplay = horizon === "baseline" 
    ? "~0" 
    : `${data.trend.poliVelocity > 0 ? "+" : ""}${data.trend.poliVelocity}`;

  return (
    <Card className="col-span-12 p-4 bg-card border-border" data-testid="card-tsle-chart">
      {/* TSLE Definition (Static, Canonical) */}
      <p className="text-xs text-muted-foreground mb-2">
        TSLE (Time-Series Liquidity Engine) tracks execution quality and liquidity regime over time using PoLi, depth symmetry, and fragility signals — not price.
      </p>

      {/* Header with Horizon Selector */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">
            TSLE Liquidity Over Time
          </h3>
          <Badge variant="outline" className="text-xs font-mono">
            {data.stats.count} pts
          </Badge>
        </div>

        {/* Liquidity Horizon Selector */}
        <div 
          className="flex items-center bg-muted/30 rounded-md p-0.5 border border-border/50"
          data-testid="selector-liquidity-horizon"
        >
          {(["now", "session", "baseline"] as LiquidityHorizon[]).map((h) => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded transition-all",
                horizon === h
                  ? "bg-primary/20 text-primary border border-primary/30 shadow-sm shadow-primary/10"
                  : "text-muted-foreground hover:text-foreground"
              )}
              data-testid={`button-horizon-${h}`}
            >
              {h === "now" ? "Now" : h === "session" ? "Session" : "Baseline"}
            </button>
          ))}
        </div>
      </div>

      {/* Regime Label */}
      {regime && (
        <div 
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md mb-3",
            regime.severity === "critical" && "bg-destructive/10 border border-destructive/20",
            regime.severity === "fragile" && "bg-amber-500/10 border border-amber-500/20",
            regime.severity === "strengthening" && "bg-chart-3/10 border border-chart-3/20",
            regime.severity === "stable" && "bg-muted/50 border border-border"
          )}
          data-testid="regime-indicator"
        >
          <RegimeIcon className={cn(
            "h-4 w-4 shrink-0",
            regime.severity === "critical" && "text-destructive",
            regime.severity === "fragile" && "text-amber-500",
            regime.severity === "strengthening" && "text-chart-3",
            regime.severity === "stable" && "text-muted-foreground"
          )} />
          <div className="flex-1 min-w-0">
            <span className={cn(
              "text-sm font-semibold mr-2",
              regime.severity === "critical" && "text-destructive",
              regime.severity === "fragile" && "text-amber-500",
              regime.severity === "strengthening" && "text-chart-3",
              regime.severity === "stable" && "text-foreground"
            )}>
              {regime.label}
            </span>
            <span className="text-xs text-muted-foreground">
              — {regime.description}
            </span>
          </div>
        </div>
      )}

      {/* Chart or Baseline View */}
      {horizon === "baseline" ? (
        <div className="h-40 flex flex-col items-center justify-center bg-muted/20 rounded-lg border border-border/50">
          <div className="text-center">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Baseline PoLi (Rolling Avg)
            </div>
            <div className="text-3xl font-mono font-bold text-primary">
              {baselinePoli ?? "—"}
            </div>
            {baselineDelta !== null && (
              <div className={cn(
                "text-sm font-medium mt-2",
                baselineDelta > 0 ? "text-chart-3" : baselineDelta < 0 ? "text-destructive" : "text-muted-foreground"
              )}>
                Current is{" "}
                <span className="font-mono font-bold">
                  {baselineDelta > 0 ? "+" : ""}{baselineDelta}
                </span>
                {" "}points {baselineDelta >= 0 ? "above" : "below"} baseline
                {Math.abs(baselineDelta) >= 5 && (
                  <span className="ml-1">
                    — {baselineDelta > 0 ? "unusually strong" : "unusually weak"}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={processedData || []} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="poliGradientTSLE" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FBBF24" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#FBBF24" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))", strokeOpacity: 0.5 }}
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
              <ReferenceLine y={75} stroke="hsl(var(--chart-3))" strokeDasharray="3 3" strokeOpacity={0.3} />
              <ReferenceLine y={50} stroke="hsl(var(--primary))" strokeDasharray="3 3" strokeOpacity={0.3} />
              <ReferenceLine y={25} stroke="hsl(var(--destructive))" strokeDasharray="3 3" strokeOpacity={0.3} />
              <Area
                type={horizon === "session" ? "monotone" : "linear"}
                dataKey="poli"
                stroke="transparent"
                fill="url(#poliGradientTSLE)"
              />
              <Line
                type={horizon === "session" ? "monotone" : "linear"}
                dataKey="poli"
                stroke="#FBBF24"
                strokeWidth={horizon === "session" ? 2.5 : 2}
                dot={false}
                activeDot={{ r: 4, fill: "#FBBF24" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-4 gap-3 mt-3 pt-3 border-t border-border">
        <div className="text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Avg PoLi</div>
          <div className="text-sm font-mono font-medium">{data.stats.avgPoli ?? "—"}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Velocity</div>
          <div className={cn(
            "text-sm font-mono font-medium",
            horizon !== "baseline" && data.trend.poliVelocity > 0 ? "text-chart-3" : 
            horizon !== "baseline" && data.trend.poliVelocity < 0 ? "text-destructive" : ""
          )}>
            {velocityDisplay}/min
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

      {/* Signals (only show for Now horizon) */}
      {horizon === "now" && data.signals.length > 0 && (
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
