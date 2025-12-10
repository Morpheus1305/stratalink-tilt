import express from "express";
import { getOrderbookDepthHistory, getTimeseriesMetadata } from "../services/depthHistory";
import { computeStabilityStats } from "../services/liquidityStats";
import { computeVenueLiquiditySnapshot } from "../services/venueLiquidity";
import { computeLiquidityFactors } from "../services/liquidityFactors";
import { getDepthCache } from "../../analytics/engines/depthEngine";
import type { SupportedToken } from "../services/cexOrderbooks";

const router = express.Router();

router.get("/timeseries", async (req, res) => {
  try {
    const token = (req.query.token as string)?.toUpperCase() || "BTC";
    const window = (req.query.window as string) || "24h";

    const history = await getOrderbookDepthHistory(token, window);

    const snapshots = history.map((h: any) => ({
      ts: h.ts,
      depthUsd50bps: h.depth50bps,
      spreadBps: h.spreadBps,
      depth10bps: h.depth10bps,
      depth25bps: h.depth25bps,
      depth100bps: h.depth100bps,
      depth200bps: h.depth200bps,
      source: h.source,
    }));

    const stability = computeStabilityStats(snapshots);
    const metadata = getTimeseriesMetadata(token);
    
    const depthCache = getDepthCache();
    const currentDepth = depthCache[token];
    const currentSnapshot = currentDepth ? {
      depth50bps: currentDepth.bands["50bps"]?.totalUSD || 0,
      depth10bps: currentDepth.bands["10bps"]?.totalUSD || 0,
      depth25bps: currentDepth.bands["25bps"]?.totalUSD || 0,
      depth100bps: currentDepth.bands["100bps"]?.totalUSD || 0,
      spreadBps: currentDepth.spreadBps,
      mid: currentDepth.mid,
      source: currentDepth.source,
      ts: currentDepth.ts,
    } : null;

    return res.json({
      token,
      window,
      snapshots,
      stability,
      metadata,
      currentSnapshot,
    });
  } catch (err) {
    console.error("timeseries error", err);
    return res.status(500).json({ error: "Timeseries computation failed" });
  }
});

router.get("/venues", async (req, res) => {
  try {
    const token = (req.query.token as string)?.toUpperCase() || "BTC";
    const snapshot = await computeVenueLiquiditySnapshot(token);
    return res.json(snapshot);
  } catch (err) {
    console.error("liquidity/venues error", err);
    return res.status(500).json({ error: "Failed to compute venue liquidity" });
  }
});

// Batch endpoint - must be declared BEFORE "/:symbol" to avoid route conflict
router.get("/factors/batch", async (req, res) => {
  try {
    const symbolsQuery = (req.query.symbols as string) || "";
    const symbols = symbolsQuery
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean) as SupportedToken[];

    if (!symbols.length) {
      return res.status(400).json({ error: "symbols query param required" });
    }

    const validSymbols = ["BTC", "ETH", "SOL", "XRP", "ADA", "AVAX", "LINK", "MATIC", "DOT", "NEAR"];
    const filteredSymbols = symbols.filter(s => validSymbols.includes(s));

    if (!filteredSymbols.length) {
      return res.status(400).json({ error: "No valid symbols provided" });
    }

    const side = (req.query.side as string)?.toLowerCase() === "sell" ? "sell" : "buy";
    const results: Record<string, any> = {};

    await Promise.all(
      filteredSymbols.map(async (symbol) => {
        results[symbol] = await computeLiquidityFactors(symbol, side);
      })
    );

    return res.json(results);
  } catch (err) {
    console.error("liquidity/factors/batch error", err);
    return res.status(500).json({ error: "Failed to compute batch liquidity factors" });
  }
});

router.get("/factors/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase() as SupportedToken;
    const side = (req.query.side as string)?.toLowerCase() === "sell" ? "sell" : "buy";
    
    const validSymbols = ["BTC", "ETH", "SOL", "XRP", "ADA", "AVAX", "LINK", "MATIC", "DOT", "NEAR"];
    if (!validSymbols.includes(symbol)) {
      return res.status(400).json({ error: "Unsupported symbol" });
    }
    
    const result = await computeLiquidityFactors(symbol, side);
    return res.json(result);
  } catch (err) {
    console.error("liquidity/factors error", err);
    return res.status(500).json({ error: "Failed to compute liquidity factors" });
  }
});

export default router;
