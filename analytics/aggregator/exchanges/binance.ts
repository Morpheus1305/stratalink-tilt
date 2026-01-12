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

/**
 * Fetch Binance depth via relay to bypass geo-blocking.
 * Falls back to direct API call if relay unavailable.
 */
export async function fetchBinanceDepth(symbol: string): Promise<{
  bids: [string, string][];
  asks: [string, string][];
}> {
  // Extract base symbol from Binance symbol format (e.g., BTCUSDT -> BTC)
  const baseSymbol = symbol.replace(/USDT$/, '').replace(/USD$/, '');
  
  // Try relay first (bypasses geo-blocking)
  const relayKey = getRelayKey();
  if (relayKey) {
    try {
      const response = await fetch(
        `${RELAY_URL}/binance/depth?symbol=${encodeURIComponent(baseSymbol)}`,
        { 
          headers: { "x-relay-key": relayKey },
          signal: AbortSignal.timeout(5000),
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        // Relay may return raw orderbook or normalized format
        if (data?.raw?.bids || data?.bids) {
          const bids = data.raw?.bids ?? data.bids ?? [];
          const asks = data.raw?.asks ?? data.asks ?? [];
          return {
            bids: bids.map((b: any) => Array.isArray(b) ? [String(b[0]), String(b[1])] : [String(b.price), String(b.sizeBase)]),
            asks: asks.map((a: any) => Array.isArray(a) ? [String(a[0]), String(a[1])] : [String(a.price), String(a.sizeBase)]),
          };
        }
      }
    } catch (err) {
      // Relay failed, fall through to direct API
    }
  }
  
  // Fallback to direct Binance API (may fail with 451 in some regions)
  const url = `${BINANCE_SPOT}/depth?symbol=${symbol}&limit=1000`;
  const { data } = await axiosInstance.get(url);
  return data;
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
