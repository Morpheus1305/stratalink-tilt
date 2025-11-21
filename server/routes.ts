import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
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

  const httpServer = createServer(app);

  return httpServer;
}
