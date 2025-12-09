import { useEffect } from "react";
import { useLiquidityStore } from "@/state/useLiquidityStore";

// ==============================
// Depth Row Component
// ==============================
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
    <tr className="border-b border-gray-700/60 text-sm">
      <td className="py-1 px-2 text-gray-300">{bps}bps</td>
      <td className="py-1 px-2 text-blue-300">${bid.toLocaleString()}</td>
      <td className="py-1 px-2 text-amber-300">${ask.toLocaleString()}</td>
      <td className="py-1 px-2 text-white font-medium">
        ${total.toLocaleString()}
      </td>
    </tr>
  );
}

// ==============================
// Main Component
// ==============================
interface TslePanelProps {
  symbol?: string;
}

export default function TslePanel({ symbol = "BTC" }: TslePanelProps) {
  const { tsleData, refreshTSLE } = useLiquidityStore();
  const tokenData = tsleData[symbol] ?? null;

  // Refresh data on mount if not available
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
    <div className="bg-black/30 rounded-xl p-5 border border-gray-800/60">
      <h3 className="text-lg font-medium mb-3">Depth by Liquidity Bands</h3>

      {depthRows.length === 0 ? (
        <p className="text-gray-500 text-sm">
          No depth bands available yet for this token.
        </p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-gray-400 text-sm border-b border-gray-700/50">
              <th className="py-1 px-2">Bps</th>
              <th className="py-1 px-2">Bid USD</th>
              <th className="py-1 px-2">Ask USD</th>
              <th className="py-1 px-2">Total USD</th>
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
