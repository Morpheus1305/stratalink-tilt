import type { 
  DashboardData, 
  TimeSeriesData,
  TrendsData,
  LiveMetric,
  LiquidityScore,
  StressSignal,
  KeyMetric,
  ExchangeData,
  CexDexDistribution,
  TickerItem,
  TimeSeriesPoint,
  PortfolioData,
  AlertsData,
  ScorecardData,
  User
} from "@shared/schema";
import { users, otpCodes, loginAttempts } from "@shared/schema";
import { db } from "./db";
import { eq, and, lt } from "drizzle-orm";
import { web3DataService } from "./apiClients";

export interface IStorage {
  getDashboardData(asset?: string): Promise<DashboardData>;
  getTimeSeriesData(timeframe: string, asset?: string): Promise<TimeSeriesData>;
  getTrendsData(timeframe: '1D' | '7D' | '1M' | '3M' | '1Y', asset?: string): Promise<TrendsData>;
  getPortfolioData(asset?: string): Promise<PortfolioData>;
  getAlertsData(asset?: string): Promise<AlertsData>;
  getScorecardData(metricType: 'tokenomics' | 'liquidity', asset?: string): Promise<ScorecardData>;
  
  // Authentication methods
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
  createUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  storeOTP(userId: string, otp: string, expiresAt: Date): Promise<void>;
  verifyOTP(userId: string, otp: string): Promise<boolean>;
  clearOTP(userId: string): Promise<void>;
  incrementLoginAttempts(userId: string): Promise<number>;
  resetLoginAttempts(userId: string): Promise<void>;
  isUserLocked(userId: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private useLiveData: boolean = true;  // Enabled: Using Binance API for live data
  
  private async fetchLiveMetrics(asset: string = 'BTC'): Promise<LiveMetric[] | null> {
    if (!this.useLiveData) return null;
    
    try {
      const [priceData, orderBook] = await Promise.all([
        web3DataService.getCryptoPrice(asset),
        web3DataService.getOrderBookDepth(asset),
      ]);

      const volatility = Math.abs(priceData.change24h);
      const cexDexRatio = 68;
      
      // Note: orderBook.depthUSD is already in millions from the fallback data in apiClients.ts
      // So we don't need to divide by 1,000,000
      const poliScore = web3DataService.calculatePoLiScore({
        depth: orderBook.depthUSD,
        spread: orderBook.spread,
        volatility: volatility,
        cexDexRatio: cexDexRatio,
      });

      return [
        {
          label: "POLI SCORE",
          value: `${poliScore}/100`,
          change: poliScore >= 72 ? 1.7 : -1.2,
          changePercent: poliScore >= 72 ? 2.4 : -1.8,
          trend: poliScore >= 72 ? "up" : "down",
        },
        {
          label: "MARKET DEPTH",
          value: `$${orderBook.depthUSD.toFixed(1)}M`,
          change: 3.5,
          changePercent: 8.2,
          trend: "up",
        },
        {
          label: "BID-ASK SPREAD",
          value: `${orderBook.spread.toFixed(2)}%`,
          change: -0.002,
          changePercent: -2.1,
          trend: "down",
        },
        {
          label: "VOLATILITY 24H",
          value: `${volatility.toFixed(1)}%`,
          change: volatility >= 12 ? 1.9 : -1.3,
          changePercent: volatility >= 12 ? 15.3 : -8.5,
          trend: volatility >= 12 ? "up" : "down",
        },
        {
          label: "CEX/DEX RATIO",
          value: `${cexDexRatio}:${100 - cexDexRatio}`,
          change: -2.2,
          changePercent: -3.2,
          trend: "down",
        },
        {
          label: "TOTAL VOL 24H",
          value: `$${(priceData.volume24h / 1e9).toFixed(1)}B`,
          change: 154,
          changePercent: 12.9,
          trend: "up",
        },
      ];
    } catch (error) {
      console.error('Error fetching live metrics, falling back to mock data:', error);
      return null;
    }
  }

  private generateLiveMetrics(asset: string = 'BTC'): LiveMetric[] {
    // Add slight randomness for realistic live updates
    const variance = () => (Math.random() - 0.5) * 0.5;
    
    // Asset-specific base values
    const assetBaseValues: Record<string, { poliScore: number; depth: number; spread: number; volatility: number; cex: number; volume: number }> = {
      'BTC': { poliScore: 72, depth: 42.5, spread: 0.08, volatility: 12.4, cex: 68, volume: 1.2 },
      'ETH': { poliScore: 68, depth: 28.3, spread: 0.12, volatility: 14.8, cex: 65, volume: 0.85 },
      'SOL': { poliScore: 62, depth: 15.7, spread: 0.15, volatility: 18.2, cex: 58, volume: 0.42 },
      'BNB': { poliScore: 65, depth: 22.0, spread: 0.11, volatility: 15.5, cex: 75, volume: 0.58 },
      'XRP': { poliScore: 60, depth: 19.5, spread: 0.13, volatility: 16.3, cex: 72, volume: 0.51 },
      'ADA': { poliScore: 58, depth: 14.2, spread: 0.16, volatility: 19.1, cex: 62, volume: 0.38 },
    };
    
    const baseValues = assetBaseValues[asset] || { poliScore: 65, depth: 30.0, spread: 0.10, volatility: 15.0, cex: 68, volume: 0.7 };
    const poliScore = baseValues.poliScore + Math.floor(variance() * 5);
    const marketDepth = baseValues.depth + variance() * 2;
    const spread = baseValues.spread + variance() * 0.01;
    const volatility = baseValues.volatility + variance() * 1.5;
    const cex = baseValues.cex + Math.floor(variance() * 4);
    const volume = baseValues.volume + variance() * 0.1;
    
    return [
      {
        label: "POLI SCORE",
        value: `${poliScore}/100`,
        change: 1.7 + variance(),
        changePercent: 2.4 + variance(),
        trend: poliScore >= baseValues.poliScore ? "up" : "down",
      },
      {
        label: "MARKET DEPTH",
        value: `$${marketDepth.toFixed(1)}M`,
        change: 3.5 + variance(),
        changePercent: 8.2 + variance(),
        trend: marketDepth >= baseValues.depth ? "up" : "down",
      },
      {
        label: "BID-ASK SPREAD",
        value: `${Math.max(0.05, spread).toFixed(2)}%`,
        change: -0.002 + variance() * 0.001,
        changePercent: -2.1 + variance(),
        trend: spread <= baseValues.spread ? "down" : "up",
      },
      {
        label: "VOLATILITY 24H",
        value: `${Math.max(10, volatility).toFixed(1)}%`,
        change: 1.9 + variance(),
        changePercent: 15.3 + variance() * 2,
        trend: volatility >= baseValues.volatility ? "up" : "down",
      },
      {
        label: "CEX/DEX RATIO",
        value: `${cex}:${100 - cex}`,
        change: -2.2 + variance(),
        changePercent: -3.2 + variance(),
        trend: "down",
      },
      {
        label: "TOTAL VOL 24H",
        value: `$${volume.toFixed(1)}B`,
        change: 154 + Math.floor(variance() * 20),
        changePercent: 12.9 + variance() * 2,
        trend: "up",
      },
    ];
  }

  private generateLiquidityScore(asset: string = 'BTC'): LiquidityScore {
    const variance = () => (Math.random() - 0.5) * 0.5;
    
    // Asset-specific base PoLi scores
    const assetBaseScores: Record<string, number> = {
      'BTC': 72,
      'ETH': 68,
      'SOL': 62,
      'BNB': 65,
      'XRP': 60,
      'ADA': 58,
    };
    
    const baseScore = assetBaseScores[asset] || 65;
    const score = Math.max(50, Math.min(95, baseScore + Math.floor(variance() * 10)));
    const change = 2.4 + variance();
    
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (score >= 75) riskLevel = 'low';
    else if (score >= 68) riskLevel = 'medium';
    else if (score >= 60) riskLevel = 'high';
    else riskLevel = 'critical';
    
    return {
      score,
      riskLevel,
      trend: change >= 0 ? "up" : "down",
      change24h: Number(change.toFixed(1)),
      historicalAverage: Math.max(60, baseScore - 4),
    };
  }

  private generateStressSignals(asset: string = 'BTC'): StressSignal[] {
    const variance = () => (Math.random() - 0.5) * 0.5;
    const now = new Date();
    const timestamp = now.getTime();
    
    // Asset-specific base values
    const assetDepthValues: Record<string, number> = {
      'BTC': 42.5,
      'ETH': 28.3,
      'SOL': 15.7,
      'BNB': 22.0,
      'XRP': 19.5,
      'ADA': 14.2,
    };
    
    const spreadChange = 15.3 + variance() * 5;
    const depthValue = (assetDepthValues[asset] || 30.0) + variance() * 2;
    const concentration = 68 + Math.floor(variance() * 4);
    
    const formatTime = (date: Date) => {
      const hours = String(date.getUTCHours()).padStart(2, '0');
      const mins = String(date.getUTCMinutes()).padStart(2, '0');
      return `${hours}:${mins} UTC`;
    };
    
    return [
      {
        id: `signal-spread-${timestamp}-1`,
        title: "Elevated Liquidity Pressure",
        description: `Bid-ask spread has widened by ${Math.abs(spreadChange).toFixed(1)}%, indicating heightened market uncertainty. Monitor for potential price swings.`,
        severity: spreadChange > 18 ? "warning" : "info",
        timestamp: formatTime(new Date(now.getTime() - 15 * 60000)),
        category: "SPREAD ANALYSIS",
      },
      {
        id: `signal-concentration-${timestamp}-2`,
        title: "CEX Liquidity Concentration",
        description: `${concentration}% of the market's volume is concentrated in Binance. Critical monitoring for single-point of failure risks.`,
        severity: concentration > 70 ? "warning" : "info",
        timestamp: formatTime(new Date(now.getTime() - 32 * 60000)),
        category: "CONCENTRATION RISK",
      },
      {
        id: `signal-depth-${timestamp}-3`,
        title: "Strong Market Depth",
        description: `Market depth is healthy at $${depthValue.toFixed(1)}M with balanced bid-ask spread across major exchanges.`,
        severity: "success",
        timestamp: formatTime(new Date(now.getTime() - 48 * 60000)),
        category: "DEPTH MONITORING",
      },
      {
        id: `signal-balance-${timestamp}-4`,
        title: "CEX/DEX Balance Maintained",
        description: `The CEX/DEX ratio (${concentration}:${100 - concentration}) remains within healthy parameters. DEX/CEX diversity reduces liquidity dependencies.`,
        severity: "info",
        timestamp: formatTime(new Date(now.getTime() - 65 * 60000)),
        category: "BALANCE CHECK",
      },
    ];
  }

  private generateKeyMetrics(asset: string = 'BTC'): KeyMetric[] {
    const variance = () => (Math.random() - 0.5) * 0.5;
    
    // Asset-specific base values
    const assetMetrics: Record<string, { depth: number; spread: number; volatility: number; volume: number }> = {
      'BTC': { depth: 42.5, spread: 0.08, volatility: 12.4, volume: 1.2 },
      'ETH': { depth: 28.3, spread: 0.12, volatility: 14.8, volume: 0.85 },
      'SOL': { depth: 15.7, spread: 0.15, volatility: 18.2, volume: 0.42 },
      'BNB': { depth: 22.0, spread: 0.11, volatility: 15.5, volume: 0.58 },
      'XRP': { depth: 19.5, spread: 0.13, volatility: 16.3, volume: 0.51 },
      'ADA': { depth: 14.2, spread: 0.16, volatility: 19.1, volume: 0.38 },
    };
    
    const baseMetrics = assetMetrics[asset] || { depth: 30.0, spread: 0.10, volatility: 15.0, volume: 0.7 };
    const marketDepth = baseMetrics.depth + variance() * 2;
    const spread = baseMetrics.spread + variance() * 0.01;
    const volatility = baseMetrics.volatility + variance() * 1.5;
    const orderbook = baseMetrics.volume + variance() * 0.1;
    
    return [
      {
        id: "market-depth",
        label: "MARKET DEPTH",
        value: `$${marketDepth.toFixed(1)}M`,
        change: 3.5 + variance(),
        changePercent: Number((8.2 + variance()).toFixed(1)),
        trend: marketDepth >= 42.5 ? "up" : "down",
      },
      {
        id: "bid-ask-spread",
        label: "BID-ASK SPREAD",
        value: `${Math.max(0.05, spread).toFixed(2)}%`,
        change: -0.002 + variance() * 0.001,
        changePercent: Number((-2.1 + variance()).toFixed(1)),
        trend: spread <= 0.08 ? "down" : "up",
      },
      {
        id: "volatility-24h",
        label: "VOLATILITY 24H",
        value: `${Math.max(10, volatility).toFixed(1)}%`,
        change: 1.9 + variance(),
        changePercent: Number((15.3 + variance() * 2).toFixed(1)),
        trend: volatility >= 12.4 ? "up" : "down",
      },
      {
        id: "cex-dex-ratio",
        label: "CEX/DEX RATIO",
        value: "68:32",
        change: -2.2 + variance(),
        changePercent: Number((-3.2 + variance()).toFixed(1)),
        trend: "down",
      },
      {
        id: "concentration-risk",
        label: "CONCENTRATION RISK",
        value: "Medium",
        change: 0,
        changePercent: 0,
        trend: "neutral",
      },
      {
        id: "total-orderbook",
        label: "TOTAL ORDER BOOK",
        value: `$${orderbook.toFixed(1)}B`,
        change: 154 + Math.floor(variance() * 20),
        changePercent: Number((12.9 + variance() * 2).toFixed(1)),
        trend: orderbook >= 1.2 ? "up" : "down",
      },
    ];
  }

  private generateExchangeData(asset: string = 'BTC'): ExchangeData[] {
    const variance = () => (Math.random() - 0.5) * 0.5;
    
    // Asset-specific liquidity multipliers
    const assetMultipliers: Record<string, number> = {
      'BTC': 1.0,
      'ETH': 0.65,
      'SOL': 0.35,
      'BNB': 0.52,
      'XRP': 0.46,
      'ADA': 0.33,
    };
    
    const multiplier = assetMultipliers[asset] || 0.7;
    
    return [
      { exchange: "Binance", liquidity: Number((28.5 * multiplier + variance()).toFixed(1)), percentage: 45 },
      { exchange: "Coinbase", liquidity: Number((18.2 * multiplier + variance()).toFixed(1)), percentage: 29 },
      { exchange: "Kraken", liquidity: Number((9.4 * multiplier + variance()).toFixed(1)), percentage: 15 },
      { exchange: "Uniswap", liquidity: Number((4.7 * multiplier + variance()).toFixed(1)), percentage: 7 },
      { exchange: "Others", liquidity: Number((2.5 * multiplier + variance() * 0.5).toFixed(1)), percentage: 4 },
    ];
  }

  private generateCexDexDistribution(asset: string = 'BTC'): CexDexDistribution {
    const variance = Math.floor((Math.random() - 0.5) * 4);
    
    // Asset-specific CEX/DEX ratios (CEX percentage)
    const assetCexRatios: Record<string, number> = {
      'BTC': 68,
      'ETH': 65,
      'SOL': 58,
      'BNB': 75,
      'XRP': 72,
      'ADA': 62,
    };
    
    const baseCex = assetCexRatios[asset] || 68;
    const cex = Math.max(55, Math.min(80, baseCex + variance));
    
    return {
      cex,
      dex: 100 - cex,
    };
  }

  private async fetchLiveTickerItems(): Promise<TickerItem[] | null> {
    if (!this.useLiveData) return null;
    
    try {
      const symbols = ['BTC', 'ETH', 'SOL'];
      const assetsData = await web3DataService.getMultipleAssets(symbols);
      
      const items: TickerItem[] = [];
      const now = new Date();
      const timestamp = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')} UTC`;
      
      const assetArray = Array.from(assetsData.entries());
      for (const [symbol, data] of assetArray) {
        items.push({
          id: `ticker-${symbol}-${now.getTime()}`,
          symbol: `${symbol}/USD`,
          price: data.price.toFixed(2),
          change: data.change24h,
          changePercent: data.change24h.toFixed(2),
          depth: `${data.depthUSD.toFixed(1)}M`,
          spread: `${data.spread.toFixed(2)}%`,
          volume: `${(data.volume24h / 1e9).toFixed(1)}B`,
          timestamp,
        });
      }
      
      return items;
    } catch (error) {
      console.error('Error fetching live ticker data, falling back to mock data:', error);
      return null;
    }
  }

  private generateTickerItems(): TickerItem[] {
    const variance = () => (Math.random() - 0.5) * 0.5;
    const now = new Date();
    const timestamp = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')} UTC`;
    
    const btcPrice = 63421 + Math.floor(variance() * 500);
    const ethPrice = 3124 + Math.floor(variance() * 50);
    const solPrice = 142 + Math.floor(variance() * 5);
    
    return [
      {
        id: `ticker-BTC-${now.getTime()}-1`,
        symbol: "BTC/USD",
        price: btcPrice.toString(),
        change: Math.floor(variance() * 200),
        changePercent: (1.8 + variance()).toFixed(1),
        depth: `${(42.5 + variance()).toFixed(1)}M`,
        spread: `${(0.08 + variance() * 0.01).toFixed(2)}%`,
        volume: `${(1.2 + variance() * 0.1).toFixed(1)}B`,
        timestamp,
      },
      {
        id: `ticker-ETH-${now.getTime()}-2`,
        symbol: "ETH/USD",
        price: ethPrice.toString(),
        change: Math.floor(variance() * 50),
        changePercent: (-0.4 + variance()).toFixed(1),
        depth: `${(28.3 + variance()).toFixed(1)}M`,
        spread: `${(0.12 + variance() * 0.01).toFixed(2)}%`,
        volume: `${(845 + variance() * 20).toFixed(0)}M`,
        timestamp,
      },
      {
        id: `ticker-SOL-${now.getTime()}-3`,
        symbol: "SOL/USD",
        price: solPrice.toString(),
        change: Math.floor(variance() * 10),
        changePercent: (6.4 + variance() * 2).toFixed(1),
        depth: `${(15.7 + variance()).toFixed(1)}M`,
        spread: `${(0.15 + variance() * 0.02).toFixed(2)}%`,
        volume: `${(423 + variance() * 30).toFixed(0)}M`,
        timestamp,
      },
    ];
  }

  private generateTimeSeriesPoints(timeframe: string, asset: string = 'BTC'): TimeSeriesPoint[] {
    const now = new Date();
    const points: TimeSeriesPoint[] = [];
    
    let intervals: number;
    let intervalMs: number;
    
    switch (timeframe) {
      case '1H':
        intervals = 60;
        intervalMs = 60 * 1000; // 1 minute
        break;
      case '4H':
        intervals = 48;
        intervalMs = 5 * 60 * 1000; // 5 minutes
        break;
      case '1D':
        intervals = 24;
        intervalMs = 60 * 60 * 1000; // 1 hour
        break;
      case '1W':
        intervals = 28;
        intervalMs = 6 * 60 * 60 * 1000; // 6 hours
        break;
      case '1M':
        intervals = 30;
        intervalMs = 24 * 60 * 60 * 1000; // 1 day
        break;
      default:
        intervals = 24;
        intervalMs = 60 * 60 * 1000;
    }

    // Asset-specific base values to differentiate data
    const assetMultipliers: Record<string, { depth: number; spread: number }> = {
      'BTC': { depth: 1.0, spread: 1.0 },
      'ETH': { depth: 0.65, spread: 1.5 },
      'SOL': { depth: 0.35, spread: 1.8 },
      'BNB': { depth: 0.50, spread: 1.4 },
      'XRP': { depth: 0.45, spread: 1.6 },
      'ADA': { depth: 0.30, spread: 1.7 },
    };
    
    const multiplier = assetMultipliers[asset] || { depth: 0.8, spread: 1.2 };

    for (let i = intervals; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * intervalMs);
      const timeString = timeframe === '1M' 
        ? timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      
      // Generate realistic looking data with some variance, scaled by asset
      const baseDepth = 42 * multiplier.depth;
      const depthVariance = Math.sin(i / 5) * 8 + Math.random() * 4;
      const liquidityDepth = baseDepth + depthVariance;
      
      const baseSpread = 0.08 * multiplier.spread;
      const spreadVariance = Math.cos(i / 3) * 0.03 + Math.random() * 0.02;
      const spread = Math.max(0.05, baseSpread + spreadVariance);

      points.push({
        timestamp: timeString,
        liquidityDepth: Number(liquidityDepth.toFixed(2)),
        spread: Number(spread.toFixed(4)),
      });
    }

    return points;
  }

  async getDashboardData(asset: string = 'BTC'): Promise<DashboardData> {
    const [liveMetrics, tickerItems] = await Promise.all([
      this.fetchLiveMetrics(asset).catch((err) => {
        console.log(`fetchLiveMetrics failed for ${asset}, using generated data:`, err.message);
        return null;
      }),
      this.fetchLiveTickerItems().catch(() => null),
    ]);
    
    const finalMetrics = liveMetrics || this.generateLiveMetrics(asset);
    console.log(`Dashboard data for ${asset}, using ${liveMetrics ? 'live' : 'generated'} metrics. PoLi Score:`, finalMetrics[0].value);
    
    return {
      liveMetrics: finalMetrics,
      liquidityScore: this.generateLiquidityScore(asset),
      stressSignals: this.generateStressSignals(asset),
      keyMetrics: this.generateKeyMetrics(asset),
      exchangeDistribution: this.generateExchangeData(asset),
      cexDexDistribution: this.generateCexDexDistribution(asset),
      tickerItems: tickerItems || this.generateTickerItems(),
    };
  }

  async getTimeSeriesData(timeframe: string, asset: string = 'BTC'): Promise<TimeSeriesData> {
    const validTimeframes = ['1H', '4H', '1D', '1W', '1M'];
    const tf = validTimeframes.includes(timeframe) ? timeframe : '1D';
    
    return {
      timeframe: tf as any,
      data: this.generateTimeSeriesPoints(tf, asset),
    };
  }

  async getTrendsData(timeframe: '1D' | '7D' | '1M' | '3M' | '1Y', asset: string = 'BTC'): Promise<TrendsData> {
    const dataPointsMap: Record<string, number> = {
      '1D': 24,    // Hourly data for 1 day
      '7D': 168,   // Hourly data for 7 days (or every few hours)
      '1M': 30,    // Daily data for 1 month
      '3M': 90,    // Daily data for 3 months
      '1Y': 365,   // Daily data for 1 year
    };

    const dataPoints = dataPointsMap[timeframe] || 168;
    const now = new Date();
    
    const poliScoreEvolution = [];
    const marketDepthTrend = [];
    const volatilityTrend = [];

    // Asset-specific base values to create distinct trends for different tokens
    const assetBaseValues: Record<string, { poliScore: number; depth: number; volatility: number }> = {
      'BTC': { poliScore: 72, depth: 45, volatility: 10 },
      'ETH': { poliScore: 68, depth: 32, volatility: 12 },
      'SOL': { poliScore: 62, depth: 18, volatility: 15 },
      'BNB': { poliScore: 65, depth: 25, volatility: 13 },
      'XRP': { poliScore: 60, depth: 22, volatility: 14 },
      'ADA': { poliScore: 58, depth: 16, volatility: 16 },
    };
    
    const baseValues = assetBaseValues[asset] || { poliScore: 65, depth: 30, volatility: 12 };
    
    // Generate realistic trending data with some variability
    const basePoliScore = baseValues.poliScore + Math.random() * 8 - 4;  // ±4 variation
    const baseDepth = baseValues.depth + Math.random() * 10 - 5;         // ±5M variation
    const baseVolatility = baseValues.volatility + Math.random() * 4 - 2; // ±2% variation

    for (let i = 0; i < dataPoints; i++) {
      let timeString: string;
      
      // Calculate time based on timeframe
      if (timeframe === '1D') {
        const time = new Date(now.getTime() - (dataPoints - i) * 60 * 60 * 1000);
        timeString = `${String(time.getUTCHours()).padStart(2, '0')}:${String(time.getUTCMinutes()).padStart(2, '0')}`;
      } else if (timeframe === '7D') {
        const time = new Date(now.getTime() - (dataPoints - i) * 60 * 60 * 1000);
        const day = time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        timeString = `${day}`;
      } else {
        const time = new Date(now.getTime() - (dataPoints - i) * 24 * 60 * 60 * 1000);
        timeString = time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }

      // Create smooth trends with some noise
      const progress = i / dataPoints;
      const wave = Math.sin(progress * Math.PI * 2) * 0.1;
      const noise = (Math.random() - 0.5) * 0.05;

      // PoLi Score: General upward trend with fluctuation
      const poliScore = Math.max(50, Math.min(100, 
        basePoliScore + wave * 20 + noise * 15 + progress * 5
      ));

      // Market Depth: Relatively stable with slight variations
      const depth = Math.max(20, Math.min(60,
        baseDepth + wave * 8 + noise * 5
      ));

      // Volatility: More erratic, trending down slightly
      const volatility = Math.max(5, Math.min(15,
        baseVolatility + wave * 3 + noise * 4 - progress * 2
      ));

      poliScoreEvolution.push({
        time: timeString,
        score: Number(poliScore.toFixed(1)),
      });

      marketDepthTrend.push({
        time: timeString,
        depth: Number(depth.toFixed(1)),
      });

      volatilityTrend.push({
        time: timeString,
        volatility: Number(volatility.toFixed(2)),
      });
    }

    // Calculate overall change percent for PoLi score
    const firstScore = poliScoreEvolution[0].score;
    const lastScore = poliScoreEvolution[poliScoreEvolution.length - 1].score;
    const changePercent = ((lastScore - firstScore) / firstScore) * 100;

    return {
      timeframe,
      poliScoreEvolution,
      marketDepthTrend,
      volatilityTrend,
      changePercent: Number(changePercent.toFixed(2)),
    };
  }

  async getPortfolioData(asset: string = 'BTC'): Promise<PortfolioData> {
    // Asset-specific portfolio PoLi scores
    const assetPoliScores: Record<string, number> = {
      'BTC': 72,
      'ETH': 67,
      'SOL': 62,
      'BNB': 69,
      'XRP': 64,
      'ADA': 60,
    };
    
    const portfolioPoliScore = assetPoliScores[asset] || 65;
    
    return {
      portfolioPoliScore,
      summary: {
        healthyAssets: 2,
        warningAssets: 3,
        criticalAssets: 1,
      },
      tokens: [
        {
          token: 'SOL',
          name: 'Solana',
          poliScore: 73,
          changePercent: -3.2,
          depth: '$42.5M',
          volatility: '12.4%',
          spread: '0.08%',
          action: 'MONITOR',
        },
        {
          token: 'USDC',
          name: 'USD Coin',
          poliScore: 94,
          changePercent: 1.8,
          depth: '$128.3M',
          volatility: '1.6%',
          spread: '0.02%',
          action: 'REVIEW',
        },
        {
          token: 'USDT',
          name: 'Tether',
          poliScore: 91,
          changePercent: 0.5,
          depth: '$245.7M',
          volatility: '0.9%',
          spread: '0.01%',
          action: 'REVIEW',
        },
        {
          token: 'JTO',
          name: 'Jito',
          poliScore: 58,
          changePercent: -3.2,
          depth: '$8.3M',
          volatility: '24.7%',
          spread: '0.45%',
          action: 'REVIEW',
        },
        {
          token: 'JUP',
          name: 'Jupiter',
          poliScore: 65,
          changePercent: 2.1,
          depth: '$15.2M',
          volatility: '19.3%',
          spread: '0.28%',
          action: 'MONITOR',
        },
        {
          token: 'BONK',
          name: 'Bonk',
          poliScore: 48,
          changePercent: -13.2,
          depth: '$5.1M',
          volatility: '32.1%',
          spread: '0.92%',
          action: 'CRITICAL',
        },
      ],
      poliComparison: [
        { token: 'SOL', score: 73 },
        { token: 'USDC', score: 94 },
        { token: 'USDT', score: 91 },
        { token: 'JTO', score: 58 },
        { token: 'JUP', score: 65 },
        { token: 'BONK', score: 48 },
      ],
      radarAnalysis: [
        { dimension: 'Depth', sol: 75, usdc: 95, usdt: 92 },
        { dimension: 'Concentration', sol: 68, usdc: 88, usdt: 90 },
        { dimension: 'Volatility', sol: 65, usdc: 95, usdt: 93 },
        { dimension: 'Spread', sol: 78, usdc: 94, usdt: 96 },
        { dimension: 'Liquidity', sol: 72, usdc: 92, usdt: 89 },
      ],
    };
  }

  async getAlertsData(asset: string = 'BTC'): Promise<AlertsData> {
    return {
      riskIndicators: [
        { indicator: 'Funding Rate Spike', observedBehavior: 'BTC +0.35% / 8z', ras: 'high' },
        { indicator: 'Paper Spot Basis', observedBehavior: 'Consolidation > $2.3B', ras: 'high' },
        { indicator: 'Stablecoin Pool Drawdown', observedBehavior: 'BUSD/CE -$2B', ras: 'low' },
        { indicator: 'Cross-Margin Utilization', observedBehavior: 'BN:48%', ras: 'medium' },
        { indicator: 'Large Holder Rule', observedBehavior: 'TX:UTXO < 0.25x', ras: 'low' },
        { indicator: 'ADL Trigger Count', observedBehavior: 'Multi-exchange', ras: 'low' },
      ],
      activeWarningCapacity: '6-8 hours',
      criticalAssets: {
        count: 3,
        total: 8,
      },
      alertTimeline: this.generateAlertTimeline(),
      alertLog: [
        {
          id: '1',
          timeUTC: '18:45',
          alertType: 'Depth',
          severity: 'HIGH',
          description: 'Liquidity sweep 85% of volume',
          status: 'New',
        },
        {
          id: '2',
          timeUTC: '16:35',
          alertType: 'Storage',
          severity: 'WARNING',
          description: '2.6% SOL impact on SOL/USDC',
          status: 'Acknowledged',
        },
        {
          id: '3',
          timeUTC: '16:32',
          alertType: 'Normal',
          severity: 'WARNING',
          description: '23% bid depth restock on AVAX',
          status: 'Dismissed',
        },
        {
          id: '4',
          timeUTC: '15:14',
          alertType: 'Normal',
          severity: 'CRITICAL',
          description: 'Unusual price action detected',
          status: 'New',
        },
        {
          id: '5',
          timeUTC: '14:45',
          alertType: 'Depth',
          severity: 'WARNING',
          description: '12% volatility windblast from OTC',
          status: 'Acknowledged',
        },
      ],
    };
  }

  private generateAlertTimeline() {
    const data = [];
    const now = new Date();
    
    for (let i = 0; i < 100; i++) {
      const time = new Date(now.getTime() - (100 - i) * 15 * 60 * 1000);
      const timeString = `${String(time.getUTCHours()).padStart(2, '0')}:${String(time.getUTCMinutes()).padStart(2, '0')}`;
      
      data.push({
        time: timeString,
        critical: Math.max(0, 20 + Math.sin(i * 0.1) * 15 + (Math.random() - 0.5) * 10),
        warning: Math.max(0, 40 + Math.cos(i * 0.15) * 20 + (Math.random() - 0.5) * 15),
        info: Math.max(0, 30 + Math.sin(i * 0.08) * 10 + (Math.random() - 0.5) * 8),
      });
    }
    
    return data;
  }

  async getScorecardData(metricType: 'tokenomics' | 'liquidity', asset: string = 'BTC'): Promise<ScorecardData> {
    const tokenomicsMetrics = [
      { metric: 'Circulating Supply', description: 'Amount in active circulation', value: '466M', industryBenchmark: '< 25 billion', status: 'GOOD' as const },
      { metric: 'Total Supply', description: 'Cumulative supply incl unlocked/vested tokens', value: '590M', industryBenchmark: 'Company benchmark', status: 'GOOD' as const },
      { metric: 'Max Supply', description: 'Theoretical cap of the protocol', value: 'Infinite', industryBenchmark: 'Company benchmark', status: 'CAUTION' as const },
      { metric: 'Vesting/Emission Schedule', description: 'Pace at which tokens are vesting over time', value: '2.5% annually', industryBenchmark: '< 5% annually', status: 'GOOD' as const },
      { metric: 'Tokens Unlock Schedule', description: 'Time and pace between unlock', value: '>12mo', industryBenchmark: 'Company benchmark', status: 'GOOD' as const },
      { metric: 'Foundation/Team Allocation %', description: 'Share of tokens in reserve by treasury', value: '12.6%', industryBenchmark: '< 15%', status: 'GOOD' as const },
      { metric: 'VC Allocation %', description: 'Share of supply allocated to early-stage VCs', value: '16.3%', industryBenchmark: 'Company benchmark', status: 'GOOD' as const },
      { metric: 'Community Utility', description: 'Amount of coins alloted for active ecosystem', value: '38.2%', industryBenchmark: 'Multi-utility', status: 'GOOD' as const },
      { metric: 'Token Utility', description: 'Utility of the token within the ecosystem', value: 'Multi-utility', industryBenchmark: 'Multi-utility', status: 'GOOD' as const },
      { metric: 'Staking Ratio %', description: 'Ratio of tokens staked vs for measuring supply', value: '4.2', industryBenchmark: '>3', status: 'GOOD' as const },
      { metric: 'Burn Mechanisms', description: 'Ways for tokens to exit out of chain', value: 'Active (fee)', industryBenchmark: 'Active', status: 'GOOD' as const },
      { metric: 'Bridget Liquidity', description: 'Sum of tokens on cross-chain & bridges', value: '<5%', industryBenchmark: '< 10%', status: 'GOOD' as const },
      { metric: 'Supply Centralization Score', description: 'Spread of tokens released for decentralization', value: '92/100', industryBenchmark: '> 80', status: 'GOOD' as const },
    ];

    const liquidityMetrics = [
      // Core Depth Metrics (10)
      { metric: 'Market Depth', description: 'Total liquidity available within 2% of mid price', value: '$42.5M', industryBenchmark: '> $20M', status: 'GOOD' as const },
      { metric: 'Bid-Side Depth', description: 'Liquidity available on bid side within 2%', value: '$21.8M', industryBenchmark: '> $10M', status: 'GOOD' as const },
      { metric: 'Ask-Side Depth', description: 'Liquidity available on ask side within 2%', value: '$20.7M', industryBenchmark: '> $10M', status: 'GOOD' as const },
      { metric: 'Depth Imbalance Ratio', description: 'Ratio between bid and ask side depth', value: '1.05:1', industryBenchmark: '0.9-1.1', status: 'GOOD' as const },
      { metric: 'Top 5 Levels Depth', description: 'Total liquidity in top 5 order book levels', value: '$18.2M', industryBenchmark: '> $8M', status: 'GOOD' as const },
      { metric: 'Depth at 1% Price Move', description: 'Available liquidity within 1% of mid', value: '$28.3M', industryBenchmark: '> $12M', status: 'GOOD' as const },
      { metric: 'Depth at 5% Price Move', description: 'Available liquidity within 5% of mid', value: '$78.5M', industryBenchmark: '> $40M', status: 'GOOD' as const },
      { metric: 'Depth Concentration (Top 10%)', description: 'Percentage of depth in top 10% of orders', value: '42%', industryBenchmark: '< 60%', status: 'GOOD' as const },
      { metric: 'Cumulative Depth Score', description: 'Overall depth quality across price levels', value: '87/100', industryBenchmark: '> 75', status: 'GOOD' as const },
      { metric: 'Depth Stability (24H)', description: 'Standard deviation of depth over 24 hours', value: '6.2%', industryBenchmark: '< 15%', status: 'GOOD' as const },
      
      // Spread Metrics (8)
      { metric: 'Bid-Ask Spread', description: 'Difference between best bid and ask price', value: '0.08%', industryBenchmark: '< 0.15%', status: 'GOOD' as const },
      { metric: 'Effective Spread', description: 'Actual cost of execution including slippage', value: '0.12%', industryBenchmark: '< 0.25%', status: 'GOOD' as const },
      { metric: 'Quoted Spread', description: 'Posted spread at best bid/ask', value: '0.08%', industryBenchmark: '< 0.15%', status: 'GOOD' as const },
      { metric: 'Realized Spread', description: 'Post-trade spread measurement', value: '0.09%', industryBenchmark: '< 0.20%', status: 'GOOD' as const },
      { metric: 'Relative Spread', description: 'Spread as percentage of mid price', value: '0.08%', industryBenchmark: '< 0.15%', status: 'GOOD' as const },
      { metric: 'Spread Volatility (1H)', description: 'Variation in spread over last hour', value: '0.02%', industryBenchmark: '< 0.05%', status: 'GOOD' as const },
      { metric: 'Weighted Average Spread', description: 'Volume-weighted spread across exchanges', value: '0.11%', industryBenchmark: '< 0.20%', status: 'GOOD' as const },
      { metric: 'Spread Tightness Score', description: 'Overall spread quality metric', value: '92/100', industryBenchmark: '> 80', status: 'GOOD' as const },
      
      // Volume Metrics (8)
      { metric: '24H Trading Volume', description: 'Total trading volume in last 24 hours', value: '$1.2B', industryBenchmark: '> $500M', status: 'GOOD' as const },
      { metric: '7D Average Volume', description: 'Average daily volume over 7 days', value: '$980M', industryBenchmark: '> $400M', status: 'GOOD' as const },
      { metric: 'Volume Concentration', description: 'Distribution of volume across exchanges', value: 'Moderate', industryBenchmark: 'Low-Moderate', status: 'GOOD' as const },
      { metric: 'Top Exchange Volume Share', description: 'Percentage of volume on largest exchange', value: '28%', industryBenchmark: '< 40%', status: 'GOOD' as const },
      { metric: 'Volume-to-Market Cap Ratio', description: 'Trading volume relative to market cap', value: '12.3%', industryBenchmark: '5-20%', status: 'GOOD' as const },
      { metric: 'Organic Volume %', description: 'Estimated real trading vs wash trading', value: '94%', industryBenchmark: '> 85%', status: 'GOOD' as const },
      { metric: 'Volume Trend (7D)', description: 'Change in volume over past week', value: '+8.5%', industryBenchmark: 'Stable/-10%', status: 'GOOD' as const },
      { metric: 'Peak-to-Trough Volume Ratio', description: 'Ratio between highest and lowest hourly volume', value: '3.2x', industryBenchmark: '< 5x', status: 'GOOD' as const },
      
      // Order Book Quality (6)
      { metric: 'Order Book Density', description: 'Distribution of orders across price levels', value: 'High', industryBenchmark: 'Medium-High', status: 'GOOD' as const },
      { metric: 'Order Book Skewness', description: 'Asymmetry in bid vs ask orders', value: '0.12', industryBenchmark: '< 0.30', status: 'GOOD' as const },
      { metric: 'Large Order Frequency', description: 'Rate of orders > $100k appearing', value: '18/hour', industryBenchmark: '> 10/hour', status: 'GOOD' as const },
      { metric: 'Order Cancellation Rate', description: 'Percentage of orders cancelled vs filled', value: '24%', industryBenchmark: '< 35%', status: 'GOOD' as const },
      { metric: 'Average Order Size', description: 'Mean order size across exchanges', value: '$8,450', industryBenchmark: '> $5,000', status: 'GOOD' as const },
      { metric: 'Order Book Update Frequency', description: 'Rate of order book changes per second', value: '42/sec', industryBenchmark: '> 20/sec', status: 'GOOD' as const },
      
      // Slippage & Execution (5)
      { metric: 'Slippage (1% Depth)', description: 'Price impact for 1% of daily volume', value: '0.15%', industryBenchmark: '< 0.30%', status: 'GOOD' as const },
      { metric: 'Slippage (5% Depth)', description: 'Price impact for 5% of daily volume', value: '0.68%', industryBenchmark: '< 1.0%', status: 'GOOD' as const },
      { metric: 'Market Impact Score', description: 'Ease of executing large orders', value: '84/100', industryBenchmark: '> 70', status: 'GOOD' as const },
      { metric: 'Fill Rate', description: 'Percentage of orders filled at posted price', value: '96.5%', industryBenchmark: '> 90%', status: 'GOOD' as const },
      { metric: 'Average Fill Time', description: 'Time to complete order execution', value: '2.3s', industryBenchmark: '< 5s', status: 'GOOD' as const },
      
      // Risk & Resilience (5)
      { metric: 'Liquidity Recovery Time', description: 'Time to restore depth after large trade', value: '45s', industryBenchmark: '< 90s', status: 'GOOD' as const },
      { metric: 'Flash Crash Resistance', description: 'Resilience to sudden price movements', value: 'High', industryBenchmark: 'Medium-High', status: 'GOOD' as const },
      { metric: 'Whale Order Absorption', description: 'Capacity to handle $10M+ orders', value: '94%', industryBenchmark: '> 80%', status: 'GOOD' as const },
      { metric: 'Liquidity Fragmentation', description: 'Distribution across venues', value: 'Low', industryBenchmark: 'Low-Medium', status: 'GOOD' as const },
      { metric: 'Stress Test Score', description: 'Performance under simulated stress', value: '88/100', industryBenchmark: '> 75', status: 'GOOD' as const },
    ];

    const totalMetrics = tokenomicsMetrics.length + liquidityMetrics.length;
    const goodCount = 48;
    const cautionCount = 7;
    const riskCount = 12;

    return {
      tokenomicsMetrics,
      liquidityMetrics,
      summary: {
        good: goodCount,
        caution: cautionCount,
        risk: riskCount,
        goodPercent: Math.round((goodCount / totalMetrics) * 100),
        cautionPercent: Math.round((cautionCount / totalMetrics) * 100),
        riskPercent: Math.round((riskCount / totalMetrics) * 100),
      },
    };
  }

  // ========================================
  // Authentication Methods
  // ========================================

  async getUserByEmail(email: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    
    if (!user) return null;
    
    return {
      ...user,
      twoFactorMethod: user.twoFactorMethod as 'email' | 'totp' | null,
      createdAt: user.createdAt.toISOString(),
      lastLogin: user.lastLogin ? user.lastLogin.toISOString() : null,
    };
  }

  async getUserById(id: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    
    if (!user) return null;
    
    return {
      ...user,
      twoFactorMethod: user.twoFactorMethod as 'email' | 'totp' | null,
      createdAt: user.createdAt.toISOString(),
      lastLogin: user.lastLogin ? user.lastLogin.toISOString() : null,
    };
  }

  async createUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const [newUser] = await db
      .insert(users)
      .values({
        id,
        email: user.email,
        passwordHash: user.passwordHash,
        name: user.name,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled,
        twoFactorMethod: user.twoFactorMethod,
        totpSecret: user.totpSecret,
        backupCodes: user.backupCodes,
      })
      .returning();
    
    return {
      ...newUser,
      twoFactorMethod: newUser.twoFactorMethod as 'email' | 'totp' | null,
      createdAt: newUser.createdAt.toISOString(),
      lastLogin: newUser.lastLogin ? newUser.lastLogin.toISOString() : null,
    };
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const updateData: any = {};
    
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.passwordHash !== undefined) updateData.passwordHash = updates.passwordHash;
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.role !== undefined) updateData.role = updates.role;
    if (updates.twoFactorEnabled !== undefined) updateData.twoFactorEnabled = updates.twoFactorEnabled;
    if (updates.twoFactorMethod !== undefined) updateData.twoFactorMethod = updates.twoFactorMethod;
    if (updates.totpSecret !== undefined) updateData.totpSecret = updates.totpSecret;
    if (updates.backupCodes !== undefined) updateData.backupCodes = updates.backupCodes;
    if (updates.lastLogin !== undefined) updateData.lastLogin = new Date(updates.lastLogin);
    
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    
    if (!updatedUser) {
      throw new Error('User not found');
    }
    
    return {
      ...updatedUser,
      twoFactorMethod: updatedUser.twoFactorMethod as 'email' | 'totp' | null,
      createdAt: updatedUser.createdAt.toISOString(),
      lastLogin: updatedUser.lastLogin ? updatedUser.lastLogin.toISOString() : null,
    };
  }

  async storeOTP(userId: string, otp: string, expiresAt: Date): Promise<void> {
    await db.delete(otpCodes).where(eq(otpCodes.userId, userId));
    
    await db.insert(otpCodes).values({
      userId,
      otp,
      expiresAt,
    });
  }

  async verifyOTP(userId: string, otp: string): Promise<boolean> {
    const [stored] = await db
      .select()
      .from(otpCodes)
      .where(eq(otpCodes.userId, userId))
      .limit(1);
    
    if (!stored) return false;
    
    if (new Date() > stored.expiresAt) {
      await db.delete(otpCodes).where(eq(otpCodes.userId, userId));
      return false;
    }
    
    return stored.otp === otp;
  }

  async clearOTP(userId: string): Promise<void> {
    await db.delete(otpCodes).where(eq(otpCodes.userId, userId));
  }

  async incrementLoginAttempts(userId: string): Promise<number> {
    const [existing] = await db
      .select()
      .from(loginAttempts)
      .where(eq(loginAttempts.userId, userId))
      .limit(1);
    
    let newCount = 1;
    let lockedUntil = null;
    
    if (existing) {
      newCount = parseInt(existing.count) + 1;
      if (newCount >= 5) {
        lockedUntil = new Date(Date.now() + 10 * 60 * 1000);
      }
      
      await db
        .update(loginAttempts)
        .set({ 
          count: newCount.toString(),
          lockedUntil,
          updatedAt: new Date(),
        })
        .where(eq(loginAttempts.userId, userId));
    } else {
      await db.insert(loginAttempts).values({
        userId,
        count: newCount.toString(),
        lockedUntil: null,
      });
    }
    
    return newCount;
  }

  async resetLoginAttempts(userId: string): Promise<void> {
    await db.delete(loginAttempts).where(eq(loginAttempts.userId, userId));
  }

  async isUserLocked(userId: string): Promise<boolean> {
    const [attempt] = await db
      .select()
      .from(loginAttempts)
      .where(eq(loginAttempts.userId, userId))
      .limit(1);
    
    if (!attempt || !attempt.lockedUntil) return false;
    
    if (new Date() > attempt.lockedUntil) {
      await db.delete(loginAttempts).where(eq(loginAttempts.userId, userId));
      return false;
    }
    
    return true;
  }
}

export const storage = new MemStorage();
