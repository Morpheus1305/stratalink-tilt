import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TT } from "@/components/tilt-tooltip";
import { Layers, TrendingUp, TrendingDown } from "lucide-react";

interface DepthVenue {
  venue: string;
  bid: number;
  ask: number;
  ok: boolean;
}

interface DepthSnapshot {
  symbol: string;
  bps: number;
  venues: DepthVenue[];
  totalBid: number;
  totalAsk: number;
  symmetry: number;
  timestamp: number;
  source: string;
}

function formatUSD(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

interface Props {
  symbol: string;
  bps?: number;
}

export default function MultiVenueDepthPanel({ symbol, bps = 10 }: Props) {
  const { data, isLoading, error } = useQuery<DepthSnapshot>({
    queryKey: ["/api/depth/snapshot", symbol, bps],
    queryFn: async () => {
      const res = await fetch(`/api/depth/snapshot?symbol=${symbol}&bps=${bps}`);
      if (!res.ok) throw new Error("Failed to fetch depth");
      return res.json();
    },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader className="pb-2">
          <TT title={`${bps}bps Order Book Depth`} body="Aggregated order book depth at this price band for the selected symbol, broken down by contributing venue. Larger bid and ask totals with high symmetry indicate healthy two-sided liquidity. Imbalances above ±20% signal directional positioning pressure.">
            <CardTitle className="text-sm font-medium text-slate-400">
              {bps}bps Depth  -  {symbol}
            </CardTitle>
          </TT>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-slate-800 rounded w-3/4" />
            <div className="h-4 bg-slate-800 rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="py-4">
          <span className="text-red-400 text-sm">Depth unavailable</span>
        </CardContent>
      </Card>
    );
  }

  const symmetryPct = (data.symmetry * 100).toFixed(1);
  const isBalanced = data.symmetry >= 0.8;
  const isBidHeavy = data.totalBid > data.totalAsk * 1.2;

  return (
    <Card className="bg-slate-900/50 border-slate-800" data-testid={`panel-depth-${symbol}`}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <TT title={`${bps}bps Order Book Depth`} body="Aggregated order book depth at this price band for the selected symbol, broken down by contributing venue. Larger bid and ask totals with high symmetry indicate healthy two-sided liquidity. Imbalances above ±20% signal directional positioning pressure.">
          <CardTitle className="text-sm font-medium text-slate-200 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            {bps}bps Depth  -  {symbol}
          </CardTitle>
        </TT>
        <Badge 
          variant="outline" 
          className={`text-xs ${data.source === "proxy" ? "border-emerald-500 text-emerald-400" : "border-slate-600 text-slate-400"}`}
        >
          {data.source === "proxy" ? "Multi-Venue" : "OKX"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700">
            <div className="text-slate-400 text-xs flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              Total Bid
            </div>
            <div className="text-emerald-400 text-lg font-mono font-semibold">
              {formatUSD(data.totalBid)}
            </div>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700">
            <div className="text-slate-400 text-xs flex items-center gap-1">
              <TrendingDown className="w-3 h-3 text-red-400" />
              Total Ask
            </div>
            <div className="text-red-400 text-lg font-mono font-semibold">
              {formatUSD(data.totalAsk)}
            </div>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700">
            <div className="text-slate-400 text-xs">Symmetry</div>
            <div className={`text-lg font-mono font-semibold ${isBalanced ? "text-emerald-400" : "text-yellow-400"}`}>
              {symmetryPct}%
            </div>
            <div className="text-slate-500 text-xs">
              {isBalanced ? "Balanced" : isBidHeavy ? "Bid Heavy" : "Ask Heavy"}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-700 pt-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-500 text-xs">
                <th className="text-left pb-2">Venue</th>
                <th className="text-right pb-2">Bid</th>
                <th className="text-right pb-2">Ask</th>
                <th className="text-right pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.venues.map((v) => (
                <tr key={v.venue} className="border-t border-slate-800">
                  <td className="py-2 text-slate-200 font-medium">{v.venue}</td>
                  <td className="py-2 text-right font-mono text-emerald-400">
                    {formatUSD(v.bid)}
                  </td>
                  <td className="py-2 text-right font-mono text-red-400">
                    {formatUSD(v.ask)}
                  </td>
                  <td className="py-2 text-right">
                    <span className={`text-xs ${v.ok ? "text-emerald-400" : "text-red-400"}`}>
                      {v.ok ? "●" : "○"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
