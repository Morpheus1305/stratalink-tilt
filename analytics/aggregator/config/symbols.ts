export const DEPTH_TOKENS = [
  "BTC", "ETH", "SOL", "XRP", "ADA", "AVAX", "LINK", "MATIC", "DOT", "NEAR"
];

export const SYMBOL_MAP: Record<string, { 
  binance: string | null; 
  coinbase: string | null; 
  kraken: string | null;
  bybit: string | null;
  okx: string | null;
}> = {
  BTC:   { binance: "BTCUSDT",   coinbase: "BTC-USD",   kraken: "XBTUSD",   bybit: "BTCUSDT",   okx: "BTC-USDT" },
  ETH:   { binance: "ETHUSDT",   coinbase: "ETH-USD",   kraken: "ETHUSD",   bybit: "ETHUSDT",   okx: "ETH-USDT" },
  SOL:   { binance: "SOLUSDT",   coinbase: "SOL-USD",   kraken: "SOLUSD",   bybit: "SOLUSDT",   okx: "SOL-USDT" },
  XRP:   { binance: "XRPUSDT",   coinbase: "XRP-USD",   kraken: "XRPUSD",   bybit: "XRPUSDT",   okx: "XRP-USDT" },
  ADA:   { binance: "ADAUSDT",   coinbase: "ADA-USD",   kraken: "ADAUSD",   bybit: "ADAUSDT",   okx: "ADA-USDT" },
  AVAX:  { binance: "AVAXUSDT",  coinbase: "AVAX-USD",  kraken: "AVAXUSD",  bybit: "AVAXUSDT",  okx: "AVAX-USDT" },
  LINK:  { binance: "LINKUSDT",  coinbase: "LINK-USD",  kraken: "LINKUSD",  bybit: "LINKUSDT",  okx: "LINK-USDT" },
  MATIC: { binance: "MATICUSDT", coinbase: "MATIC-USD", kraken: "MATICUSD", bybit: "MATICUSDT", okx: "MATIC-USDT" },
  DOT:   { binance: "DOTUSDT",   coinbase: "DOT-USD",   kraken: "DOTUSD",   bybit: "DOTUSDT",   okx: "DOT-USDT" },
  NEAR:  { binance: "NEARUSDT",  coinbase: "NEAR-USD",  kraken: "NEARUSD",  bybit: "NEARUSDT",  okx: "NEAR-USDT" },
};

export const PERP_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];
