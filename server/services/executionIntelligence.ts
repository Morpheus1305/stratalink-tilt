import { computeTsleEngine, TsleResult } from "./tradeSizeEngine";
import { SupportedToken } from "./cexOrderbooks";

export interface ExecutionIntel {
  symbol: string;
  side: "buy" | "sell";
  maxSizeSignals: {
    bps10: number;
    bps25: number;
    bps50: number;
    bps100: number;
  };
  slippageRegime: "Ultra-Tight" | "Tight" | "Normal" | "Wide" | "Broken";
  bestVenue: string;
  venueSummary: string;
  executionRiskScore: number;
  commentary: string;
  generatedAt: number;
}

function classifySlippage(bps: number): ExecutionIntel["slippageRegime"] {
  if (bps < 5) return "Ultra-Tight";
  if (bps < 15) return "Tight";
  if (bps < 30) return "Normal";
  if (bps < 70) return "Wide";
  return "Broken";
}

function computeExecutionRisk(scoreInputs: {
  bps25: number;
  bps50: number;
  venueCount: number;
  venueBalance: number;
}): number {
  const { bps25, bps50, venueCount, venueBalance } = scoreInputs;

  let score = 100;

  score -= Math.min(bps25 * 0.5, 30);
  score -= Math.min(bps50 * 0.2, 20);

  if (venueCount === 1) score -= 25;
  if (venueCount === 2) score -= 10;

  score -= Math.abs(venueBalance) * 15;

  return Math.round(Math.max(0, Math.min(100, score)));
}

export async function computeExecutionIntel(
  symbol: string,
  side: "buy" | "sell"
): Promise<ExecutionIntel> {
  const tsle = await computeTsleEngine(symbol as SupportedToken, side, 5_000_000);

  const maxByBps: Record<number, number> = {};
  for (const row of tsle.maxSizeByBps) {
    maxByBps[row.bps] = row.maxSizeUsd;
  }

  const firstPoint = tsle.curve[0];
  const regime = firstPoint ? classifySlippage(firstPoint.bestSlippageBps) : "Broken";

  const p100k = tsle.curve.find((p) => p.sizeUsd >= 100000);
  const bestVenue = p100k?.bestVenue ?? firstPoint?.bestVenue ?? "coinbase";

  const venueDepths = tsle.venues.map(
    (v) => v.maxSize25bps + v.maxSize50bps + v.maxSize100bps
  );
  const totalDepth = venueDepths.reduce((a, b) => a + b, 0);
  const balance =
    totalDepth > 0 
      ? Math.max(...venueDepths) / totalDepth - 1 / venueDepths.length 
      : 0;

  const riskScore = computeExecutionRisk({
    bps25: firstPoint?.bestSlippageBps ?? 100,
    bps50: p100k?.bestSlippageBps ?? 100,
    venueCount: tsle.venues.length,
    venueBalance: balance,
  });

  const interpretation = riskScore > 85
    ? "Excellent execution conditions with deep, stable books across major venues."
    : riskScore > 65
    ? "Healthy liquidity, moderate fragmentation, acceptable slippage across venues."
    : riskScore > 45
    ? "Execution risk rising  -  watch venue imbalances and depth decay."
    : riskScore > 25
    ? "Poor liquidity environment  -  wide spreads and inconsistent depth across venues."
    : "Severely impaired liquidity  -  expect strong price impact and unreliable execution.";

  const commentary = `Execution environment for ${symbol} (${side}):
• Slippage regime: ${regime}
• Best venue at $100k: ${bestVenue}
• Max tradeable size <25bps: $${(maxByBps[25] / 1_000_000).toFixed(2)}M
• Risk Score: ${riskScore}/100

${interpretation}`;

  return {
    symbol,
    side,
    maxSizeSignals: {
      bps10: maxByBps[10] || 0,
      bps25: maxByBps[25] || 0,
      bps50: maxByBps[50] || 0,
      bps100: maxByBps[100] || 0,
    },
    slippageRegime: regime,
    bestVenue,
    venueSummary: `${bestVenue} currently offers the most stable + deepest execution conditions.`,
    executionRiskScore: riskScore,
    commentary,
    generatedAt: Date.now(),
  };
}
