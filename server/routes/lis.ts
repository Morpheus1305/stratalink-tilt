// server/routes/lis.ts
import { Router } from "express";
import type { Request, Response } from "express";

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

const VALID_VENUES = ["binance", "coinbase", "kraken", "deribit", "uniswap", "hyperliquid", "okx", "bybit", "dydx", "bitget", "gmx"] as const;
type ValidVenue = (typeof VALID_VENUES)[number];

function isValidVenue(v: string): v is ValidVenue {
  return (VALID_VENUES as readonly string[]).includes(v);
}

/**
 * Canonicalize venue/symbol for ALL TSLE/LIS keys.
 * This prevents key drift (e.g., coinbase returning BTC-USD internally).
 */
function canonicalizeKeys(venue: string, symbol: string) {
  return {
    venue: String(venue).toLowerCase(),
    symbol: String(symbol).toUpperCase(),
  };
}

/**
 * Canonicalize depth band keys to contract-stable names.
 * Accepts common variants and rewrites to:
 *   pct_0.1, pct_0.25, pct_0.5, pct_1, pct_2
 */
function canonicalizeBands(bands: any): Record<string, any> {
  if (!bands || typeof bands !== "object") return {};

  const out: Record<string, any> = {};

  const map: Record<string, string> = {
    // 0.1
    "pct_0.1": "pct_0.1",
    "pct_0_1": "pct_0.1",

    // 0.25
    "pct_0.25": "pct_0.25",
    "pct_0_25": "pct_0.25",

    // 0.5
    "pct_0.5": "pct_0.5",
    "pct_0_5": "pct_0.5",

    // 1
    "pct_1": "pct_1",

    // 2
    "pct_2": "pct_2",
  };

  for (const [k, v] of Object.entries(bands)) {
    const nk = map[k];
    if (!nk) continue;
    out[nk] = v;
  }

  return out;
}

/**
 * Map UI venue → relay venue
 */
function mapRelayVenue(venue: string): string {
  return venue.toLowerCase();
}

/**
 * Binance Authenticity Rule:
 * Accept Binance only if venue === "binance" AND data came from our trusted relay.
 * 
 * Since LIS fetches directly from relay.stratalink.ai, we can construct provenance
 * after receiving valid data (matching the pattern in binance.ts aggregator).
 * The relay is our trusted intermediary - if it returns data, it's authentic Binance data.
 */
function constructBinanceProvenance(symbol: string, ts_fetch_start: number, ts_fetch_end: number) {
  return {
    sourceVenue: "binance" as const,
    transport: "relay" as const,
    rawSymbol: symbol,
    engine: "LIS",
    ts_fetch_start,
    ts_fetch_end,
  };
}

function validateBinanceProvenance(venue: string, provenance: any): { valid: boolean; error?: string } {
  if (venue !== "binance") {
    return { valid: true };
  }

  if (provenance?.sourceVenue !== "binance") {
    return { valid: false, error: `Wrong sourceVenue: ${provenance?.sourceVenue ?? 'missing'}` };
  }

  if (provenance?.transport !== "relay") {
    return { valid: false, error: `Wrong transport: ${provenance?.transport ?? 'missing'}` };
  }

  return { valid: true };
}

/**
 * Normalize raw orderbook data into LISSnapshot format
 * Computes: mid_price, spread (absolute + bps), bands (10/25/50/100/200 bps)
 */
function normalizeOrderbook(rawData: any, venue: string, symbol: string): LISSnapshot {
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
  const spreadBps = midPrice > 0 ? (spreadAbsolute / midPrice) * 10_000 : 0;

  const bpsLevels = [0.1, 0.25, 0.5, 1, 2];
  const bands: Record<
    string,
    { bid_notional: number; ask_notional: number; total_notional: number }
  > = {};

  for (const bps of bpsLevels) {
    const priceRange = midPrice * (bps / 100);
    const bidFloor = midPrice - priceRange;
    const askCeil = midPrice + priceRange;

    let bidNotional = 0;
    for (const [priceStr, qtyStr] of bids) {
      const price = parseFloat(priceStr);
      const qty = parseFloat(qtyStr);
      if (price >= bidFloor) bidNotional += price * qty;
    }

    let askNotional = 0;
    for (const [priceStr, qtyStr] of asks) {
      const price = parseFloat(priceStr);
      const qty = parseFloat(qtyStr);
      if (price <= askCeil) askNotional += price * qty;
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
    spread: { absolute: spreadAbsolute, bps: spreadBps },
    bands,
  };
}

/**
 * GET /api/lis/:venue/depth?symbol=BTC
 *
 * Returns LISSnapshot + tsle (state machine output)
 * Also records into TSLE buffer using canonical keys.
 */
router.get("/:venue/depth", async (req: Request, res: Response) => {
  const rawVenue = String(req.params.venue ?? "").toLowerCase();
  const rawSymbol = req.query.symbol;

  if (!rawSymbol || typeof rawSymbol !== "string") {
    return res.status(400).json({ error: "symbol query parameter required" });
  }

  if (!isValidVenue(rawVenue)) {
    return res.status(400).json({
      error: `Venue "${rawVenue}" coming soon. Currently supported: ${VALID_VENUES.join(", ")}`,
    });
  }

  const { venue, symbol } = canonicalizeKeys(rawVenue, rawSymbol);

  try {
    let data: LISSnapshot;

    if (venue === "deribit" || venue === "hyperliquid" || venue === "uniswap" || venue === "okx" || venue === "bybit" || venue === "dydx" || venue === "bitget" || venue === "gmx") {
      const relayMap: Record<string, string> = {
        deribit: `/deribit/${req.query.scope === "spot" ? "spot" : "perps"}/depth`,
        hyperliquid: `/hyperliquid/perps/depth`,
        uniswap: `/uniswap/spot/depth`,
        okx: `/okx/${req.query.scope === "perps" ? "perps" : "spot"}/depth`,
        bybit: `/bybit/${req.query.scope === "perps" ? "perps" : "spot"}/depth`,
        dydx: `/dydx/perps/depth`,
        bitget: `/bitget/${req.query.scope === "perps" ? "perps" : "spot"}/depth`,
        gmx: `/gmx/perps/depth`,
      };
      const relayPath = relayMap[venue];
      const internalHeaders: Record<string, string> = {};
      if (process.env.RELAY_SECRET) internalHeaders["x-relay-secret"] = process.env.RELAY_SECRET;
      const relayRes = await fetch(
        `http://localhost:${process.env.PORT || 5000}${relayPath}?symbol=${encodeURIComponent(symbol)}`,
        { headers: internalHeaders }
      );
      if (!relayRes.ok) {
        const err = await relayRes.json().catch(() => ({}));
        return res.status(relayRes.status).json({ error: err.error || `${venue} relay returned ${relayRes.status}` });
      }
      const relayData = await relayRes.json();
      data = {
        venue,
        symbol,
        timestamp: relayData.timestamp ?? Date.now(),
        mid_price: relayData.mid_price ?? 0,
        spread: relayData.spread ?? { absolute: 0, bps: 0 },
        bands: relayData.bands ?? {},
      } as LISSnapshot;
      if (relayData.provenance) (data as any).provenance = relayData.provenance;
    } else if (venue === "coinbase") {
      // Coinbase fetch may return its own symbol; we will override to canonical.
      data = await fetchCoinbaseDepth(symbol);
    } else {
      const relayKey = process.env.VITE_LIS_RELAY_KEY || process.env.LIS_RELAY_KEY;
      if (!relayKey) {
        return res.status(500).json({ error: "LIS_RELAY_KEY not configured" });
      }

      const relayVenue = mapRelayVenue(venue);
      const ts_fetch_start = Date.now();

      const response = await fetch(
        `https://relay.stratalink.ai/${relayVenue}/depth?symbol=${encodeURIComponent(symbol)}`,
        { headers: { "x-relay-key": relayKey } }
      );

      const ts_fetch_end = Date.now();

      if (!response.ok) {
        return res.status(response.status).json({
          error: `LIS relay returned ${response.status}`,
        });
      }

      const rawData = await response.json();

      // ✅ For Binance: construct provenance since relay doesn't return it
      // This matches the pattern used in analytics/aggregator/exchanges/binance.ts
      // The relay is our trusted intermediary - if it returns data, it's authentic venue data
      let provenance = rawData?.provenance;
      if (venue === "binance" && !provenance?.sourceVenue) {
        provenance = constructBinanceProvenance(symbol, ts_fetch_start, ts_fetch_end);
      }

      // ✅ Binance Authenticity Rule: verify provenance before accepting
      const provenanceCheck = validateBinanceProvenance(venue, provenance);
      if (!provenanceCheck.valid) {
        console.error(`[LIS] Binance authenticity REJECTED: ${provenanceCheck.error}`);
        return res.status(400).json({
          error: `Binance authenticity check failed: ${provenanceCheck.error}`,
        });
      }

      // If already normalized, accept shape but still enforce canonical keys + bands.
      if (rawData?.bands && rawData?.mid_price !== undefined) {
        data = rawData as LISSnapshot;
      } else {
        data = normalizeOrderbook(rawData, venue, symbol);
      }

      // ✅ Attach provenance to snapshot for downstream consumers
      if (provenance) {
        (data as any).provenance = provenance;
      }
    }

    // ✅ HARD CANONICALIZATION (prevents key drift / empty /api/lis/state)
    data.venue = venue;
    data.symbol = symbol;

    // ✅ HARD CANONICALIZATION OF BANDS (prevents L2 missing/NULL due to key drift)
    (data as any).bands = canonicalizeBands((data as any).bands);

    // ✅ Deterministic depth evidence marker (L2 requires pct_0.25 + pct_0.5)
    const requiredBandKeys = ["pct_0.25", "pct_0.5"] as const;
    const hasRequiredBands = requiredBandKeys.every((k) => {
      const b = (data as any).bands?.[k];
      return b && Number.isFinite(b.total_notional);
    });
    if (!hasRequiredBands) {
      (data as any).__depthEvidenceMissing = true;
    }

    // ✅ Debug health for fast freeze verification (harmless if ignored by clients)
    (data as any).bandHealth = {
      hasBands: !!(data as any).bands && Object.keys((data as any).bands).length > 0,
      hasPct01: !!(data as any).bands?.["pct_0.1"],
      hasPct025: !!(data as any).bands?.["pct_0.25"],
      hasPct05: !!(data as any).bands?.["pct_0.5"],
      hasPct1: !!(data as any).bands?.["pct_1"],
      hasPct2: !!(data as any).bands?.["pct_2"],
      hasRequiredBands,
    };

    // TSLE runs on all venues
    tsleBuffer.record(data);

    const buffer = tsleBuffer.getHistory(venue, symbol);
    const spreadBps = data.spread?.bps ?? 0;

    const tsle = tsleStateEngine.transition(venue, symbol, buffer, spreadBps);
    (data as any).tsle = tsle;

    return res.json(data);
  } catch (err) {
    console.error("[LIS Proxy]", err);
    return res.status(500).json({ error: "LIS proxy failed" });
  }
});

/**
 * TSLE Dashboard endpoint
 * Returns time-series history, trend analysis, signals, and stats
 * Used by the TSLE chart component
 */
router.get("/tsle/dashboard", async (req: Request, res: Response) => {
  const v = String(req.query.venue ?? "binance").toLowerCase();
  const s = String(req.query.symbol ?? "BTC");
  const limit = Number.parseInt(String(req.query.limit ?? "60"), 10) || 60;

  if (!isValidVenue(v)) {
    return res.status(400).json({
      error: `Invalid venue. Must be one of: ${VALID_VENUES.join(", ")}`,
    });
  }

  const { venue, symbol } = canonicalizeKeys(v, s);

  try {
    const history = tsleBuffer.getHistory(venue, symbol, limit);
    const stats = tsleBuffer.getStats(venue, symbol);
    const trend = tsleBuffer.getTrend(venue, symbol, 12);
    const signals = tsleBuffer.getSignals(venue, symbol);
    const latest = tsleBuffer.getLatest(venue, symbol);
    const stateSnapshot = tsleStateEngine.getState(venue, symbol);

    return res.json({
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
    return res.status(500).json({ error: "TSLE dashboard failed" });
  }
});

/**
 * TSLE State endpoint
 * Returns current TSLE state machine snapshot
 */
router.get("/", async (req: Request, res: Response) => {
  const v = String(req.query.venue ?? "binance").toLowerCase();
  const s = String(req.query.symbol ?? "BTC");

  if (!isValidVenue(v)) {
    return res.status(400).json({
      error: `Invalid venue. Must be one of: ${VALID_VENUES.join(", ")}`,
    });
  }

  const { venue, symbol } = canonicalizeKeys(v, s);

  try {
    const stateSnapshot = tsleStateEngine.getState(venue, symbol);
    const latest = tsleBuffer.getLatest(venue, symbol);
    const trend = tsleBuffer.getTrend(venue, symbol, 12);

    return res.json({
      venue,
      symbol,
      state: stateSnapshot.state || TSLE_STATE.STABLE,
      stateSnapshot,
      latest,
      trend,
    });
  } catch (err) {
    console.error("[TSLE State]", err);
    return res.status(500).json({ error: "TSLE state failed" });
  }
});

/**
 * Venue Divergence Detection endpoint
 * Compares Reference vs Stress venues for a given symbol
 * If a venue query param is provided and it's not coinbase/binance,
 * compare that venue against coinbase as reference.
 */
router.get("/divergence", async (req: Request, res: Response) => {
  const symbol = String(req.query.symbol ?? "BTC").toUpperCase();
  const requestedVenue = req.query.venue ? String(req.query.venue).toLowerCase() : null;

  let referenceVenue: string = "coinbase";
  let stressVenue: string = "binance";

  if (requestedVenue && isValidVenue(requestedVenue)) {
    if (requestedVenue === "coinbase") {
      referenceVenue = "coinbase";
      stressVenue = "binance";
    } else {
      stressVenue = requestedVenue;
      referenceVenue = "coinbase";
    }
  }

  try {
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

    const refState = tsleStateEngine.getState(referenceVenue, symbol);
    const stressState = tsleStateEngine.getState(stressVenue, symbol);

    const refSnapshot: VenueSnapshot = {
      venue: referenceVenue,
      poli: refLatest.poli,
      depth25: refLatest.depth25,
      depth50: refLatest.depth50,
      spreadBps: 0,
      imbalance2550: refLatest.imbalance2550,
      tsleState: refState.state || "STABLE",
      timestamp: refLatest.ts,
    };

    const stressSnapshot: VenueSnapshot = {
      venue: stressVenue,
      poli: stressLatest.poli,
      depth25: stressLatest.depth25,
      depth50: stressLatest.depth50,
      spreadBps: 0,
      imbalance2550: stressLatest.imbalance2550,
      tsleState: stressState.state || "STABLE",
      timestamp: stressLatest.ts,
    };

    const signals = detectDivergence(refSnapshot, stressSnapshot);
    const report = generateDivergenceReport(signals);

    return res.json({
      ...report,
      referenceVenue,
      stressVenue,
      symbol,
      snapshots: { reference: refSnapshot, stress: stressSnapshot },
    });
  } catch (err) {
    console.error("[Divergence Detection]", err);
    return res.status(500).json({ error: "Divergence detection failed" });
  }
});

/**
 * GET /api/lis/state
 * Returns the unified LiquidityState object — canonical liquidity truth
 */
router.get("/state", (req: Request, res: Response) => {
  const v = String(req.query.venue ?? "coinbase").toLowerCase();
  const s = String(req.query.symbol ?? "BTC");

  if (!isValidVenue(v)) {
    return res.status(400).json({
      error: `Invalid venue. Must be one of: ${VALID_VENUES.join(", ")}`,
    });
  }

  const { venue, symbol } = canonicalizeKeys(v, s);

  try {
    const buffer = tsleBuffer.getHistory(venue, symbol);
    const stateSnapshot = tsleStateEngine.getState(venue, symbol);
    const trend = tsleBuffer.getTrend(venue, symbol);
    const signals = tsleBuffer.getSignals(venue, symbol);
    const latest = tsleBuffer.getLatest(venue, symbol);

    // ✅ Ensure canonical LiquidityState includes latest (critical for evidence)
    const liquidityState = buildLiquidityState(
      venue,
      symbol,
      buffer,
      stateSnapshot,
      trend,
      signals,
      latest
    );

    return res.json(liquidityState);
  } catch (err) {
    console.error("[LiquidityState]", err);
    return res.status(500).json({ error: "Failed to build liquidity state" });
  }
});

export default router;