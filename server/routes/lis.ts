import { Router } from "express";

const router = Router();

router.get("/:venue/depth", async (req, res) => {
  const { venue } = req.params;
  const { symbol } = req.query;

  if (!symbol || typeof symbol !== "string") {
    return res.status(400).json({ error: "symbol query parameter required" });
  }

  const validVenues = ["binance", "coinbase", "okx", "kraken"];
  if (!validVenues.includes(venue)) {
    return res.status(400).json({ error: `Invalid venue. Must be one of: ${validVenues.join(", ")}` });
  }

  try {
    const relayKey = process.env.VITE_LIS_RELAY_KEY || process.env.LIS_RELAY_KEY;
    if (!relayKey) {
      return res.status(500).json({ error: "LIS_RELAY_KEY not configured" });
    }

    const response = await fetch(
      `https://relay.stratalink.ai/${venue}/depth?symbol=${symbol}`,
      {
        headers: {
          "x-relay-key": relayKey,
        },
      }
    );

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `LIS relay returned ${response.status}` 
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("[LIS Proxy] Error:", err);
    res.status(500).json({ error: "LIS proxy failed" });
  }
});

export default router;
