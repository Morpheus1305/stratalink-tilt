import { z } from "zod";
import { pgTable, varchar, boolean, text, timestamp, integer, real, json, date } from "drizzle-orm/pg-core";
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
  staticOtpPin: varchar("static_otp_pin", { length: 10 }),
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

// ========================================
// Daily Commentary Snapshots (for Yesterday vs Today deltas)
// ========================================

export const dailyCommentarySnapshots = pgTable("daily_commentary_snapshots", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  side: varchar("side", { length: 10 }).notNull(),
  snapshotDate: date("snapshot_date").notNull(),
  executionRiskScore: integer("execution_risk_score").notNull(),
  maxSize25bps: real("max_size_25bps").notNull(),
  maxSize50bps: real("max_size_50bps").notNull(),
  slippageRegime: varchar("slippage_regime", { length: 50 }).notNull(),
  dominantFactor: text("dominant_factor").notNull(),
  marketStructureRegime: text("market_structure_regime").notNull(),
  executionSummaryBullets: json("execution_summary_bullets").$type<string[]>().notNull(),
  bestVenue: varchar("best_venue", { length: 50 }).notNull(),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
});

// Manual insert schema to avoid drizzle-zod compatibility issues
export const insertCommentarySnapshotSchema = z.object({
  symbol: z.string(),
  side: z.string(),
  snapshotDate: z.string(),
  executionRiskScore: z.number(),
  maxSize25bps: z.number(),
  maxSize50bps: z.number(),
  slippageRegime: z.string(),
  dominantFactor: z.string(),
  marketStructureRegime: z.string(),
  executionSummaryBullets: z.array(z.string()),
  bestVenue: z.string(),
  generatedAt: z.number().optional(),
});

export type InsertCommentarySnapshot = z.infer<typeof insertCommentarySnapshotSchema>;
export type SelectCommentarySnapshot = typeof dailyCommentarySnapshots.$inferSelect;

// Zod schema for delta calculations
export const commentaryDeltaSchema = z.object({
  riskScoreDelta: z.number().nullable(),
  maxSize25bpsDeltaPct: z.number().nullable(),
  maxSize50bpsDeltaPct: z.number().nullable(),
  regimeChange: z.string().nullable(),
  priorDate: z.string().nullable(),
});

export type CommentaryDelta = z.infer<typeof commentaryDeltaSchema>;

// ========================================
// Stress Alert Configuration & History
// ========================================

export const alertRules = pgTable("alert_rules", {
  id: varchar("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  enabled: boolean("enabled").notNull().default(true),
  symbol: varchar("symbol", { length: 20 }),
  triggerType: varchar("trigger_type", { length: 50 }).notNull(),
  severityThreshold: varchar("severity_threshold", { length: 20 }).notNull(),
  regimeThreshold: varchar("regime_threshold", { length: 30 }),
  poliThreshold: integer("poli_threshold"),
  depthDivergenceThreshold: real("depth_divergence_threshold"),
  notifyEmail: boolean("notify_email").notNull().default(false),
  emailRecipients: text("email_recipients").array(),
  notifyWebhook: boolean("notify_webhook").notNull().default(false),
  webhookUrl: text("webhook_url"),
  cooldownMinutes: integer("cooldown_minutes").notNull().default(15),
  lastTriggered: timestamp("last_triggered"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const alertHistory = pgTable("alert_history", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  ruleId: varchar("rule_id").notNull().references(() => alertRules.id, { onDelete: 'cascade' }),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  triggerType: varchar("trigger_type", { length: 50 }).notNull(),
  severity: varchar("severity", { length: 20 }).notNull(),
  regime: varchar("regime", { length: 30 }).notNull(),
  signalData: json("signal_data").$type<object>().notNull(),
  emailSent: boolean("email_sent").notNull().default(false),
  webhookSent: boolean("webhook_sent").notNull().default(false),
  notificationStatus: varchar("notification_status", { length: 20 }).notNull(),
  triggeredAt: timestamp("triggered_at").notNull().defaultNow(),
});

export const insertAlertRuleSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(255),
  enabled: z.boolean().default(true),
  symbol: z.string().max(20).nullable().optional(),
  triggerType: z.enum(["DIVERGENCE", "REGIME_CHANGE", "POLI_DROP", "DEPTH_DROP"]),
  severityThreshold: z.enum(["LOW", "MODERATE", "HIGH", "CRITICAL"]),
  regimeThreshold: z.enum(["NORMAL", "EARLY_WARNING", "STRESS_BUILDING", "CONFIRMED_STRESS"]).nullable().optional(),
  poliThreshold: z.number().min(0).max(100).nullable().optional(),
  depthDivergenceThreshold: z.number().min(0).max(100).nullable().optional(),
  notifyEmail: z.boolean().default(false),
  emailRecipients: z.array(z.string().email()).nullable().optional(),
  notifyWebhook: z.boolean().default(false),
  webhookUrl: z.string().url().nullable().optional(),
  cooldownMinutes: z.number().min(1).max(1440).default(15),
});

export type InsertAlertRule = z.infer<typeof insertAlertRuleSchema>;
export type SelectAlertRule = typeof alertRules.$inferSelect;

export const insertAlertHistorySchema = z.object({
  ruleId: z.string(),
  symbol: z.string(),
  triggerType: z.string(),
  severity: z.string(),
  regime: z.string(),
  signalData: z.object({}).passthrough(),
  emailSent: z.boolean().default(false),
  webhookSent: z.boolean().default(false),
  notificationStatus: z.enum(["SENT", "PARTIAL", "FAILED", "SKIPPED"]),
});

export type InsertAlertHistory = z.infer<typeof insertAlertHistorySchema>;
export type SelectAlertHistory = typeof alertHistory.$inferSelect;

export const alertRuleResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  symbol: z.string().nullable(),
  triggerType: z.string(),
  severityThreshold: z.string(),
  regimeThreshold: z.string().nullable(),
  poliThreshold: z.number().nullable(),
  depthDivergenceThreshold: z.number().nullable(),
  notifyEmail: z.boolean(),
  emailRecipients: z.array(z.string()).nullable(),
  notifyWebhook: z.boolean(),
  webhookUrl: z.string().nullable(),
  cooldownMinutes: z.number(),
  lastTriggered: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type AlertRuleResponse = z.infer<typeof alertRuleResponseSchema>;

export const alertHistoryResponseSchema = z.object({
  id: z.number(),
  ruleId: z.string(),
  symbol: z.string(),
  triggerType: z.string(),
  severity: z.string(),
  regime: z.string(),
  signalData: z.object({}).passthrough(),
  emailSent: z.boolean(),
  webhookSent: z.boolean(),
  notificationStatus: z.string(),
  triggeredAt: z.string(),
});

export type AlertHistoryResponse = z.infer<typeof alertHistoryResponseSchema>;

// Extended daily commentary response with deltas
export const dailyCommentaryResponseSchema = z.object({
  symbol: z.string(),
  side: z.enum(["buy", "sell"]),
  dominantFactor: z.string(),
  marketStructureRegime: z.string(),
  executionSummaryBullets: z.array(z.string()),
  executionRiskScore: z.number(),
  slippageRegime: z.string(),
  bestVenue: z.string(),
  maxSize25bps: z.number(),
  maxSize50bps: z.number(),
  generatedAt: z.number(),
  delta: commentaryDeltaSchema.nullable(),
});

export type DailyCommentaryResponse = z.infer<typeof dailyCommentaryResponseSchema>;

// ========================================
// Report Records & Scheduled Configs
// ========================================

export const reportRecords = pgTable("report_records", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  reportType: varchar("report_type", { length: 50 }).notNull(),
  tokenScope: varchar("token_scope", { length: 255 }),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
  generatedBy: varchar("generated_by", { length: 100 }).default("on-demand"),
  deliveryStatus: varchar("delivery_status", { length: 20 }).notNull().default("generated"),
  filePath: varchar("file_path", { length: 500 }),
  referenceId: varchar("reference_id", { length: 100 }).notNull(),
  metadata: json("metadata").$type<Record<string, unknown>>(),
});

export const insertReportRecordSchema = z.object({
  reportType: z.string(),
  tokenScope: z.string().optional(),
  generatedBy: z.string().default("on-demand"),
  deliveryStatus: z.string().default("generated"),
  filePath: z.string().optional(),
  referenceId: z.string(),
  metadata: z.record(z.unknown()).optional(),
});
export type InsertReportRecord = z.infer<typeof insertReportRecordSchema>;
export type SelectReportRecord = typeof reportRecords.$inferSelect;

export const scheduledReportConfigs = pgTable("scheduled_report_configs", {
  id: varchar("id").primaryKey(),
  active: boolean("active").notNull().default(false),
  deliveryTime: varchar("delivery_time", { length: 10 }).notNull().default("07:00"),
  dayOfWeek: integer("day_of_week"),
  dayOfMonth: integer("day_of_month"),
  emailRecipients: text("email_recipients").array(),
  tokenScope: varchar("token_scope", { length: 50 }).notNull().default("all"),
  selectedTokens: text("selected_tokens").array(),
  formatPdf: boolean("format_pdf").notNull().default(true),
  formatJson: boolean("format_json").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type SelectScheduledConfig = typeof scheduledReportConfigs.$inferSelect;
