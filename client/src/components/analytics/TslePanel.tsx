import { useEffect } from "react";
import { useLiquidityStore } from "@/state/useLiquidityStore";

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
    <tr className="py-2 text-sm text-[var(--c-text-primary)] border-b border-[var(--c-border)] last:border-none">
      <td className="py-2 px-2 font-medium text-[var(--c-text-primary)]">{bps}bps</td>
      <td className="py-2 px-2 font-semibold text-[var(--c-text-primary)] text-right">
        ${bid.toLocaleString()}
      </td>
      <td className="py-2 px-2 font-semibold text-[var(--c-text-primary)] text-right">
        ${ask.toLocaleString()}
      </td>
      <td className="py-2 px-2 font-semibold text-[var(--c-text-primary)] text-right">
        ${total.toLocaleString()}
      </td>
    </tr>
  );
}

interface TslePanelProps {
  symbol?: string;
}

export default function TslePanel({ symbol = "BTC" }: TslePanelProps) {
  const { tsleData, refreshTSLE } = useLiquidityStore();
  const tokenData = tsleData[symbol] ?? null;

  useEffect(() => {
    if (!tokenData) {
      refreshTSLE();
    }
  }, [symbol, tokenData, refreshTSLE]);

  const levels = tokenData?.depth?.aggregate?.levels ?? {};

  const depthRows = Object.entries(levels ?? {}).filter(
    ([, obj]: any) => obj && (obj.bidUsd || obj.askUsd || obj.totalUsd)
  );

  return (
    <div className="bg-[var(--c-card)] rounded-xl p-5 shadow-sm border border-[var(--c-border)]">
      <h3 className="text-[var(--c-text-primary)] text-lg font-semibold tracking-tight mb-3">
        Depth by Liquidity Bands
      </h3>

      {depthRows.length === 0 ? (
        <p className="text-[var(--c-text-secondary)] text-sm">
          No depth bands available yet for this token.
        </p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-[var(--c-text-secondary)] text-xs uppercase tracking-wide pb-2 border-b border-[var(--c-border)]">
              <th className="py-2 px-2 text-left">Bps</th>
              <th className="py-2 px-2 text-right">Bid USD</th>
              <th className="py-2 px-2 text-right">Ask USD</th>
              <th className="py-2 px-2 text-right">Total USD</th>
            </tr>
          </thead>
          <tbody>
            {depthRows.map(([bps, obj]: any) => (
              <DepthRow
                key={bps}
                bps={bps}
                bid={obj.bidUsd ?? 0}
                ask={obj.askUsd ?? 0}
                total={obj.totalUsd ?? 0}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
