import axios from "axios";

const BINANCE_SPOT = "https://api.binance.com/api/v3";
const BINANCE_FUTURES = "https://fapi.binance.com/fapi/v1";

const axiosInstance = axios.create({
  timeout: 5000,
  headers: { 'Accept': 'application/json' },
});

export async function fetchBinancePrice(symbol: string): Promise<number> {
  const url = `${BINANCE_SPOT}/ticker/price?symbol=${symbol}`;
  const { data } = await axiosInstance.get(url);
  return Number(data.price);
}

export async function fetchBinanceDepth(symbol: string): Promise<{
  bids: [string, string][];
  asks: [string, string][];
}> {
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
