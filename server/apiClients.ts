import axios from 'axios';

// ============ Exchange Response Interfaces ============

// Binance
interface BinanceSpotPrice {
  symbol: string;
  price: string;
}

interface BinanceFuturesPrice {
  symbol: string;
  price: string;
  time: number;
}

interface BinanceOrderBook {
  bids: [string, string][];
  asks: [string, string][];
}

interface BinanceTicker {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  lastPrice: string;
  volume: string;
  quoteVolume: string;
}

// Coinbase
interface CoinbaseTicker {
  trade_id: number;
  price: string;
  size: string;
  time: string;
  bid: string;
  ask: string;
  volume: string;
}

// KuCoin
interface KuCoinResponse {
  code: string;
  data: {
    sequence: string;
    price: string;
    size: string;
    bestBid: string;
    bestBidSize: string;
    bestAsk: string;
    bestAskSize: string;
    time: number;
  };
}

// Kraken
interface KrakenResponse {
  error: string[];
  result: {
    [key: string]: {
      a: [string, string, string]; // ask
      b: [string, string, string]; // bid
      c: [string, string]; // last trade
      v: [string, string]; // volume
      p: [string, string]; // vwap
      t: [number, number]; // trades
      l: [string, string]; // low
      h: [string, string]; // high
      o: string; // open
    };
  };
}

// Bybit
interface BybitResponse {
  retCode: number;
  retMsg: string;
  result: {
    category: string;
    list: Array<{
      symbol: string;
      lastPrice: string;
      indexPrice?: string;
      markPrice?: string;
      prevPrice24h: string;
      price24hPcnt: string;
      highPrice24h: string;
      lowPrice24h: string;
      prevPrice1h?: string;
      markPrice1h?: string;
      openInterest?: string;
      openInterestValue?: string;
      turnover24h: string;
      volume24h: string;
      fundingRate?: string;
      nextFundingTime?: string;
      predictedDeliveryPrice?: string;
      basisRate?: string;
      deliveryFeeRate?: string;
      deliveryTime?: string;
      ask1Size?: string;
      bid1Price?: string;
      ask1Price?: string;
      bid1Size?: string;
    }>;
  };
}

// OKX
interface OKXResponse {
  code: string;
  msg: string;
  data: Array<{
    instType: string;
    instId: string;
    last: string;
    lastSz: string;
    askPx: string;
    askSz: string;
    bidPx: string;
    bidSz: string;
    open24h: string;
    high24h: string;
    low24h: string;
    volCcy24h: string;
    vol24h: string;
    ts: string;
    sodUtc0: string;
    sodUtc8: string;
  }>;
}

// CoinMarketCap
interface CoinMarketCapListing {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  cmc_rank: number;
  quote: {
    USD: {
      price: number;
      market_cap: number;
      volume_24h: number;
    };
  };
}

interface CoinMarketCapResponse {
  data: CoinMarketCapListing[];
  status: {
    timestamp: string;
    error_code: number;
    error_message: string | null;
  };
}

// Unified price result
interface ExchangePrice {
  exchange: string;
  spotPrice: number;
  bid?: number;
  ask?: number;
  volume24h?: number;
  change24h?: number;
  timestamp: number;
}

interface PerpPrice {
  exchange: string;
  price: number;
  fundingRate?: number;
  openInterest?: number;
  timestamp: number;
}

// ============ API Base URLs ============
const BINANCE_SPOT_BASE = 'https://api.binance.com/api/v3';
const BINANCE_FUTURES_BASE = 'https://fapi.binance.com/fapi/v1';
const COINBASE_BASE = 'https://api.exchange.coinbase.com';
const KUCOIN_BASE = 'https://api.kucoin.com/api/v1';
const KRAKEN_BASE = 'https://api.kraken.com/0/public';
const BYBIT_BASE = 'https://api.bybit.com/v5';
const OKX_BASE = 'https://www.okx.com/api/v5';
const COINMARKETCAP_BASE = 'https://pro-api.coinmarketcap.com/v1';

const axiosInstance = axios.create({
  timeout: 8000,
  headers: {
    'Accept': 'application/json',
  },
});

export class Web3DataService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30000; // 30 seconds

  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data as T;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  // ============ Individual Exchange Spot Price Methods ============

  private async fetchCoinbasePrice(symbol: string): Promise<ExchangePrice | null> {
    try {
      const pair = `${symbol.toUpperCase()}-USD`;
      const response = await axiosInstance.get<CoinbaseTicker>(
        `${COINBASE_BASE}/products/${pair}/ticker`
      );
      return {
        exchange: 'Coinbase',
        spotPrice: parseFloat(response.data.price),
        bid: parseFloat(response.data.bid),
        ask: parseFloat(response.data.ask),
        volume24h: parseFloat(response.data.volume),
        timestamp: Date.now(),
      };
    } catch (error: any) {
      console.debug(`[Coinbase] Failed for ${symbol}: ${error.message}`);
      return null;
    }
  }

  private async fetchKuCoinPrice(symbol: string): Promise<ExchangePrice | null> {
    try {
      const pair = `${symbol.toUpperCase()}-USDT`;
      const response = await axiosInstance.get<KuCoinResponse>(
        `${KUCOIN_BASE}/market/orderbook/level1`,
        { params: { symbol: pair } }
      );
      if (response.data.code !== '200000') return null;
      return {
        exchange: 'KuCoin',
        spotPrice: parseFloat(response.data.data.price),
        bid: parseFloat(response.data.data.bestBid),
        ask: parseFloat(response.data.data.bestAsk),
        timestamp: response.data.data.time,
      };
    } catch (error: any) {
      console.debug(`[KuCoin] Failed for ${symbol}: ${error.message}`);
      return null;
    }
  }

  private async fetchKrakenPrice(symbol: string): Promise<ExchangePrice | null> {
    try {
      const krakenSymbol = this.getKrakenSymbol(symbol);
      const response = await axiosInstance.get<KrakenResponse>(
        `${KRAKEN_BASE}/Ticker`,
        { params: { pair: krakenSymbol } }
      );
      if (response.data.error.length > 0) return null;
      const key = Object.keys(response.data.result)[0];
      const data = response.data.result[key];
      const lastPrice = parseFloat(data.c[0]);
      const openPrice = parseFloat(data.o);
      const change24h = ((lastPrice - openPrice) / openPrice) * 100;
      return {
        exchange: 'Kraken',
        spotPrice: lastPrice,
        bid: parseFloat(data.b[0]),
        ask: parseFloat(data.a[0]),
        volume24h: parseFloat(data.v[1]),
        change24h,
        timestamp: Date.now(),
      };
    } catch (error: any) {
      console.debug(`[Kraken] Failed for ${symbol}: ${error.message}`);
      return null;
    }
  }

  private async fetchBybitSpotPrice(symbol: string): Promise<ExchangePrice | null> {
    try {
      const bybitSymbol = `${symbol.toUpperCase()}USDT`;
      const response = await axiosInstance.get<BybitResponse>(
        `${BYBIT_BASE}/market/tickers`,
        { params: { category: 'spot', symbol: bybitSymbol } }
      );
      if (response.data.retCode !== 0 || !response.data.result.list.length) return null;
      const data = response.data.result.list[0];
      return {
        exchange: 'Bybit',
        spotPrice: parseFloat(data.lastPrice),
        bid: data.bid1Price ? parseFloat(data.bid1Price) : undefined,
        ask: data.ask1Price ? parseFloat(data.ask1Price) : undefined,
        volume24h: parseFloat(data.turnover24h),
        change24h: parseFloat(data.price24hPcnt) * 100,
        timestamp: Date.now(),
      };
    } catch (error: any) {
      console.debug(`[Bybit Spot] Failed for ${symbol}: ${error.message}`);
      return null;
    }
  }

  private async fetchOKXPrice(symbol: string): Promise<ExchangePrice | null> {
    try {
      const instId = `${symbol.toUpperCase()}-USDT`;
      const response = await axiosInstance.get<OKXResponse>(
        `${OKX_BASE}/market/ticker`,
        { params: { instId } }
      );
      if (response.data.code !== '0' || !response.data.data.length) return null;
      const data = response.data.data[0];
      const lastPrice = parseFloat(data.last);
      const openPrice = parseFloat(data.open24h);
      const change24h = ((lastPrice - openPrice) / openPrice) * 100;
      return {
        exchange: 'OKX',
        spotPrice: lastPrice,
        bid: parseFloat(data.bidPx),
        ask: parseFloat(data.askPx),
        volume24h: parseFloat(data.volCcy24h),
        change24h,
        timestamp: parseInt(data.ts),
      };
    } catch (error: any) {
      console.debug(`[OKX] Failed for ${symbol}: ${error.message}`);
      return null;
    }
  }

  private async fetchBinanceSpotPrice(symbol: string): Promise<ExchangePrice | null> {
    try {
      const binanceSymbol = `${symbol.toUpperCase()}USDT`;
      const [priceRes, tickerRes] = await Promise.all([
        axiosInstance.get<BinanceSpotPrice>(
          `${BINANCE_SPOT_BASE}/ticker/price`,
          { params: { symbol: binanceSymbol } }
        ),
        axiosInstance.get<BinanceTicker>(
          `${BINANCE_SPOT_BASE}/ticker/24hr`,
          { params: { symbol: binanceSymbol } }
        ),
      ]);
      return {
        exchange: 'Binance',
        spotPrice: parseFloat(priceRes.data.price),
        volume24h: parseFloat(tickerRes.data.quoteVolume),
        change24h: parseFloat(tickerRes.data.priceChangePercent),
        timestamp: Date.now(),
      };
    } catch (error: any) {
      if (error.response?.status === 451) {
        console.debug(`[Binance] Geo-blocked for ${symbol}`);
      } else {
        console.debug(`[Binance] Failed for ${symbol}: ${error.message}`);
      }
      return null;
    }
  }

  // ============ Perpetual/Futures Price Methods ============

  private async fetchBybitPerpPrice(symbol: string): Promise<PerpPrice | null> {
    try {
      const bybitSymbol = `${symbol.toUpperCase()}USDT`;
      const response = await axiosInstance.get<BybitResponse>(
        `${BYBIT_BASE}/market/tickers`,
        { params: { category: 'linear', symbol: bybitSymbol } }
      );
      if (response.data.retCode !== 0 || !response.data.result.list.length) return null;
      const data = response.data.result.list[0];
      return {
        exchange: 'Bybit',
        price: parseFloat(data.lastPrice),
        fundingRate: data.fundingRate ? parseFloat(data.fundingRate) * 100 : undefined,
        openInterest: data.openInterestValue ? parseFloat(data.openInterestValue) : undefined,
        timestamp: Date.now(),
      };
    } catch (error: any) {
      console.debug(`[Bybit Perp] Failed for ${symbol}: ${error.message}`);
      return null;
    }
  }

  private async fetchBinanceFuturesPrice(symbol: string): Promise<PerpPrice | null> {
    try {
      const binanceSymbol = `${symbol.toUpperCase()}USDT`;
      const response = await axiosInstance.get<BinanceFuturesPrice>(
        `${BINANCE_FUTURES_BASE}/ticker/price`,
        { params: { symbol: binanceSymbol } }
      );
      return {
        exchange: 'Binance',
        price: parseFloat(response.data.price),
        timestamp: response.data.time || Date.now(),
      };
    } catch (error: any) {
      if (error.response?.status === 451) {
        console.debug(`[Binance Futures] Geo-blocked for ${symbol}`);
      } else {
        console.debug(`[Binance Futures] Failed for ${symbol}: ${error.message}`);
      }
      return null;
    }
  }

  // ============ Multi-Source Price Fetcher ============

  async getCryptoPrice(symbol: string): Promise<{ 
    price: number; 
    change24h: number; 
    volume24h: number; 
    futuresPrice: number; 
    basis: number;
    source: string;
  }> {
    const cacheKey = `price_${symbol}`;
    const cached = this.getCached<{ price: number; change24h: number; volume24h: number; futuresPrice: number; basis: number; source: string }>(cacheKey);
    if (cached) return cached;

    // Try all spot exchanges in parallel
    const spotPromises = [
      this.fetchCoinbasePrice(symbol),
      this.fetchKrakenPrice(symbol),
      this.fetchBybitSpotPrice(symbol),
      this.fetchOKXPrice(symbol),
      this.fetchKuCoinPrice(symbol),
      this.fetchBinanceSpotPrice(symbol),
    ];

    // Try perp exchanges in parallel  
    const perpPromises = [
      this.fetchBybitPerpPrice(symbol),
      this.fetchBinanceFuturesPrice(symbol),
    ];

    const [spotResults, perpResults] = await Promise.all([
      Promise.all(spotPromises),
      Promise.all(perpPromises),
    ]);

    // Get the first successful spot price
    const spotData = spotResults.find(r => r !== null);
    const perpData = perpResults.find(r => r !== null);

    if (spotData) {
      const spotPrice = spotData.spotPrice;
      const futuresPrice = perpData?.price || spotPrice;
      const basis = ((futuresPrice - spotPrice) / spotPrice) * 100;

      const result = {
        price: spotPrice,
        change24h: spotData.change24h || 0,
        volume24h: spotData.volume24h || 0,
        futuresPrice,
        basis,
        source: spotData.exchange + (perpData ? ` / ${perpData.exchange} Perp` : ''),
      };

      this.setCache(cacheKey, result);
      console.log(`[${spotData.exchange}] ${symbol}: Spot $${spotPrice.toFixed(2)}${perpData ? `, Perp $${futuresPrice.toFixed(2)} (${perpData.exchange}), Basis ${basis.toFixed(4)}%` : ''}`);
      return result;
    }

    // All sources failed, use fallback
    console.warn(`All exchanges failed for ${symbol}, using fallback data`);
    const fallback = this.getFallbackPrice(symbol);
    return { ...fallback, futuresPrice: fallback.price, basis: 0, source: 'Fallback' };
  }

  // Helper to map symbols to Kraken format
  private getKrakenSymbol(symbol: string): string {
    const krakenMap: { [key: string]: string } = {
      'BTC': 'XBTUSD',
      'ETH': 'ETHUSD',
      'SOL': 'SOLUSD',
      'XRP': 'XRPUSD',
      'ADA': 'ADAUSD',
      'DOGE': 'DOGEUSD',
      'DOT': 'DOTUSD',
      'AVAX': 'AVAXUSD',
      'MATIC': 'MATICUSD',
      'LINK': 'LINKUSD',
    };
    return krakenMap[symbol.toUpperCase()] || `${symbol.toUpperCase()}USD`;
  }

  async getOrderBookDepth(symbol: string): Promise<{ depthUSD: number; spread: number; bidDepth: number; askDepth: number }> {
    const cacheKey = `orderbook_${symbol}`;
    const cached = this.getCached<{ depthUSD: number; spread: number; bidDepth: number; askDepth: number }>(cacheKey);
    if (cached) return cached;

    try {
      const binanceSymbol = `${symbol.toUpperCase()}USDT`;
      const response = await axiosInstance.get<BinanceOrderBook>(
        `${BINANCE_SPOT_BASE}/depth`,
        {
          params: {
            symbol: binanceSymbol,
            limit: 100,
          },
        }
      );

      const bids = response.data.bids;
      const asks = response.data.asks;

      // Calculate depth in USD by multiplying price * quantity
      const bidDepthUSD = bids.slice(0, 20).reduce((sum, [price, qty]) => 
        sum + (parseFloat(price) * parseFloat(qty)), 0
      );
      const askDepthUSD = asks.slice(0, 20).reduce((sum, [price, qty]) => 
        sum + (parseFloat(price) * parseFloat(qty)), 0
      );
      const totalDepthUSD = (bidDepthUSD + askDepthUSD) / 2;

      const bestBid = parseFloat(bids[0][0]);
      const bestAsk = parseFloat(asks[0][0]);
      const spread = ((bestAsk - bestBid) / bestBid) * 100;

      const result = {
        depthUSD: totalDepthUSD / 1000000, // Convert to millions
        spread: spread,
        bidDepth: bidDepthUSD / 1000000,
        askDepth: askDepthUSD / 1000000,
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error: any) {
      if (error.response?.status === 451) {
        console.warn(`Binance API unavailable in this region (451) for ${symbol}, using fallback data`);
      } else {
        console.error(`Error fetching order book for ${symbol}:`, error.message);
      }
      // Realistic fallback based on typical market depth for major cryptocurrencies
      const fallbacks: { [key: string]: any } = {
        'BTC': { depthUSD: 42.5, spread: 0.05, bidDepth: 21.25, askDepth: 21.25 },
        'ETH': { depthUSD: 28.3, spread: 0.08, bidDepth: 14.15, askDepth: 14.15 },
        'SOL': { depthUSD: 15.7, spread: 0.12, bidDepth: 7.85, askDepth: 7.85 },
      };
      return fallbacks[symbol.toUpperCase()] || { depthUSD: 30.0, spread: 0.10, bidDepth: 15.0, askDepth: 15.0 };
    }
  }

  async getMarketTicker(symbol: string): Promise<BinanceTicker | null> {
    try {
      const binanceSymbol = `${symbol.toUpperCase()}USDT`;
      const response = await axiosInstance.get<BinanceTicker>(
        `${BINANCE_SPOT_BASE}/ticker/24hr`,
        {
          params: {
            symbol: binanceSymbol,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      if (error.response?.status !== 451) {
        console.error(`Error fetching ticker for ${symbol}:`, error.message);
      }
      return null;
    }
  }

  async getMultipleAssets(symbols: string[]): Promise<Map<string, any>> {
    const results = new Map();
    
    const promises = symbols.map(async (symbol) => {
      try {
        const [price, orderBook, ticker] = await Promise.all([
          this.getCryptoPrice(symbol),
          this.getOrderBookDepth(symbol),
          this.getMarketTicker(symbol),
        ]);

        results.set(symbol, {
          symbol,
          price: price.price,
          change24h: price.change24h,
          volume24h: price.volume24h,
          depthUSD: orderBook.depthUSD,
          spread: orderBook.spread,
          bidDepth: orderBook.bidDepth,
          askDepth: orderBook.askDepth,
          ticker,
        });
      } catch (error) {
        console.error(`Error fetching data for ${symbol}:`, error);
      }
    });

    await Promise.allSettled(promises);
    return results;
  }

  async getAggregatedData(asset: string = 'BTC'): Promise<{
    price: number;
    change24h: number;
    volume24h: number;
    depthUSD: number;
    spread: number;
    volatility: number;
  }> {
    try {
      const [priceData, orderBook] = await Promise.all([
        this.getCryptoPrice(asset),
        this.getOrderBookDepth(asset),
      ]);

      return {
        price: priceData.price,
        change24h: priceData.change24h,
        volume24h: priceData.volume24h,
        depthUSD: orderBook.depthUSD,
        spread: orderBook.spread,
        volatility: Math.abs(priceData.change24h),
      };
    } catch (error) {
      console.error(`Error fetching aggregated data for ${asset}:`, error);
      throw error;
    }
  }

  async getBinanceFullData(symbol: string): Promise<{
    spotPrice: number;
    futuresPrice: number;
    basis: number;
    change24h: number;
    volume24h: number;
    depthUSD: number;
    spread: number;
    bidDepth: number;
    askDepth: number;
  }> {
    const cacheKey = `binance_full_${symbol}`;
    const cached = this.getCached<any>(cacheKey);
    if (cached) return cached;

    try {
      const [priceData, orderBook] = await Promise.all([
        this.getCryptoPrice(symbol),
        this.getOrderBookDepth(symbol),
      ]);

      const result = {
        spotPrice: priceData.price,
        futuresPrice: priceData.futuresPrice,
        basis: priceData.basis,
        change24h: priceData.change24h,
        volume24h: priceData.volume24h,
        depthUSD: orderBook.depthUSD,
        spread: orderBook.spread,
        bidDepth: orderBook.bidDepth,
        askDepth: orderBook.askDepth,
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error(`Error fetching full Binance data for ${symbol}:`, error);
      const fallback = this.getFallbackPrice(symbol);
      return {
        spotPrice: fallback.price,
        futuresPrice: fallback.price,
        basis: 0,
        change24h: fallback.change24h,
        volume24h: fallback.volume24h,
        depthUSD: 30.0,
        spread: 0.10,
        bidDepth: 15.0,
        askDepth: 15.0,
      };
    }
  }

  private getFallbackPrice(symbol: string): { price: number; change24h: number; volume24h: number } {
    const fallbacks: { [key: string]: { price: number; change24h: number; volume24h: number } } = {
      'BTC': { price: 42850, change24h: 2.3, volume24h: 28500000000 },
      'ETH': { price: 2250, change24h: 1.8, volume24h: 15200000000 },
      'SOL': { price: 98.5, change24h: -0.9, volume24h: 2300000000 },
    };
    return fallbacks[symbol.toUpperCase()] || { price: 0, change24h: 0, volume24h: 0 };
  }

  calculatePoLiScore(data: {
    depth: number;
    spread: number;
    volatility: number;
    cexDexRatio: number;
  }): number {
    const depthScore = Math.min(100, (data.depth / 50) * 40);
    const spreadScore = Math.max(0, 30 - (data.spread * 1000));
    const volatilityScore = Math.max(0, 20 - (data.volatility * 1.5));
    const diversificationScore = 100 - Math.abs(data.cexDexRatio - 50) / 50 * 10;

    const totalScore = depthScore + spreadScore + volatilityScore + diversificationScore;
    return Math.min(100, Math.max(0, Math.round(totalScore)));
  }

  getRiskLevel(score: number): 'Low' | 'Medium' | 'High' | 'Critical' {
    if (score >= 75) return 'Low';
    if (score >= 50) return 'Medium';
    if (score >= 25) return 'High';
    return 'Critical';
  }

  async getTop20Tokens(): Promise<Array<{ id: string; name: string; symbol: string; rank: number }>> {
    const cacheKey = 'top20_tokens';
    const cached = this.getCached<Array<{ id: string; name: string; symbol: string; rank: number }>>(cacheKey);
    if (cached) return cached;

    try {
      const apiKey = process.env.COINMARKETCAP_API_KEY;
      if (!apiKey) {
        console.warn('COINMARKETCAP_API_KEY not found, returning fallback token list');
        return this.getFallbackTop20();
      }

      const response = await axios.get<CoinMarketCapResponse>(
        `${COINMARKETCAP_BASE}/cryptocurrency/listings/latest`,
        {
          headers: {
            'X-CMC_PRO_API_KEY': apiKey,
            'Accept': 'application/json',
          },
          params: {
            limit: 20,
            convert: 'USD',
          },
          timeout: 10000,
        }
      );

      const tokens = response.data.data.map((coin) => ({
        id: coin.symbol,
        name: coin.name,
        symbol: coin.symbol,
        rank: coin.cmc_rank,
      }));

      this.setCache(cacheKey, tokens);
      return tokens;
    } catch (error: any) {
      console.error('Error fetching Top 20 from CoinMarketCap:', error.message);
      return this.getFallbackTop20();
    }
  }

  private getFallbackTop20(): Array<{ id: string; name: string; symbol: string; rank: number }> {
    return [
      { id: 'BTC', name: 'Bitcoin', symbol: 'BTC', rank: 1 },
      { id: 'ETH', name: 'Ethereum', symbol: 'ETH', rank: 2 },
      { id: 'USDT', name: 'Tether', symbol: 'USDT', rank: 3 },
      { id: 'BNB', name: 'BNB', symbol: 'BNB', rank: 4 },
      { id: 'SOL', name: 'Solana', symbol: 'SOL', rank: 5 },
      { id: 'XRP', name: 'XRP', symbol: 'XRP', rank: 6 },
      { id: 'USDC', name: 'USD Coin', symbol: 'USDC', rank: 7 },
      { id: 'ADA', name: 'Cardano', symbol: 'ADA', rank: 8 },
      { id: 'AVAX', name: 'Avalanche', symbol: 'AVAX', rank: 9 },
      { id: 'DOGE', name: 'Dogecoin', symbol: 'DOGE', rank: 10 },
      { id: 'TRX', name: 'TRON', symbol: 'TRX', rank: 11 },
      { id: 'DOT', name: 'Polkadot', symbol: 'DOT', rank: 12 },
      { id: 'MATIC', name: 'Polygon', symbol: 'MATIC', rank: 13 },
      { id: 'LINK', name: 'Chainlink', symbol: 'LINK', rank: 14 },
      { id: 'SHIB', name: 'Shiba Inu', symbol: 'SHIB', rank: 15 },
      { id: 'UNI', name: 'Uniswap', symbol: 'UNI', rank: 16 },
      { id: 'LTC', name: 'Litecoin', symbol: 'LTC', rank: 17 },
      { id: 'ATOM', name: 'Cosmos', symbol: 'ATOM', rank: 18 },
      { id: 'ETC', name: 'Ethereum Classic', symbol: 'ETC', rank: 19 },
      { id: 'XLM', name: 'Stellar', symbol: 'XLM', rank: 20 },
    ];
  }
}

export const web3DataService = new Web3DataService();
