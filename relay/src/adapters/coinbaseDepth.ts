import fetch from "node-fetch";
import { buildBandsFromOrderbook } from "../lib/bandBuilder";
import { LISSnapshot } from "../types";

export async function fetchCoinbaseDepth(symbol: string): Promise<LISSnapshot> {
  const product = `${symbol}-USD`;

  const res = await fetch(
    `https://api.exchange.coinbase.com/products/${product}/book?level=2`
  );

  if (!res.ok) {
    throw new Error(`Coinbase API error ${res.status}`);
  }

  const data = await res.json();

  const bids = data.bids.map(([p, s]: [string, string]) => ({
    price: Number(p),
    size: Number(s),
  }));

  const asks = data.asks.map(([p, s]: [string, string]) => ({
    price: Number(p),
    size: Number(s),
  }));

  const bands = buildBandsFromOrderbook(bids, asks);

  const bestBid = bids[0]?.price;
  const bestAsk = asks[0]?.price;
  const mid = (bestBid + bestAsk) / 2;

  return {
    venue: "coinbase",
    symbol,
    quote: "USD",
    timestamp: Date.now(),
    mid_price: mid,
    spread: {
      absolute: bestAsk - bestBid,
      bps: ((bestAsk - bestBid) / mid) * 10_000,
    },
    bands,
    metrics: {
      bid_ask_balance: bands.pct_0_25.bid_notional /
        (bands.pct_0_25.total_notional || 1),
      depth_asymmetry: Math.abs(
        bands.pct_0_25.bid_notional - bands.pct_0_25.ask_notional
      ) / (bands.pct_0_25.total_notional || 1),
      source: "lis-v1",
    },
  };
}