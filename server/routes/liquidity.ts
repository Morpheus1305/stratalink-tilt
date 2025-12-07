import express from "express";
import { getOrderbookDepthHistory } from "../services/depthHistory";
import { computeStabilityStats } from "../services/liquidityStats";
import { computeVenueLiquiditySnapshot } from "../services/venueLiquidity";
import { computeLiquidityFactors } from "../services/liquidityFactors";
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
    }));

    const stability = computeStabilityStats(snapshots);

    return res.json({
      token,
      window,
      snapshots,
      stability,
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

router.get("/factors/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase() as SupportedToken;
    const side = (req.query.side as string)?.toLowerCase() === "sell" ? "sell" : "buy";
    
    const validSymbols = ["BTC", "ETH", "SOL"];
    if (!validSymbols.includes(symbol)) {
      return res.status(400).json({ error: "Unsupported symbol. Use BTC, ETH, or SOL" });
    }
    
    const result = await computeLiquidityFactors(symbol, side);
    return res.json(result);
  } catch (err) {
    console.error("liquidity/factors error", err);
    return res.status(500).json({ error: "Failed to compute liquidity factors" });
  }
});

export default router;
