import axios from "axios";

const KRAKEN_BASE = "https://api.kraken.com/0/public";

const axiosInstance = axios.create({
  timeout: 5000,
  headers: { 'Accept': 'application/json' },
});

export async function fetchKrakenPrice(pair: string): Promise<number> {
  const url = `${KRAKEN_BASE}/Ticker?pair=${pair}`;
  const { data } = await axiosInstance.get(url);
  if (data.error?.length) throw new Error(data.error[0]);
  const key = Object.keys(data.result)[0];
  return Number(data.result[key].c[0]);
}

export async function fetchKrakenTicker(pair: string): Promise<{
  price: number;
  bid: number;
  ask: number;
  volume24h: number;
  vwap24h: number;
  trades24h: number;
  low24h: number;
  high24h: number;
  open: number;
}> {
  const url = `${KRAKEN_BASE}/Ticker?pair=${pair}`;
  const { data } = await axiosInstance.get(url);
  if (data.error?.length) throw new Error(data.error[0]);
  const key = Object.keys(data.result)[0];
  const ticker = data.result[key];
  return {
    price: Number(ticker.c[0]),
    bid: Number(ticker.b[0]),
    ask: Number(ticker.a[0]),
    volume24h: Number(ticker.v[1]),
    vwap24h: Number(ticker.p[1]),
    trades24h: Number(ticker.t[1]),
    low24h: Number(ticker.l[1]),
    high24h: Number(ticker.h[1]),
    open: Number(ticker.o),
  };
}

export async function fetchKrakenDepth(pair: string, count: number = 500): Promise<{
  bids: [string, string, number][];
  asks: [string, string, number][];
}> {
  const url = `${KRAKEN_BASE}/Depth?pair=${pair}&count=${count}`;
  const { data } = await axiosInstance.get(url);
  if (data.error?.length) throw new Error(data.error[0]);
  const key = Object.keys(data.result)[0];
  return data.result[key];
}
