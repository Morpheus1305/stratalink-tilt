// ----------------------------------------
// TSLE Scoring Engine 2.0 (Unified Version)
// ----------------------------------------

import { getDepthForToken } from "@/data/depth";
import { getFundingForToken } from "@/data/funding";
import { getFragmentationScore } from "@/data/fragmentation";
import { getExecutionIntegrityScore } from "@/data/execution";

// Weightings for TSLE 2.0
const WEIGHTS = {
  depth: 0.35,
  funding: 0.15,
  stability: 0.15,
  fragmentation: 0.20,
  execution: 0.15,
};

// 5-Factor LIQ score weightings
const FACTOR_WEIGHTS = {
  depthQuality: 0.30,
  executionEfficiency: 0.20,
  liquidityStability: 0.20,
  marketFragmentation: 0.15,
  riskConcentration: 0.15,
};

// Regime boundaries
const REGIME_MAP = [
  { min: 90, name: "Ultra-Tight" },
  { min: 80, name: "Tight" },
  { min: 70, name: "Constructive" },
  { min: 60, name: "Patchy" },
  { min: 0, name: "Broken" },
];

// ---------------------------
// Helper → classify regime
// ---------------------------
function classifyRegime(score: number) {
  for (const r of REGIME_MAP) {
    if (score >= r.min) return r.name;
  }
  return "Unknown";
}

// ---------------------------
// Compute 5-Factor Liquidity Score
// ---------------------------
export async function computeFiveFactorScore(token: string, depth: any, funding: any) {
  const depthQuality = Math.min(100, (depth?.["25"]?.totalUsd ?? 0) / 30000000 * 100);
  const executionEfficiency = await getExecutionIntegrityScore(token);
  const liquidityStability = Math.max(0, 100 - Math.abs(funding?.apr ?? 0) * 10);
  const marketFragmentation = await getFragmentationScore(token);
  const riskConcentration = Math.min(100, (depth?.venues?.length ?? 1) * 20);

  const combined =
    depthQuality * FACTOR_WEIGHTS.depthQuality +
    executionEfficiency * FACTOR_WEIGHTS.executionEfficiency +
    liquidityStability * FACTOR_WEIGHTS.liquidityStability +
    marketFragmentation * FACTOR_WEIGHTS.marketFragmentation +
    riskConcentration * FACTOR_WEIGHTS.riskConcentration;

  return {
    score: Math.round(combined),
    factors: {
      depthQuality,
      executionEfficiency,
      liquidityStability,
      marketFragmentation,
      riskConcentration,
    }
  };
}

// ---------------------------
// Main TSLE computation
// ---------------------------
export async function computeTSLE(token: string) {

  const depth = await getDepthForToken(token);
  const funding = await getFundingForToken(token);
  const fragmentation = await getFragmentationScore(token);
  const execIntegrity = await getExecutionIntegrityScore(token);

  const depthScore = Math.min(100, (depth?.aggregate?.levels?.["25"]?.totalUsd ?? 0) / 25000000 * 100);
  const fundingScore = Math.max(0, 100 - Math.abs(funding?.apr ?? 0) * 8);
  const stabilityScore = Math.min(100, (depth?.venues?.length ?? 1) * 25);

  const tsle =
    depthScore * WEIGHTS.depth +
    fundingScore * WEIGHTS.funding +
    stabilityScore * WEIGHTS.stability +
    fragmentation * WEIGHTS.fragmentation +
    execIntegrity * WEIGHTS.execution;

  const fiveFactor = await computeFiveFactorScore(token, depth.aggregate?.levels, funding);

  return {
    token,
    tsle: Math.round(tsle),
    regime: classifyRegime(Math.round(tsle)),
    depthScore,
    fundingScore,
    stabilityScore,
    fragmentation,
    execIntegrity,
    fiveFactor,
    depth,
    funding,
  };
}

// ---------------------------
// Compute TSLE for all tokens
// ---------------------------
export async function computeAllTokens(tokens: string[]) {
  const results: Record<string, Awaited<ReturnType<typeof computeTSLE>>> = {};
  for (const t of tokens) {
    results[t] = await computeTSLE(t);
  }
  return results;
}
