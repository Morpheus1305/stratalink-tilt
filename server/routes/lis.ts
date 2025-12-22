import { Router } from "express";
import {
  tsleBuffer,
  tsleStateEngine,
  TSLE_STATE,
  type LISSnapshot,
} from "../services/tsle-buffer";

const router = Router();

/**
 * Map UI venue → relay venue
 * THIS IS THE KEY FIX
 */
function mapRelayVenue(venue: string): string {
  switch (venue.toLowerCase()) {
    case "binance":
      return "binance";
    case "coinbase":
      return "coinbase_spot"; // ← CHANGE THIS if relay uses another name
    default:
      return venue;
  }
}

router.get("/:venue/depth", async (req, res) => {
  const { venue } = req.params;
  const { symbol } = req.query;

  if (!symbol || typeof symbol !== "string") {
    return res.status(400).json({ error: "symbol query parameter required" });
  }

  const validVenues = ["binance", "coinbase"];
  if (!validVenues.includes(venue)) {
    return res.status(400).json({
      error: `Invalid venue. Must be one of: ${validVenues.join(", ")}`,
    });
  }

  try {
    const relayKey =
      process.env.VITE_LIS_RELAY_KEY || process.env.LIS_RELAY_KEY;

    if (!relayKey) {
      return res.status(500).json({ error: "LIS_RELAY_KEY not configured" });
    }

    const relayVenue = mapRelayVenue(venue);

    const response = await fetch(
      `https://relay.stratalink.ai/${relayVenue}/depth?symbol=${symbol}`,
      {
        headers: {
          "x-relay-key": relayKey,
        },
      }
    );

    if (!response.ok) {
      return res.status(response.status).json({
        error: `LIS relay returned ${response.status}`,
      });
    }

    const data = (await response.json()) as LISSnapshot;

    // Force canonical venue so UI NEVER mislabels
    data.venue = venue;

    // TSLE ONLY runs on Binance
    if (venue === "binance") {
      tsleBuffer.record(data);
      const buffer = tsleBuffer.getHistory(venue, symbol);
      const spreadBps = data.spread?.bps;
      const tsle = tsleStateEngine.transition(
        venue,
        symbol,
        buffer,
        spreadBps
      );
      (data as any).tsle = tsle;
    }

    res.json(data);
  } catch (err) {
    console.error("[LIS Proxy]", err);
    res.status(500).json({ error: "LIS proxy failed" });
  }
});

export default router;