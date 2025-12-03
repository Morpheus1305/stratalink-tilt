import axios from "axios";

const OKX_BASE = "https://www.okx.com/api/v5";

const axiosInstance = axios.create({
  timeout: 5000,
  headers: { 'Accept': 'application/json' },
});

export async function fetchOKXPrice(instId: string): Promise<number> {
  const url = `${OKX_BASE}/market/ticker?instId=${instId}`;
  const { data } = await axiosInstance.get(url);
  if (data.code !== '0' || !data.data?.length) {
    throw new Error(`OKX error: ${data.msg}`);
  }
  return Number(data.data[0].last);
}

export async function fetchOKXTicker(instId: string): Promise<{
  price: number;
  bid: number;
  ask: number;
  volume24h: number;
  volCcy24h: number;
  open24h: number;
  high24h: number;
  low24h: number;
  change24hPercent: number;
}> {
  const url = `${OKX_BASE}/market/ticker?instId=${instId}`;
  const { data } = await axiosInstance.get(url);
  if (data.code !== '0' || !data.data?.length) {
    throw new Error(`OKX error: ${data.msg}`);
  }
  const ticker = data.data[0];
  const last = Number(ticker.last);
  const open = Number(ticker.open24h);
  return {
    price: last,
    bid: Number(ticker.bidPx),
    ask: Number(ticker.askPx),
    volume24h: Number(ticker.vol24h),
    volCcy24h: Number(ticker.volCcy24h),
    open24h: open,
    high24h: Number(ticker.high24h),
    low24h: Number(ticker.low24h),
    change24hPercent: open > 0 ? ((last - open) / open) * 100 : 0,
  };
}

export async function fetchOKXDepth(instId: string, sz: number = 400): Promise<{
  bids: [string, string, string, string][];
  asks: [string, string, string, string][];
}> {
  const url = `${OKX_BASE}/market/books?instId=${instId}&sz=${sz}`;
  const { data } = await axiosInstance.get(url);
  if (data.code !== '0' || !data.data?.length) {
    throw new Error(`OKX error: ${data.msg}`);
  }
  return {
    bids: data.data[0].bids || [],
    asks: data.data[0].asks || [],
  };
}

export async function fetchOKXFundingRate(instId: string): Promise<{
  fundingRate: number;
  fundingTime: number;
  nextFundingRate: number;
  nextFundingTime: number;
}> {
  const url = `${OKX_BASE}/public/funding-rate?instId=${instId}`;
  const { data } = await axiosInstance.get(url);
  if (data.code !== '0' || !data.data?.length) {
    throw new Error(`OKX error: ${data.msg}`);
  }
  const fr = data.data[0];
  return {
    fundingRate: Number(fr.fundingRate || 0),
    fundingTime: Number(fr.fundingTime || 0),
    nextFundingRate: Number(fr.nextFundingRate || 0),
    nextFundingTime: Number(fr.nextFundingTime || 0),
  };
}
