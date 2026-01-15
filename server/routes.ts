import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import { storage } from "./storage";
import { authHelpers, sendOTPEmail, sanitizeUser } from "./auth";
import { web3DataService } from "./apiClients";
import { arkhamService } from "./arkhamClient";
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
import tapeRoutes from "./routes/tape";
import rclRoutes from "./routes/rcl";
import dailyCommentaryRouter from "./api/dailyCommentary";
import { startIngestionLoop } from "../analytics/engines/ingestionManager";
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

  // Get alerts data
  app.get("/api/alerts", async (req, res) => {
    try {
      const asset = (req.query.asset as string) || 'BTC';
      const data = await storage.getAlertsData(asset);
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

      // PROTOTYPE ONLY: Fixed OTP code verification
      // This is intentionally using a fixed code (291305) for demonstration purposes
      // In production, use dynamic OTP codes with proper email/SMS delivery
      const FIXED_OTP = '291305';
      const isDevelopment = process.env.NODE_ENV !== 'production';
      const isDevBypass = isDevelopment && otpCode === '000000';
      
      const isValid = otpCode === FIXED_OTP || isDevBypass;

      if (!isValid) {
        await storage.incrementLoginAttempts(user.id);
        return res.status(401).json({ error: "Invalid OTP code" });
      }

      if (isDevBypass) {
        console.log('[AUTH] Development OTP bypass used (code: 000000)');
      } else {
        console.log('[AUTH] Fixed OTP verified (code: 291305)');
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

  // ========================================
  // Arkham Identity Intelligence Endpoints
  // ========================================

  app.get("/api/identity/entity/:entity", async (req, res) => {
    try {
      const { entity } = req.params;
      const data = await arkhamService.getEntityAttribution(entity);
      res.json(data);
    } catch (error) {
      console.error('Entity attribution error:', error);
      res.status(500).json({ error: "Failed to fetch entity attribution" });
    }
  });

  app.get("/api/identity/fragmentation/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const data = await arkhamService.getFragmentationData(token);
      res.json(data);
    } catch (error) {
      console.error('Fragmentation data error:', error);
      res.status(500).json({ error: "Failed to fetch fragmentation data" });
    }
  });

  app.get("/api/identity/mm-integrity", async (_req, res) => {
    try {
      const data = await arkhamService.getMMIntegrityScores();
      res.json(data);
    } catch (error) {
      console.error('MM integrity error:', error);
      res.status(500).json({ error: "Failed to fetch MM integrity scores" });
    }
  });

  app.get("/api/identity/poli-plus", async (_req, res) => {
    try {
      const data = await arkhamService.getPoLiPlusMetrics();
      res.json(data);
    } catch (error) {
      console.error('PoLi+ metrics error:', error);
      res.status(500).json({ error: "Failed to fetch PoLi+ metrics" });
    }
  });

  app.get("/api/identity/alerts", async (_req, res) => {
    try {
      const data = await arkhamService.getIdentityAlerts();
      res.json(data);
    } catch (error) {
      console.error('Identity alerts error:', error);
      res.status(500).json({ error: "Failed to fetch identity alerts" });
    }
  });

  app.get("/api/identity/surveillance", async (_req, res) => {
    try {
      const data = await arkhamService.getRegSurveillanceSnapshot();
      res.json(data);
    } catch (error) {
      console.error('Surveillance snapshot error:', error);
      res.status(500).json({ error: "Failed to fetch surveillance snapshot" });
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

  app.use("/api/tape", tapeRoutes);

  // Mount RCL routes (Regulatory Consumption Layer - ADGM)
  app.use("/api/rcl/v0.1", rclRoutes);

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

  // Start analytics ingestion loop
  startIngestionLoop();

  const httpServer = createServer(app);

  return httpServer;
}
