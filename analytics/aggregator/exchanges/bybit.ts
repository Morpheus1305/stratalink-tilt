import axios from "axios";

const BYBIT_BASE = "https://api.bybit.com/v5";

const axiosInstance = axios.create({
  timeout: 5000,
  headers: { 'Accept': 'application/json' },
});

export async function fetchBybitSpotPrice(symbol: string): Promise<number> {
  const url = `${BYBIT_BASE}/market/tickers?category=spot&symbol=${symbol}`;
  const { data } = await axiosInstance.get(url);
  if (data.retCode !== 0 || !data.result?.list?.length) {
    throw new Error(`Bybit error: ${data.retMsg}`);
  }
  return Number(data.result.list[0].lastPrice);
}

export async function fetchBybitSpotTicker(symbol: string): Promise<{
  price: number;
  bid: number;
  ask: number;
  volume24h: number;
  turnover24h: number;
  change24hPercent: number;
}> {
  const url = `${BYBIT_BASE}/market/tickers?category=spot&symbol=${symbol}`;
  const { data } = await axiosInstance.get(url);
  if (data.retCode !== 0 || !data.result?.list?.length) {
    throw new Error(`Bybit error: ${data.retMsg}`);
  }
  const ticker = data.result.list[0];
  return {
    price: Number(ticker.lastPrice),
    bid: Number(ticker.bid1Price || 0),
    ask: Number(ticker.ask1Price || 0),
    volume24h: Number(ticker.volume24h),
    turnover24h: Number(ticker.turnover24h),
    change24hPercent: Number(ticker.price24hPcnt) * 100,
  };
}

export async function fetchBybitPerpTicker(symbol: string): Promise<{
  price: number;
  markPrice: number;
  indexPrice: number;
  fundingRate: number;
  nextFundingTime: number;
  openInterest: number;
  openInterestValue: number;
  volume24h: number;
  turnover24h: number;
}> {
  const url = `${BYBIT_BASE}/market/tickers?category=linear&symbol=${symbol}`;
  const { data } = await axiosInstance.get(url);
  if (data.retCode !== 0 || !data.result?.list?.length) {
    throw new Error(`Bybit error: ${data.retMsg}`);
  }
  const ticker = data.result.list[0];
  return {
    price: Number(ticker.lastPrice),
    markPrice: Number(ticker.markPrice || 0),
    indexPrice: Number(ticker.indexPrice || 0),
    fundingRate: Number(ticker.fundingRate || 0),
    nextFundingTime: Number(ticker.nextFundingTime || 0),
    openInterest: Number(ticker.openInterest || 0),
    openInterestValue: Number(ticker.openInterestValue || 0),
    volume24h: Number(ticker.volume24h),
    turnover24h: Number(ticker.turnover24h),
  };
}

export async function fetchBybitDepth(symbol: string, category: string = "spot", limit: number = 200): Promise<{
  bids: [string, string][];
  asks: [string, string][];
}> {
  const url = `${BYBIT_BASE}/market/orderbook?category=${category}&symbol=${symbol}&limit=${limit}`;
  const { data } = await axiosInstance.get(url);
  if (data.retCode !== 0) {
    throw new Error(`Bybit error: ${data.retMsg}`);
  }
  return {
    bids: data.result.b || [],
    asks: data.result.a || [],
  };
}
