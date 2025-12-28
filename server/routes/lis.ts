import { Router } from "express";
import {
  tsleBuffer,
  tsleStateEngine,
  TSLE_STATE,
  type LISSnapshot,
  buildLiquidityState,
} from "../services/tsle-buffer";
import {
  detectDivergence,
  generateDivergenceReport,
  type VenueSnapshot,
} from "../services/divergence-detector";
import { fetchCoinbaseDepth } from "../services/lis-coinbase";

const router = Router();

/**
 * Map UI venue → relay venue
 * Note: Both binance and coinbase use their lowercase names directly
 */
function mapRelayVenue(venue: string): string {
  return venue.toLowerCase();
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

  // Currently supported venues
  const validVenues = ["binance", "coinbase", "kraken"];
  if (!validVenues.includes(venue)) {
    return res.status(400).json({
      error: `Venue "${venue}" coming soon. Currently supported: ${validVenues.join(", ")}`,
    });
  }

  try {
    let data: LISSnapshot;

    // Use direct API for Coinbase (more reliable than relay)
    if (venue === "coinbase") {
      data = await fetchCoinbaseDepth(symbol);
    } else {
      // Use relay for other venues (Binance, Kraken, etc.)
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
      if (rawData.bands && rawData.mid_price !== undefined) {
        data = rawData as LISSnapshot;
        data.venue = venue;
      } else {
        data = normalizeOrderbook(rawData, venue, symbol);
      }
    }

    // TSLE runs on all venues
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

    res.json(data);
  } catch (err) {
    console.error("[LIS Proxy]", err);
    res.status(500).json({ error: "LIS proxy failed" });
  }
});

/**
 * TSLE Dashboard endpoint
 * Returns time-series history, trend analysis, signals, and stats
 * Used by the TSLE chart component
 */
router.get("/tsle/dashboard", async (req, res) => {
  const venue = (req.query.venue as string) || "binance";
  const symbol = (req.query.symbol as string) || "BTC";
  const limit = parseInt(req.query.limit as string) || 60;

  const validVenues = ["binance", "coinbase", "kraken"];
  if (!validVenues.includes(venue.toLowerCase())) {
    return res.status(400).json({
      error: `Invalid venue. Must be one of: ${validVenues.join(", ")}`,
    });
  }

  try {
    const history = tsleBuffer.getHistory(venue, symbol, limit);
    const stats = tsleBuffer.getStats(venue, symbol);
    const trend = tsleBuffer.getTrend(venue, symbol, 12);
    const signals = tsleBuffer.getSignals(venue, symbol);
    const latest = tsleBuffer.getLatest(venue, symbol);

    // Get state machine snapshot
    const stateSnapshot = tsleStateEngine.getState(venue, symbol);

    res.json({
      venue,
      symbol,
      history,
      trend,
      signals,
      stats,
      latest,
      stateSnapshot,
    });
  } catch (err) {
    console.error("[TSLE Dashboard]", err);
    res.status(500).json({ error: "TSLE dashboard failed" });
  }
});

/**
 * TSLE State endpoint
 * Returns current TSLE state machine snapshot
 */
router.get("/tsle/state", async (req, res) => {
  const venue = (req.query.venue as string) || "binance";
  const symbol = (req.query.symbol as string) || "BTC";

  try {
    const stateSnapshot = tsleStateEngine.getState(venue, symbol);
    const latest = tsleBuffer.getLatest(venue, symbol);
    const trend = tsleBuffer.getTrend(venue, symbol, 12);

    res.json({
      venue,
      symbol,
      state: stateSnapshot.state || TSLE_STATE.STABLE,
      stateSnapshot,
      latest,
      trend,
    });
  } catch (err) {
    console.error("[TSLE State]", err);
    res.status(500).json({ error: "TSLE state failed" });
  }
});

/**
 * Venue Divergence Detection endpoint
 * Compares Reference vs Stress venues for a given symbol
 * Returns divergence signals and regime classification
 */
router.get("/divergence", async (req, res) => {
  const symbol = (req.query.symbol as string) || "BTC";
  const referenceVenue = "coinbase";
  const stressVenue = "binance";

  try {
    // Get latest snapshots for both venues
    const refLatest = tsleBuffer.getLatest(referenceVenue, symbol);
    const stressLatest = tsleBuffer.getLatest(stressVenue, symbol);

    if (!refLatest || !stressLatest) {
      return res.json({
        hasDivergence: false,
        signals: [],
        summary: "Insufficient data. Both venues must have recent snapshots.",
        regime: "NORMAL",
        timestamp: Date.now(),
        referenceVenue,
        stressVenue,
        symbol,
      });
    }

    // Get TSLE states for both venues
    const refState = tsleStateEngine.getState(referenceVenue, symbol);
    const stressState = tsleStateEngine.getState(stressVenue, symbol);

    // Build venue snapshots for comparison
    // Note: TSLEPoint uses 'ts' for timestamp and doesn't store spread
    const refSnapshot: VenueSnapshot = {
      venue: referenceVenue,
      poli: refLatest.poli,
      depth25: refLatest.depth25,
      depth50: refLatest.depth50,
      spreadBps: 0, // Spread not stored in TSLEPoint, would need separate lookup
      imbalance2550: refLatest.imbalance2550,
      tsleState: refState.state || "STABLE",
      timestamp: refLatest.ts,
    };

    const stressSnapshot: VenueSnapshot = {
      venue: stressVenue,
      poli: stressLatest.poli,
      depth25: stressLatest.depth25,
      depth50: stressLatest.depth50,
      spreadBps: 0, // Spread not stored in TSLEPoint, would need separate lookup
      imbalance2550: stressLatest.imbalance2550,
      tsleState: stressState.state || "STABLE",
      timestamp: stressLatest.ts,
    };

    // Detect divergence signals
    const signals = detectDivergence(refSnapshot, stressSnapshot);
    const report = generateDivergenceReport(signals);

    res.json({
      ...report,
      referenceVenue,
      stressVenue,
      symbol,
      snapshots: {
        reference: refSnapshot,
        stress: stressSnapshot,
      },
    });
  } catch (err) {
    console.error("[Divergence Detection]", err);
    res.status(500).json({ error: "Divergence detection failed" });
  }
});

/**
 * GET /api/lis/state
 * Returns the unified LiquidityState object — canonical liquidity truth
 * 
 * This endpoint is the single source of truth for liquidity intelligence.
 * All downstream products should read from this state.
 */
router.get("/state", (req, res) => {
  const venue = ((req.query.venue as string) || "coinbase").toLowerCase();
  const symbol = ((req.query.symbol as string) || "BTC").toUpperCase();

  try {
    const buffer = tsleBuffer.getHistory(venue, symbol);
    const stateSnapshot = tsleStateEngine.getState(venue, symbol);
    const trend = tsleBuffer.getTrend(venue, symbol);
    const signals = tsleBuffer.getSignals(venue, symbol);

    const liquidityState = buildLiquidityState(
      venue,
      symbol,
      buffer,
      stateSnapshot,
      trend,
      signals
    );

    res.json(liquidityState);
  } catch (err) {
    console.error("[LiquidityState]", err);
    res.status(500).json({ error: "Failed to build liquidity state" });
  }
});

export default router;
