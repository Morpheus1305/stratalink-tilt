import express from "express";
import { getOrderbookDepthHistory } from "../services/depthHistory";
import { computeStabilityStats } from "../services/liquidityStats";

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

export default router;
