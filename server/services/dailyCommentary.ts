import { computeTsleEngine, TsleSide } from "./tradeSizeEngine";
import { computeExecutionIntel } from "./executionIntelligence";
import { SupportedToken } from "./cexOrderbooks";
import { storage, CommentarySnapshot } from "../storage";
import type { CommentaryDelta } from "@shared/schema";

export type DailyCommentary = {
  symbol: SupportedToken;
  side: TsleSide;
  dominantFactor: string;
  marketStructureRegime: string;
  executionSummaryBullets: string[];
  executionRiskScore: number;
  slippageRegime: string;
  bestVenue: string;
  maxSize25bps: number;
  maxSize50bps: number;
  generatedAt: number;
  delta: CommentaryDelta | null;
};

function formatUsdCompact(v: number): string {
  if (!isFinite(v) || v <= 0) return "$0";
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function formatDeltaPct(pct: number): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

function getTodayDateUTC(): string {
  return new Date().toISOString().split("T")[0];
}

function buildDominantFactor(
  symbol: string,
  slippageRegime: string,
  riskScore: number,
  bestVenue: string
): string {
  const venue = bestVenue.toUpperCase();
  
  if (riskScore >= 85) {
    return `Order book is fully two-sided across ${venue}; sweep cost remains inside 18bps. Execution posture: FAVORABLE.`;
  }
  if (riskScore >= 70) {
    return `Depth concentrated on ${venue} with adequate secondary venue support. Sweep cost 18-35bps. Execution posture: CONSTRUCTIVE.`;
  }
  if (riskScore >= 55) {
    return `Liquidity fragmented; ${venue} holds primary depth but secondary venues thin. Sweep cost 35-60bps. Execution posture: CAUTIOUS.`;
  }
  if (riskScore >= 40) {
    return `Books one-sided with widening spreads. ${venue} remains viable but off-venue depth sparse. Execution posture: DEFENSIVE.`;
  }
  return `Stress conditions: thin depth, wide spreads, ${slippageRegime.toLowerCase()} slippage profile. Execution posture: AVOID LARGE FLOWS.`;
}

function buildMarketStructureRegime(
  symbol: string,
  slippageRegime: string,
  riskScore: number,
  maxSize25bps: number,
  maxSize50bps: number
): string {
  const s25 = formatUsdCompact(maxSize25bps);
  const s50 = formatUsdCompact(maxSize50bps);

  if (riskScore >= 85) {
    return `LOW-IMPACT regime: ${symbol} absorbs flows to ${s25} inside 25bps; ${s50} clears inside 50bps without material footprint.`;
  }
  if (riskScore >= 70) {
    return `BALANCED regime: ${symbol} tolerates ${s25} inside 25bps. Impact curve steepens beyond ${s50}; recommend TWAP above this threshold.`;
  }
  if (riskScore >= 55) {
    return `FRAGILE regime: Impact accelerates sharply beyond ${s25}. Orders above ${s50} require execution algo or risk adverse selection.`;
  }
  if (riskScore >= 40) {
    return `STRESSED regime: Depth walls encountered at ${s25}. Block trades to ${s50} will print with 50-100bps impact.`;
  }
  return `DELEVERAGING regime: Mid-sized orders hit depth walls. Block trades face significant price impact; consider off-exchange RFQ.`;
}

function buildExecutionBullets(
  maxSize25bps: number,
  maxSize50bps: number,
  slippageRegime: string,
  riskScore: number,
  bestVenue: string,
  delta: CommentaryDelta | null
): string[] {
  const s25 = formatUsdCompact(maxSize25bps);
  const s50 = formatUsdCompact(maxSize50bps);
  const venue = bestVenue.toUpperCase();

  const bullets: string[] = [
    `Max size <25bps impact: **${s25}**`,
    `Max size <50bps impact: **${s50}**`,
    `Slippage regime: **${slippageRegime}** | Risk score: **${riskScore}/100**`,
    `Primary venue: **${venue}**`,
  ];

  if (delta) {
    const parts: string[] = [];
    if (delta.riskScoreDelta !== null) {
      const sign = delta.riskScoreDelta >= 0 ? "+" : "";
      parts.push(`Risk ${sign}${delta.riskScoreDelta} pts`);
    }
    if (delta.maxSize25bpsDeltaPct !== null) {
      parts.push(`25bps capacity ${formatDeltaPct(delta.maxSize25bpsDeltaPct)}`);
    }
    if (delta.regimeChange) {
      parts.push(`Regime: ${delta.regimeChange}`);
    }
    if (parts.length > 0) {
      bullets.push(`vs Prior: ${parts.join(" | ")}`);
    }
  }

  return bullets;
}

function computeDelta(
  current: { riskScore: number; max25: number; max50: number; regime: string },
  prior: CommentarySnapshot | null
): CommentaryDelta | null {
  if (!prior) return null;

  const riskScoreDelta = current.riskScore - prior.executionRiskScore;
  
  const max25DeltaPct =
    prior.maxSize25bps > 0
      ? ((current.max25 - prior.maxSize25bps) / prior.maxSize25bps) * 100
      : null;
  
  const max50DeltaPct =
    prior.maxSize50bps > 0
      ? ((current.max50 - prior.maxSize50bps) / prior.maxSize50bps) * 100
      : null;

  let regimeChange: string | null = null;
  if (prior.slippageRegime !== current.regime) {
    regimeChange = `${prior.slippageRegime} → ${current.regime}`;
  }

  return {
    riskScoreDelta,
    maxSize25bpsDeltaPct: max25DeltaPct,
    maxSize50bpsDeltaPct: max50DeltaPct,
    regimeChange,
    priorDate: prior.snapshotDate,
  };
}

export async function computeDailyCommentary(
  symbol: SupportedToken,
  side: TsleSide
): Promise<DailyCommentary> {
  const tsle = await computeTsleEngine(symbol, side, 5_000_000);

  const maxByBps = tsle.maxSizeByBps.reduce((acc, row) => {
    acc[row.bps] = row.maxSizeUsd;
    return acc;
  }, {} as Record<number, number>);

  const exec = await computeExecutionIntel(symbol, side);

  const max25 = maxByBps[25] || 0;
  const max50 = maxByBps[50] || 0;
  const today = getTodayDateUTC();

  const priorSnapshot = await storage.getPriorSnapshot(symbol, side, today);

  const delta = computeDelta(
    { riskScore: exec.executionRiskScore, max25, max50, regime: exec.slippageRegime },
    priorSnapshot
  );

  const dominantFactor = buildDominantFactor(
    symbol,
    exec.slippageRegime,
    exec.executionRiskScore,
    exec.bestVenue
  );

  const marketStructureRegime = buildMarketStructureRegime(
    symbol,
    exec.slippageRegime,
    exec.executionRiskScore,
    max25,
    max50
  );

  const bullets = buildExecutionBullets(
    max25,
    max50,
    exec.slippageRegime,
    exec.executionRiskScore,
    exec.bestVenue,
    delta
  );

  await storage.saveCommentarySnapshot({
    symbol,
    side,
    snapshotDate: today,
    executionRiskScore: exec.executionRiskScore,
    maxSize25bps: max25,
    maxSize50bps: max50,
    slippageRegime: exec.slippageRegime,
    dominantFactor,
    marketStructureRegime,
    executionSummaryBullets: bullets,
    bestVenue: exec.bestVenue,
    generatedAt: Date.now(),
  });

  return {
    symbol,
    side,
    dominantFactor,
    marketStructureRegime,
    executionSummaryBullets: bullets,
    executionRiskScore: exec.executionRiskScore,
    slippageRegime: exec.slippageRegime,
    bestVenue: exec.bestVenue,
    maxSize25bps: max25,
    maxSize50bps: max50,
    generatedAt: Date.now(),
    delta,
  };
}
