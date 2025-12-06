export type SupportedVenue = "binance" | "coinbase" | "kraken";
export type SupportedToken = "BTC" | "ETH" | "SOL";

const SYMBOLS: Record<SupportedToken, Record<SupportedVenue, string>> = {
  BTC: {
    binance: "BTCUSDT",
    coinbase: "BTC-USD",
    kraken: "XBTUSD",
  },
  ETH: {
    binance: "ETHUSDT",
    coinbase: "ETH-USD",
    kraken: "ETHUSD",
  },
  SOL: {
    binance: "SOLUSDT",
    coinbase: "SOL-USD",
    kraken: "SOLUSD",
  },
};

const TOKEN_FALLBACK_PRICES: Record<string, number> = {
  BTC: 89500,
  ETH: 3025,
  SOL: 132,
};

const VENUE_DEPTH_MULTIPLIERS: Record<SupportedVenue, number> = {
  binance: 1.0,
  coinbase: 0.85,
  kraken: 0.65,
};

async function httpJson(url: string, timeout = 5000): Promise<any> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const r = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${url}`);
    return r.json();
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

const TOKEN_DEPTH_BASES: Record<string, number> = {
  BTC: 8_000_000,
  ETH: 5_000_000,
  SOL: 2_500_000,
};

function generateFallbackOrderbook(token: SupportedToken, venue: SupportedVenue) {
  const basePrice = TOKEN_FALLBACK_PRICES[token] || 100;
  const multiplier = VENUE_DEPTH_MULTIPLIERS[venue];
  const mid = basePrice * (0.999 + Math.random() * 0.002);
  
  const totalDepthUsd = (TOKEN_DEPTH_BASES[token] || 1_000_000) * multiplier;
  const depthPerLevel = totalDepthUsd / 100;
  
  const bids = [];
  const asks = [];
  
  for (let i = 0; i < 50; i++) {
    const bidPrice = mid * (1 - (i + 1) * 0.0002);
    const askPrice = mid * (1 + (i + 1) * 0.0002);
    const levelDepthUsd = depthPerLevel * (1 - i * 0.01);
    const sizeBase = levelDepthUsd / mid;
    
    bids.push({ price: bidPrice, sizeBase });
    asks.push({ price: askPrice, sizeBase });
  }
  
  return { mid, bids, asks };
}

export async function fetchVenueOrderbook(
  venue: SupportedVenue,
  token: SupportedToken
) {
  const symbol = SYMBOLS[token]?.[venue];
  if (!symbol) {
    return generateFallbackOrderbook(token, venue);
  }

  try {
    if (venue === "binance") {
      const json = await httpJson(
        `https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=100`
      );
      const bids = json.bids.map(([p, q]: [string, string]) => ({
        price: +p,
        sizeBase: +q,
      }));
      const asks = json.asks.map(([p, q]: [string, string]) => ({
        price: +p,
        sizeBase: +q,
      }));
      const mid = (bids[0].price + asks[0].price) / 2;
      return { mid, bids, asks };
    }

    if (venue === "coinbase") {
      const json = await httpJson(
        `https://api.exchange.coinbase.com/products/${symbol}/book?level=2`
      );
      const bids = json.bids.map(([p, q]: [string, string]) => ({
        price: +p,
        sizeBase: +q,
      }));
      const asks = json.asks.map(([p, q]: [string, string]) => ({
        price: +p,
        sizeBase: +q,
      }));
      const mid = (+bids[0].price + +asks[0].price) / 2;
      return { mid, bids, asks };
    }

    const json = await httpJson(
      `https://api.kraken.com/0/public/Depth?pair=${symbol}&count=100`
    );
    const pairKey = Object.keys(json.result)[0];
    const raw = json.result[pairKey];

    const bids = raw.bids.map(([p, q]: [string, string]) => ({
      price: +p,
      sizeBase: +q,
    }));
    const asks = raw.asks.map(([p, q]: [string, string]) => ({
      price: +p,
      sizeBase: +q,
    }));
    const mid = (bids[0].price + asks[0].price) / 2;

    return { mid, bids, asks };
  } catch (err) {
    console.log(`[cexOrderbooks] ${venue} orderbook failed for ${token}, using fallback`);
    return generateFallbackOrderbook(token, venue);
  }
}

export async function fetchVenueVolume24h(
  venue: SupportedVenue,
  token: SupportedToken
): Promise<number> {
  const symbol = SYMBOLS[token]?.[venue];
  if (!symbol) {
    return generateFallbackVolume(token, venue);
  }

  try {
    if (venue === "binance") {
      const json = await httpJson(
        `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`
      );
      return +json.quoteVolume;
    }

    if (venue === "coinbase") {
      const json = await httpJson(
        `https://api.exchange.coinbase.com/products/${symbol}/stats`
      );
      return +json.volume * +json.last;
    }

    const json = await httpJson(
      `https://api.kraken.com/0/public/Ticker?pair=${symbol}`
    );
    const pairKey = Object.keys(json.result)[0];
    const raw = json.result[pairKey];
    return +raw.v[1] * +raw.c[0];
  } catch (err) {
    console.log(`[cexOrderbooks] ${venue} volume failed for ${token}, using fallback`);
    return generateFallbackVolume(token, venue);
  }
}

function generateFallbackVolume(token: SupportedToken, venue: SupportedVenue): number {
  const baseVolumes: Record<string, number> = {
    BTC: 500_000_000,
    ETH: 300_000_000,
    SOL: 150_000_000,
  };
  const multiplier = VENUE_DEPTH_MULTIPLIERS[venue];
  const jitter = 0.8 + Math.random() * 0.4;
  return (baseVolumes[token] || 50_000_000) * multiplier * jitter;
}
