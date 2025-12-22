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
 */
function mapRelayVenue(venue: string): string {
  switch (venue.toLowerCase()) {
    case "binance":
      return "binance";
    case "coinbase":
      return "coinbase_spot";
    default:
      return venue;
  }
}

/**
 * Normalize raw orderbook data into LISSnapshot format
 * Computes: mid_price, spread (absolute + bps), bands (10/25/50/100/200 bps)
 */
function normalizeOrderbook(
  rawData: any,
  venue: string,
  symbol: string
): LISSnapshot {
  const bids: [string, string][] = rawData?.raw?.bids ?? rawData?.bids ?? [];
  const asks: [string, string][] = rawData?.raw?.asks ?? rawData?.asks ?? [];

  if (!bids.length || !asks.length) {
    return {
      venue,
      symbol,
      timestamp: Date.now(),
      mid_price: 0,
      spread: { absolute: 0, bps: 0 },
      bands: {},
    };
  }

  const bestBid = parseFloat(bids[0][0]);
  const bestAsk = parseFloat(asks[0][0]);
  const midPrice = (bestBid + bestAsk) / 2;
  const spreadAbsolute = bestAsk - bestBid;
  const spreadBps = midPrice > 0 ? (spreadAbsolute / midPrice) * 10000 : 0;

  const bpsLevels = [0.1, 0.25, 0.5, 1, 2];
  const bands: Record<string, { bid_notional: number; ask_notional: number; total_notional: number }> = {};

  for (const bps of bpsLevels) {
    const priceRange = midPrice * (bps / 100);
    const bidFloor = midPrice - priceRange;
    const askCeil = midPrice + priceRange;

    let bidNotional = 0;
    for (const [priceStr, qtyStr] of bids) {
      const price = parseFloat(priceStr);
      const qty = parseFloat(qtyStr);
      if (price >= bidFloor) {
        bidNotional += price * qty;
      }
    }

    let askNotional = 0;
    for (const [priceStr, qtyStr] of asks) {
      const price = parseFloat(priceStr);
      const qty = parseFloat(qtyStr);
      if (price <= askCeil) {
        askNotional += price * qty;
      }
    }

    const key = `pct_${bps}`;
    bands[key] = {
      bid_notional: bidNotional,
      ask_notional: askNotional,
      total_notional: bidNotional + askNotional,
    };
  }

  return {
    venue,
    symbol,
    timestamp: rawData?.ts ?? Date.now(),
    mid_price: midPrice,
    spread: {
      absolute: spreadAbsolute,
      bps: spreadBps,
    },
    bands,
  };
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

    const rawData = await response.json();

    // Check if data is already normalized (has bands) or needs normalization
    let data: LISSnapshot;
    if (rawData.bands && rawData.mid_price !== undefined) {
      data = rawData as LISSnapshot;
      data.venue = venue;
    } else {
      data = normalizeOrderbook(rawData, venue, symbol);
    }

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
