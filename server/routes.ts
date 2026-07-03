import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import { storage } from "./storage";
import { authHelpers, sendOTPEmail, sanitizeUser } from "./auth";
import { web3DataService } from "./apiClients";
import analyticsRoutes from "../analytics/routes";
import liquidityRoutes from "./routes/liquidity";
import executionRoutes from "./routes/execution";
import intelRoutes from "./routes/intel";
import fundingRoutes from "./routes/funding";
import depthRoutes from "./routes/depth";
import tsleRoutes from "./routes/tsle";
import lisRoutes from "./routes/lis";
import poliRoutes from "./routes/poli";
import poliEvidenceRoutes from "./routes/poliEvidence";
import poliApiRoutes from "./routes/poliApi";
import alertsRoutes from "./routes/alerts";
import rclRoutes from "./routes/rcl";
import deribitRoutes from "./routes/deribit-relay";
import uniswapRoutes from "./routes/uniswap-relay";
import hyperliquidRoutes from "./routes/hyperliquid-relay";
import okxRoutes from "./routes/okx-relay";
import bybitRoutes from "./routes/bybit-relay";
import dydxRoutes from "./routes/dydx-relay";
import bitgetRoutes from "./routes/bitget-relay";
import gmxRoutes         from "./routes/gmx-relay";
import curveRoutes       from "./routes/curve-relay";
import otcRoutes         from "./routes/otc-relay";
import aerodromeRoutes         from "./routes/aerodrome-relay";
import velodromeRoutes         from "./routes/velodrome-relay";
import pancakeswapRoutes       from "./routes/pancakeswap-relay";
import uniswapWorldchainRoutes from "./routes/uniswap-worldchain-relay";
import syncswapRoutes          from "./routes/syncswap-relay";
import lineaDexRoutes          from "./routes/linea-dex-relay";
import scrollDexRoutes         from "./routes/scroll-dex-relay";
import analyticsL5fRoutes from "./routes/analytics-l5f";
// Security Token Exchange Relays (Phase 2 — ATS/MTF regulated venues)
import securitizeRoutes from "./routes/securitize-relay";
import archaxRoutes     from "./routes/archax-relay";
import inxRoutes        from "./routes/inx-relay";
import tzeroRoutes      from "./routes/tzero-relay";
import sdxRoutes        from "./routes/sdx-relay";
import addxRoutes       from "./routes/addx-relay";
import dailyCommentaryRouter from "./api/dailyCommentary";
import { reportRoutes, generateServerSideReport } from "./routes/reports";
import systemStatusRoutes from "./routes/system-status";
import { startIngestionLoop } from "../analytics/engines/ingestionManager";
import { db } from "./db";
import { scheduledReportConfigs } from "../shared/schema";
import cron from "node-cron";
import { 
  loginRequestSchema, 
  verifyOTPRequestSchema, 
  resendOTPRequestSchema,
  type LoginResponse,
  type VerifyOTPResponse,
  type ResendOTPResponse
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Validate session (check if JWT is valid and not expired)
  app.get("/api/auth/session", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "No token provided" });
      }

      const token = authHeader.substring(7);
      const decoded = authHelpers.verifyAccessToken(token);
      
      if (!decoded) {
        return res.status(401).json({ error: "Invalid token" });
      }

      const user = await storage.getUserById(decoded.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      res.json({ user: sanitizeUser(user), valid: true });
    } catch (error) {
      console.error('Session validation error:', error);
      res.status(401).json({ error: "Invalid session" });
    }
  });

  // Get dashboard data
  app.get("/api/dashboard", async (req, res) => {
    try {
      const asset = (req.query.asset as string) || 'BTC';
      const data = await storage.getDashboardData(asset);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  });

  // Get time series data
  app.get("/api/time-series/:timeframe", async (req, res) => {
    try {
      const { timeframe } = req.params;
      const asset = (req.query.asset as string) || 'BTC';
      const validTimeframes = ['1H', '4H', '1D', '1W', '1M'];
      
      if (!validTimeframes.includes(timeframe)) {
        return res.status(400).json({ error: "Invalid timeframe. Must be one of: 1H, 4H, 1D, 1W, 1M" });
      }
      
      const data = await storage.getTimeSeriesData(timeframe, asset);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch time series data" });
    }
  });

  // Get historical trends data
  app.get("/api/trends/:timeframe", async (req, res) => {
    try {
      const { timeframe } = req.params;
      const asset = (req.query.asset as string) || 'BTC';
      const validTimeframes = ['1D', '7D', '1M', '3M', '1Y'];
      
      if (!validTimeframes.includes(timeframe)) {
        return res.status(400).json({ error: "Invalid timeframe. Must be one of: 1D, 7D, 1M, 3M, 1Y" });
      }
      
      const data = await storage.getTrendsData(timeframe as '1D' | '7D' | '1M' | '3M' | '1Y', asset);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trends data" });
    }
  });

  // Get portfolio data
  app.get("/api/portfolio", async (req, res) => {
    try {
      const asset = (req.query.asset as string) || 'BTC';
      const data = await storage.getPortfolioData(asset);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch portfolio data" });
    }
  });

  // Get alerts data  -  live from L5F + TSLE buffer + alert history
  app.get("/api/alerts", async (req, res) => {
    try {
      const asset = (req.query.asset as string) || 'BTC';
      const { getLiveAlertsData } = await import("./services/liveAlertsService");
      const data = await getLiveAlertsData(asset);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch alerts data" });
    }
  });

  // Get Top 20 tokens from CoinMarketCap
  app.get("/api/tokens", async (_req, res) => {
    try {
      const tokens = await web3DataService.getTop20Tokens();
      res.json(tokens);
    } catch (error) {
      console.error('Error in /api/tokens:', error);
      res.status(500).json({ error: "Failed to fetch token list" });
    }
  });

  // BTC spot price proxy (CoinGecko)  -  avoids browser CORS
  app.get("/api/price/btc", async (_req, res) => {
    try {
      const r = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
        { signal: AbortSignal.timeout(4000) }
      );
      if (!r.ok) return res.status(502).json({ error: "upstream error" });
      const json = await r.json() as { bitcoin?: { usd?: number } };
      const price = json?.bitcoin?.usd ?? null;
      res.json({ price });
    } catch {
      res.status(502).json({ error: "Failed to fetch BTC price" });
    }
  });

  // Get scorecard data
  app.get("/api/scorecard", async (req, res) => {
    try {
      const metricType = (req.query.type as string) || 'tokenomics';
      const asset = (req.query.asset as string) || 'BTC';
      
      if (metricType !== 'tokenomics' && metricType !== 'liquidity') {
        return res.status(400).json({ error: "Invalid metric type. Must be 'tokenomics' or 'liquidity'" });
      }
      
      const data = await storage.getScorecardData(metricType, asset);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch scorecard data" });
    }
  });

  // ========================================
  // Authentication Endpoints
  // ========================================

  app.post("/api/auth/login", async (req, res) => {
    try {
      const validation = loginRequestSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid request", 
          details: validation.error.errors 
        });
      }

      const { email, password } = validation.data;
      
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isLocked = await storage.isUserLocked(user.id);
      if (isLocked) {
        return res.status(429).json({ 
          error: "Account temporarily locked due to too many failed attempts. Please try again later." 
        });
      }

      const isPasswordValid = await authHelpers.verifyPassword(password, user.passwordHash);
      if (!isPasswordValid) {
        await storage.incrementLoginAttempts(user.id);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // PROTOTYPE: Always enforce 2FA for all users (fixed OTP code)
      // In production, this would check user.twoFactorEnabled
      const tempToken = authHelpers.generateTempToken(user.id, user.email);
      
      const response: LoginResponse = {
        requires2FA: true,
        tempToken,
      };
      
      console.log('[AUTH] Login successful, redirecting to 2FA verification');
      res.json(response);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const validation = verifyOTPRequestSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid request", 
          details: validation.error.errors 
        });
      }

      const { tempToken, otpCode } = validation.data;
      
      let tempPayload;
      try {
        tempPayload = authHelpers.verifyTempToken(tempToken);
      } catch (error) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      const user = await storage.getUserById(tempPayload.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      // Per-user static OTP pin (stored in users.static_otp_pin)
      // Falls back to shared fixed code for accounts without a personal pin
      const FIXED_OTP = '291305';
      const userPin = (user as any).staticOtpPin as string | null | undefined;
      const isDevelopment = process.env.NODE_ENV !== 'production';
      const isDevBypass = isDevelopment && otpCode === '000000';

      const isValid = isDevBypass
        || (userPin ? otpCode === userPin : otpCode === FIXED_OTP);

      if (!isValid) {
        await storage.incrementLoginAttempts(user.id);
        return res.status(401).json({ error: "Invalid OTP code" });
      }

      if (isDevBypass) {
        console.log('[AUTH] Development OTP bypass used (code: 000000)');
      } else {
        console.log(`[AUTH] OTP verified for ${user.email}`);
      }

      await storage.resetLoginAttempts(user.id);
      await storage.updateUser(user.id, { lastLogin: new Date().toISOString() });
      
      const accessToken = authHelpers.generateAccessToken(user);
      
      const response: VerifyOTPResponse = {
        accessToken,
        user: sanitizeUser(user),
      };
      
      res.json(response);
    } catch (error) {
      console.error('OTP verification error:', error);
      res.status(500).json({ error: "OTP verification failed" });
    }
  });

  app.post("/api/auth/resend-otp", async (req, res) => {
    try {
      const validation = resendOTPRequestSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid request", 
          details: validation.error.errors 
        });
      }

      const { tempToken } = validation.data;
      
      let tempPayload;
      try {
        tempPayload = authHelpers.verifyTempToken(tempToken);
      } catch (error) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      const user = await storage.getUserById(tempPayload.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      // Fixed OTP flow - no email needed, just acknowledge the request
      const response: ResendOTPResponse = {
        success: true,
        message: "Use the fixed verification code: 291305",
      };
      
      res.json(response);
    } catch (error) {
      console.error('Resend OTP error:', error);
      res.status(500).json({ error: "Failed to resend OTP" });
    }
  });

  // Mount funding routes (live exchange data)
  app.use("/api/funding", fundingRoutes);

  // Mount depth routes (multi-venue orderbook)
  app.use("/api/depth", depthRoutes);

  // Mount TSLE routes (Trade Size Liquidity Engine)
  app.use("/api/tsle", tsleRoutes);

  // Mount LIS routes (Liquidity Ingress Service proxy)
  app.use("/api/lis", lisRoutes);

  // Mount PoLi routes (Liquidity Ingress Service proxy)
  app.use("/api/poli", poliRoutes);

  // Mount PoLi routes (Liquidity Ingress Service proxy)
  app.use("/api/poli/evidence", poliEvidenceRoutes);

  // Mount PoLi DACT Engine routes (consumes DACT v0.1 events)
  app.use("/api/poli/dact", poliApiRoutes);

  // Mount analytics routes
  app.use("/api/analytics", analyticsRoutes);

  // Mount L5F analytics layer
  app.use("/api/analytics/l5f", analyticsL5fRoutes);

  // Mount liquidity routes
  app.use("/api/liquidity", liquidityRoutes);

  // Mount execution routes
  app.use("/api/execution", executionRoutes);

  // Mount intel routes
  app.use("/api/intel", intelRoutes);

  // Mount daily commentary routes
  app.use("/api", dailyCommentaryRouter);

  // Mount stress alert routes
  app.use("/api/alerts", alertsRoutes);

  // Mount RCL routes (Regulatory Consumption Layer - ADGM)
  app.use("/api/rcl/v0.1", rclRoutes);

  // Mount exchange relay routes (LIS/TLC venue connectors)
  app.use("/api/deribit", deribitRoutes);
  app.use("/api/uniswap", uniswapRoutes);
  app.use("/api/hyperliquid", hyperliquidRoutes);
  app.use("/api/okx", okxRoutes);
  app.use("/api/bybit", bybitRoutes);
  app.use("/api/dydx", dydxRoutes);
  app.use("/api/bitget", bitgetRoutes);
  app.use("/api/gmx",          gmxRoutes);
  app.use("/api/curve",        curveRoutes);
  app.use("/api/otc",          otcRoutes);
  app.use("/api/aerodrome",          aerodromeRoutes);
  app.use("/api/velodrome",          velodromeRoutes);
  app.use("/api/pancakeswap",        pancakeswapRoutes);
  app.use("/api/uniswap-worldchain", uniswapWorldchainRoutes);
  app.use("/api/syncswap",           syncswapRoutes);
  app.use("/api/linea-dex",          lineaDexRoutes);
  app.use("/api/scroll-dex",         scrollDexRoutes);
  // Security Token Exchange Relays (Phase 2 — regulated ATS/MTF venues)
  app.use("/api/securitize", securitizeRoutes);
  app.use("/api/archax",     archaxRoutes);
  app.use("/api/inx",        inxRoutes);
  app.use("/api/tzero",      tzeroRoutes);
  app.use("/api/sdx",        sdxRoutes);
  app.use("/api/addx",       addxRoutes);

  // Download endpoint for LTC code archive
  app.get("/download/LTC-v1.0.zip", (_req, res) => {
    const zipPath = path.resolve(process.cwd(), "client/public/LTC-v1.0.zip");
    res.download(zipPath, "LTC-v1.0.zip", (err) => {
      if (err) {
        console.error("Download error:", err);
        res.status(404).json({ error: "File not found" });
      }
    });
  });

  // Mount reports routes
  app.use("/api/reports", reportRoutes);

  // Mount system status routes
  app.use("/api/system", systemStatusRoutes);

  // Start analytics ingestion loop
  startIngestionLoop();

  // ─── Scheduled report delivery (node-cron) ────────────────────────────────
  // Daily at 07:00 UTC
  cron.schedule("0 7 * * *", async () => {
    try {
      const configs = await db.select().from(scheduledReportConfigs);
      for (const cfg of configs) {
        if (!cfg.active) continue;
        const type = cfg.id as "daily" | "weekly" | "monthly";
        const now = new Date();
        // weekly: only on configured day (5=Friday)
        if (type === "weekly" && cfg.dayOfWeek !== null && now.getDay() !== cfg.dayOfWeek) continue;
        // monthly: only on configured day of month
        if (type === "monthly" && cfg.dayOfMonth !== null && now.getDate() !== cfg.dayOfMonth) continue;
        await generateServerSideReport(type, {});
      }
    } catch (err) {
      console.error("[Cron] scheduled report error:", err);
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
