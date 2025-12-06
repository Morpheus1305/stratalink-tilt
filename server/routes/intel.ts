import express from "express";
import { computeExecutionIntel } from "../services/executionIntelligence";

const router = express.Router();

router.get("/execution", async (req, res) => {
  try {
    const symbol = (req.query.symbol as string)?.toUpperCase() || "BTC";
    const side = (req.query.side as string) === "sell" ? "sell" : "buy";

    const result = await computeExecutionIntel(symbol, side);
    res.json(result);
  } catch (err) {
    console.error("Execution Intel error:", err);
    res.status(500).json({ error: "Failed to compute execution intelligence" });
  }
});

export default router;
