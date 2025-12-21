import { Router } from "express";
import { 
  tsleBuffer, 
  tsleStateEngine, 
  TSLE_STATE,
  type LISSnapshot, 
  type TSLETrend, 
  type TSLESignal 
} from "../services/tsle-buffer";

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

    const data = await response.json() as LISSnapshot;
    
    // Record to TSLE buffer and trigger state transition (Binance only)
    if (venue.toLowerCase() === "binance") {
      const prevPoint = tsleBuffer.getLatest(venue, symbol as string);
      const point = tsleBuffer.record(data);
      
      // Trigger state machine transition
      if (point) {
        tsleStateEngine.transition(venue, symbol as string, point, prevPoint);
      }
    }
    
    res.json(data);
  } catch (err) {
    console.error("[LIS Proxy] Error:", err);
    res.status(500).json({ error: "LIS proxy failed" });
  }
});

// TSLE History Endpoints

// GET /api/lis/tsle/history?venue=binance&symbol=BTC&limit=60
router.get("/tsle/history", (req, res) => {
  const venue = (req.query.venue as string) || "binance";
  const symbol = (req.query.symbol as string) || "BTC";
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

  const history = tsleBuffer.getHistory(venue, symbol, limit);
  const stats = tsleBuffer.getStats(venue, symbol);

  res.json({
    venue,
    symbol,
    points: history,
    stats,
    asOf: new Date().toISOString(),
  });
});

// GET /api/lis/tsle/latest?venue=binance&symbol=BTC
router.get("/tsle/latest", (req, res) => {
  const venue = (req.query.venue as string) || "binance";
  const symbol = (req.query.symbol as string) || "BTC";

  const latest = tsleBuffer.getLatest(venue, symbol);
  const stats = tsleBuffer.getStats(venue, symbol);

  if (!latest) {
    return res.status(404).json({ 
      error: "No TSLE data available yet",
      hint: "Data is collected on each LIS poll. Wait for a few polling cycles."
    });
  }

  res.json({
    venue,
    symbol,
    latest,
    stats,
    asOf: new Date().toISOString(),
  });
});

// GET /api/lis/tsle/buffers - list all active buffers
router.get("/tsle/buffers", (req, res) => {
  const keys = tsleBuffer.getBufferKeys();
  const bufferStats = keys.map(key => {
    const [venue, symbol] = key.split(":");
    return {
      key,
      venue,
      symbol,
      ...tsleBuffer.getStats(venue, symbol),
    };
  });

  res.json({
    buffers: bufferStats,
    totalBuffers: keys.length,
    asOf: new Date().toISOString(),
  });
});

// GET /api/lis/tsle/trend?venue=binance&symbol=BTC&window=12
router.get("/tsle/trend", (req, res) => {
  const venue = (req.query.venue as string) || "binance";
  const symbol = (req.query.symbol as string) || "BTC";
  const window = req.query.window ? parseInt(req.query.window as string, 10) : 12;

  const trend = tsleBuffer.getTrend(venue, symbol, window);
  const latest = tsleBuffer.getLatest(venue, symbol);
  const stats = tsleBuffer.getStats(venue, symbol);

  res.json({
    venue,
    symbol,
    window,
    trend,
    latest,
    stats,
    asOf: new Date().toISOString(),
  });
});

// GET /api/lis/tsle/signals?venue=binance&symbol=BTC
router.get("/tsle/signals", (req, res) => {
  const venue = (req.query.venue as string) || "binance";
  const symbol = (req.query.symbol as string) || "BTC";

  const signals = tsleBuffer.getSignals(venue, symbol);
  const trend = tsleBuffer.getTrend(venue, symbol, 12);
  const latest = tsleBuffer.getLatest(venue, symbol);

  res.json({
    venue,
    symbol,
    signals,
    signalCount: signals.length,
    hasHighSeverity: signals.some(s => s.severity === "high"),
    trend,
    latest,
    asOf: new Date().toISOString(),
  });
});

// GET /api/lis/tsle/dashboard?venue=binance&symbol=BTC
// Combined endpoint for frontend: history + trend + signals + state
router.get("/tsle/dashboard", (req, res) => {
  const venue = (req.query.venue as string) || "binance";
  const symbol = (req.query.symbol as string) || "BTC";
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 60;

  const history = tsleBuffer.getHistory(venue, symbol, limit);
  const trend = tsleBuffer.getTrend(venue, symbol, 12);
  const signals = tsleBuffer.getSignals(venue, symbol);
  const stats = tsleBuffer.getStats(venue, symbol);
  const latest = tsleBuffer.getLatest(venue, symbol);
  const stateSnapshot = tsleStateEngine.getState(venue, symbol);

  res.json({
    venue,
    symbol,
    history,
    trend,
    signals,
    stats,
    latest,
    state: stateSnapshot,
    asOf: new Date().toISOString(),
  });
});

// GET /api/lis/tsle/state?venue=binance&symbol=BTC
// Current TSLE state with transition history
router.get("/tsle/state", (req, res) => {
  const venue = (req.query.venue as string) || "binance";
  const symbol = (req.query.symbol as string) || "BTC";
  const historyLimit = req.query.history ? parseInt(req.query.history as string, 10) : 10;

  const stateSnapshot = tsleStateEngine.getState(venue, symbol);
  const transitionHistory = tsleStateEngine.getTransitionHistory(venue, symbol, historyLimit);
  const latest = tsleBuffer.getLatest(venue, symbol);

  res.json({
    venue,
    symbol,
    ...stateSnapshot,
    transitionHistory,
    latest,
    stateDefinitions: {
      [TSLE_STATE.STABLE]: "Healthy liquidity: PoLi ≥70, low imbalance, steady depth",
      [TSLE_STATE.THINNING]: "Early warning: PoLi 50-70 or depth erosion detected",
      [TSLE_STATE.FRAGILE]: "At-risk: PoLi 30-50 or significant imbalance/erosion",
      [TSLE_STATE.DISLOCATED]: "Critical: PoLi <30 or severe liquidity breakdown",
    },
    asOf: new Date().toISOString(),
  });
});

// GET /api/lis/tsle/states - list all tracked states across venues/symbols
router.get("/tsle/states", (req, res) => {
  const allStates = tsleStateEngine.getAllStates();
  const stateEntries = Array.from(allStates.entries()).map(([key, state]) => {
    const [venue, symbol] = key.split(":");
    const snapshot = tsleStateEngine.getState(venue, symbol);
    return {
      key,
      venue,
      symbol,
      state,
      since: snapshot.since,
      durationMs: snapshot.durationMs,
      transitionCount: snapshot.transitionCount,
    };
  });

  res.json({
    states: stateEntries,
    totalTracked: stateEntries.length,
    asOf: new Date().toISOString(),
  });
});

export default router;
