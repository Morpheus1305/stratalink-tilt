import { SYMBOL_MAP } from "./config/symbols";
import { fetchBinancePrice } from "./exchanges/binance";
import { fetchCoinbasePrice } from "./exchanges/coinbase";
import { fetchKrakenPrice } from "./exchanges/kraken";
import { fetchBybitSpotPrice } from "./exchanges/bybit";
import { fetchOKXPrice } from "./exchanges/okx";

type AggregatedPrice = {
  symbol: string;
  quote: string;
  price: number;
  source: string;
  ts: number;
  cached?: boolean;
};

const CACHE = new Map<string, AggregatedPrice>();
const TTL_MS = 3000;

export async function getAggregatedPrice({ 
  symbol, 
  quote = "USD" 
}: { 
  symbol: string; 
  quote?: string 
}): Promise<AggregatedPrice> {
  const key = `${symbol.toUpperCase()}-${quote.toUpperCase()}`;
  const cached = CACHE.get(key);
  if (cached && Date.now() - cached.ts < TTL_MS) {
    return { ...cached, cached: true };
  }

  const map = SYMBOL_MAP[symbol.toUpperCase() as keyof typeof SYMBOL_MAP];
  if (!map) throw new Error("Unsupported symbol: " + symbol);

  const calls: Promise<{ src: string; price: number } | null>[] = [];

  if (map.coinbase) {
    calls.push(
      fetchCoinbasePrice(map.coinbase)
        .then((p) => ({ src: "coinbase", price: p }))
        .catch(() => null)
    );
  }

  if (map.kraken) {
    calls.push(
      fetchKrakenPrice(map.kraken)
        .then((p) => ({ src: "kraken", price: p }))
        .catch(() => null)
    );
  }

  if (map.okx) {
    calls.push(
      fetchOKXPrice(map.okx)
        .then((p) => ({ src: "okx", price: p }))
        .catch(() => null)
    );
  }

  if (map.bybit) {
    calls.push(
      fetchBybitSpotPrice(map.bybit)
        .then((p) => ({ src: "bybit", price: p }))
        .catch(() => null)
    );
  }

  if (map.binance) {
    calls.push(
      fetchBinancePrice(map.binance)
        .then((p) => ({ src: "binance", price: p }))
        .catch(() => null)
    );
  }

  const results = (await Promise.all(calls)).filter(
    (x): x is { src: string; price: number } => x !== null
  );

  if (!results.length) throw new Error("No valid prices for " + symbol);

  const prices = results.map((r) => r.price).sort((a, b) => a - b);
  const median = prices[Math.floor(prices.length / 2)];
  
  const sane = results.filter(
    (r) => Math.abs(r.price - median) / median < 0.1
  );
  const candidates = sane.length ? sane : results;

  const priority = ["coinbase", "kraken", "okx", "bybit", "binance"];
  for (const p of priority) {
    const found = candidates.find((c) => c.src === p);
    if (found) {
      const out: AggregatedPrice = {
        symbol: symbol.toUpperCase(),
        quote: quote.toUpperCase(),
        price: found.price,
        source: found.src,
        ts: Date.now(),
      };
      CACHE.set(key, out);
      return out;
    }
  }

  const fallback: AggregatedPrice = {
    symbol: symbol.toUpperCase(),
    quote: quote.toUpperCase(),
    price: median,
    source: "median",
    ts: Date.now(),
  };
  CACHE.set(key, fallback);
  return fallback;
}

export async function getMultiplePrices(symbols: string[]): Promise<AggregatedPrice[]> {
  const results = await Promise.all(
    symbols.map((s) => 
      getAggregatedPrice({ symbol: s }).catch((err) => ({
        symbol: s.toUpperCase(),
        quote: "USD",
        price: 0,
        source: "error",
        ts: Date.now(),
        error: err.message,
      } as AggregatedPrice & { error?: string }))
    )
  );
  return results;
}
