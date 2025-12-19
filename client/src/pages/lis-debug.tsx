import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Database, RefreshCw, Eye, EyeOff } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard-header";
import { PlatformTabs } from "@/components/platform-tabs";
import { cn } from "@/lib/utils";

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

const VENUE_CAPABILITIES: Record<string, { depth: boolean; funding: boolean }> = {
  binance: {
    depth: true,
    funding: true
  },
  coinbase: {
    depth: true,
    funding: false
  },
  okx: {
    depth: false,
    funding: true
  },
  kraken: {
    depth: false,
    funding: false
  }
};

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

export default function LiquidityTruthConsole() {
  const [token, setToken] = useState("BTC");
  const [venue, setVenue] = useState<Venue>("binance");
  const [data, setData] = useState<LISSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    let alive = true;
    setError(null);

    const fetchDepth = async () => {
      const res = await fetch(
        `/api/lis/${venue.toLowerCase()}/depth?symbol=${token}`
      );

      if (!res.ok) {
        throw new Error(`Depth not available for ${token} on ${venue}`);
      }

      return res.json();
    };

    const fetchData = () => {
      fetchDepth()
        .then((res) => {
          if (!alive) return;
          setData(res);
          setError(null);
          setLastUpdate(new Date());
        })
        .catch((err) => {
          if (!alive) return;
          setError(err?.message ?? "Failed to load LIS data");
        });
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);

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
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span className="font-mono">Updated {lastUpdate.toLocaleTimeString()}</span>
            </div>
          )}
        </div>

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
                  <SelectTrigger className="w-[180px] h-9 text-sm" data-testid="select-venue">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VENUES.map((v) => {
                      const caps = VENUE_CAPABILITIES[v];
                      const hasDepth = caps?.depth ?? false;
                      return (
                        <SelectItem key={v} value={v} disabled={!hasDepth}>
                          <span className="flex items-center gap-2">
                            {v.toUpperCase()}
                            {!hasDepth && <span className="text-xs text-muted-foreground">(no depth)</span>}
                          </span>
                        </SelectItem>
                      );
                    })}
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
            {/* Market Summary */}
            <Card className="col-span-12 lg:col-span-4 bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Market Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Venue</span>
                  <Badge variant="outline" className="font-mono">{data.venue.toUpperCase()}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Symbol</span>
                  <span className="font-mono font-semibold text-primary">{data.symbol}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Mid Price</span>
                  <span className="font-mono text-xl font-bold">${data.mid_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Spread</span>
                  <span className="font-mono text-accent">{(data.spread?.bps ?? 0).toFixed(4)} bps</span>
                </div>
              </CardContent>
            </Card>

            {/* Depth Table */}
            <Card className="col-span-12 lg:col-span-8 bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Orderbook Depth Bands
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-2 text-xs text-muted-foreground uppercase tracking-wide font-medium">Band</th>
                        <th className="text-right py-2 px-2 text-xs text-muted-foreground uppercase tracking-wide font-medium">Bid USD</th>
                        <th className="text-right py-2 px-2 text-xs text-muted-foreground uppercase tracking-wide font-medium">Ask USD</th>
                        <th className="text-right py-2 px-2 text-xs text-muted-foreground uppercase tracking-wide font-medium">Total USD</th>
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

                        return (
                          <tr key={key} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                            <td className="py-2 px-2 font-mono font-medium">{label}</td>
                            <td className="py-2 px-2 text-right font-mono text-emerald-400">{formatUSD(bid)}</td>
                            <td className="py-2 px-2 text-right font-mono text-red-400">{formatUSD(ask)}</td>
                            <td className="py-2 px-2 text-right font-mono font-semibold">{formatUSD(total)}</td>
                            <td className="py-2 px-2 text-right">
                              <span
                                className={cn(
                                  "font-mono font-medium",
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
              </CardContent>
            </Card>

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
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">Loading LIS data...</span>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
