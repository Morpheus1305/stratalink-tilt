import React, { useMemo } from "react";
import { useLiquidityStore } from "@/state/useLiquidityStore";

// ==============================
// Utility — Colour Mapping
// ==============================
const regimeColor = (regime: string | null | undefined) => {
  switch (regime) {
    case "Ultra-Tight":
      return "text-green-300";
    case "Tight":
      return "text-emerald-300";
    case "Constructive":
      return "text-lime-300";
    case "Patchy":
      return "text-yellow-300";
    case "Thin":
      return "text-orange-400";
    case "Broken":
      return "text-red-400";
    default:
      return "text-gray-400";
  }
};

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
// Explanation snippets
// ==============================
const regimeExplanation = {
  "Ultra-Tight":
    "High-quality conditions: excellent depth, stable markets, low fragmentation.",
  Tight: "Strong liquidity profile: tight spreads, predictable execution.",
  Constructive:
    "Constructive liquidity: markets are orderly but monitor execution carefully.",
  Patchy:
    "Patchy conditions: spreads uneven, depth varies across venues. Proceed carefully.",
  Thin: "Thin liquidity: low depth & fragmented markets. Execution may slip.",
  Broken:
    "Broken liquidity regime: severe fragmentation & instability. Treat conditions as stressed.",
};

// ==============================
// Main Component
// ==============================
interface TslePanelProps {
  symbol?: string;
}

export default function TslePanel({ symbol = "BTC" }: TslePanelProps) {
  // Safely access store shape
  const store = useLiquidityStore((s: any) => s);
  const tsleData = store.tsleData ?? {};
  const tokenData = tsleData[symbol] ?? null;

  const fundingSnapshot = tokenData?.funding ?? null;
  const levels = tokenData?.depth?.levels ?? {};

  // ===============================
  // 5-FACTOR SCORE CALCULATION — FINAL VERSION
  // ===============================

  const depth = tokenData?.depth?.levels ?? {};
  const funding = fundingSnapshot?.headlineRate ?? fundingSnapshot?.rate ?? null;
  const regimeFromSnapshot = tokenData?.regime ?? null;
  const fragmentation = tokenData?.fragmentation ?? null;
  const concentration = tokenData?.execIntegrity != null ? 100 - tokenData.execIntegrity : null;

  // ---------- DEPTH QUALITY (0–100)
  const d25 = depth["25"]?.totalUsd ?? 0;
  const d50 = depth["50"]?.totalUsd ?? 0;
  const d100 = depth["100"]?.totalUsd ?? 0;

  const depthScore = (() => {
    const score =
      (Math.min(d25 / 5_000_000, 1) * 0.5 +
       Math.min(d50 / 10_000_000, 1) * 0.3 +
       Math.min(d100 / 20_000_000, 1) * 0.2) * 100;
    return Math.round(score);
  })();

  // ---------- EXECUTION EFFICIENCY (0–100)
  const executionScore = (() => {
    if (funding === null) return 0;
    const fr = Math.abs(funding);
    if (fr < 0.0001) return 95;
    if (fr < 0.0002) return 85;
    if (fr < 0.0005) return 70;
    if (fr < 0.0010) return 60;
    return 40;
  })();

  // ---------- LIQUIDITY STABILITY (0–100)
  const liquidityStabilityScore = (() => {
    if (!regimeFromSnapshot) return 45;
    switch (regimeFromSnapshot.toLowerCase()) {
      case "ultra-tight": return 95;
      case "tight": return 85;
      case "constructive": return 70;
      case "patchy": return 55;
      case "thin": return 35;
      case "broken": return 15;
      default: return 45;
    }
  })();

  // ---------- MARKET FRAGMENTATION (0–100)
  const fragmentationScore = (() => {
    if (fragmentation == null) return 50;
    return Math.max(0, 100 - fragmentation);
  })();

  // ---------- RISK CONCENTRATION (0–100)
  const riskScore = (() => {
    if (concentration == null) return 50;
    return Math.max(0, 100 - concentration);
  })();

  // ---------- FINAL COMPOSITE SCORE
  const fiveFactorScore = Math.round(
    depthScore * 0.30 +
    executionScore * 0.20 +
    liquidityStabilityScore * 0.20 +
    fragmentationScore * 0.15 +
    riskScore * 0.15
  );

  // ================
  // CLASSIFY REGIME
  // ================
  const regime = useMemo(() => {
    const s = fiveFactorScore;
    if (s >= 90) return "Ultra-Tight";
    if (s >= 80) return "Tight";
    if (s >= 65) return "Constructive";
    if (s >= 50) return "Patchy";
    return "Broken";
  }, [fiveFactorScore]);

  // ================
  // DEPTH BAND TABLE
  // ================
  const depthRows = Object.entries(levels ?? {}).filter(
    ([, obj]: any) => obj && (obj.bidUsd || obj.askUsd || obj.totalUsd)
  );

  return (
    <div className="bg-black/30 rounded-xl p-5 border border-gray-800/60">
      <h2 className="text-xl font-semibold mb-4">
        TSLE Score: {fiveFactorScore}/100
      </h2>
      <p className={`text-sm mb-4 ${regimeColor(regime)}`}>
        Liquidity Regime: {regime}
      </p>

      <div className="space-y-4">
        {/* === 5-Factor Breakdown === */}
        <div>
          <h3 className="text-lg font-medium mb-2">Liquidity 5-Factor Score</h3>

          <Factor label="Depth Quality" value={depthScore} />
          <Factor label="Execution Efficiency" value={executionScore} />
          <Factor label="Liquidity Stability" value={liquidityStabilityScore} />
          <Factor label="Market Fragmentation" value={fragmentationScore} />
          <Factor label="Risk Concentration" value={riskScore} />

          <div className="text-gray-400 text-sm mt-2">
            Overall Score:{" "}
            <span className="text-white font-bold">{fiveFactorScore}/100</span>
          </div>
        </div>

        {/* === Depth Table === */}
        <div>
          <h3 className="text-lg font-medium mb-2">Depth by Liquidity Bands</h3>

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
      </div>

      {/* === Explanation === */}
      <p className="text-gray-500 text-xs mt-4">
        {regimeExplanation[regime]}
      </p>
    </div>
  );
}

// ==============================
// Factor Subcomponent
// ==============================
function Factor({ label, value }: { label: string; value: number }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm text-gray-300 mb-1">
        <span>{label}</span>
        <span className="text-white">{value}</span>
      </div>
      <div className="w-full h-2 bg-gray-700 rounded">
        <div
          className={`h-2 rounded ${
            value >= 70
              ? "bg-green-400"
              : value >= 50
              ? "bg-yellow-400"
              : "bg-red-400"
          }`}
          style={{ width: `${value}%` }}
        ></div>
      </div>
    </div>
  );
}