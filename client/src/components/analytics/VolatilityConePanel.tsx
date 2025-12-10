import { useQuery } from "@tanstack/react-query";
import Card from "./Card";

interface VolWindow {
  realised: number;
  implied: number;
  premium: number;
}

interface VolData {
  symbol: string;
  windows: {
    "1d": VolWindow;
    "7d": VolWindow;
    "30d": VolWindow;
  };
  avgPremium: number;
  regime: "RICH" | "FAIR" | "CHEAP";
  ts: number;
}

interface Props {
  symbol?: string;
}

export default function VolatilityConePanel({ symbol = "BTC" }: Props) {
  const { data, isLoading } = useQuery<VolData>({
    queryKey: ["/api/analytics/vol", symbol],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/vol/${symbol}`);
      if (!res.ok) throw new Error("Failed to fetch volatility data");
      return res.json();
    },
    refetchInterval: 15000,
  });

  const regimeColor = data?.regime === "RICH" ? "text-red-400" : data?.regime === "CHEAP" ? "text-emerald-400" : "text-[#F5C211]";
  const regimeBg = data?.regime === "RICH" ? "bg-red-500/10 border-red-500/40" : data?.regime === "CHEAP" ? "bg-emerald-500/10 border-emerald-500/40" : "bg-[#F5C211]/10 border-[#F5C211]/40";

  return (
    <Card title="Volatility Cone">
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="text-xs text-muted-foreground">Loading volatility data...</div>
        </div>
      ) : data ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Vol Premium Regime</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${regimeBg} ${regimeColor}`}>
              {data.regime}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            {(["1d", "7d", "30d"] as const).map((window) => (
              <div key={window} className="bg-[#0c1020] rounded-lg p-2 border border-[#1a2337]">
                <div className="text-[10px] text-muted-foreground uppercase mb-1">{window}</div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">RV</span>
                    <span className="font-mono text-slate-200">{data.windows[window].realised}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">IV</span>
                    <span className="font-mono text-cyan-300">{data.windows[window].implied}%</span>
                  </div>
                  <div className="flex justify-between text-xs pt-1 border-t border-[#1a2337]">
                    <span className="text-muted-foreground">Prm</span>
                    <span className={`font-mono ${data.windows[window].premium > 5 ? "text-red-400" : data.windows[window].premium < 2 ? "text-emerald-400" : "text-[#F5C211]"}`}>
                      +{data.windows[window].premium}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#1a2337]">
            <span className="text-xs text-muted-foreground">Avg Vol Premium</span>
            <span className={`text-sm font-mono font-semibold ${data.avgPremium > 5 ? "text-red-400" : data.avgPremium < 2 ? "text-emerald-400" : "text-[#F5C211]"}`}>
              +{data.avgPremium}%
            </span>
          </div>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">No volatility data available</div>
      )}
    </Card>
  );
}
