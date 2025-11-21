import { z } from "zod";
import { pgTable, varchar, boolean, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

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

// Portfolio Page Schemas
export const portfolioTokenSchema = z.object({
  token: z.string(),
  name: z.string(),
  poliScore: z.number(),
  changePercent: z.number(),
  depth: z.string(),
  volatility: z.string(),
  spread: z.string(),
  action: z.enum(['MONITOR', 'REVIEW', 'CRITICAL']),
});

export type PortfolioToken = z.infer<typeof portfolioTokenSchema>;

export const portfolioSummarySchema = z.object({
  healthyAssets: z.number(),
  warningAssets: z.number(),
  criticalAssets: z.number(),
});

export type PortfolioSummary = z.infer<typeof portfolioSummarySchema>;

export const poliComparisonPointSchema = z.object({
  token: z.string(),
  score: z.number(),
});

export type PoliComparisonPoint = z.infer<typeof poliComparisonPointSchema>;

export const radarDimensionSchema = z.object({
  dimension: z.string(),
  sol: z.number(),
  usdc: z.number(),
  usdt: z.number(),
});

export type RadarDimension = z.infer<typeof radarDimensionSchema>;

export const portfolioDataSchema = z.object({
  portfolioPoliScore: z.number(),
  summary: portfolioSummarySchema,
  tokens: z.array(portfolioTokenSchema),
  poliComparison: z.array(poliComparisonPointSchema),
  radarAnalysis: z.array(radarDimensionSchema),
});

export type PortfolioData = z.infer<typeof portfolioDataSchema>;

// Alerts Page Schemas
export const riskIndicatorSchema = z.object({
  indicator: z.string(),
  observedBehavior: z.string(),
  ras: z.enum(['high', 'medium', 'low']),
});

export type RiskIndicator = z.infer<typeof riskIndicatorSchema>;

export const alertTimelinePointSchema = z.object({
  time: z.string(),
  critical: z.number(),
  warning: z.number(),
  info: z.number(),
});

export type AlertTimelinePoint = z.infer<typeof alertTimelinePointSchema>;

export const alertLogEntrySchema = z.object({
  id: z.string(),
  timeUTC: z.string(),
  alertType: z.string(),
  severity: z.enum(['HIGH', 'WARNING', 'CRITICAL']),
  description: z.string(),
  status: z.enum(['New', 'Acknowledged', 'Dismissed']),
});

export type AlertLogEntry = z.infer<typeof alertLogEntrySchema>;

export const alertsDataSchema = z.object({
  riskIndicators: z.array(riskIndicatorSchema),
  activeWarningCapacity: z.string(),
  criticalAssets: z.object({
    count: z.number(),
    total: z.number(),
  }),
  alertTimeline: z.array(alertTimelinePointSchema),
  alertLog: z.array(alertLogEntrySchema),
});

export type AlertsData = z.infer<typeof alertsDataSchema>;

// Scorecard Page Schemas
export const scorecardMetricSchema = z.object({
  metric: z.string(),
  description: z.string(),
  value: z.string(),
  industryBenchmark: z.string(),
  status: z.enum(['GOOD', 'CAUTION', 'CRITICAL']),
});

export type ScorecardMetric = z.infer<typeof scorecardMetricSchema>;

export const scorecardSummarySchema = z.object({
  good: z.number(),
  caution: z.number(),
  risk: z.number(),
  goodPercent: z.number(),
  cautionPercent: z.number(),
  riskPercent: z.number(),
});

export type ScorecardSummary = z.infer<typeof scorecardSummarySchema>;

export const scorecardDataSchema = z.object({
  tokenomicsMetrics: z.array(scorecardMetricSchema),
  liquidityMetrics: z.array(scorecardMetricSchema),
  summary: scorecardSummarySchema,
});

export type ScorecardData = z.infer<typeof scorecardDataSchema>;

// ========================================
// Database Tables (Drizzle ORM)
// ========================================

export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default('viewer'),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  twoFactorMethod: varchar("two_factor_method", { length: 20 }),
  totpSecret: text("totp_secret"),
  backupCodes: text("backup_codes").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastLogin: timestamp("last_login"),
});

export const otpCodes = pgTable("otp_codes", {
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }).primaryKey(),
  otp: varchar("otp", { length: 10 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const loginAttempts = pgTable("login_attempts", {
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }).primaryKey(),
  count: varchar("count", { length: 10 }).notNull().default('0'),
  lockedUntil: timestamp("locked_until"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export type InsertUser = z.infer<typeof insertUserSchema>;
export type SelectUser = z.infer<typeof selectUserSchema>;

// ========================================
// Authentication & User Management Schemas
// ========================================

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  passwordHash: z.string(),
  name: z.string(),
  role: z.enum(['admin', 'analyst', 'viewer']),
  twoFactorEnabled: z.boolean(),
  twoFactorMethod: z.enum(['email', 'totp']).nullable(),
  totpSecret: z.string().nullable(),
  backupCodes: z.array(z.string()),
  createdAt: z.string(),
  lastLogin: z.string().nullable(),
});

export type User = z.infer<typeof userSchema>;

export const publicUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(['admin', 'analyst', 'viewer']),
  twoFactorEnabled: z.boolean(),
  twoFactorMethod: z.enum(['email', 'totp']).nullable(),
  createdAt: z.string(),
  lastLogin: z.string().nullable(),
});

export type PublicUser = z.infer<typeof publicUserSchema>;

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const loginResponseSchema = z.object({
  requires2FA: z.boolean(),
  tempToken: z.string().optional(),
  user: publicUserSchema.optional(),
  accessToken: z.string().optional(),
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;

export const verifyOTPRequestSchema = z.object({
  tempToken: z.string(),
  otpCode: z.string().length(6),
});

export type VerifyOTPRequest = z.infer<typeof verifyOTPRequestSchema>;

export const verifyOTPResponseSchema = z.object({
  accessToken: z.string(),
  user: publicUserSchema,
});

export type VerifyOTPResponse = z.infer<typeof verifyOTPResponseSchema>;

export const resendOTPRequestSchema = z.object({
  tempToken: z.string(),
});

export type ResendOTPRequest = z.infer<typeof resendOTPRequestSchema>;

export const resendOTPResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type ResendOTPResponse = z.infer<typeof resendOTPResponseSchema>;

export const setupTOTPResponseSchema = z.object({
  secret: z.string(),
  qrCode: z.string(),
  backupCodes: z.array(z.string()),
});

export type SetupTOTPResponse = z.infer<typeof setupTOTPResponseSchema>;
