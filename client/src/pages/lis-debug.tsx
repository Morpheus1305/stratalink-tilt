import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Database, Eye, EyeOff, ArrowUp, ArrowDown, TrendingUp, AlertTriangle, RefreshCw } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard-header";
import { PlatformTabs } from "@/components/platform-tabs";
import PollingOrbital from "@/components/polling-orbital";
import TSLEChart from "@/components/tsle-chart";
import { cn } from "@/lib/utils";
import { getPoLiRating } from "@/lib/poli-rating";

const BAND_LABELS: Record<string, string> = {
  "pct_0_1": "10 bps",
  "pct_0.1": "10 bps",
  "pct_0_25": "25 bps",
  "pct_0.25": "25 bps",
  "pct_0_5": "50 bps",
  "pct_0.5": "50 bps",
  "pct_1": "100 bps",
  "pct_2": "200 bps",
};

const TOKENS = ["BTC", "ETH", "SOL", "LINK", "AVAX"];
const VENUES = ["binance", "coinbase", "okx", "kraken"] as const;

type Venue = (typeof VENUES)[number];

type LISBand = {
  bid_notional?: number;
  ask_notional?: number;
  total_notional?: number;
};

type LISSnapshot = {
  venue: string;
  symbol: string;
  timestamp: number;
  mid_price: number;
  spread?: {
    absolute?: number;
    bps?: number;
  };
  bands?: Record<string, LISBand>;
};

function formatUSD(v: number) {
  if (v >= 1_000_000) {
    return `$${(v / 1_000_000).toFixed(2)}M`;
  }
  return `$${v.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function calcImbalance(bid: number, ask: number): number {
  const total = bid + ask;
  if (!total || total === 0) return 0;
  return ((bid - ask) / total) * 100;
}

function getExecutionQuality(bands: Record<string, LISBand> | undefined): { label: string; color: string; borderColor: string } {
  if (!bands) return { label: "N/A", color: "text-muted-foreground", borderColor: "border-muted-foreground/40" };
  
  let totalImbalance = 0;
  let count = 0;
  
  Object.entries(bands).forEach(([key, band]) => {
    const label = BAND_LABELS[key] ?? key;
    if (label === "25 bps" || label === "50 bps") {
      const bid = band.bid_notional ?? 0;
      const ask = band.ask_notional ?? 0;
      const imb = Math.abs(calcImbalance(bid, ask));
      totalImbalance += imb;
      count++;
    }
  });
  
  const avgImbalance = count > 0 ? totalImbalance / count : 0;
  
  if (avgImbalance < 10) {
    return { label: "STRONG", color: "text-emerald-400", borderColor: "border-emerald-400/40" };
  } else if (avgImbalance <= 25) {
    return { label: "FAIR", color: "text-yellow-400", borderColor: "border-yellow-400/40" };
  } else {
    return { label: "FRAGILE", color: "text-red-400", borderColor: "border-red-400/40" };
  }
}

type PoLiScoreData = {
  score: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  trend: 'up' | 'down';
  change24h: number;
  historicalAverage: number;
};

function computePoLiFromLIS(data: LISSnapshot | null, prevScore: number | null): PoLiScoreData {
  if (!data || !data.bands) {
    return { score: 0, riskLevel: 'critical', trend: 'down', change24h: 0, historicalAverage: 65 };
  }
  
  let depth25 = 0, depth50 = 0;
  let bid25 = 0, ask25 = 0, bid50 = 0, ask50 = 0;
  
  Object.entries(data.bands).forEach(([key, band]) => {
    const label = BAND_LABELS[key] ?? key;
    if (label === "25 bps") {
      bid25 = band.bid_notional ?? 0;
      ask25 = band.ask_notional ?? 0;
      depth25 = bid25 + ask25;
    } else if (label === "50 bps") {
      bid50 = band.bid_notional ?? 0;
      ask50 = band.ask_notional ?? 0;
      depth50 = bid50 + ask50;
    }
  });
  
  const depthScore = Math.min(40, (depth25 + depth50) / 100000);
  
  const imbalance25 = Math.abs(calcImbalance(bid25, ask25));
  const imbalance50 = Math.abs(calcImbalance(bid50, ask50));
  const avgImbalance = (imbalance25 + imbalance50) / 2;
  const balanceScore = Math.max(0, 35 - avgImbalance);
  
  const spreadBps = data.spread?.bps ?? 0;
  const spreadScore = Math.max(0, 25 - spreadBps * 2);
  
  const rawScore = depthScore + balanceScore + spreadScore;
  const score = Math.round(Math.min(100, Math.max(0, rawScore)));
  
  let riskLevel: 'low' | 'medium' | 'high' | 'critical';
  if (score >= 75) riskLevel = 'low';
  else if (score >= 55) riskLevel = 'medium';
  else if (score >= 35) riskLevel = 'high';
  else riskLevel = 'critical';
  
  const change24h = prevScore !== null ? ((score - prevScore) / Math.max(prevScore, 1)) * 100 : 0;
  const trend = change24h >= 0 ? 'up' : 'down';
  
  return { score, riskLevel, trend, change24h, historicalAverage: 65 };
}

function getPoLiSubLabel(data: LISSnapshot | null, rating: string): string {
  if (!data || !data.bands) return "";
  
  let depth25 = 0, depth50 = 0;
  let bid25 = 0, ask25 = 0, bid50 = 0, ask50 = 0;
  
  Object.entries(data.bands).forEach(([key, band]) => {
    const label = BAND_LABELS[key] ?? key;
    if (label === "25 bps") {
      bid25 = band.bid_notional ?? 0;
      ask25 = band.ask_notional ?? 0;
      depth25 = bid25 + ask25;
    } else if (label === "50 bps") {
      bid50 = band.bid_notional ?? 0;
      ask50 = band.ask_notional ?? 0;
      depth50 = bid50 + ask50;
    }
  });
  
  const avgImbalance = (Math.abs(calcImbalance(bid25, ask25)) + Math.abs(calcImbalance(bid50, ask50))) / 2;
  const totalDepth = depth25 + depth50;
  const depthThreshold = 500000;
  
  if (totalDepth >= depthThreshold && avgImbalance <= 10) {
    return `${rating} liquidity supported by strong two-sided depth at 25–50 bps`;
  } else if (totalDepth >= depthThreshold && avgImbalance > 10) {
    return `${rating} liquidity despite shallow 25–50 bps imbalance`;
  } else if (totalDepth < depthThreshold && avgImbalance <= 15) {
    return `${rating} liquidity driven by thin 25–50 bps execution bands`;
  } else {
    return `${rating} liquidity with fragile 25–50 bps depth structure`;
  }
}

type FragilityState = {
  isFragile: boolean;
  prevScore: number | null;
  prevPrice: number | null;
  prevSpread: number | null;
};

function detectLiquidityFragility(
  currentScore: number,
  currentPrice: number,
  currentSpread: number,
  prevState: FragilityState
): { isFragile: boolean; message: string } {
  if (prevState.prevScore === null || prevState.prevPrice === null || prevState.prevSpread === null) {
    return { isFragile: false, message: "" };
  }
  
  const scoreDrop = prevState.prevScore - currentScore;
  const priceChange = Math.abs((currentPrice - prevState.prevPrice) / prevState.prevPrice) * 100;
  const spreadChange = Math.abs((currentSpread - prevState.prevSpread) / Math.max(prevState.prevSpread, 0.001)) * 100;
  
  if (scoreDrop >= 5 && priceChange < 0.10 && spreadChange < 5) {
    return { 
      isFragile: true, 
      message: "Liquidity weakening beneath stable price" 
    };
  }
  
  return { isFragile: false, message: "" };
}

export default function LiquidityTruthConsole() {
  const [token, setToken] = useState("BTC");
  const [venue, setVenue] = useState<Venue>("binance");
  const [data, setData] = useState<LISSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const prevScoreRef = useRef<number | null>(null);
  const [poliData, setPoliData] = useState<PoLiScoreData | null>(null);
  const [fragilityState, setFragilityState] = useState<FragilityState>({
    isFragile: false,
    prevScore: null,
    prevPrice: null,
    prevSpread: null,
  });
  const [fragilityWarning, setFragilityWarning] = useState<{ isFragile: boolean; message: string }>({ isFragile: false, message: "" });
  const [pollTick, setPollTick] = useState(0);
  
  useEffect(() => {
    if (data) {
      const newPoli = computePoLiFromLIS(data, prevScoreRef.current);
      setPoliData(newPoli);
      
      const fragility = detectLiquidityFragility(
        newPoli.score,
        data.mid_price,
        data.spread?.bps ?? 0,
        fragilityState
      );
      setFragilityWarning(fragility);
      
      setFragilityState({
        isFragile: fragility.isFragile,
        prevScore: newPoli.score,
        prevPrice: data.mid_price,
        prevSpread: data.spread?.bps ?? 0,
      });
      
      prevScoreRef.current = newPoli.score;
    }
  }, [data]);

  useEffect(() => {
    let alive = true;
    setError(null);

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/lis/${venue.toLowerCase()}/depth?symbol=${token}`
        );

        if (!res.ok) {
          throw new Error(`Depth not available for ${token} on ${venue}`);
        }

        const data = await res.json();
        if (!alive) return;
        
        setData(data);
        setError(null);
        setLastUpdate(new Date());
        setPollTick((t) => t + 1);
      } catch (err: any) {
        if (!alive) return;
        setError(err?.message ?? "Failed to load LIS data");
      }
    };

    poll();
    const interval = setInterval(poll, 5000);

    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [token, venue]);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <PlatformTabs />

      <div className="p-4 space-y-4">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-primary" />
            <div>
              <h1 className="text-lg font-semibold text-foreground">Liquidity Truth Console</h1>
              <p className="text-xs text-muted-foreground">LIS - Liquidity Ingestion Service - Ground Truth View</p>
            </div>
          </div>
          {lastUpdate && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <PollingOrbital pollTick={pollTick} size={24} />
              <span className="font-mono">Updated {lastUpdate.toLocaleTimeString()}</span>
            </div>
          )}
        </div>

        {/* Positioning Statement */}
        <p className="mt-2 text-sm italic text-muted-foreground max-w-4xl">
          "Price tells you where the market traded — liquidity quality tells you whether you could trade."
        </p>

        {/* Controls */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Token</label>
                <Select value={token} onValueChange={setToken}>
                  <SelectTrigger className="w-[120px] h-9 text-sm" data-testid="select-token">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TOKENS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Venue</label>
                <Select value={venue} onValueChange={(v) => setVenue(v as Venue)}>
                  <SelectTrigger className="w-[140px] h-9 text-sm" data-testid="select-venue">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VENUES.map((v) => (
                      <SelectItem key={v} value={v}>{v.toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1" />

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRaw((v) => !v)}
                data-testid="button-toggle-raw"
              >
                {showRaw ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {showRaw ? "Hide" : "Show"} Raw JSON
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="bg-destructive/10 border-destructive/30">
            <CardContent className="p-4">
              <p className="text-sm text-destructive">Error: {error}</p>
            </CardContent>
          </Card>
        )}

        {/* Main Data */}
        {data && (
          <div className="grid grid-cols-12 gap-4">
            {/* Market Context (left) */}
            <Card className="col-span-12 lg:col-span-3 p-4 bg-card border-border">
              <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-2">
                Market Context
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400 uppercase tracking-wide">Venue</span>
                  <Badge variant="outline" className="font-mono text-xs">{data.venue.toUpperCase()}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400 uppercase tracking-wide">Symbol</span>
                  <span className="font-mono text-sm font-medium text-foreground">{data.symbol}</span>
                </div>
                <div className="flex items-center justify-between border-t border-border/50 pt-2 mt-1">
                  <span className="text-xs text-neutral-400 uppercase tracking-wide">Ref Price</span>
                  <span className="text-sm font-medium text-muted-foreground">${data.mid_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400 uppercase tracking-wide">Spread</span>
                  <span className="text-xs font-medium text-muted-foreground">{(data.spread?.bps ?? 0).toFixed(4)} bps</span>
                </div>
              </div>
            </Card>

            {/* PoLi Score Gauge (center) */}
            {poliData && (
              <Card className="col-span-12 lg:col-span-3 p-4 border-card-border flex flex-col items-center justify-center" data-testid="card-lis-poli-score">
                <div className="flex items-center justify-between mb-2">
                  <div className="relative inline-block group">
                    <h3 className="text-xs font-semibold tracking-wide uppercase cursor-help">POLI SCORE</h3>
                    <span className="absolute left-0 bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50">
                      <span className="block bg-neutral-900 text-neutral-200 text-xs leading-snug px-3 py-2 rounded-md shadow-lg max-w-xs whitespace-normal">
                        <span className="font-bold block mb-1">Proof of Liquidity (PoLi)</span>
                        A real-time execution-quality score derived from executable orderbook depth, balance, and spread — independent of price.
                      </span>
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <div className="flex items-center gap-1 text-xs">
                      {poliData.trend === 'up' ? (
                        <ArrowUp className="h-3 w-3 text-chart-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3 text-destructive" />
                      )}
                      <span className={poliData.trend === 'up' ? 'text-chart-3' : 'text-destructive'}>
                        {poliData.change24h > 0 ? '+' : ''}{poliData.change24h.toFixed(1)}%
                      </span>
                    </div>
                    {fragilityWarning.isFragile && (
                      <div className="relative group mt-1 text-[11px] text-amber-400 flex items-center justify-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        <span>{fragilityWarning.message}</span>
                        <span className="absolute right-0 bottom-full mb-2 w-64 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                          <span className="block bg-neutral-900 text-neutral-200 text-xs px-3 py-1 rounded-md shadow-lg whitespace-normal">
                            Orderbook depth is deteriorating inside the executable 25–50 bps range despite minimal price movement.
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-center mb-2">
                  <div className="relative w-36 h-36">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="72"
                        cy="72"
                        r="64"
                        fill="none"
                        stroke="hsl(var(--border))"
                        strokeWidth="6"
                      />
                      <circle
                        cx="72"
                        cy="72"
                        r="64"
                        fill="none"
                        stroke={poliData.riskLevel === 'low' ? 'hsl(var(--chart-3))' : poliData.riskLevel === 'medium' ? 'hsl(var(--primary))' : 'hsl(var(--destructive))'}
                        strokeWidth="6"
                        strokeDasharray={`${(poliData.score / 100) * 402} ${402 - (poliData.score / 100) * 402}`}
                        strokeLinecap="round"
                        className="transition-all duration-500"
                      />
                    </svg>
                    
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="font-mono text-3xl font-bold" data-testid="text-lis-poli-value">
                        {poliData.score}
                      </div>
                      <div className="text-xs text-muted-foreground">/100</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        <span className="font-bold text-foreground">{getPoLiRating(poliData.score)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* PoLi Sub-Label */}
                <p className="mt-2 text-xs text-neutral-400 text-center max-w-[220px] mx-auto">
                  {getPoLiSubLabel(data, getPoLiRating(poliData.score))}
                </p>

                <div className="space-y-1 mt-2">
                  <div className={cn(
                    "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs",
                    poliData.riskLevel === 'low' ? 'bg-chart-3/10 border-chart-3/20' :
                    poliData.riskLevel === 'medium' ? 'bg-primary/10 border-primary/20' :
                    'bg-destructive/10 border-destructive/20'
                  )}>
                    <TrendingUp className={cn(
                      "h-3 w-3",
                      poliData.riskLevel === 'low' ? 'text-chart-3' :
                      poliData.riskLevel === 'medium' ? 'text-primary' :
                      'text-destructive'
                    )} />
                    <span className={cn(
                      "font-semibold uppercase text-xs",
                      poliData.riskLevel === 'low' ? 'text-chart-3' :
                      poliData.riskLevel === 'medium' ? 'text-primary' :
                      'text-destructive'
                    )}>
                      {poliData.riskLevel} RISK
                    </span>
                  </div>

                  <div className="pt-1 border-t border-border space-y-0.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground uppercase tracking-wide">Hist Avg</span>
                      <span className="font-mono font-medium">{poliData.historicalAverage}</span>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Executable Depth - Primary Insight (right) */}
            <Card className="col-span-12 lg:col-span-6 p-5 bg-card border border-amber-500/40 shadow-[0_0_0_1px_rgba(234,179,8,0.25)]">
              <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">
                    Executable Depth
                  </h3>
                    {(() => {
                      const quality = getExecutionQuality(data.bands);
                      return (
                        <span className="inline-flex items-center gap-1">
                          <span className={cn(
                            "inline-flex items-center text-xs font-medium border rounded-full px-2 py-0.5 bg-transparent",
                            quality.color,
                            quality.borderColor
                          )}>
                            {quality.label}
                          </span>
                          {quality.label === "FRAGILE" && (
                            <span className="relative inline-block group">
                              <span className="text-neutral-500 hover:text-neutral-300 cursor-help ml-1 text-xs">
                                &#9432;
                              </span>
                              <span className="absolute right-0 bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50">
                                <span className="block bg-neutral-900 text-neutral-200 text-xs leading-snug px-3 py-2 rounded-md shadow-lg max-w-xs whitespace-normal">
                                  <span className="font-bold block mb-1">Why execution is fragile</span>
                                  Depth within 25–50 bps is thin or imbalanced, meaning moderate-size orders are likely to cause price impact rather than execute at the reference price.
                                  <span className="block mt-1 text-neutral-400">This market trades, but does not absorb size efficiently.</span>
                                </span>
                              </span>
                            </span>
                          )}
                        </span>
                      );
                    })()}
                </div>
                <span className="text-xs text-neutral-400">Executable size before price impact</span>
              </div>
              <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-2 text-xs text-muted-foreground uppercase tracking-wide font-medium">Band</th>
                        <th className="text-right py-2 px-2 text-xs text-muted-foreground uppercase tracking-wide font-medium">Bid USD</th>
                        <th className="text-right py-2 px-2 text-xs text-muted-foreground uppercase tracking-wide font-medium">Ask USD</th>
                        <th className="text-right py-2 px-2 text-xs text-muted-foreground uppercase tracking-wide font-medium">Total Depth</th>
                        <th className="text-right py-2 px-2 text-xs text-muted-foreground uppercase tracking-wide font-medium">Imbalance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(data.bands ?? {}).map(([key, band]) => {
                        const label = BAND_LABELS[key] ?? key;
                        const bid = band.bid_notional ?? 0;
                        const ask = band.ask_notional ?? 0;
                        const total = bid + ask;
                        const imbalance = calcImbalance(bid, ask);
                        const isKeyBand = label === "25 bps" || label === "50 bps";
                        const isStructuralBand = label === "100 bps" || label === "200 bps";

                        return (
                          <tr 
                            key={key} 
                            className={cn(
                              "border-b border-border/50 transition-colors",
                              isKeyBand ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/30"
                            )}
                          >
                            <td className={cn(
                              "py-2 px-2 font-mono text-xs uppercase tracking-wide",
                              isKeyBand ? "text-primary text-sm font-semibold" : "font-medium",
                              isStructuralBand ? "opacity-60" : ""
                            )}>
                              {label}
                              {isKeyBand && (
                                <span className="relative inline-block ml-2 group">
                                  <span className="text-xs text-primary/70 cursor-help">KEY</span>
                                  <span className="absolute left-0 bottom-full mb-2 w-64 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                                    <span className="block bg-neutral-900 text-neutral-200 text-xs px-3 py-1 rounded-md shadow-lg whitespace-normal">
                                      25–50 bps captures the depth most large orders can access before price impact becomes dominant.
                                    </span>
                                  </span>
                                </span>
                              )}
                            </td>
                            <td className={cn(
                              "py-2 px-2 text-right font-mono text-sm text-emerald-400",
                              isKeyBand ? "font-semibold" : ""
                            )}>{formatUSD(bid)}</td>
                            <td className={cn(
                              "py-2 px-2 text-right font-mono text-sm text-red-400",
                              isKeyBand ? "font-semibold" : ""
                            )}>{formatUSD(ask)}</td>
                            <td className={cn(
                              "py-2 px-2 text-right font-mono text-sm font-bold",
                              isKeyBand ? "text-foreground" : "font-semibold"
                            )}>{formatUSD(total)}</td>
                            <td className="py-2 px-2 text-right text-sm">
                              <span
                                className={cn(
                                  "font-mono font-medium text-sm",
                                  imbalance > 0 ? "text-emerald-400" : imbalance < 0 ? "text-red-400" : "text-muted-foreground"
                                )}
                              >
                                {imbalance > 0 ? "+" : ""}{imbalance.toFixed(2)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
              </div>
            </Card>

            {/* TSLE Time-Series Chart (Binance only) */}
            {venue === "binance" && (
              <TSLEChart venue={venue} symbol={token} pollTick={pollTick} />
            )}

            {/* Raw JSON */}
            {showRaw && (
              <Card className="col-span-12 bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Raw LIS Response
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted/30 p-4 rounded-lg text-xs font-mono overflow-x-auto max-h-96 overflow-y-auto">
                    {JSON.stringify(data, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Loading State */}
        {!data && !error && (
          <Card className="bg-card border-border">
            <CardContent className="p-8 flex items-center justify-center">
              <PollingOrbital pollTick={pollTick} size={32} />
              <span className="ml-3 text-muted-foreground">Loading LIS data...</span>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
