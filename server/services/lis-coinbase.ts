import type { LISSnapshot } from "./tsle-buffer";

const COINBASE_API_BASE = "https://api.exchange.coinbase.com";

type CoinbaseBook = {
  bids: [string, string, string][];
  asks: [string, string, string][];
};

const SYMBOL_MAP: Record<string, string> = {
  BTC: "BTC-USD",
  ETH: "ETH-USD",
  SOL: "SOL-USD",
  LINK: "LINK-USD",
  AVAX: "AVAX-USD",
  DOGE: "DOGE-USD",
  XRP: "XRP-USD",
  ADA: "ADA-USD",
  DOT: "DOT-USD",
  MATIC: "MATIC-USD",
};

function buildBands(
  bids: [string, string, string][],
  asks: [string, string, string][],
  mid: number
): Record<string, { bid_notional: number; ask_notional: number; total_notional: number }> {
  const bpsLevels = [0.1, 0.25, 0.5, 1, 2];
  const bands: Record<string, { bid_notional: number; ask_notional: number; total_notional: number }> = {};

  for (const bps of bpsLevels) {
    const priceRange = mid * (bps / 100);
    const bidFloor = mid - priceRange;
    const askCeil = mid + priceRange;

    let bidNotional = 0;
    for (const [priceStr, sizeStr] of bids) {
      const price = parseFloat(priceStr);
      const size = parseFloat(sizeStr);
      if (price >= bidFloor) {
        bidNotional += price * size;
      }
    }

    let askNotional = 0;
    for (const [priceStr, sizeStr] of asks) {
      const price = parseFloat(priceStr);
      const size = parseFloat(sizeStr);
      if (price <= askCeil) {
        askNotional += price * size;
      }
    }

    const key = `pct_${bps}`;
    bands[key] = {
      bid_notional: bidNotional,
      ask_notional: askNotional,
      total_notional: bidNotional + askNotional,
    };
  }

  return bands;
}

export async function fetchCoinbaseDepth(symbol: string): Promise<LISSnapshot> {
  const product = SYMBOL_MAP[symbol.toUpperCase()] || `${symbol.toUpperCase()}-USD`;
  const url = `${COINBASE_API_BASE}/products/${product}/book?level=2`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Stratalink-LIS/1.0" },
  });

  if (!res.ok) {
    throw new Error(`Coinbase API error ${res.status}`);
  }

  const book = (await res.json()) as CoinbaseBook;

  if (!book.bids?.length || !book.asks?.length) {
    throw new Error("Empty orderbook from Coinbase");
  }

  const bestBid = parseFloat(book.bids[0][0]);
  const bestAsk = parseFloat(book.asks[0][0]);
  const mid = (bestBid + bestAsk) / 2;
  const spreadAbsolute = bestAsk - bestBid;
  const spreadBps = mid > 0 ? (spreadAbsolute / mid) * 10000 : 0;

  return {
    venue: "coinbase",
    symbol: symbol.toUpperCase(),
    timestamp: Date.now(),
    mid_price: mid,
    spread: {
      absolute: spreadAbsolute,
      bps: spreadBps,
    },
    bands: buildBands(book.bids, book.asks, mid),
  };
}
