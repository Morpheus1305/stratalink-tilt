import { Router } from "express";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { getDepth: getRouterDepth } = require("../../relay/depthRouter.cjs");

const router = Router();

const DEPTH_CAPABLE_VENUES = {
  binance: true,
  coinbase: true,
  okx: false,
  kraken: false
};

router.get("/:venue/depth", async (req, res) => {
  const { venue } = req.params;
  const { symbol } = req.query;

  if (!symbol || typeof symbol !== "string") {
    return res.status(400).json({ error: "symbol query parameter required" });
  }

  const v = venue.toLowerCase();
  const validVenues = ["binance", "coinbase", "okx", "kraken"];
  
  if (!validVenues.includes(v)) {
    return res.status(400).json({ error: `Invalid venue. Must be one of: ${validVenues.join(", ")}` });
  }

  if (!DEPTH_CAPABLE_VENUES[v as keyof typeof DEPTH_CAPABLE_VENUES]) {
    return res.status(404).json({ 
      error: `Depth not available on ${venue.toUpperCase()}`,
      venue: v,
      symbol: symbol.toUpperCase()
    });
  }

  try {
    const depth = await getRouterDepth(v, symbol.toUpperCase());
    res.json(depth);
  } catch (err: any) {
    console.error(`[LIS] Depth failed for ${v}/${symbol}:`, err.message);
    res.status(500).json({ 
      error: err.message || "Depth fetch failed",
      venue: v,
      symbol: symbol.toUpperCase()
    });
  }
});

export default router;
