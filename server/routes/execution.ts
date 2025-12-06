import express from "express";
import { getDepthForVenue } from "../services/depthAggregator";

const router = express.Router();

router.post("/cost", async (req, res) => {
  try {
    const { token, side, sizeUsd } = req.body;

    const venues = ["binance", "coinbase", "kraken"];

    const quotes = [];

    for (const venue of venues) {
      const ob = await getDepthForVenue(token, venue);

      let remaining = sizeUsd;
      let weightedPriceSum = 0;
      let depthUsed = 0;

      const bookSide = side === "buy" ? ob.asks : ob.bids;

      for (const level of bookSide) {
        const take = Math.min(level.sizeUsd, remaining);
        remaining -= take;
        depthUsed += take;
        weightedPriceSum += take * level.price;

        if (remaining <= 0) break;
      }

      const mid = ob.midPrice;
      const avgPrice = depthUsed > 0 ? weightedPriceSum / depthUsed : mid;
      const slippageBps = ((avgPrice - mid) / mid) * 10000 * (side === "buy" ? 1 : -1);
      const slippageUsd = (sizeUsd * Math.abs(slippageBps)) / 10000;

      quotes.push({
        venue,
        expectedSlippageBps: +slippageBps.toFixed(2),
        expectedSlippageUsd: +slippageUsd.toFixed(2),
        depthUtilizationPct: +(depthUsed / ob.totalDepthUsd * 100).toFixed(1),
      });
    }

    quotes.sort((a, b) => a.expectedSlippageBps - b.expectedSlippageBps);

    return res.json({
      token,
      side,
      sizeUsd,
      bestVenue: quotes[0].venue,
      bestTotalSlippageBps: quotes[0].expectedSlippageBps,
      bestTotalSlippageUsd: quotes[0].expectedSlippageUsd,
      quotes,
    });
  } catch (err) {
    console.error("execution cost error", err);
    return res.status(500).json({ error: "Execution cost computation failed" });
  }
});

export default router;
