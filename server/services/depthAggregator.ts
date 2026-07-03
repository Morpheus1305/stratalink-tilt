/**
 * Depth Aggregator — Execution Cost Service
 * Uses live depth from the TSLE depth cache when available.
 * Falls back to deterministic static shapes only when no live data exists.
 * No Math.random() — all values are reproducible and live-anchored.
 */

import { getDepthCache } from "../../analytics/engines/depthEngine";

interface OrderbookLevel {
  price: number;
  sizeUsd: number;
}

interface VenueOrderbook {
  venue: string;
  midPrice: number;
  totalDepthUsd: number;
  asks: OrderbookLevel[];
  bids: OrderbookLevel[];
}

const VENUE_DEPTH_MULTIPLIERS: Record<string, number> = {
  binance: 1.0,
  coinbase: 0.85,
  kraken: 0.65,
};

// Stale reference prices — used only when the live depth cache has nothing.
// These are clearly labeled and never jittered.
const STALE_FALLBACK_PRICES: Record<string, number> = {
  BTC: 89500,
  ETH: 3025,
  SOL: 132,
  XRP: 2.03,
  ADA: 0.41,
  AVAX: 13.2,
  LINK: 13.65,
  MATIC: 0.52,
  DOT: 2.10,
  NEAR: 1.70,
};

const TOKEN_DEPTH_BASES: Record<string, number> = {
  BTC: 8_000_000,
  ETH: 5_000_000,
  SOL: 2_500_000,
  XRP: 1_800_000,
  ADA: 1_200_000,
  AVAX: 900_000,
  LINK: 850_000,
  MATIC: 600_000,
  DOT: 550_000,
  NEAR: 400_000,
};

function generateOrderbookSide(
  midPrice: number,
  totalDepth: number,
  isBid: boolean,
  levels: number = 20
): OrderbookLevel[] {
  const side: OrderbookLevel[] = [];
  let remaining = totalDepth;

  for (let i = 0; i < levels && remaining > 0; i++) {
    const bpsDelta = (i + 1) * 5;
    const priceMultiplier = isBid
      ? 1 - bpsDelta / 10000
      : 1 + bpsDelta / 10000;

    const price = midPrice * priceMultiplier;
    const depthPct = 0.15 - i * 0.005;
    const sizeUsd = Math.min(remaining, totalDepth * Math.max(depthPct, 0.02));
    remaining -= sizeUsd;

    side.push({ price: +price.toFixed(6), sizeUsd: +sizeUsd.toFixed(2) });
  }

  return side;
}

export async function getDepthForVenue(
  token: string,
  venue: string
): Promise<VenueOrderbook> {
  // Prefer live depth from the TSLE depth cache (populated by ingestion manager).
  const cache = getDepthCache();
  const liveDepth = cache[token];

  const venueMultiplier = VENUE_DEPTH_MULTIPLIERS[venue] ?? 0.5;

  let midPrice: number;
  let totalDepth: number;

  if (liveDepth && liveDepth.mid > 0) {
    // Live: use actual mid price and 50bps aggregate depth scaled by venue weight.
    midPrice = liveDepth.mid;
    const aggregateDepth50 = liveDepth.bands?.["50bps"]?.totalUSD ?? (TOKEN_DEPTH_BASES[token] ?? 1_000_000);
    totalDepth = aggregateDepth50 * venueMultiplier;
  } else {
    // No live data yet — use deterministic stale reference (clearly not live).
    midPrice = STALE_FALLBACK_PRICES[token] ?? 100;
    totalDepth = (TOKEN_DEPTH_BASES[token] ?? 500_000) * venueMultiplier;
  }

  const halfDepth = totalDepth / 2;
  const bids = generateOrderbookSide(midPrice, halfDepth, true);
  const asks = generateOrderbookSide(midPrice, halfDepth, false);

  return {
    venue,
    midPrice: +midPrice.toFixed(6),
    totalDepthUsd: +totalDepth.toFixed(2),
    asks,
    bids,
  };
}
