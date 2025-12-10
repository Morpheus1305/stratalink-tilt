import { useQuery } from "@tanstack/react-query";
import Card from "./Card";

interface StableBalance {
  balance: number;
  netFlow24h: number;
  flowPercent: number;
}

interface VenueFlow {
  venue: string;
  chain: string;
  usdc: StableBalance;
  usdt: StableBalance;
}

interface FlowData {
  flows: VenueFlow[];
  aggregate: {
    usdc: {
      totalBalance: number;
      netFlow24h: number;
      dominance: number;
    };
    usdt: {
      totalBalance: number;
      netFlow24h: number;
      dominance: number;
    };
  };
  netFlow24h: number;
  flowRegime: "INFLOW" | "OUTFLOW" | "NEUTRAL";
  ts: number;
}

function formatFlow(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toString();
}

export default function StablecoinFlowPanel() {
  const { data, isLoading } = useQuery<FlowData>({
    queryKey: ["/api/analytics/flows/stablecoins"],
    refetchInterval: 30000,
  });

  const regimeColor = data?.flowRegime === "INFLOW" ? "text-emerald-400" : data?.flowRegime === "OUTFLOW" ? "text-red-400" : "text-[#F5C211]";
  const regimeBg = data?.flowRegime === "INFLOW" ? "bg-emerald-500/10 border-emerald-500/40" : data?.flowRegime === "OUTFLOW" ? "bg-red-500/10 border-red-500/40" : "bg-[#F5C211]/10 border-[#F5C211]/40";

  return (
    <Card title="Net Stablecoin Flows">
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="text-xs text-muted-foreground">Loading flow data...</div>
        </div>
      ) : data ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">24h Net</span>
              <span className={`text-lg font-mono font-bold ${data.netFlow24h >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {data.netFlow24h >= 0 ? "+" : ""}{formatFlow(data.netFlow24h)}
              </span>
            </div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${regimeBg} ${regimeColor}`}>
              {data.flowRegime}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#0c1020] rounded-lg p-2 border border-[#1a2337]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-cyan-300 uppercase font-medium">USDC</span>
                <span className="text-[10px] text-muted-foreground">{data.aggregate.usdc.dominance}% dom</span>
              </div>
              <div className={`text-sm font-mono font-semibold ${data.aggregate.usdc.netFlow24h >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {data.aggregate.usdc.netFlow24h >= 0 ? "+" : ""}{formatFlow(data.aggregate.usdc.netFlow24h)}
              </div>
            </div>

            <div className="bg-[#0c1020] rounded-lg p-2 border border-[#1a2337]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-emerald-300 uppercase font-medium">USDT</span>
                <span className="text-[10px] text-muted-foreground">{data.aggregate.usdt.dominance}% dom</span>
              </div>
              <div className={`text-sm font-mono font-semibold ${data.aggregate.usdt.netFlow24h >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {data.aggregate.usdt.netFlow24h >= 0 ? "+" : ""}{formatFlow(data.aggregate.usdt.netFlow24h)}
              </div>
            </div>
          </div>

          <div className="bg-[#0c1020] rounded-lg p-2 border border-[#1a2337]">
            <div className="text-[10px] text-muted-foreground uppercase mb-2">Venue Flows (24h)</div>
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {data.flows.slice(0, 4).map((v) => {
                const totalFlow = v.usdc.netFlow24h + v.usdt.netFlow24h;
                return (
                  <div key={v.venue} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{v.venue}</span>
                    <span className={`font-mono ${totalFlow >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {totalFlow >= 0 ? "+" : ""}{formatFlow(totalFlow)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">No flow data available</div>
      )}
    </Card>
  );
}
