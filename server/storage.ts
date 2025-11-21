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
  TimeSeriesPoint
} from "@shared/schema";
import { web3DataService } from "./apiClients";

export interface IStorage {
  getDashboardData(asset?: string): Promise<DashboardData>;
  getTimeSeriesData(timeframe: string, asset?: string): Promise<TimeSeriesData>;
  getTrendsData(timeframe: '1D' | '7D' | '1M' | '3M' | '1Y', asset?: string): Promise<TrendsData>;
}

export class MemStorage implements IStorage {
  private useLiveData: boolean = true;
  
  private async fetchLiveMetrics(asset: string = 'BTC'): Promise<LiveMetric[] | null> {
    if (!this.useLiveData) return null;
    
    try {
      const [priceData, orderBook] = await Promise.all([
        web3DataService.getCryptoPrice(asset),
        web3DataService.getOrderBookDepth(asset),
      ]);

      const volatility = Math.abs(priceData.change24h);
      const cexDexRatio = 68;
      
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

  private generateLiveMetrics(): LiveMetric[] {
    // Add slight randomness for realistic live updates
    const variance = () => (Math.random() - 0.5) * 0.5;
    
    const poliScore = 72 + Math.floor(variance() * 5);
    const marketDepth = 42.5 + variance() * 2;
    const spread = 0.08 + variance() * 0.01;
    const volatility = 12.4 + variance() * 1.5;
    
    return [
      {
        label: "POLI SCORE",
        value: `${poliScore}/100`,
        change: 1.7 + variance(),
        changePercent: 2.4 + variance(),
        trend: poliScore >= 72 ? "up" : "down",
      },
      {
        label: "MARKET DEPTH",
        value: `$${marketDepth.toFixed(1)}M`,
        change: 3.5 + variance(),
        changePercent: 8.2 + variance(),
        trend: marketDepth >= 42.5 ? "up" : "down",
      },
      {
        label: "BID-ASK SPREAD",
        value: `${Math.max(0.05, spread).toFixed(2)}%`,
        change: -0.002 + variance() * 0.001,
        changePercent: -2.1 + variance(),
        trend: spread <= 0.08 ? "down" : "up",
      },
      {
        label: "VOLATILITY 24H",
        value: `${Math.max(10, volatility).toFixed(1)}%`,
        change: 1.9 + variance(),
        changePercent: 15.3 + variance() * 2,
        trend: volatility >= 12.4 ? "up" : "down",
      },
      {
        label: "CEX/DEX RATIO",
        value: "68:32",
        change: -2.2 + variance(),
        changePercent: -3.2 + variance(),
        trend: "down",
      },
      {
        label: "TOTAL VOL 24H",
        value: "$1.2B",
        change: 154 + Math.floor(variance() * 20),
        changePercent: 12.9 + variance() * 2,
        trend: "up",
      },
    ];
  }

  private generateLiquidityScore(): LiquidityScore {
    const variance = () => (Math.random() - 0.5) * 0.5;
    const score = Math.max(65, Math.min(78, 72 + Math.floor(variance() * 10)));
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
      historicalAverage: 68,
    };
  }

  private generateStressSignals(): StressSignal[] {
    const variance = () => (Math.random() - 0.5) * 0.5;
    const now = new Date();
    const timestamp = now.getTime();
    
    const spreadChange = 15.3 + variance() * 5;
    const depthValue = 42.5 + variance() * 2;
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

  private generateKeyMetrics(): KeyMetric[] {
    const variance = () => (Math.random() - 0.5) * 0.5;
    
    const marketDepth = 42.5 + variance() * 2;
    const spread = 0.08 + variance() * 0.01;
    const volatility = 12.4 + variance() * 1.5;
    const orderbook = 1.2 + variance() * 0.1;
    
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

  private generateExchangeData(): ExchangeData[] {
    const variance = () => (Math.random() - 0.5) * 0.5;
    
    return [
      { exchange: "Binance", liquidity: Number((28.5 + variance()).toFixed(1)), percentage: 45 },
      { exchange: "Coinbase", liquidity: Number((18.2 + variance()).toFixed(1)), percentage: 29 },
      { exchange: "Kraken", liquidity: Number((9.4 + variance()).toFixed(1)), percentage: 15 },
      { exchange: "Uniswap", liquidity: Number((4.7 + variance()).toFixed(1)), percentage: 7 },
      { exchange: "Others", liquidity: Number((2.5 + variance() * 0.5).toFixed(1)), percentage: 4 },
    ];
  }

  private generateCexDexDistribution(): CexDexDistribution {
    const variance = Math.floor((Math.random() - 0.5) * 4);
    const cex = Math.max(65, Math.min(71, 68 + variance));
    
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

  private generateTimeSeriesPoints(timeframe: string): TimeSeriesPoint[] {
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

    for (let i = intervals; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * intervalMs);
      const timeString = timeframe === '1M' 
        ? timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      
      // Generate realistic looking data with some variance
      const baseDepth = 42;
      const depthVariance = Math.sin(i / 5) * 8 + Math.random() * 4;
      const liquidityDepth = baseDepth + depthVariance;
      
      const baseSpread = 0.08;
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
      this.fetchLiveMetrics(asset).catch(() => null),
      this.fetchLiveTickerItems().catch(() => null),
    ]);
    
    return {
      liveMetrics: liveMetrics || this.generateLiveMetrics(),
      liquidityScore: this.generateLiquidityScore(),
      stressSignals: this.generateStressSignals(),
      keyMetrics: this.generateKeyMetrics(),
      exchangeDistribution: this.generateExchangeData(),
      cexDexDistribution: this.generateCexDexDistribution(),
      tickerItems: tickerItems || this.generateTickerItems(),
    };
  }

  async getTimeSeriesData(timeframe: string, asset: string = 'BTC'): Promise<TimeSeriesData> {
    const validTimeframes = ['1H', '4H', '1D', '1W', '1M'];
    const tf = validTimeframes.includes(timeframe) ? timeframe : '1D';
    
    return {
      timeframe: tf as any,
      data: this.generateTimeSeriesPoints(tf),
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

    // Generate realistic trending data with some variability
    const basePoliScore = 65 + Math.random() * 15;  // Start between 65-80
    const baseDepth = 35 + Math.random() * 15;      // Start between 35-50M
    const baseVolatility = 8 + Math.random() * 4;   // Start between 8-12%

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
}

export const storage = new MemStorage();
