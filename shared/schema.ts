import { z } from "zod";

// Live Market Data Metrics
export const liveMetricSchema = z.object({
  label: z.string(),
  value: z.union([z.number(), z.string()]),
  change: z.number(),
  changePercent: z.number(),
  trend: z.enum(['up', 'down', 'neutral']),
  unit: z.string().optional(),
});

export type LiveMetric = z.infer<typeof liveMetricSchema>;

// Liquidity Intelligence Score
export const liquidityScoreSchema = z.object({
  score: z.number().min(0).max(100),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
  trend: z.enum(['up', 'down', 'neutral']),
  change24h: z.number(),
  historicalAverage: z.number(),
});

export type LiquidityScore = z.infer<typeof liquidityScoreSchema>;

// Stress Signal
export const stressSignalSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  severity: z.enum(['critical', 'warning', 'info', 'success']),
  timestamp: z.string(),
  category: z.string(),
});

export type StressSignal = z.infer<typeof stressSignalSchema>;

// Key Metric Card
export const keyMetricSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.union([z.number(), z.string()]),
  unit: z.string().optional(),
  change: z.number(),
  changePercent: z.number(),
  trend: z.enum(['up', 'down', 'neutral']),
});

export type KeyMetric = z.infer<typeof keyMetricSchema>;

// Exchange Distribution Data
export const exchangeDataSchema = z.object({
  exchange: z.string(),
  liquidity: z.number(),
  percentage: z.number(),
});

export type ExchangeData = z.infer<typeof exchangeDataSchema>;

// CEX/DEX Distribution
export const cexDexDistributionSchema = z.object({
  cex: z.number(),
  dex: z.number(),
});

export type CexDexDistribution = z.infer<typeof cexDexDistributionSchema>;

// Time Series Data Point
export const timeSeriesPointSchema = z.object({
  timestamp: z.string(),
  liquidityDepth: z.number(),
  spread: z.number(),
});

export type TimeSeriesPoint = z.infer<typeof timeSeriesPointSchema>;

// Ticker Item
export const tickerItemSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  price: z.string(),
  change: z.number(),
  changePercent: z.string(),
  depth: z.string(),
  spread: z.string(),
  volume: z.string(),
  timestamp: z.string(),
});

export type TickerItem = z.infer<typeof tickerItemSchema>;

// Dashboard Data (complete snapshot)
export const dashboardDataSchema = z.object({
  liveMetrics: z.array(liveMetricSchema),
  liquidityScore: liquidityScoreSchema,
  stressSignals: z.array(stressSignalSchema),
  keyMetrics: z.array(keyMetricSchema),
  exchangeDistribution: z.array(exchangeDataSchema),
  cexDexDistribution: cexDexDistributionSchema,
  tickerItems: z.array(tickerItemSchema),
});

export type DashboardData = z.infer<typeof dashboardDataSchema>;

// Time series response
export const timeSeriesDataSchema = z.object({
  timeframe: z.enum(['1H', '4H', '1D', '1W', '1M']),
  data: z.array(timeSeriesPointSchema),
});

export type TimeSeriesData = z.infer<typeof timeSeriesDataSchema>;

// Historical Trends Data
export const poliScorePointSchema = z.object({
  time: z.string(),
  score: z.number(),
});

export const marketDepthPointSchema = z.object({
  time: z.string(),
  depth: z.number(),
});

export const volatilityPointSchema = z.object({
  time: z.string(),
  volatility: z.number(),
});

export const trendsDataSchema = z.object({
  timeframe: z.enum(['1D', '7D', '1M', '3M', '1Y']),
  poliScoreEvolution: z.array(poliScorePointSchema),
  marketDepthTrend: z.array(marketDepthPointSchema),
  volatilityTrend: z.array(volatilityPointSchema),
  changePercent: z.number(),
});

export type TrendsData = z.infer<typeof trendsDataSchema>;
