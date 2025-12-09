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
export default function TslePanel() {
  const focus = useLiquidityStore((s) => s.focusToken);
  const snapshot = useLiquidityStore((s) => s.tokenSnapshots[focus ?? ""] ?? null);
  const fundingSnapshot = snapshot?.funding ?? null;
  const levels = snapshot?.aggregate?.levels ?? {};

  // ================
  // Extract depth numbers
  // ================
  const d10 = levels?.["10"]?.totalUsd ?? 0;
  const d25 = levels?.["25"]?.totalUsd ?? 0;

  // ================
  // DEPTH QUALITY SCORE
  // ================
  const depthScore = useMemo(() => {
    const s10 = Math.min((d10 / 40_000_000) * 100, 100);
    const s25 = Math.min((d25 / 80_000_000) * 100, 100);
    return Math.round(s10 * 0.4 + s25 * 0.6);
  }, [d10, d25]);

  // ================
  // EXECUTION EFFICIENCY
  // ================
  const executionScore = useMemo(() => {
    const fr = Math.abs(fundingSnapshot?.headlineRate ?? 0);
    if (fr < 0.00002) return 90;
    if (fr < 0.00005) return 75;
    if (fr < 0.0001) return 55;
    return 30;
  }, [fundingSnapshot]);

  // ================
  // MARKET FRAGMENTATION
  // ================
  const fragmentationScore = useMemo(() => {
    const aggMid = snapshot?.aggregate?.mid ?? null;
    const venues =
      snapshot?.venues?.filter((v) => v.ok && typeof v.mid === "number") ?? [];

    if (!aggMid || venues.length <= 1) return 40;

    const diffs = venues.map((v) => Math.abs(v.mid - aggMid) / aggMid);
    const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;

    if (avg < 0.0003) return 85;
    if (avg < 0.0007) return 65;
    return 40;
  }, [snapshot]);

  // ================
  // RISK CONCENTRATION
  // ================
  const concentrationScore = useMemo(() => {
    const venues =
      snapshot?.venues?.filter((v) => v.ok && v.levels?.["25"]) ?? [];

    const totals = venues.map((v) => v.levels["25"].totalUsd ?? 0);
    const total = totals.reduce((a, b) => a + b, 0);

    if (total === 0) return 30;

    const topShare = Math.max(...totals) / total;

    if (topShare < 0.45) return 70;
    if (topShare < 0.65) return 55;
    return 30;
  }, [snapshot]);

  // ================
  // CONSOLIDATED 5-FACTOR SCORE
  // ================
  const fiveFactorScore = useMemo(() => {
    const stabilityPlaceholder = 55; // until stability metric added
    return Math.round(
      depthScore * 0.35 +
        executionScore * 0.2 +
        stabilityPlaceholder * 0.15 +
        fragmentationScore * 0.15 +
        concentrationScore * 0.15
    );
  }, [
    depthScore,
    executionScore,
    fragmentationScore,
    concentrationScore,
  ]);

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
          <Factor label="Liquidity Stability" value={55} />
          <Factor label="Market Fragmentation" value={fragmentationScore} />
          <Factor label="Risk Concentration" value={concentrationScore} />

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