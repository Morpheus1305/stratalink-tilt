/**
 * Trade Size Liquidity Engine (TSLE)
 *
 * This module takes a depth snapshot (multi-venue, multi-bps)
 * and answers three questions:
 *
 *  1) Max tradeable size at <X bps (25 / 50 / 100)
 *  2) Expected impact for a requested trade size
 *  3) Overall execution regime (Ultra-Tight / Tight / Neutral / Stressed)
 */

export type Side = "buy" | "sell";

export interface VenueDepthBand {
  venue: string;
  depth10bps: number;
  depth25bps: number;
  depth50bps: number;
  depth100bps: number;
  depth200bps: number;
}

export interface DepthSnapshotInput {
  symbol: string;
  venues: VenueDepthBand[];
  asOf?: string;
}

export interface TsleDepthSummary {
  symbol: string;
  side: Side;
  maxSizeAt25bps: number;
  maxSizeAt50bps: number;
  maxSizeAt100bps: number;
  requestedSize: number;
  estImpactBps: number;
  regime: "Ultra-Tight" | "Tight" | "Neutral" | "Stressed" | "Broken";
  score: number;
  totalDepth10bps: number;
  totalDepth25bps: number;
  totalDepth50bps: number;
  totalDepth100bps: number;
  totalDepth200bps: number;
  venues: {
    venue: string;
    share25bps: number;
    share50bps: number;
    share100bps: number;
  }[];
}

function sumBand(venues: VenueDepthBand[], key: keyof VenueDepthBand): number {
  return venues.reduce((acc, v) => acc + ((v[key] as number) || 0), 0);
}

function classifyRegime(
  max25: number,
  max50: number,
  max100: number,
  estImpactBps: number
): { regime: TsleDepthSummary["regime"]; score: number } {
  if (estImpactBps <= 5 && max25 > max50 * 0.6) {
    return { regime: "Ultra-Tight", score: 95 };
  }
  if (estImpactBps <= 10 && max25 > max50 * 0.4) {
    return { regime: "Tight", score: 85 };
  }
  if (estImpactBps <= 25) {
    return { regime: "Neutral", score: 70 };
  }
  if (estImpactBps <= 50) {
    return { regime: "Stressed", score: 45 };
  }
  return { regime: "Broken", score: 20 };
}

function estimateImpactBps(
  size: number,
  total10: number,
  total25: number,
  total50: number,
  total100: number,
  total200: number
): number {
  if (size <= 0) return 0;

  if (size <= total10) return 5;
  if (size <= total25) {
    const frac = (size - total10) / Math.max(total25 - total10, 1);
    return 10 + frac * 10;
  }
  if (size <= total50) {
    const frac = (size - total25) / Math.max(total50 - total25, 1);
    return 25 + frac * 25;
  }
  if (size <= total100) {
    const frac = (size - total50) / Math.max(total100 - total50, 1);
    return 50 + frac * 50;
  }
  if (size <= total200) {
    const frac = (size - total100) / Math.max(total200 - total100, 1);
    return 100 + frac * 100;
  }

  return 250;
}

export function computeTsleDepthSummary(
  snapshot: DepthSnapshotInput,
  params: { side: Side; requestedSize: number }
): TsleDepthSummary {
  const { side, requestedSize } = params;
  const venues = snapshot.venues || [];

  const total10 = sumBand(venues, "depth10bps");
  const total25 = sumBand(venues, "depth25bps");
  const total50 = sumBand(venues, "depth50bps");
  const total100 = sumBand(venues, "depth100bps");
  const total200 = sumBand(venues, "depth200bps");

  const maxSizeAt25bps = total25;
  const maxSizeAt50bps = total50;
  const maxSizeAt100bps = total100;

  const estImpactBps = estimateImpactBps(
    requestedSize,
    total10,
    total25,
    total50,
    total100,
    total200
  );

  const { regime, score } = classifyRegime(
    maxSizeAt25bps,
    maxSizeAt50bps,
    maxSizeAt100bps,
    estImpactBps
  );

  const venuesShares = venues.map((v) => ({
    venue: v.venue,
    share25bps: total25 > 0 ? (v.depth25bps / total25) * 100 : 0,
    share50bps: total50 > 0 ? (v.depth50bps / total50) * 100 : 0,
    share100bps: total100 > 0 ? (v.depth100bps / total100) * 100 : 0,
  }));

  return {
    symbol: snapshot.symbol,
    side,
    maxSizeAt25bps,
    maxSizeAt50bps,
    maxSizeAt100bps,
    requestedSize,
    estImpactBps,
    regime,
    score,
    totalDepth10bps: total10,
    totalDepth25bps: total25,
    totalDepth50bps: total50,
    totalDepth100bps: total100,
    totalDepth200bps: total200,
    venues: venuesShares,
  };
}
