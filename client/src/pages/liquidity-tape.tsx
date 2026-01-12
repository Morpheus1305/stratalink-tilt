// client/src/pages/liquidity-tape.tsx
// Liquidity Tape v1.0 - Real-time consolidated liquidity feed

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Filter, Activity, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { LiquidityTapeEvent, LiquidityTapeEventType, LiquidityVenue } from "@shared/liquidityTape";

const EVENT_TYPE_COLORS: Record<LiquidityTapeEventType, string> = {
  DEPTH_UPDATE: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  SPREAD_UPDATE: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  FUNDING_RATE: "bg-green-500/20 text-green-400 border-green-500/30",
  IMBALANCE: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  MARK_PRICE: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
};

const VENUE_COLORS: Record<LiquidityVenue, string> = {
  binance: "bg-yellow-500/20 text-yellow-400",
  coinbase: "bg-blue-500/20 text-blue-400",
  kraken: "bg-purple-500/20 text-purple-400",
  okx: "bg-gray-500/20 text-gray-400",
  bybit: "bg-orange-500/20 text-orange-400",
  dex: "bg-green-500/20 text-green-400",
  unknown: "bg-gray-500/20 text-gray-500",
};

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatNumber(n: number, decimals = 2): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(decimals)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(decimals)}K`;
  return n.toFixed(decimals);
}

function PayloadDisplay({ event }: { event: LiquidityTapeEvent }) {
  const { type, payload } = event;

  switch (type) {
    case "DEPTH_UPDATE": {
      const p = payload as any;
      return (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Side:</span>
          <Badge variant="outline" className={p.side === "bid" ? "text-green-400" : "text-red-400"}>
            {p.side?.toUpperCase()}
          </Badge>
          <span className="text-muted-foreground">Depth:</span>
          <span className="font-mono">${formatNumber(p.depthUsd || 0)}</span>
          <span className="text-muted-foreground">@{p.bps}bps</span>
        </div>
      );
    }
    case "SPREAD_UPDATE": {
      const p = payload as any;
      return (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Spread:</span>
          <span className="font-mono">{p.spreadBps?.toFixed(2)}bps</span>
          <span className="text-muted-foreground">Mid:</span>
          <span className="font-mono">${formatNumber(p.mid || 0)}</span>
        </div>
      );
    }
    case "FUNDING_RATE": {
      const p = payload as any;
      const rate = (p.fundingRate * 100).toFixed(4);
      const apr = p.apr?.toFixed(2);
      const isPositive = p.fundingRate > 0;
      return (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Rate:</span>
          <span className={`font-mono ${isPositive ? "text-green-400" : "text-red-400"}`}>
            {isPositive ? "+" : ""}{rate}%
          </span>
          <span className="text-muted-foreground">APR:</span>
          <span className="font-mono">{apr}%</span>
        </div>
      );
    }
    case "IMBALANCE": {
      const p = payload as any;
      const pct = (p.imbalancePct * 100).toFixed(1);
      const icon = p.imbalancePct > 0.05 ? <TrendingUp className="w-3 h-3 text-green-400" /> :
                   p.imbalancePct < -0.05 ? <TrendingDown className="w-3 h-3 text-red-400" /> :
                   <Minus className="w-3 h-3 text-gray-400" />;
      return (
        <div className="flex items-center gap-2 text-xs">
          {icon}
          <span className="text-muted-foreground">Imbalance:</span>
          <span className="font-mono">{pct}%</span>
          <span className="text-muted-foreground">Total:</span>
          <span className="font-mono">${formatNumber(p.totalUsd || 0)}</span>
        </div>
      );
    }
    case "MARK_PRICE": {
      const p = payload as any;
      return (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Mark:</span>
          <span className="font-mono">${formatNumber(p.markPrice || 0)}</span>
        </div>
      );
    }
    default:
      return <span className="text-xs text-muted-foreground">—</span>;
  }
}

export default function LiquidityTapePage() {
  const [symbolFilter, setSymbolFilter] = useState("");
  const [venueFilter, setVenueFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [limit, setLimit] = useState(50);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (symbolFilter) params.set("symbol", symbolFilter.toUpperCase());
    if (venueFilter !== "all") params.set("venue", venueFilter);
    if (typeFilter !== "all") params.set("type", typeFilter);
    params.set("limit", String(limit));
    return params.toString();
  }, [symbolFilter, venueFilter, typeFilter, limit]);

  const { data, isLoading, refetch, isFetching } = useQuery<{
    ok: boolean;
    count: number;
    events: LiquidityTapeEvent[];
  }>({
    queryKey: ["/api/tape/latest", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/tape/latest?${queryParams}`);
      if (!res.ok) throw new Error("Failed to fetch tape");
      return res.json();
    },
    refetchInterval: 2000,
  });

  const events = data?.events || [];

  const stats = useMemo(() => {
    const byType: Record<string, number> = {};
    const byVenue: Record<string, number> = {};
    for (const e of events) {
      byType[e.type] = (byType[e.type] || 0) + 1;
      byVenue[e.venue] = (byVenue[e.venue] || 0) + 1;
    }
    return { byType, byVenue, total: events.length };
  }, [events]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Activity className="w-6 h-6 text-primary" />
              Liquidity Tape v1.0
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Real-time consolidated liquidity feed from all engines
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            data-testid="button-refresh-tape"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-foreground">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Events in view</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-400">{stats.byType["DEPTH_UPDATE"] || 0}</div>
              <div className="text-xs text-muted-foreground">Depth Updates</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-400">{stats.byType["FUNDING_RATE"] || 0}</div>
              <div className="text-xs text-muted-foreground">Funding Rates</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-orange-400">{stats.byType["IMBALANCE"] || 0}</div>
              <div className="text-xs text-muted-foreground">Imbalance Events</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Symbol (e.g., BTC)"
                  value={symbolFilter}
                  onChange={(e) => setSymbolFilter(e.target.value)}
                  className="h-9"
                  data-testid="input-symbol-filter"
                />
              </div>
              <Select value={venueFilter} onValueChange={setVenueFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-venue-filter">
                  <SelectValue placeholder="Venue" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Venues</SelectItem>
                  <SelectItem value="coinbase">Coinbase</SelectItem>
                  <SelectItem value="binance">Binance</SelectItem>
                  <SelectItem value="kraken">Kraken</SelectItem>
                  <SelectItem value="okx">OKX</SelectItem>
                  <SelectItem value="bybit">Bybit</SelectItem>
                  <SelectItem value="dex">DEX</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[160px]" data-testid="select-type-filter">
                  <SelectValue placeholder="Event Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="DEPTH_UPDATE">Depth Update</SelectItem>
                  <SelectItem value="SPREAD_UPDATE">Spread Update</SelectItem>
                  <SelectItem value="FUNDING_RATE">Funding Rate</SelectItem>
                  <SelectItem value="IMBALANCE">Imbalance</SelectItem>
                  <SelectItem value="MARK_PRICE">Mark Price</SelectItem>
                </SelectContent>
              </Select>
              <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
                <SelectTrigger className="w-[100px]" data-testid="select-limit">
                  <SelectValue placeholder="Limit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Event Stream</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                Loading tape events...
              </div>
            ) : events.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                No events match the current filters
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Time</TableHead>
                      <TableHead className="w-[80px]">Symbol</TableHead>
                      <TableHead className="w-[100px]">Venue</TableHead>
                      <TableHead className="w-[140px]">Type</TableHead>
                      <TableHead>Payload</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event.id} data-testid={`row-event-${event.id}`}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {formatTimestamp(event.ts)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {event.symbol}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${VENUE_COLORS[event.venue]} border-0`}>
                            {event.venue}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${EVENT_TYPE_COLORS[event.type]} border`}>
                            {event.type.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <PayloadDisplay event={event} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
