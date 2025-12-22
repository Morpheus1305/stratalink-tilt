// server/services/lis-coinbase.ts
import type { LISSnapshot, LISBand } from "./tsle-buffer";

const COINBASE_BOOK_URL =
  "https://api.exchange.coinbase.com/products/BTC-USD/book?level=2";

type CoinbaseBook = {
  bids: [string, string][];
  asks: [string, string][];
};

function buildBands(
  bids: [string, string][],
  asks: [string, string][],
  mid: number
): Record<string, LISBand> {
  const bands = {
    pct_0_1: { bid_notional: 0, ask_notional: 0 },
    pct_0_25: { bid_notional: 0, ask_notional: 0 },
    pct_0_5: { bid_notional: 0, ask_notional: 0 },
    pct_1: { bid_notional: 0, ask_notional: 0 },
    pct_2: { bid_notional: 0, ask_notional: 0 },
  };

  function accumulate(
    side: "bid_notional" | "ask_notional",
    price: number,
    size: number
  ) {
    const bps = Math.abs(price - mid) / mid * 10_000;

    if (bps <= 10) bands.pct_0_1[side]! += price * size;
    if (bps <= 25) bands.pct_0_25[side]! += price * size;
    if (bps <= 50) bands.pct_0_5[side]! += price * size;
    if (bps <= 100) bands.pct_1[side]! += price * size;
    if (bps <= 200) bands.pct_2[side]! += price * size;
  }

  bids.forEach(([p, s]) =>
    accumulate("bid_notional", Number(p), Number(s))
  );
  asks.forEach(([p, s]) =>
    accumulate("ask_notional", Number(p), Number(s))
  );

  Object.values(bands).forEach(b => {
    b.total_notional =
      (b.bid_notional ?? 0) + (b.ask_notional ?? 0);
  });

  return bands;
}

export async function fetchCoinbaseLIS(): Promise<LISSnapshot> {
  const res = await fetch(COINBASE_BOOK_URL, {
    headers: { "User-Agent": "Stratalink-LIS" },
  });

  if (!res.ok) {
    throw new Error(`Coinbase API error ${res.status}`);
  }

  const book = (await res.json()) as CoinbaseBook;

  const bestBid = Number(book.bids[0][0]);
  const bestAsk = Number(book.asks[0][0]);
  const mid = (bestBid + bestAsk) / 2;

  return {
    venue: "coinbase",
    symbol: "BTC",
    quote: "USD",
    timestamp: Date.now(),
    mid_price: mid,
    spread: {
      absolute: bestAsk - bestBid,
      bps: ((bestAsk - bestBid) / mid) * 10_000,
    },
    bands: buildBands(book.bids, book.asks, mid),
  };
}