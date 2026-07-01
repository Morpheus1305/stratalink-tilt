export const DEPTH_TOKENS = [
  // ILU-20 — Reserve
  "BTC", "ETH",
  // ILU-20 — Stablecoin Infrastructure
  "USDT", "USDC", "DAI",
  // ILU-20 — Exchange & Trading Infrastructure
  "BNB", "CRO", "OKB", "UNI", "CAKE",
  // ILU-20 — Financial Infrastructure
  "LINK", "AAVE", "MKR", "SNX", "COMP",
  // ILU-20 — High-Volume Liquidity
  "SOL", "XRP", "DOGE", "ADA", "AVAX",
  // legacy (kept for history continuity)
  "MATIC", "DOT", "NEAR",
];

export const SYMBOL_MAP: Record<string, {
  binance: string | null;
  coinbase: string | null;
  kraken: string | null;
  bybit: string | null;
  okx: string | null;
}> = {
  // ── Reserve ──────────────────────────────────────────────────────────────
  BTC:   { binance: "BTCUSDT",   coinbase: "BTC-USD",   kraken: "XBTUSD",   bybit: "BTCUSDT",   okx: "BTC-USDT"  },
  ETH:   { binance: "ETHUSDT",   coinbase: "ETH-USD",   kraken: "ETHUSD",   bybit: "ETHUSDT",   okx: "ETH-USDT"  },

  // ── Stablecoin Infrastructure ─────────────────────────────────────────────
  USDT:  { binance: null,        coinbase: "USDT-USD",  kraken: "USDTUSD",  bybit: "USDTUSDC",  okx: null         },
  USDC:  { binance: null,        coinbase: "USDC-USD",  kraken: "USDCUSD",  bybit: "USDCUSDT",  okx: null         },
  DAI:   { binance: "DAIUSDT",   coinbase: "DAI-USD",   kraken: "DAIUSD",   bybit: "DAIUSDT",   okx: "DAI-USDT"  },

  // ── Exchange & Trading Infrastructure ─────────────────────────────────────
  BNB:   { binance: "BNBUSDT",   coinbase: null,        kraken: null,       bybit: "BNBUSDT",   okx: "BNB-USDT"  },
  CRO:   { binance: "CROUSDT",   coinbase: "CRO-USD",   kraken: "CROUSD",   bybit: "CROUSDT",   okx: "CRO-USDT"  },
  OKB:   { binance: "OKBUSDT",   coinbase: null,        kraken: null,       bybit: "OKBUSDT",   okx: "OKB-USDT"  },
  UNI:   { binance: "UNIUSDT",   coinbase: "UNI-USD",   kraken: "UNIUSD",   bybit: "UNIUSDT",   okx: "UNI-USDT"  },
  CAKE:  { binance: "CAKEUSDT",  coinbase: null,        kraken: null,       bybit: "CAKEUSDT",  okx: "CAKE-USDT" },

  // ── Financial Infrastructure ──────────────────────────────────────────────
  LINK:  { binance: "LINKUSDT",  coinbase: "LINK-USD",  kraken: "LINKUSD",  bybit: "LINKUSDT",  okx: "LINK-USDT" },
  AAVE:  { binance: "AAVEUSDT",  coinbase: "AAVE-USD",  kraken: "AAVEUSD",  bybit: "AAVEUSDT",  okx: "AAVE-USDT" },
  MKR:   { binance: "MKRUSDT",   coinbase: "MKR-USD",   kraken: "MKRUSD",   bybit: "MKRUSDT",   okx: "MKR-USDT"  },
  SNX:   { binance: "SNXUSDT",   coinbase: "SNX-USD",   kraken: "SNXUSD",   bybit: "SNXUSDT",   okx: "SNX-USDT"  },
  COMP:  { binance: "COMPUSDT",  coinbase: "COMP-USD",  kraken: "COMPUSD",  bybit: "COMPUSDT",  okx: "COMP-USDT" },

  // ── High-Volume Liquidity ─────────────────────────────────────────────────
  SOL:   { binance: "SOLUSDT",   coinbase: "SOL-USD",   kraken: "SOLUSD",   bybit: "SOLUSDT",   okx: "SOL-USDT"  },
  XRP:   { binance: "XRPUSDT",   coinbase: "XRP-USD",   kraken: "XRPUSD",   bybit: "XRPUSDT",   okx: "XRP-USDT"  },
  DOGE:  { binance: "DOGEUSDT",  coinbase: "DOGE-USD",  kraken: "DOGEUSD",  bybit: "DOGEUSDT",  okx: "DOGE-USDT" },
  ADA:   { binance: "ADAUSDT",   coinbase: "ADA-USD",   kraken: "ADAUSD",   bybit: "ADAUSDT",   okx: "ADA-USDT"  },
  AVAX:  { binance: "AVAXUSDT",  coinbase: "AVAX-USD",  kraken: "AVAXUSD",  bybit: "AVAXUSDT",  okx: "AVAX-USDT" },

  // ── Legacy (history continuity) ───────────────────────────────────────────
  MATIC: { binance: "MATICUSDT", coinbase: "MATIC-USD", kraken: "MATICUSD", bybit: "MATICUSDT", okx: "MATIC-USDT" },
  DOT:   { binance: "DOTUSDT",   coinbase: "DOT-USD",   kraken: "DOTUSD",   bybit: "DOTUSDT",   okx: "DOT-USDT"  },
  NEAR:  { binance: "NEARUSDT",  coinbase: "NEAR-USD",  kraken: "NEARUSD",  bybit: "NEARUSDT",  okx: "NEAR-USDT" },
};

export const PERP_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];
