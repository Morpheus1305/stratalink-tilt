// server/lib/scoring/tsleScore.ts
// STRATA Liquidity TSLE Scoring Model 2.0

export type TsleRegime = "Ultra-Tight" | "Tight" | "Neutral" | "Stressed" | "Broken";

export interface TsleDepthBand {
  bidUsd: number;
  askUsd: number;
  totalUsd: number;
}

export interface TsleDepthAggregate {
  mid: number | null;
  levels: Record<string, TsleDepthBand>;
}

export interface TsleDepthSnapshot {
  symbol: string;
  source: string;
  levels: number[];
  aggregate: TsleDepthAggregate;
}

export interface TsleFundingVenue {
  venue: string;
  ok: boolean;
  rate: number | null;
  apr: number | null;
  error?: string | null;
}

export interface TsleFundingSnapshot {
  symbol: string;
  source: string;
  venues: TsleFundingVenue[];
  headlineRate: number;
  medianRate: number;
  avgRate: number;
  regime: TsleRegime | string;
}

export interface TsleInputs {
  symbol: string;
  depth: TsleDepthSnapshot;
  funding: TsleFundingSnapshot;
}

export interface TsleBandSnapshot {
  bps: number;
  bidUsd: number;
  askUsd: number;
  totalUsd: number;
}

export interface TsleScoreResult {
  symbol: string;
  score: number;
  depthScore: number;
  fundingScore: number;
  frictionScore: number;
  qualityBand: TsleRegime | "Moderate" | "Thin";
  bands: TsleBandSnapshot[];
  funding: {
    headlineRate: number;
    medianRate: number;
    avgRate: number;
    regime: TsleRegime | string;
  };
  venues: TsleFundingVenue[];
  notes: string[];
  asOf: string;
}

const BPS_LEVELS = [10, 25, 50, 100, 200];

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function safeBand(agg: TsleDepthAggregate, bps: number): TsleBandSnapshot {
  const key = String(bps);
  const lvl = (agg?.levels && agg.levels[key]) || { bidUsd: 0, askUsd: 0, totalUsd: 0 };
  return {
    bps,
    bidUsd: Number(lvl.bidUsd || 0),
    askUsd: Number(lvl.askUsd || 0),
    totalUsd: Number(lvl.totalUsd || 0),
  };
}

function computeDepthComponents(bands: TsleBandSnapshot[]) {
  const totals = bands.map(b => b.totalUsd);
  const totalDepth = totals.reduce((a, b) => a + b, 0);

  let magnitudeScore = 0;
  if (totalDepth <= 0) {
    magnitudeScore = 0;
  } else if (totalDepth >= 100_000_000) {
    magnitudeScore = 40;
  } else if (totalDepth >= 50_000_000) {
    magnitudeScore = 35;
  } else if (totalDepth >= 20_000_000) {
    magnitudeScore = 30;
  } else if (totalDepth >= 10_000_000) {
    magnitudeScore = 25;
  } else if (totalDepth >= 5_000_000) {
    magnitudeScore = 20;
  } else if (totalDepth >= 1_000_000) {
    magnitudeScore = 15;
  } else if (totalDepth >= 250_000) {
    magnitudeScore = 10;
  } else if (totalDepth > 0) {
    magnitudeScore = 5;
  }

  let stepsOk = 0;
  for (let i = 0; i < totals.length - 1; i++) {
    if (totals[i + 1] + 1e-6 >= totals[i]) {
      stepsOk += 1;
    }
  }
  const curveShapeScore = clamp((stepsOk / 4) * 20, 0, 20);

  let imbalances: number[] = [];
  for (const b of bands) {
    const denom = b.totalUsd || 1;
    const imbalance = Math.abs(b.bidUsd - b.askUsd) / denom;
    imbalances.push(imbalance);
  }
  const avgImbalance = imbalances.length
    ? imbalances.reduce((a, b) => a + b, 0) / imbalances.length
    : 1;

  let symmetryScore = 0;
  if (avgImbalance <= 0.10) symmetryScore = 20;
  else if (avgImbalance <= 0.20) symmetryScore = 16;
  else if (avgImbalance <= 0.35) symmetryScore = 12;
  else if (avgImbalance <= 0.50) symmetryScore = 7;
  else symmetryScore = 3;

  return { magnitudeScore, curveShapeScore, symmetryScore, totalDepth, avgImbalance };
}

function computeFundingScore(funding: TsleFundingSnapshot) {
  const regime = (funding.regime || "Neutral") as TsleRegime | string;
  let base = 0;

  switch (regime) {
    case "Ultra-Tight":
      base = 25;
      break;
    case "Tight":
      base = 20;
      break;
    case "Neutral":
      base = 14;
      break;
    case "Stressed":
      base = 6;
      break;
    case "Broken":
      base = 0;
      break;
    default:
      base = 10;
  }

  const okVenues = funding.venues?.filter(v => v.ok && typeof v.rate === "number") || [];
  const rates = okVenues.map(v => v.rate as number);
  const absHeadline = Math.abs(funding.headlineRate || 0);

  let penalty = 0;

  if (rates.length >= 2) {
    const max = Math.max(...rates);
    const min = Math.min(...rates);
    const spread = Math.abs(max - min);

    if (spread > 0.0020) penalty += 6;
    else if (spread > 0.0010) penalty += 3;
  }

  if (absHeadline > 0.0010) penalty += 5;
  else if (absHeadline > 0.0005) penalty += 2;

  const fundingScore = clamp(base - penalty, 0, 25);
  return { fundingScore, penalty, absHeadline };
}

function computeFrictionScore(
  bands: TsleBandSnapshot[],
  totalDepth: number,
  avgImbalance: number
) {
  if (!bands.length || totalDepth <= 0) {
    return { frictionScore: 0, penalty: 15 };
  }

  const b10 = bands.find(b => b.bps === 10) || bands[0];
  const b200 = bands.find(b => b.bps === 200) || bands[bands.length - 1];

  let penalty = 0;

  const frontShare = b10.totalUsd / (totalDepth || 1);
  if (frontShare < 0.05) penalty += 7;
  else if (frontShare < 0.10) penalty += 4;

  const slopeRatio = b200.totalUsd / (b10.totalUsd || 1);
  if (slopeRatio < 2) penalty += 5;
  else if (slopeRatio < 3) penalty += 3;

  if (avgImbalance > 0.40) penalty += 3;

  const frictionScore = clamp(15 - penalty, 0, 15);
  return { frictionScore, penalty };
}

function classifyQualityBand(score: number): TsleRegime | "Moderate" | "Thin" {
  if (score >= 90) return "Ultra-Tight";
  if (score >= 75) return "Tight";
  if (score >= 55) return "Moderate";
  if (score >= 35) return "Thin";
  return "Broken";
}

export function computeTsleScore(input: TsleInputs): TsleScoreResult {
  const { symbol, depth, funding } = input;

  const agg = depth?.aggregate || { mid: null, levels: {} as Record<string, TsleDepthBand> };

  const bands: TsleBandSnapshot[] = BPS_LEVELS.map(bps => safeBand(agg, bps));

  const {
    magnitudeScore,
    curveShapeScore,
    symmetryScore,
    totalDepth,
    avgImbalance,
  } = computeDepthComponents(bands);

  const { fundingScore, penalty: fundingPenalty, absHeadline } = computeFundingScore(funding);

  const { frictionScore, penalty: frictionPenalty } = computeFrictionScore(
    bands,
    totalDepth,
    avgImbalance
  );

  const depthScore = clamp(
    0.25 * curveShapeScore + 0.25 * symmetryScore + 0.5 * magnitudeScore,
    0,
    60
  );

  const score = clamp(depthScore + fundingScore + frictionScore, 0, 100);
  const qualityBand = classifyQualityBand(score);

  const notes: string[] = [];

  if (totalDepth < 2_000_000) {
    notes.push("Overall depth is thin vs institutional norms (< $2m across 10 - 200bps).");
  } else if (totalDepth > 20_000_000) {
    notes.push("Deep aggregate liquidity across 10 - 200bps bands.");
  }

  if (avgImbalance > 0.45) {
    notes.push("Order book notably imbalanced between bid and ask liquidity.");
  }

  if (fundingPenalty >= 6) {
    notes.push("Funding dispersion and carry costs indicate stressed perp conditions.");
  } else if (absHeadline > 0.0005 && fundingScore <= 14) {
    notes.push("Elevated perp funding suggests directional positioning in the market.");
  }

  if (frictionScore <= 5) {
    notes.push("Front-of-book depth is shallow relative to deeper books  -  execution slippage risk.");
  }

  if (!notes.length) {
    notes.push("Liquidity conditions appear orderly with balanced depth and stable funding.");
  }

  return {
    symbol,
    score: Math.round(score),
    depthScore: Math.round(depthScore),
    fundingScore: Math.round(fundingScore),
    frictionScore: Math.round(frictionScore),
    qualityBand,
    bands,
    funding: {
      headlineRate: funding.headlineRate,
      medianRate: funding.medianRate,
      avgRate: funding.avgRate,
      regime: funding.regime,
    },
    venues: funding.venues || [],
    notes,
    asOf: new Date().toISOString(),
  };
}
