import { useEffect, useRef } from "react";
import { useLiquidityStore } from "@/state/useLiquidityStore";

const REFRESH_INTERVAL_MS = 10_000; // Refresh every 10 seconds

function DepthRow({
  bps,
  bid,
  ask,
  total,
}: {
  bps: string;
  bid: number;
  ask: number;
  total: number;
}) {
  return (
    <div className="grid grid-cols-4 gap-2 border-t border-slate-900/70 px-3 py-1.5 text-[11px] text-slate-200">
      <span className="font-medium">{bps}bps</span>
      <span className="text-right">${Math.round(bid).toLocaleString()}</span>
      <span className="text-right">${Math.round(ask).toLocaleString()}</span>
      <span className="text-right font-semibold">${Math.round(total).toLocaleString()}</span>
    </div>
  );
}

interface TslePanelProps {
  symbol?: string;
}

export default function TslePanel({ symbol = "BTC" }: TslePanelProps) {
  const { tsleData, refreshTSLE } = useLiquidityStore();
  const tokenData = tsleData[symbol] ?? null;

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initial fetch and periodic refresh for real-time data
  useEffect(() => {
    // Fetch immediately
    refreshTSLE();

    // Set up interval for real-time updates
    intervalRef.current = setInterval(() => {
      refreshTSLE();
    }, REFRESH_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [symbol, refreshTSLE]);

  const levels = tokenData?.depth?.aggregate?.levels ?? {};

  const depthRows = Object.entries(levels ?? {}).filter(
    ([, obj]: any) => obj && (obj.bidUsd || obj.askUsd || obj.totalUsd)
  );

  return (
    <section
      className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 sm:px-5 sm:py-4 shadow-[0_0_0_1px_rgba(15,23,42,0.6)]"
      data-testid={`panel-depth-bands-${symbol}`}
    >
      <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400 mb-3">
        Depth by Liquidity Bands
      </div>

      {depthRows.length === 0 ? (
        <div className="text-[11px] text-slate-400">
          No depth bands available yet for this token.
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/60">
          <div className="grid grid-cols-4 gap-2 border-b border-slate-800 px-3 py-1.5 text-[11px] font-medium text-slate-400">
            <span>BPS</span>
            <span className="text-right">BID USD</span>
            <span className="text-right">ASK USD</span>
            <span className="text-right">TOTAL USD</span>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {depthRows.map(([bps, obj]: any) => (
              <DepthRow
                key={bps}
                bps={bps}
                bid={obj.bidUsd ?? 0}
                ask={obj.askUsd ?? 0}
                total={obj.totalUsd ?? 0}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
