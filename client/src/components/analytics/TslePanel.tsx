import { useEffect } from "react";
import { useLiquidityStore } from "@/state/useLiquidityStore";

//
// TSLE SCORING PANEL – ZUSTAND STORE VERSION
// - Uses centralized Zustand store for TSLE data
// - Falls back to regime-based scoring if no data
//

// ---------------------------------------------
// Regime → Color
// ---------------------------------------------
const regimeColor = (regime: string | null | undefined) => {
  switch (regime) {
    case "Ultra-Tight":
      return "text-green-400";
    case "Tight":
      return "text-emerald-300";
    case "Constructive":
      return "text-sky-300";
    case "Patchy":
      return "text-yellow-300";
    case "Thin":
      return "text-orange-400";
    case "Broken":
      return "text-red-500";
    default:
      return "text-gray-400";
  }
};

// ---------------------------------------------
// Depth Row Component
// ---------------------------------------------
interface DepthRowProps {
  bps: string;
  bid: string;
  ask: string;
  total: string;
}

function DepthRow({ bps, bid, ask, total }: DepthRowProps) {
  return (
    <tr className="border-t border-white/5">
      <td className="px-2 py-1">{bps}bps</td>
      <td className="px-2 py-1 text-right">{bid}</td>
      <td className="px-2 py-1 text-right">{ask}</td>
      <td className="px-2 py-1 text-right font-semibold">{total}</td>
    </tr>
  );
}

// ---------------------------------------------
// Execution Commentary
// ---------------------------------------------
const buildExecutionNote = (regime: string | null | undefined) => {
  switch (regime) {
    case "Ultra-Tight":
      return "Execution conditions excellent: deep liquidity, ultra-low slippage.";
    case "Tight":
      return "Stable liquidity profile; expected execution quality remains robust.";
    case "Constructive":
      return "Good depth available; normal execution conditions expected.";
    case "Patchy":
      return "Moderate depth available; monitor order sizes during high volatility.";
    case "Thin":
      return "Liquidity impaired; spreads widen beyond norms. Size management required.";
    case "Broken":
      return "Severely impaired liquidity: route carefully; high market impact risk.";
    default:
      return "Liquidity regime not yet classified — treat conditions as average and monitor closely.";
  }
};

// ---------------------------------------------
// Component
// ---------------------------------------------
interface TslePanelProps {
  symbol?: string;
  score?: number;
  regime?: string;
  depth?: number;
  funding?: number;
  friction?: number;
}

export default function TslePanel({ 
  symbol = "BTC",
  score: propScore,
  regime: propRegime,
  depth: propDepth,
  funding: propFunding,
  friction: propFriction,
}: TslePanelProps) {
  const { tsleData, refreshTSLE } = useLiquidityStore();
  const data = tsleData[symbol];

  useEffect(() => {
    if (!data) {
      refreshTSLE();
    }
  }, [symbol, data]);

  // Use props if provided, otherwise use store data
  const score = propScore ?? data?.tsle ?? null;
  const regime = propRegime ?? data?.regime ?? null;
  const depthScore = propDepth ?? data?.depthScore ?? null;
  const fundingScore = propFunding ?? data?.fundingScore ?? null;
  const frictionScore = propFriction ?? data?.execIntegrity ?? null;
  const stabilityScore = data?.stabilityScore ?? null;
  const fragmentation = data?.fragmentation ?? null;

  if (!data && !propScore) {
    return (
      <div className="p-4 rounded-lg bg-white/5 text-sm text-gray-400">
        Loading TSLE Liquidity Engine…
      </div>
    );
  }

  const executionNote = buildExecutionNote(regime);

  // Get depth levels from store
  const levels = tsleData[symbol]?.depth?.aggregate?.levels;

  // ---------------------------------------------
  // Render
  // ---------------------------------------------
  return (
    <div className="bg-white/5 rounded-lg p-4 flex flex-col gap-4" data-testid="panel-tsle">
      {/* HEADER */}
      <div className="flex flex-col gap-1">
        <div className="text-lg font-bold">
          TSLE Score:{" "}
          <span className={regimeColor(regime)}>
            {score !== null ? `${Math.round(score)}/100` : "N/A"}
          </span>
        </div>

        <div className="text-sm opacity-80">
          Liquidity Regime:{" "}
          <span className={regimeColor(regime)}>
            {regime ?? "Unknown"}
          </span>
        </div>

        <div className="text-xs flex flex-wrap gap-4 opacity-70">
          <span data-testid="text-depth-score">
            Depth: {depthScore !== null ? `${Math.round(depthScore)}/100` : "N/A"}
          </span>
          <span data-testid="text-funding-score">
            Funding: {fundingScore !== null ? `${Math.round(fundingScore)}/100` : "N/A"}
          </span>
          <span data-testid="text-friction-score">
            Exec Integrity: {frictionScore !== null ? `${Math.round(frictionScore)}/100` : "N/A"}
          </span>
          {stabilityScore !== null && (
            <span data-testid="text-stability-score">
              Stability: {Math.round(stabilityScore)}/100
            </span>
          )}
          {fragmentation !== null && (
            <span data-testid="text-fragmentation-score">
              Fragmentation: {Math.round(fragmentation)}/100
            </span>
          )}
        </div>
      </div>

      {/* DEPTH TABLE */}
      <div className="text-sm font-semibold opacity-80">
        Depth by Liquidity Bands
      </div>

      <div className="border border-white/10 rounded-md overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="opacity-50 bg-white/5">
              <th className="text-left px-2 py-1">Bps</th>
              <th className="text-right px-2 py-1">Bid USD</th>
              <th className="text-right px-2 py-1">Ask USD</th>
              <th className="text-right px-2 py-1">Total USD</th>
            </tr>
          </thead>
          <tbody>
            {levels ? (
              Object.entries(levels).map(([bps, lvl]: [string, any]) => (
                <DepthRow
                  key={bps}
                  bps={bps}
                  bid={lvl.bidUsd.toLocaleString()}
                  ask={lvl.askUsd.toLocaleString()}
                  total={lvl.totalUsd.toLocaleString()}
                />
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-2 py-2 text-center text-xs opacity-60">
                  No depth bands available yet for this token.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* EXECUTION NOTE */}
      <div className="text-xs mt-2 opacity-70 italic">{executionNote}</div>
    </div>
  );
}
