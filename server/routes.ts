import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authHelpers, sendOTPEmail, sanitizeUser } from "./auth";
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
  app.get("/api/dashboard", async (_req, res) => {
    try {
      const data = await storage.getDashboardData();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  });

  // Get time series data
  app.get("/api/time-series/:timeframe", async (req, res) => {
    try {
      const { timeframe } = req.params;
      const validTimeframes = ['1H', '4H', '1D', '1W', '1M'];
      
      if (!validTimeframes.includes(timeframe)) {
        return res.status(400).json({ error: "Invalid timeframe. Must be one of: 1H, 4H, 1D, 1W, 1M" });
      }
      
      const data = await storage.getTimeSeriesData(timeframe);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch time series data" });
    }
  });

  // Get historical trends data
  app.get("/api/trends/:timeframe", async (req, res) => {
    try {
      const { timeframe } = req.params;
      const validTimeframes = ['1D', '7D', '1M', '3M', '1Y'];
      
      if (!validTimeframes.includes(timeframe)) {
        return res.status(400).json({ error: "Invalid timeframe. Must be one of: 1D, 7D, 1M, 3M, 1Y" });
      }
      
      const data = await storage.getTrendsData(timeframe as '1D' | '7D' | '1M' | '3M' | '1Y');
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trends data" });
    }
  });

  // Get portfolio data
  app.get("/api/portfolio", async (_req, res) => {
    try {
      const data = await storage.getPortfolioData();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch portfolio data" });
    }
  });

  // Get alerts data
  app.get("/api/alerts", async (_req, res) => {
    try {
      const data = await storage.getAlertsData();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch alerts data" });
    }
  });

  // Get scorecard data
  app.get("/api/scorecard", async (req, res) => {
    try {
      const metricType = (req.query.type as string) || 'tokenomics';
      
      if (metricType !== 'tokenomics' && metricType !== 'liquidity') {
        return res.status(400).json({ error: "Invalid metric type. Must be 'tokenomics' or 'liquidity'" });
      }
      
      const data = await storage.getScorecardData(metricType);
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

      if (user.twoFactorEnabled) {
        const otp = authHelpers.generateEmailOTP();
        const expiresAt = new Date(Date.now() + 3 * 60 * 1000);
        
        await storage.storeOTP(user.id, otp, expiresAt);
        
        await sendOTPEmail(user.email, otp);
        
        const tempToken = authHelpers.generateTempToken(user.id, user.email);
        
        const response: LoginResponse = {
          requires2FA: true,
          tempToken,
        };
        
        res.json(response);
      } else {
        const accessToken = authHelpers.generateAccessToken(user);
        await storage.resetLoginAttempts(user.id);
        await storage.updateUser(user.id, { lastLogin: new Date().toISOString() });
        
        const response: LoginResponse = {
          requires2FA: false,
          accessToken,
          user: sanitizeUser(user),
        };
        
        res.json(response);
      }
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

      let isValid = false;
      
      // Development bypass: Allow "000000" as a dev OTP code
      const isDevelopment = process.env.NODE_ENV !== 'production';
      const isDevBypass = isDevelopment && otpCode === '000000';
      
      if (isDevBypass) {
        console.log('[AUTH] Development OTP bypass used (code: 000000)');
        isValid = true;
      } else if (user.twoFactorMethod === 'totp' && user.totpSecret) {
        isValid = authHelpers.verifyTOTP(otpCode, user.totpSecret);
      } else {
        isValid = await storage.verifyOTP(user.id, otpCode);
      }

      if (!isValid) {
        await storage.incrementLoginAttempts(user.id);
        return res.status(401).json({ error: "Invalid OTP code" });
      }

      await storage.clearOTP(user.id);
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

      const otp = authHelpers.generateEmailOTP();
      const expiresAt = new Date(Date.now() + 3 * 60 * 1000);
      
      await storage.storeOTP(user.id, otp, expiresAt);
      await sendOTPEmail(user.email, otp);
      
      const response: ResendOTPResponse = {
        success: true,
        message: "OTP sent successfully",
      };
      
      res.json(response);
    } catch (error) {
      console.error('Resend OTP error:', error);
      res.status(500).json({ error: "Failed to resend OTP" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
