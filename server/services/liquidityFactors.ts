import { fetchVenueOrderbook, SupportedVenue, SupportedToken } from "./cexOrderbooks";

export interface LiquidityFactors {
  depthQuality: number;
  execEfficiency: number;
  stability: number;
  fragmentation: number;
  riskConcentration: number;
}

export interface LiquidityFactorsMeta {
  max10bps: number;
  max25bps: number;
  max50bps: number;
  venueCount: number;
  topShare: number;
}

export interface LiquidityFactorsResult {
  symbol: string;
  composite: number;
  rating: string;
  factors: LiquidityFactors;
  meta: LiquidityFactorsMeta;
  generatedAt: number;
}

const VENUES: SupportedVenue[] = ["binance", "coinbase", "kraken"];

function normalize(value: number, min: number, max: number): number {
  if (value <= min) return 0;
  if (value >= max) return 100;
  return Math.round(((value - min) / (max - min)) * 100);
}

function findMaxSizeAtBps(
  orderbook: { mid: number; bids: { price: number; sizeBase: number }[]; asks: { price: number; sizeBase: number }[] },
  maxBps: number,
  side: "buy" | "sell"
): number {
  const levels = side === "buy" ? orderbook.asks : orderbook.bids;
  const mid = orderbook.mid;

  if (!levels || levels.length === 0 || mid === 0) return 0;

  let cumSize = 0;
  let cumCost = 0;

  for (const level of levels) {
    const levelSizeUsd = level.sizeBase * level.price;
    const testSize = cumSize + levelSizeUsd;
    const testCost = cumCost + levelSizeUsd * level.price;
    const avgPrice = testCost / testSize;
    const slippageBps = Math.abs((avgPrice - mid) / mid) * 10000;

    if (slippageBps > maxBps) {
      const ratio = maxBps / slippageBps;
      return Math.round(cumSize + levelSizeUsd * ratio);
    }

    cumSize = testSize;
    cumCost = testCost;
  }

  return Math.round(cumSize);
}

export async function computeLiquidityFactors(
  symbol: SupportedToken,
  side: "buy" | "sell" = "buy"
): Promise<LiquidityFactorsResult> {
  const orderbooks = await Promise.all(
    VENUES.map(async (venue) => ({
      venue,
      ob: await fetchVenueOrderbook(venue, symbol),
    }))
  );

  let totalDepth10 = 0;
  let totalDepth25 = 0;
  let totalDepth50 = 0;
  const venueDepths: { venue: string; depth25: number }[] = [];

  for (const { venue, ob } of orderbooks) {
    const d10 = findMaxSizeAtBps(ob, 10, side);
    const d25 = findMaxSizeAtBps(ob, 25, side);
    const d50 = findMaxSizeAtBps(ob, 50, side);
    
    totalDepth10 += d10;
    totalDepth25 += d25;
    totalDepth50 += d50;
    venueDepths.push({ venue, depth25: d25 });
  }

  const depthQuality = Math.round(
    normalize(totalDepth25, 0, 15_000_000) * 0.6 +
    normalize(totalDepth50, 0, 30_000_000) * 0.4
  );

  const slippage10 = totalDepth10 < 1_000_000 ? 0.03 : totalDepth10 < 5_000_000 ? 0.01 : 0.005;
  const execEfficiency = normalize(1 / slippage10, 0, 300);

  // Stability computed from real cross-venue depth dispersion.
  // High dispersion (venues disagree on depth) = low stability.
  const activeLevels = venueDepths.filter(v => v.depth25 > 0);
  let stability = 50; // default when only one venue active
  if (activeLevels.length >= 2) {
    const depths = activeLevels.map(v => v.depth25);
    const mean = depths.reduce((a, b) => a + b, 0) / depths.length;
    const stdev = Math.sqrt(depths.reduce((s, v) => s + (v - mean) ** 2, 0) / depths.length);
    const cv = mean > 0 ? stdev / mean : 1; // coefficient of variation
    stability = normalize(1 - cv, 0, 1); // cv=0 → perfect stability=100; cv=1 → unstable=0
  }

  const venueCount = venueDepths.filter(v => v.depth25 > 0).length;
  const fragmentation = normalize(venueCount, 1, 10);

  const totalVenueDepth = venueDepths.reduce((sum, v) => sum + v.depth25, 0);
  const topVenueShare = totalVenueDepth > 0
    ? Math.round((Math.max(...venueDepths.map(v => v.depth25)) / totalVenueDepth) * 100)
    : 100;
  const riskConcentration = normalize(100 - topVenueShare, 0, 100);

  const composite = Math.round(
    0.30 * depthQuality +
    0.25 * execEfficiency +
    0.20 * stability +
    0.15 * fragmentation +
    0.10 * riskConcentration
  );

  let rating = "B";
  if (composite >= 90) rating = "AAA";
  else if (composite >= 80) rating = "AA";
  else if (composite >= 70) rating = "A";
  else if (composite >= 60) rating = "BBB";
  else if (composite >= 50) rating = "BB";

  return {
    symbol,
    composite,
    rating,
    factors: {
      depthQuality,
      execEfficiency,
      stability,
      fragmentation,
      riskConcentration,
    },
    meta: {
      max10bps: totalDepth10,
      max25bps: totalDepth25,
      max50bps: totalDepth50,
      venueCount,
      topShare: topVenueShare,
    },
    generatedAt: Date.now(),
  };
}
