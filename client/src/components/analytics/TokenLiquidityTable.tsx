import { useEffect, useState, useMemo } from "react";
import { TokenLiquiditySummary } from "@/types/liquidity";
import { fetchTokenLiquiditySummary } from "@/lib/liquiditySummaryClient";
import { useTsleDepth, formatUSD, getRegimeColor } from "@/utils/tsleDepth";
import { Zap, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  selectedToken: string;
  onSelectToken: (symbol: string) => void;
}

type SortField = "tsleScore" | "factorScore" | "max25bps" | "depth10" | "depth10Change24h";
type SortDirection = "asc" | "desc";

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

const getTsleBadgeClass = (score: number | null | undefined): string => {
  if (score == null) return "bg-slate-600/10 text-slate-200 border-slate-500/30";
  if (score >= 85) return "bg-emerald-500/20 border-emerald-500/40 text-emerald-200";
  if (score >= 70) return "bg-lime-500/20 border-lime-500/40 text-lime-200";
  if (score >= 55) return "bg-sky-500/15 border-sky-500/35 text-sky-200";
  if (score >= 40) return "bg-amber-500/15 border-amber-500/35 text-amber-200";
  if (score >= 25) return "bg-orange-500/15 border-orange-500/40 text-orange-200";
  return "bg-red-500/20 border-red-500/40 text-red-200";
};

const TokenLiquidityTable = ({ selectedToken, onSelectToken }: Props) => {
  const [rows, setRows] = useState<TokenLiquiditySummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sortField, setSortField] = useState<SortField>("tsleScore");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  const { data: tsle, loading: tsleLoading } = useTsleDepth(selectedToken, { side: "buy", size: 100_000 });

  const tsleRegimeLabel = tsle
    ? `${tsle.regime} · ${tsle.score}/100`
    : "Collecting liquidity data...";

  useEffect(() => {
    let mounted = true;
    fetchTokenLiquiditySummary().then((data) => {
      if (!mounted) return;
      setRows(data);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const sortedRows = useMemo(() => {
    const sorted = [...rows].sort((a, b) => {
      let aVal = a[sortField] ?? -Infinity;
      let bVal = b[sortField] ?? -Infinity;
      if (sortDir === "desc") return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
      return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
    });
    return sorted;
  }, [rows, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === "desc" 
      ? <ArrowDown className="w-3 h-3 text-[#F5C211]" /> 
      : <ArrowUp className="w-3 h-3 text-[#F5C211]" />;
  };

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
            Ranked by TSLE Score & max tradeable size. Click headers to sort. Click a row to focus a token.
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          TSLE Regime:{" "}
          <span className="text-emerald-300">Ultra-Tight</span>,{" "}
          <span className="text-lime-300">Tight</span>,{" "}
          <span className="text-sky-300">Constructive</span>,{" "}
          <span className="text-amber-300">Patchy</span>,{" "}
          <span className="text-orange-300">Thin</span>,{" "}
          <span className="text-red-300">Broken</span>.
        </div>
      </div>

      <div className="mb-3 p-2 rounded-lg bg-muted/30 border border-border flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Zap className="w-3 h-3 text-[#F5C211]" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">TSLE Live</span>
          <span className="text-xs font-mono text-foreground">{selectedToken}</span>
        </div>
        {tsleLoading ? (
          <span className="text-[10px] text-muted-foreground">Loading...</span>
        ) : tsle ? (
          <>
            <span className={`text-xs font-mono font-semibold ${getRegimeColor(tsle.regime)}`}>
              {tsleRegimeLabel}
            </span>
            <span className="text-[10px] text-muted-foreground">
              Impact: ~{tsle.estImpactBps.toFixed(1)}bps
            </span>
            <span className="text-[10px] text-muted-foreground">
              Max @25bps: {formatUSD(tsle.maxSizeAt25bps)}
            </span>
            {tsle.venues && tsle.venues.length > 0 && (
              <span className="text-[10px] text-muted-foreground ml-auto">
                {tsle.venues.map(v => `${v.venue} ${v.share25bps.toFixed(0)}%`).join(", ")}
              </span>
            )}
          </>
        ) : (
          <span className="text-[10px] text-muted-foreground">No data</span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className="border-b border-border text-muted-foreground">
            <tr className="text-[10px] uppercase tracking-[0.16em]">
              <th className="py-2 pr-3 text-left">Token</th>
              <th 
                className="py-2 pr-3 text-right cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort("tsleScore")}
                data-testid="sort-tsle"
              >
                <span className="inline-flex items-center gap-1">
                  TSLE <SortIcon field="tsleScore" />
                </span>
              </th>
              <th 
                className="py-2 pr-3 text-right cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort("factorScore")}
                data-testid="sort-factor"
              >
                <span className="inline-flex items-center gap-1">
                  5-Factor <SortIcon field="factorScore" />
                </span>
              </th>
              <th 
                className="py-2 pr-3 text-right cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort("max25bps")}
                data-testid="sort-max25"
              >
                <span className="inline-flex items-center gap-1">
                  &lt;25bps Size <SortIcon field="max25bps" />
                </span>
              </th>
              <th className="py-2 pr-3 text-right">&lt;50bps Size</th>
              <th className="py-2 pr-3 text-left">Best Venue</th>
              <th 
                className="py-2 pr-3 text-right cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort("depth10")}
                data-testid="sort-depth10"
              >
                <span className="inline-flex items-center gap-1">
                  10bps Depth <SortIcon field="depth10" />
                </span>
              </th>
              <th 
                className="py-2 pr-3 text-right cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort("depth10Change24h")}
                data-testid="sort-depth-change"
              >
                <span className="inline-flex items-center gap-1">
                  24h Δ <SortIcon field="depth10Change24h" />
                </span>
              </th>
              <th className="py-2 pr-3 text-left">Exec Regime</th>
              <th className="py-2 pl-3 text-left">Risk</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => {
              const isActive = row.symbol === selectedToken;
              return (
                <tr
                  key={row.symbol}
                  data-testid={`row-token-${row.symbol}`}
                  className={cn(
                    "cursor-pointer border-b border-border/60 last:border-b-0 hover:bg-muted/40 transition-colors",
                    isActive && "bg-muted/60"
                  )}
                  onClick={() => onSelectToken(row.symbol)}
                >
                  <td className="py-2 pr-3 text-left">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          isActive ? "bg-emerald-400" : "bg-slate-500"
                        )}
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
                  <td className="py-2 pr-3 text-right">
                    {row.tsleScore != null ? (
                      <div
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-[2px] text-[10px] font-medium",
                          getTsleBadgeClass(row.tsleScore)
                        )}
                        title={row.tsleRegime || ""}
                      >
                        <span>{row.tsleScore}</span>
                        {row.tsleRegime && (
                          <span className="uppercase tracking-[0.08em] text-[9px]">{row.tsleRegime}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-500">—</span>
                    )}
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
                    className={cn(
                      "py-2 pr-3 text-right font-mono",
                      row.depth10Change24h >= 0 ? "text-emerald-400" : "text-red-400"
                    )}
                  >
                    {row.depth10Change24h >= 0 ? "▲" : "▼"}
                    {Math.abs(row.depth10Change24h).toFixed(1)}%
                  </td>
                  <td className="py-2 pr-3 text-left">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                        regimeClass(row.execRegime)
                      )}
                    >
                      {row.execRegime}
                    </span>
                  </td>
                  <td className="py-2 pl-3 text-left">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                        riskClass(row.riskFlag)
                      )}
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
