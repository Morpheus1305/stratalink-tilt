import express from "express";
import { computeDailyCommentary } from "../services/dailyCommentary";
import type { TsleSide } from "../services/tradeSizeEngine";
import type { SupportedToken } from "../services/cexOrderbooks";

const router = express.Router();

router.get("/commentary/daily", async (req, res) => {
  try {
    const symbolParam = (req.query.symbol as string) || "BTC";
    const symbol = symbolParam.toUpperCase() as SupportedToken;

    const sideParam = (req.query.side as string) || "buy";
    const side: TsleSide =
      sideParam === "sell" || sideParam === "SELL" ? "sell" : "buy";

    const result = await computeDailyCommentary(symbol, side);
    res.json(result);
  } catch (err) {
    console.error("Daily commentary error:", err);
    res.status(500).json({ error: "Failed to compute daily commentary" });
  }
});

export default router;
