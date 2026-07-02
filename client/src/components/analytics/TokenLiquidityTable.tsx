import { useEffect, useState, useMemo, useRef } from "react";
import { TT } from "@/components/tilt-tooltip";
import { TokenLiquiditySummary } from "@/types/liquidity";
import { fetchTokenLiquiditySummary } from "@/lib/liquiditySummaryClient";
import { useTsleDepth, formatUSD, getRegimeColor, getTsleScoreBadgeColor, stressBadgeColor, stressCellColor } from "@/utils/tsleDepth";
import { useLiquidityStore } from "@/state/useLiquidityStore";
import { Badge } from "@/components/ui/badge";
import { Zap, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

type TsleRegime =
  | "Ultra-Tight"
  | "Tight"
  | "Constructive"
  | "Patchy"
  | "Thin"
  | "Broken";

type TsleBatchItem = {
  symbol: string;
  score: number;
  regime: TsleRegime;
  source: string;
};

function getTsleBadgeClass(regime: TsleRegime): string {
  const base =
    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border";

  switch (regime) {
    case "Ultra-Tight":
      return `${base} bg-emerald-500/10 text-emerald-300 border-emerald-500/60`;
    case "Tight":
      return `${base} bg-lime-500/10 text-lime-300 border-lime-500/60`;
    case "Constructive":
      return `${base} bg-sky-500/10 text-sky-300 border-sky-500/60`;
    case "Patchy":
      return `${base} bg-cyan-500/10 text-cyan-200 border-cyan-500/40`;
    case "Thin":
      return `${base} bg-amber-500/10 text-amber-300 border-amber-500/60`;
    case "Broken":
    default:
      return `${base} bg-rose-500/15 text-rose-300 border-rose-500/70`;
  }
}

interface Props {
  selectedToken: string;
  onSelectToken: (symbol: string) => void;
  batchFactors?: Record<string, any> | null;
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


const TRACKED_TOKENS = ["BTC", "ETH", "SOL", "LINK", "NEAR", "AVAX", "DOT", "ADA", "XRP"];

const TokenLiquidityTable = ({ selectedToken, onSelectToken, batchFactors }: Props) => {
  const [rows, setRows] = useState<TokenLiquiditySummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sortField, setSortField] = useState<SortField>("tsleScore");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [tsleBatch, setTsleBatch] = useState<Record<string, TsleBatchItem>>({});
  const tsleBatchRef = useRef<Record<string, TsleBatchItem>>({});

  const { tsleData, refreshTSLE } = useLiquidityStore();
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
    refreshTSLE();
    
    const fetchTsleBatch = async () => {
      try {
        const res = await fetch(`/api/tsle/batch?symbols=${TRACKED_TOKENS.join(",")}`);
        if (res.ok) {
          const data = await res.json();
          if (mounted) {
            tsleBatchRef.current = data;
            setTsleBatch(data);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch TSLE batch:", err);
      }
    };
    
    fetchTsleBatch();
    const intervalId = setInterval(fetchTsleBatch, 30_000);
    
    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, []);

  const sortedRows = useMemo(() => {
    const sorted = [...rows].sort((a, b) => {
      let aVal: number;
      let bVal: number;
      
      if (sortField === "factorScore") {
        aVal = batchFactors?.[a.symbol]?.composite ?? a.factorScore ?? -Infinity;
        bVal = batchFactors?.[b.symbol]?.composite ?? b.factorScore ?? -Infinity;
      } else if (sortField === "tsleScore") {
        aVal = tsleBatch[a.symbol]?.score ?? a.tsleScore ?? -Infinity;
        bVal = tsleBatch[b.symbol]?.score ?? b.tsleScore ?? -Infinity;
      } else {
        aVal = a[sortField] ?? -Infinity;
        bVal = b[sortField] ?? -Infinity;
      }
      
      if (sortDir === "desc") return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
      return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
    });
    return sorted;
  }, [rows, sortField, sortDir, batchFactors, tsleBatch]);

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
          <TT title="Token Liquidity League Table" body="Sortable ranking of all tracked tokens by liquidity quality. Columns are ranked by TSLE Score and max tradeable size. Click any column header to re-sort. Click a row to set that token as the active selection for all panels. Red rows indicate tokens in degraded liquidity regimes.">
            <h2 className="text-sm font-semibold text-foreground tracking-[0.16em] uppercase">
              Token Liquidity League Table
            </h2>
          </TT>
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
              <th className="py-2 pr-3 text-left"><TT title="Token" body="Asset ticker symbol. Click the row to focus this token across all analytics panels.">Token</TT></th>
              <th 
                className="py-2 pr-3 text-right cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort("tsleScore")}
                data-testid="sort-tsle"
              >
                <span className="inline-flex items-center gap-1">
                  <TT title="TSLE Score" body="Time-Series Liquidity Efficiency score. Composite of depth, spread, and execution quality over a rolling window. Higher = more efficient. Ultra-Tight > 90, Tight > 75, Constructive > 60, Patchy > 40, Thin > 20, Broken ≤ 20.">TSLE</TT> <SortIcon field="tsleScore" />
                </span>
              </th>
              <th 
                className="py-2 pr-3 text-right cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort("factorScore")}
                data-testid="sort-factor"
              >
                <span className="inline-flex items-center gap-1">
                  <TT title="5-Factor Score" body="L5F composite score for this token (0-100). Weighted aggregate of Depth Quality, Resilience, Fragmentation, Execution Integrity, and Regime Stability. Below 50 = fragile. Used to derive PoLi ratings.">5-Factor</TT> <SortIcon field="factorScore" />
                </span>
              </th>
              <th 
                className="py-2 pr-3 text-right cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort("max25bps")}
                data-testid="sort-max25"
              >
                <span className="inline-flex items-center gap-1">
                  <TT title="Max Size at &lt;25bps Impact" body="Maximum single order size executable with less than 25 basis points of price impact. This is the key institutional execution threshold — the upper bound of what can be traded cleanly in one order."><>{"<25bps Size"}</></TT> <SortIcon field="max25bps" />
                </span>
              </th>
              <th className="py-2 pr-3 text-right"><TT title="Max Size at &lt;50bps Impact" body="Maximum single order size that can be executed with less than 50 bps of price impact across all venues. Institutional threshold for less-time-sensitive execution.">{"<50bps Size"}</TT></th>
              <th className="py-2 pr-3 text-left"><TT title="Best Venue" body="The exchange or DEX currently offering the tightest spread and deepest liquidity for this token. Use this for primary venue routing decisions.">Best Venue</TT></th>
              <th 
                className="py-2 pr-3 text-right cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort("depth10")}
                data-testid="sort-depth10"
              >
                <span className="inline-flex items-center gap-1">
                  <TT title="10bps Depth" body="Total order book depth within 10 basis points of mid-price (sum of bid and ask sides). This is the tightest and most reliable liquidity band — it's the depth available without any meaningful price impact for standard institutional execution.">10bps Depth</TT> <SortIcon field="depth10" />
                </span>
              </th>
              <th 
                className="py-2 pr-3 text-right cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort("depth10Change24h")}
                data-testid="sort-depth-change"
              >
                <span className="inline-flex items-center gap-1">
                  <TT title="24h Depth Change" body="Percentage change in 10bps depth over the past 24 hours. Negative values indicate structural liquidity withdrawal. A decline of more than 20% in 24h is a significant warning signal even if absolute depth remains high.">24h Δ</TT> <SortIcon field="depth10Change24h" />
                </span>
              </th>
              <th className="py-2 pr-3 text-left"><TT title="Execution Regime" body="Current execution quality regime for this token: Ultra-Tight, Tight, Constructive, Patchy, Thin, or Broken. Determines whether institutional-scale execution is feasible at current market conditions.">Exec Regime</TT></th>
              <th className="py-2 pl-3 text-left"><TT title="Risk Flag" body="Aggregated risk classification based on stress score, regime stability, and fragmentation index. LOW = normal conditions. MEDIUM = monitor closely. HIGH = reduce exposure. CRITICAL = immediate action required.">Risk</TT></th>
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
                  <td className="py-2 pr-3 text-right tsle-cell">
                    {(() => {
                      const batchItem = tsleBatch[row.symbol];
                      const tokenData = tsleData[row.symbol];
                      
                      const score: number =
                        batchItem?.score ??
                        tokenData?.tsle ??
                        0;

                      const regime: TsleRegime =
                        (batchItem?.regime as TsleRegime) ??
                        (tokenData?.regime as TsleRegime) ??
                        "Patchy";

                      if (score === 0) {
                        return <span className="text-[10px] text-slate-500"> - </span>;
                      }

                      return (
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-xs font-mono text-slate-50/90 min-w-[2ch]">
                            {score}
                          </span>
                          <span className={getTsleBadgeClass(regime)}>
                            {regime}
                          </span>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="py-2 pr-3 text-right text-foreground font-mono">
                    {batchFactors?.[row.symbol]?.composite ?? row.factorScore}
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
