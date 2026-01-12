import axios from "axios";

const BINANCE_SPOT = "https://api.binance.com/api/v3";
const BINANCE_FUTURES = "https://fapi.binance.com/fapi/v1";
const RELAY_URL = "https://relay.stratalink.ai";

const axiosInstance = axios.create({
  timeout: 5000,
  headers: { 'Accept': 'application/json' },
});

function getRelayKey(): string | null {
  return process.env.VITE_LIS_RELAY_KEY || process.env.LIS_RELAY_KEY || null;
}

export async function fetchBinancePrice(symbol: string): Promise<number> {
  const url = `${BINANCE_SPOT}/ticker/price?symbol=${symbol}`;
  const { data } = await axiosInstance.get(url);
  return Number(data.price);
}

export type BinanceDepthResult = {
  bids: [string, string][];
  asks: [string, string][];
  provenance: {
    sourceVenue: 'binance';
    transport: 'relay';
    rawSymbol: string;
    ts_fetch_start: number;
    ts_fetch_end: number;
  };
};

/**
 * Fetch Binance depth ONLY via relay to ensure authentic Binance data.
 * No fallback to direct API - if relay fails, throw error.
 * This ensures all Binance depth events are verifiably from Binance via our relay.
 */
export async function fetchBinanceDepth(symbol: string): Promise<BinanceDepthResult> {
  const ts_fetch_start = Date.now();
  
  // Extract base symbol from Binance symbol format (e.g., BTCUSDT -> BTC)
  const baseSymbol = symbol.replace(/USDT$/, '').replace(/USD$/, '');
  
  const relayKey = getRelayKey();
  if (!relayKey) {
    throw new Error(`[Binance] No relay key configured - cannot fetch authentic Binance data for ${symbol}`);
  }
  
  const response = await fetch(
    `${RELAY_URL}/binance/depth?symbol=${encodeURIComponent(baseSymbol)}`,
    { 
      headers: { "x-relay-key": relayKey },
      signal: AbortSignal.timeout(5000),
    }
  );
  
  if (!response.ok) {
    throw new Error(`[Binance] Relay returned ${response.status} for ${symbol}`);
  }
  
  const data = await response.json();
  
  if (!data?.raw?.bids && !data?.bids) {
    throw new Error(`[Binance] Relay returned invalid depth data for ${symbol}`);
  }
  
  const bids = data.raw?.bids ?? data.bids ?? [];
  const asks = data.raw?.asks ?? data.asks ?? [];
  const ts_fetch_end = Date.now();
  
  return {
    bids: bids.map((b: any) => Array.isArray(b) ? [String(b[0]), String(b[1])] : [String(b.price), String(b.sizeBase)]),
    asks: asks.map((a: any) => Array.isArray(a) ? [String(a[0]), String(a[1])] : [String(a.price), String(a.sizeBase)]),
    provenance: {
      sourceVenue: 'binance',
      transport: 'relay',
      rawSymbol: symbol,
      ts_fetch_start,
      ts_fetch_end,
    },
  };
}

export async function fetchBinanceFunding(symbol: string): Promise<{
  fundingRate: number;
  markPrice: number;
  nextFundingTime: number;
}> {
  const url = `${BINANCE_FUTURES}/premiumIndex?symbol=${symbol}`;
  const { data } = await axiosInstance.get(url);
  return {
    fundingRate: Number(data.lastFundingRate ?? data.fundingRate ?? 0),
    markPrice: Number(data.markPrice ?? 0),
    nextFundingTime: data.nextFundingTime,
  };
}

export async function fetchBinanceLiquidations(symbol: string): Promise<any[]> {
  const url = `${BINANCE_FUTURES}/allForceOrders?symbol=${symbol}`;
  const { data } = await axiosInstance.get(url);
  return data;
}

export async function fetchBinance24hTicker(symbol: string): Promise<{
  priceChange: number;
  priceChangePercent: number;
  volume: number;
  quoteVolume: number;
}> {
  const url = `${BINANCE_SPOT}/ticker/24hr?symbol=${symbol}`;
  const { data } = await axiosInstance.get(url);
  return {
    priceChange: Number(data.priceChange),
    priceChangePercent: Number(data.priceChangePercent),
    volume: Number(data.volume),
    quoteVolume: Number(data.quoteVolume),
  };
}
