import { fetchVenueOrderbook, SupportedVenue, SupportedToken } from "./cexOrderbooks";

export interface TsleCurvePoint {
  sizeUsd: number;
  bestSlippageBps: number;
  bestVenue: string;
  venues: { venue: string; slippageBps: number }[];
}

export interface TsleVenueSummary {
  venue: string;
  maxSize10bps: number;
  maxSize25bps: number;
  maxSize50bps: number;
  maxSize100bps: number;
}

export interface TsleResult {
  symbol: string;
  side: "buy" | "sell";
  curve: TsleCurvePoint[];
  maxSizeByBps: { bps: number; maxSizeUsd: number }[];
  venues: TsleVenueSummary[];
  generatedAt: number;
}

const VENUES: SupportedVenue[] = ["binance", "coinbase", "kraken"];
const TEST_SIZES = [10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000, 2_500_000, 5_000_000];
const BPS_THRESHOLDS = [10, 25, 50, 100];

function computeSlippageForSize(
  orderbook: any,
  sizeUsd: number,
  side: "buy" | "sell"
): number {
  const levels = side === "buy" ? orderbook.asks : orderbook.bids;
  const mid = orderbook.mid;

  if (!levels || levels.length === 0 || mid === 0) {
    return 100;
  }

  let remaining = sizeUsd;
  let totalCost = 0;

  for (const level of levels) {
    const levelSizeUsd = level.sizeBase * level.price;
    const fillSize = Math.min(remaining, levelSizeUsd);
    totalCost += fillSize * level.price;
    remaining -= fillSize;

    if (remaining <= 0) break;
  }

  if (remaining > 0) {
    return 100;
  }

  const avgPrice = totalCost / sizeUsd;
  const slippageBps = Math.abs((avgPrice - mid) / mid) * 10000;
  return Math.round(slippageBps * 100) / 100;
}

function findMaxSizeAtBps(
  orderbook: any,
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

export async function computeTsleEngine(
  symbol: SupportedToken,
  side: "buy" | "sell",
  maxSizeUsd: number = 5_000_000
): Promise<TsleResult> {
  const orderbooks = await Promise.all(
    VENUES.map(async (venue) => ({
      venue,
      ob: await fetchVenueOrderbook(venue, symbol),
    }))
  );

  const curve: TsleCurvePoint[] = [];

  for (const sizeUsd of TEST_SIZES) {
    if (sizeUsd > maxSizeUsd) break;

    const venueSlippages = orderbooks.map(({ venue, ob }) => ({
      venue,
      slippageBps: computeSlippageForSize(ob, sizeUsd, side),
    }));

    venueSlippages.sort((a, b) => a.slippageBps - b.slippageBps);
    const best = venueSlippages[0];

    curve.push({
      sizeUsd,
      bestSlippageBps: best.slippageBps,
      bestVenue: best.venue,
      venues: venueSlippages,
    });
  }

  const maxSizeByBps = BPS_THRESHOLDS.map((bps) => {
    const venueSizes = orderbooks.map(({ venue, ob }) => ({
      venue,
      maxSize: findMaxSizeAtBps(ob, bps, side),
    }));
    const totalMaxSize = venueSizes.reduce((sum, v) => sum + v.maxSize, 0);
    return { bps, maxSizeUsd: totalMaxSize };
  });

  const venues: TsleVenueSummary[] = orderbooks.map(({ venue, ob }) => ({
    venue,
    maxSize10bps: findMaxSizeAtBps(ob, 10, side),
    maxSize25bps: findMaxSizeAtBps(ob, 25, side),
    maxSize50bps: findMaxSizeAtBps(ob, 50, side),
    maxSize100bps: findMaxSizeAtBps(ob, 100, side),
  }));

  return {
    symbol,
    side,
    curve,
    maxSizeByBps,
    venues,
    generatedAt: Date.now(),
  };
}
