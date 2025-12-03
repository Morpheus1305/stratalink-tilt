import axios from "axios";

const COINBASE_BASE = "https://api.exchange.coinbase.com";

const axiosInstance = axios.create({
  timeout: 5000,
  headers: { 'Accept': 'application/json' },
});

export async function fetchCoinbasePrice(symbol: string): Promise<number> {
  const url = `${COINBASE_BASE}/products/${symbol}/ticker`;
  const { data } = await axiosInstance.get(url);
  return Number(data.price);
}

export async function fetchCoinbaseTicker(symbol: string): Promise<{
  price: number;
  bid: number;
  ask: number;
  volume: number;
  time: string;
}> {
  const url = `${COINBASE_BASE}/products/${symbol}/ticker`;
  const { data } = await axiosInstance.get(url);
  return {
    price: Number(data.price),
    bid: Number(data.bid),
    ask: Number(data.ask),
    volume: Number(data.volume),
    time: data.time,
  };
}

export async function fetchCoinbaseDepth(symbol: string, level: number = 2): Promise<{
  bids: [string, string, number][];
  asks: [string, string, number][];
}> {
  const url = `${COINBASE_BASE}/products/${symbol}/book?level=${level}`;
  const { data } = await axiosInstance.get(url);
  return data;
}
