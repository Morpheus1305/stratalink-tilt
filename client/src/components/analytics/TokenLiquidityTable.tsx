import { useEffect, useState } from "react";
import { TokenLiquiditySummary } from "@/types/liquidity";
import { fetchTokenLiquiditySummary } from "@/lib/liquiditySummaryClient";

interface Props {
  selectedToken: string;
  onSelectToken: (symbol: string) => void;
}

const regimeClass = (regime: string) => {
  switch (regime) {
    case "Ultra-Tight":
      return "bg-emerald-500/10 text-emerald-300 border-emerald-500/40";
    case "Tight":
      return "bg-sky-500/10 text-sky-300 border-sky-500/40";
    case "Constructive":
      return "bg-slate-500/10 text-slate-200 border-slate-500/40";
    case "Stressed":
      return "bg-amber-500/10 text-amber-300 border-amber-500/40";
    case "Block-Only":
      return "bg-red-500/10 text-red-300 border-red-500/40";
    default:
      return "bg-slate-600/10 text-slate-200 border-slate-500/30";
  }
};

const riskClass = (flag: string) => {
  switch (flag) {
    case "green":
      return "bg-emerald-500/10 text-emerald-300 border-emerald-500/40";
    case "amber":
      return "bg-amber-500/10 text-amber-300 border-amber-500/40";
    case "red":
      return "bg-red-500/10 text-red-300 border-red-500/40";
    default:
      return "bg-slate-600/10 text-slate-200 border-slate-500/30";
  }
};

const TokenLiquidityTable = ({ selectedToken, onSelectToken }: Props) => {
  const [rows, setRows] = useState<TokenLiquiditySummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    fetchTokenLiquiditySummary().then((data) => {
      if (!mounted) return;
      const sorted = [...data].sort((a, b) => b.factorScore - a.factorScore);
      setRows(sorted);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <section className="mb-6 rounded-xl border border-border bg-card p-4" data-testid="panel-liquidity-league-loading">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-foreground tracking-[0.16em] uppercase">
            Token Liquidity League Table
          </h2>
          <span className="text-xs text-muted-foreground">Loading...</span>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-6 rounded-xl border border-border bg-card p-4" data-testid="panel-liquidity-league">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground tracking-[0.16em] uppercase">
            Token Liquidity League Table
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Ranked by 5-Factor Score & max tradeable size at &lt;25bps impact. Click a row to focus a token.
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          Exec Regime:{" "}
          <span className="text-emerald-300">Ultra-Tight</span>,{" "}
          <span className="text-sky-300">Tight</span>,{" "}
          <span className="text-amber-300">Stressed</span>,{" "}
          <span className="text-red-300">Block-Only</span>.
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className="border-b border-border text-muted-foreground">
            <tr className="text-[10px] uppercase tracking-[0.16em]">
              <th className="py-2 pr-3 text-left">Token</th>
              <th className="py-2 pr-3 text-right">5-Factor</th>
              <th className="py-2 pr-3 text-right">&lt;25bps Size</th>
              <th className="py-2 pr-3 text-right">&lt;50bps Size</th>
              <th className="py-2 pr-3 text-left">Best Venue</th>
              <th className="py-2 pr-3 text-right">10bps Depth</th>
              <th className="py-2 pr-3 text-right">24h Δ Depth</th>
              <th className="py-2 pr-3 text-left">Exec Regime</th>
              <th className="py-2 pl-3 text-left">Risk</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const isActive = row.symbol === selectedToken;
              return (
                <tr
                  key={row.symbol}
                  data-testid={`row-token-${row.symbol}`}
                  className={`cursor-pointer border-b border-border/60 last:border-b-0 hover:bg-muted/40 transition-colors ${
                    isActive ? "bg-muted/60" : ""
                  }`}
                  onClick={() => onSelectToken(row.symbol)}
                >
                  <td className="py-2 pr-3 text-left">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isActive ? "bg-emerald-400" : "bg-slate-500"
                        }`}
                      />
                      <div className="flex flex-col">
                        <span className="text-foreground font-medium font-mono">{row.symbol}</span>
                        {row.name && (
                          <span className="text-[10px] text-muted-foreground uppercase tracking-[0.12em]">
                            {row.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-2 pr-3 text-right text-foreground font-mono">
                    {row.factorScore}
                  </td>
                  <td className="py-2 pr-3 text-right text-foreground font-mono">
                    ${row.max25bps.toLocaleString()}
                  </td>
                  <td className="py-2 pr-3 text-right text-foreground font-mono">
                    ${row.max50bps.toLocaleString()}
                  </td>
                  <td className="py-2 pr-3 text-left text-muted-foreground">
                    {row.bestVenue}
                  </td>
                  <td className="py-2 pr-3 text-right text-foreground font-mono">
                    ${row.depth10.toLocaleString()}
                  </td>
                  <td
                    className={`py-2 pr-3 text-right font-mono ${
                      row.depth10Change24h >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {row.depth10Change24h >= 0 ? "▲" : "▼"}
                    {Math.abs(row.depth10Change24h).toFixed(1)}%
                  </td>
                  <td className="py-2 pr-3 text-left">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${regimeClass(
                        row.execRegime
                      )}`}
                    >
                      {row.execRegime}
                    </span>
                  </td>
                  <td className="py-2 pl-3 text-left">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${riskClass(
                        row.riskFlag
                      )}`}
                    >
                      {row.riskFlag === "green"
                        ? "Low"
                        : row.riskFlag === "amber"
                        ? "Moderate"
                        : "High"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default TokenLiquidityTable;
