import { useQuery } from "@tanstack/react-query";
import Card from "./Card";

interface VenueSpread {
  venue: string;
  bidAskSpread: number;
  liquidity: string;
}

interface SpreadData {
  symbol: string;
  cex: VenueSpread[];
  dex: VenueSpread[];
  avgCexSpread: number;
  avgDexSpread: number;
  divergence: number;
  divergencePercent: number;
  bestCex: string;
  bestDex: string;
  ts: number;
}

interface Props {
  symbol?: string;
}

export default function CexDexGauge({ symbol = "BTC" }: Props) {
  const { data, isLoading } = useQuery<SpreadData>({
    queryKey: ["/api/analytics/spreads/cex-dex", symbol],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/spreads/cex-dex/${symbol}`);
      if (!res.ok) throw new Error("Failed to fetch spread data");
      return res.json();
    },
    refetchInterval: 10000,
  });

  const divergenceColor = data && data.divergencePercent > 150 ? "text-red-400" : data && data.divergencePercent < 80 ? "text-emerald-400" : "text-[#F5C211]";

  return (
    <Card title="CEX / DEX Spread Divergence">
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="text-xs text-muted-foreground">Loading spread data...</div>
        </div>
      ) : data ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Divergence</span>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-mono font-bold ${divergenceColor}`}>
                {data.divergencePercent > 0 ? "+" : ""}{data.divergencePercent}%
              </span>
              <span className="text-xs text-muted-foreground">DEX wider</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#0c1020] rounded-lg p-2 border border-[#1a2337]">
              <div className="text-[10px] text-muted-foreground uppercase mb-2 flex items-center justify-between">
                <span>CEX Venues</span>
                <span className="text-emerald-400">{data.avgCexSpread} bps avg</span>
              </div>
              <div className="space-y-1">
                {data.cex.map((v) => (
                  <div key={v.venue} className="flex justify-between text-xs">
                    <span className={v.venue === data.bestCex ? "text-emerald-300 font-medium" : "text-muted-foreground"}>
                      {v.venue}
                    </span>
                    <span className="font-mono text-slate-200">{v.bidAskSpread} bps</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#0c1020] rounded-lg p-2 border border-[#1a2337]">
              <div className="text-[10px] text-muted-foreground uppercase mb-2 flex items-center justify-between">
                <span>DEX Venues</span>
                <span className="text-amber-400">{data.avgDexSpread} bps avg</span>
              </div>
              <div className="space-y-1">
                {data.dex.map((v) => (
                  <div key={v.venue} className="flex justify-between text-xs">
                    <span className={v.venue === data.bestDex ? "text-cyan-300 font-medium" : "text-muted-foreground"}>
                      {v.venue}
                    </span>
                    <span className="font-mono text-slate-200">{v.bidAskSpread} bps</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#1a2337]">
            <div className="text-xs">
              <span className="text-muted-foreground">Best CEX: </span>
              <span className="text-emerald-300 font-medium">{data.bestCex}</span>
            </div>
            <div className="text-xs">
              <span className="text-muted-foreground">Best DEX: </span>
              <span className="text-cyan-300 font-medium">{data.bestDex}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">No spread data available</div>
      )}
    </Card>
  );
}
