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

const TOKEN_BASE_PRICES: Record<string, number> = {
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

const VENUE_DEPTH_MULTIPLIERS: Record<string, number> = {
  binance: 1.0,
  coinbase: 0.85,
  kraken: 0.65,
};

const TOKEN_DEPTH_BASES: Record<string, number> = {
  BTC: 8000000,
  ETH: 5000000,
  SOL: 2500000,
  XRP: 1800000,
  ADA: 1200000,
  AVAX: 900000,
  LINK: 850000,
  MATIC: 600000,
  DOT: 550000,
  NEAR: 400000,
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
    
    const depthPct = 0.15 - (i * 0.005);
    const sizeUsd = Math.min(remaining, totalDepth * Math.max(depthPct, 0.02));
    remaining -= sizeUsd;
    
    side.push({
      price: +price.toFixed(6),
      sizeUsd: +sizeUsd.toFixed(2),
    });
  }
  
  return side;
}

export async function getDepthForVenue(
  token: string,
  venue: string
): Promise<VenueOrderbook> {
  const basePrice = TOKEN_BASE_PRICES[token] || 100;
  const baseDepth = TOKEN_DEPTH_BASES[token] || 500000;
  const venueMultiplier = VENUE_DEPTH_MULTIPLIERS[venue] || 0.5;
  
  const jitter = 0.995 + Math.random() * 0.01;
  const midPrice = basePrice * jitter;
  
  const depthJitter = 0.9 + Math.random() * 0.2;
  const totalDepth = baseDepth * venueMultiplier * depthJitter;
  
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
