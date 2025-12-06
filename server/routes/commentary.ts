import express from "express";
import { computeDailyCommentary } from "../services/dailyCommentary";
import type { SupportedToken } from "../services/cexOrderbooks";

const router = express.Router();

router.get("/daily", async (req, res) => {
  try {
    const symbolParam = (req.query.symbol as string) || "BTC";
    const symbol = symbolParam.toUpperCase() as SupportedToken;

    const sideParam = (req.query.side as string) || "buy";
    const side = sideParam === "sell" || sideParam === "SELL" ? "sell" : "buy";

    const result = await computeDailyCommentary(symbol, side as "buy" | "sell");
    res.json(result);
  } catch (err) {
    console.error("Daily commentary error:", err);
    res.status(500).json({ error: "Failed to compute daily commentary" });
  }
});

export default router;
