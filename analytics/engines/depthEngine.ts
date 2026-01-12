import { DEPTH_TOKENS, SYMBOL_MAP } from "../aggregator/config/symbols";
import { fetchBinanceDepth, type BinanceDepthResult } from "../aggregator/exchanges/binance";
import { fetchCoinbaseDepth } from "../aggregator/exchanges/coinbase";
import { fetchKrakenDepth } from "../aggregator/exchanges/kraken";
import { fetchOKXDepth } from "../aggregator/exchanges/okx";
import { tapeStore } from "../../server/services/tapeStore";

type DepthSource = "coinbase" | "kraken" | "okx" | "binance";
type TransportType = "relay" | "direct";

export type DepthProvenance = {
  sourceVenue: DepthSource;
  transport: TransportType;
  rawSymbol: string;
  engine: "DepthEngine";
  ts_fetch_start?: number;
  ts_fetch_end?: number;
};

function canonicalizeSymbol(symbol: string): string {
  const s = symbol.toUpperCase();
  if (s.includes("-") || s.includes("/") || s.includes("_")) return s;
  return `${s}-USD`;
}

function safePushToTape(evt: any) {
  if (evt && tapeStore?.push) {
    try {
      tapeStore.push(evt);
    } catch {
    }
  }
}

const BANDS = [0.001, 0.0025, 0.005, 0.01, 0.02];

export type DepthBand = {
  bidUSD: number;
  askUSD: number;
  totalUSD: number;
  imbalance: number;
};

export type TokenDepth = {
  mid: number;
  spread: number;
  spreadBps: number;
  bands: {
    "10bps": DepthBand;
    "25bps": DepthBand;
    "50bps": DepthBand;
    "100bps": DepthBand;
    "200bps": DepthBand;
  };
  source: string;
  ts: number;
};

let DEPTH_CACHE: Record<string, TokenDepth> = {};
let LAST_INGEST = 0;

export function getDepthCache(): Record<string, TokenDepth> {
  return DEPTH_CACHE;
}

export function getLastIngestTime(): number {
  return LAST_INGEST;
}

function computeDepth(
  mid: number,
  bids: any[],
  asks: any[],
  band: number
): DepthBand {
  const lower = mid * (1 - band);
  const upper = mid * (1 + band);

  let bidUSD = 0;
  for (const [px, qty] of bids) {
    const p = Number(px);
    const q = Number(qty);
    if (p < lower) break;
    bidUSD += p * q;
  }

  let askUSD = 0;
  for (const [px, qty] of asks) {
    const p = Number(px);
    const q = Number(qty);
    if (p > upper) break;
    askUSD += p * q;
  }

  const totalUSD = bidUSD + askUSD;
  const imbalance = totalUSD > 0 ? (bidUSD - askUSD) / totalUSD : 0;

  return { bidUSD, askUSD, totalUSD, imbalance };
}

type DepthFetchResult = {
  bids: [string, string][];
  asks: [string, string][];
  provenance: DepthProvenance;
};

async function fetchDepthFromCoinbase(symbol: string): Promise<DepthFetchResult | null> {
  const map = SYMBOL_MAP[symbol];
  if (!map?.coinbase) return null;
  
  const ts_fetch_start = Date.now();
  try {
    const data = await fetchCoinbaseDepth(map.coinbase, 2);
    const ts_fetch_end = Date.now();
    return {
      bids: data.bids.map((b: any) => [b[0], b[1]]),
      asks: data.asks.map((a: any) => [a[0], a[1]]),
      provenance: {
        sourceVenue: "coinbase",
        transport: "direct",
        rawSymbol: map.coinbase,
        engine: "DepthEngine",
        ts_fetch_start,
        ts_fetch_end,
      },
    };
  } catch {
    return null;
  }
}

async function fetchDepthFromKraken(symbol: string): Promise<DepthFetchResult | null> {
  const map = SYMBOL_MAP[symbol];
  if (!map?.kraken) return null;
  
  const ts_fetch_start = Date.now();
  try {
    const data = await fetchKrakenDepth(map.kraken, 500);
    const ts_fetch_end = Date.now();
    return {
      bids: data.bids.map((b: any) => [b[0], b[1]]),
      asks: data.asks.map((a: any) => [a[0], a[1]]),
      provenance: {
        sourceVenue: "kraken",
        transport: "direct",
        rawSymbol: map.kraken,
        engine: "DepthEngine",
        ts_fetch_start,
        ts_fetch_end,
      },
    };
  } catch {
    return null;
  }
}

async function fetchDepthFromOKX(symbol: string): Promise<DepthFetchResult | null> {
  const map = SYMBOL_MAP[symbol];
  if (!map?.okx) return null;
  
  const ts_fetch_start = Date.now();
  try {
    const data = await fetchOKXDepth(map.okx, 400);
    const ts_fetch_end = Date.now();
    return {
      bids: data.bids.map((b: any) => [b[0], b[1]]),
      asks: data.asks.map((a: any) => [a[0], a[1]]),
      provenance: {
        sourceVenue: "okx",
        transport: "direct",
        rawSymbol: map.okx,
        engine: "DepthEngine",
        ts_fetch_start,
        ts_fetch_end,
      },
    };
  } catch {
    return null;
  }
}

async function fetchDepthFromBinance(symbol: string): Promise<DepthFetchResult | null> {
  const map = SYMBOL_MAP[symbol];
  
  // Binance authenticity check: require valid SYMBOL_MAP entry
  if (!map?.binance) {
    console.warn(`[DepthEngine] No Binance symbol mapping for ${symbol} - skipping Binance fetch`);
    return null;
  }
  
  try {
    const data = await fetchBinanceDepth(map.binance);
    
    // Verify the data came from Binance via relay (authenticity guarantee)
    if (data.provenance.sourceVenue !== 'binance' || data.provenance.transport !== 'relay') {
      console.error(`[DepthEngine] Binance authenticity check FAILED for ${symbol}: got venue=${data.provenance.sourceVenue}, transport=${data.provenance.transport}`);
      return null;
    }
    
    return {
      bids: data.bids,
      asks: data.asks,
      provenance: {
        sourceVenue: "binance",
        transport: "relay",
        rawSymbol: map.binance,
        engine: "DepthEngine",
        ts_fetch_start: data.provenance.ts_fetch_start,
        ts_fetch_end: data.provenance.ts_fetch_end,
      },
    };
  } catch (err: any) {
    // Don't silently fall back - log why Binance fetch failed
    console.debug(`[DepthEngine] Binance fetch failed for ${symbol}: ${err.message}`);
    return null;
  }
}

async function fetchDepthFromSource(source: DepthSource, symbol: string): Promise<DepthFetchResult | null> {
  switch (source) {
    case "coinbase": return fetchDepthFromCoinbase(symbol);
    case "kraken": return fetchDepthFromKraken(symbol);
    case "okx": return fetchDepthFromOKX(symbol);
    case "binance": return fetchDepthFromBinance(symbol);
  }
}

async function fetchDepthAllVenues(symbol: string): Promise<DepthFetchResult[]> {
  const results = await Promise.allSettled([
    fetchDepthFromBinance(symbol),
    fetchDepthFromCoinbase(symbol),
    fetchDepthFromKraken(symbol),
    fetchDepthFromOKX(symbol),
  ]);

  return results
    .map(r => r.status === 'fulfilled' ? r.value : null)
    .filter((r): r is DepthFetchResult => r !== null && r.bids.length > 0 && r.asks.length > 0);
}

export async function ingestDepth(): Promise<void> {
  const out: Record<string, TokenDepth> = {};

  const promises = DEPTH_TOKENS.map(async (symbol) => {
    try {
      const venueDepth = await fetchDepthAllVenues(symbol);
      if (!venueDepth.length) {
        console.debug(`[DepthEngine] No depth data for ${symbol}`);
        return;
      }

      for (const vd of venueDepth) {
        const { bids, asks, provenance } = vd;
        const source = provenance.sourceVenue;

        const bestBid = Number(bids[0][0]);
        const bestAsk = Number(asks[0][0]);
        const mid = (bestBid + bestAsk) / 2;
        const spread = bestAsk - bestBid;
        const spreadBps = (spread / mid) * 10000;

        const depthBands: any = {};
        for (const band of BANDS) {
          const key = `${(band * 10000).toFixed(0)}bps`;
          depthBands[key] = computeDepth(mid, bids, asks, band);
        }

        const canonSymbol = canonicalizeSymbol(symbol);

        safePushToTape({
          id: `depth-${canonSymbol}-${source}-${Date.now()}`,
          ts: Date.now(),
          type: "DEPTH_UPDATE",
          venue: source as any,
          symbol: canonSymbol,
          payload: {
            side: "bid" as const,
            price: bestBid,
            size: bids[0] ? Number(bids[0][1]) : 0,
            notionalUsd: depthBands["25bps"]?.bidUSD ?? 0,
            spreadBps,
            depthUsd: depthBands["25bps"]?.totalUSD ?? 0,
            bps: 25,
            provenance: {
              sourceVenue: provenance.sourceVenue,
              transport: provenance.transport,
              rawSymbol: provenance.rawSymbol,
              engine: provenance.engine,
            },
          },
        });

        safePushToTape({
          id: `spread-${canonSymbol}-${source}-${Date.now()}`,
          ts: Date.now(),
          type: "SPREAD_UPDATE",
          venue: source as any,
          symbol: canonSymbol,
          payload: {
            spreadBps,
            bid: bestBid,
            ask: bestAsk,
            mid,
            provenance: {
              sourceVenue: provenance.sourceVenue,
              transport: provenance.transport,
              rawSymbol: provenance.rawSymbol,
              engine: provenance.engine,
            },
          },
        });
      }

      const first = venueDepth[0];
      const bestBid = Number(first.bids[0][0]);
      const bestAsk = Number(first.asks[0][0]);
      const mid = (bestBid + bestAsk) / 2;
      const spread = bestAsk - bestBid;
      const spreadBps = (spread / mid) * 10000;

      const depthBands: any = {};
      for (const band of BANDS) {
        const key = `${(band * 10000).toFixed(0)}bps`;
        depthBands[key] = computeDepth(mid, first.bids, first.asks, band);
      }

      out[symbol] = {
        mid,
        spread,
        spreadBps,
        bands: depthBands,
        source: first.provenance.sourceVenue,
        ts: Date.now(),
      };

      console.log(`[DepthEngine] ${symbol}: Mid $${mid.toFixed(2)}, Spread ${spreadBps.toFixed(2)}bps (${first.provenance.sourceVenue} via ${first.provenance.transport})`);
    } catch (err: any) {
      console.error(`[DepthEngine] Error for ${symbol}:`, err.message);
    }
  });

  await Promise.all(promises);
  DEPTH_CACHE = out;
  LAST_INGEST = Date.now();
}

export function getDepthSummary(): {
  tokens: number;
  totalDepth10bps: number;
  totalDepth100bps: number;
  avgSpreadBps: number;
} {
  const cache = getDepthCache();
  const tokens = Object.keys(cache).length;
  
  let totalDepth10bps = 0;
  let totalDepth100bps = 0;
  let totalSpread = 0;
  
  for (const symbol of Object.keys(cache)) {
    const d = cache[symbol];
    totalDepth10bps += d.bands["10bps"]?.totalUSD || 0;
    totalDepth100bps += d.bands["100bps"]?.totalUSD || 0;
    totalSpread += d.spreadBps;
  }

  return {
    tokens,
    totalDepth10bps,
    totalDepth100bps,
    avgSpreadBps: tokens > 0 ? totalSpread / tokens : 0,
  };
}
