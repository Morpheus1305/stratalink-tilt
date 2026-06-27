import { ingestDepth, getDepthCache, getLastIngestTime as getDepthIngestTime } from "./depthEngine";
import { ingestFunding, getFundingCache, getLastFundingIngestTime } from "./fundingEngine";
import { ingestLiquidations, getLiquidationCache, getLastLiquidationIngestTime } from "./liquidationEngine";
import { computeStress, getStressCommentary, StressResult } from "./stressEngine";
import { recordDepthSnapshot } from "../../server/services/depthHistoryStore";
import { tsleBuffer } from "../../server/services/tsle-buffer";
import { computeAnalyticsSnapshot } from "../../server/services/analytics-layer";
import { evaluateAndNotify } from "../../server/services/alert-service";
import { pushIngestCycleAlerts } from "../../server/services/liveAlertsService";
import type { DivergenceReport, DivergenceSignal } from "../../server/services/divergence-detector";

let isIngesting = false;
let lastFullIngest = 0;
let ingestInterval: NodeJS.Timeout | null = null;

const INGEST_INTERVAL_MS = 5000;

/**
 * Convert a DEPTH_CACHE entry into LISSnapshot format and push to tsleBuffer.
 * Band key mapping:  "10bps" → "pct_0.1", "25bps" → "pct_0.25", etc.
 * Field mapping:      bidUSD/askUSD/totalUSD → bid_notional/ask_notional/total_notional
 */
function feedDepthToTsleBuffer(): void {
  const cache = getDepthCache();
  const now = Date.now();

  for (const [symbol, depth] of Object.entries(cache)) {
    const sym = symbol.toUpperCase();
    // All ILU-20 symbols are now tracked — no symbol filter

    const b = depth.bands as any;

    const snapshot = {
      venue: depth.source || "binance",
      symbol: sym,
      timestamp: depth.ts || now,
      mid_price: depth.mid,
      spread: {
        absolute: depth.spread,
        bps: depth.spreadBps,
      },
      bands: {
        "pct_0.1":  { bid_notional: b["10bps"]?.bidUSD  ?? 0, ask_notional: b["10bps"]?.askUSD  ?? 0, total_notional: b["10bps"]?.totalUSD  ?? 0 },
        "pct_0.25": { bid_notional: b["25bps"]?.bidUSD  ?? 0, ask_notional: b["25bps"]?.askUSD  ?? 0, total_notional: b["25bps"]?.totalUSD  ?? 0 },
        "pct_0.5":  { bid_notional: b["50bps"]?.bidUSD  ?? 0, ask_notional: b["50bps"]?.askUSD  ?? 0, total_notional: b["50bps"]?.totalUSD  ?? 0 },
        "pct_1.0":  { bid_notional: b["100bps"]?.bidUSD ?? 0, ask_notional: b["100bps"]?.askUSD ?? 0, total_notional: b["100bps"]?.totalUSD ?? 0 },
        "pct_2.0":  { bid_notional: b["200bps"]?.bidUSD ?? 0, ask_notional: b["200bps"]?.askUSD ?? 0, total_notional: b["200bps"]?.totalUSD ?? 0 },
      },
    };

    tsleBuffer.record(snapshot);
  }
}

const TRACKED_SYMBOLS = ['BTC', 'ETH', 'SOL'];

/**
 * Build a DivergenceReport-shaped context from live L5F scores so existing
 * alert rules (POLI_DROP, DEPTH_DROP, REGIME_CHANGE, DIVERGENCE) can be
 * evaluated without needing actual venue-pair divergence data.
 */
async function detectAndWriteAlerts(): Promise<void> {
  for (const sym of TRACKED_SYMBOLS) {
    const snap = computeAnalyticsSnapshot(sym);
    if (!snap) continue;

    // Map vol_regime → DivergenceReport.regime
    const regime: DivergenceReport['regime'] =
      snap.vol_regime === 'STRESS'
        ? 'CONFIRMED_STRESS'
        : snap.vol_regime === 'ELEVATED'
        ? 'EARLY_WARNING'
        : 'NORMAL';

    const signals: DivergenceSignal[] = [];
    const now = Date.now();

    // PoLi signal — fired when composite score is below target
    if (snap.l5f_composite < 65) {
      const severity: DivergenceSignal['severity'] =
        snap.l5f_composite < 35
          ? 'CRITICAL'
          : snap.l5f_composite < 50
          ? 'HIGH'
          : 'MODERATE';
      signals.push({
        type: 'POLI',
        severity,
        referenceVenue: 'coinbase',
        stressVenue: 'binance',
        referenceValue: snap.l5f_composite,
        stressValue: snap.l5f_composite,
        delta: 65 - snap.l5f_composite,
        threshold: 65,
        message: `${sym} L5F composite ${snap.l5f_composite.toFixed(1)} — below target (65)`,
        timestamp: now,
      });
    }

    // Depth signal — fired when DQ score is degraded
    if (snap.l5f_depth_quality < 50) {
      const severity: DivergenceSignal['severity'] =
        snap.l5f_depth_quality < 30 ? 'HIGH' : 'MODERATE';
      signals.push({
        type: 'DEPTH',
        severity,
        referenceVenue: 'coinbase',
        stressVenue: 'binance',
        referenceValue: snap.total_depth_10bps,
        stressValue: snap.total_depth_10bps,
        delta: 50 - snap.l5f_depth_quality,
        threshold: 50,
        message: `${sym} Depth Quality ${snap.l5f_depth_quality.toFixed(1)} — $${(snap.total_depth_10bps / 1e6).toFixed(1)}M @ 10bps`,
        timestamp: now,
      });
    }

    // Spread/fragmentation signal
    if (snap.spread_dispersion_bps > 5) {
      signals.push({
        type: 'SPREAD',
        severity: snap.spread_dispersion_bps > 15 ? 'HIGH' : 'MODERATE',
        referenceVenue: 'coinbase',
        stressVenue: 'binance',
        referenceValue: snap.spread_dispersion_bps,
        stressValue: snap.spread_dispersion_bps,
        delta: snap.spread_dispersion_bps,
        threshold: 5,
        message: `${sym} spread dispersion ${snap.spread_dispersion_bps.toFixed(2)}bps across venues`,
        timestamp: now,
      });
    }

    const report: DivergenceReport = {
      hasDivergence: signals.length > 0,
      signals,
      summary: `L5F ${sym}: composite ${snap.l5f_composite.toFixed(1)}, DQ ${snap.l5f_depth_quality.toFixed(1)}, R ${snap.l5f_resilience.toFixed(1)}, regime ${snap.vol_regime} — ${snap.venue_count} venues active`,
      regime,
      timestamp: now,
    };

    await evaluateAndNotify({ symbol: sym, divergenceReport: report, signals });

    // Push to in-memory ring buffer so the frontend log updates every cycle
    pushIngestCycleAlerts(sym, snap);
  }
}

// ILU-20 symbol groups used across relay venues
const ILU_BYBIT_SYMBOLS = ["BTC", "ETH", "SOL", "XRP", "DOGE", "BNB", "ADA", "TON",
                            "LINK", "MKR", "AAVE", "UNI", "HYPE", "OKB", "CRO",
                            "USDC", "USDE", "DAI"];
const ILU_DYDX_SYMBOLS  = ["BTC", "ETH", "SOL", "XRP", "DOGE", "BNB", "ADA",
                            "LINK", "MKR", "AAVE", "UNI"];
const ILU_HL_SYMBOLS    = ["BTC", "ETH", "SOL", "XRP", "DOGE", "BNB", "ADA",
                            "LINK", "MKR", "AAVE", "UNI", "HYPE"];
const ILU_OTC_SYMBOLS   = ["BTC", "ETH", "SOL", "XRP", "DOGE", "BNB", "ADA", "TON",
                            "LINK", "MKR", "AAVE", "UNI", "HYPE", "OKB", "CRO",
                            "USDT", "USDC", "USDE", "DAI"];

const RELAY_VENUES: { path: string; symbols: string[] }[] = [
  { path: "/api/bybit/spot/depth",       symbols: ILU_BYBIT_SYMBOLS },
  { path: "/api/bitget/spot/depth",      symbols: ["BTC", "ETH", "SOL"] },
  { path: "/api/dydx/perps/depth",       symbols: ILU_DYDX_SYMBOLS  },
  { path: "/api/hyperliquid/perps/depth",symbols: ILU_HL_SYMBOLS    },
  { path: "/api/gmx/perps/depth",        symbols: ["BTC", "ETH"]        },
  { path: "/api/deribit/spot/depth",     symbols: ["BTC", "ETH"]        },
  { path: "/api/uniswap/spot/depth",     symbols: ["BTC", "ETH", "SOL"] },
  { path: "/api/curve/spot/depth",       symbols: ["BTC", "ETH"]        },
  { path: "/api/otc/spot/depth",         symbols: ILU_OTC_SYMBOLS   },
];

/**
 * Actively poll each passive relay endpoint so it fetches from the exchange
 * and records to tsleBuffer. Fire-and-forget per venue; failures are silenced
 * so one bad venue doesn't block the ingest cycle.
 */
async function ingestRelayVenues(): Promise<void> {
  const port = process.env.PORT || 5000;
  const secret = process.env.RELAY_SECRET || "";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(secret ? { "x-relay-secret": secret } : {}),
  };

  console.log(`[IngestionManager] Polling ${RELAY_VENUES.length} relay venue groups...`);
  const calls: Promise<void>[] = [];
  for (const { path, symbols } of RELAY_VENUES) {
    for (const sym of symbols) {
      const url = `http://127.0.0.1:${port}${path}?symbol=${sym}`;
      calls.push(
        fetch(url, { headers })
          .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); })
          .catch(err =>
            console.warn(`[IngestionManager] relay ${path}?symbol=${sym}: ${err.message}`)
          )
      );
    }
  }
  await Promise.allSettled(calls);
  console.log(`[IngestionManager] Relay venue poll complete (${calls.length} calls)`);
}

export async function runFullIngest(): Promise<void> {
  if (isIngesting) {
    console.log("[IngestionManager] Skipping - ingest already in progress");
    return;
  }

  isIngesting = true;
  const start = Date.now();
  console.log("[IngestionManager] Starting full ingest...");

  try {
    await Promise.all([
      ingestDepth(),
      ingestFunding(),
      ingestLiquidations(),
    ]);

    recordDepthSnapshot();
    feedDepthToTsleBuffer();

    // Poll passive relay venues so they fetch+record to tsleBuffer (fire-and-forget)
    ingestRelayVenues().catch((err) =>
      console.warn("[IngestionManager] Relay ingest error:", err?.message)
    );

    // Fire-and-forget: evaluate L5F thresholds against active alert rules
    detectAndWriteAlerts().catch((err) =>
      console.warn("[IngestionManager] Alert detection error:", err?.message),
    );

    lastFullIngest = Date.now();
    const elapsed = Date.now() - start;
    console.log(`[IngestionManager] Full ingest completed in ${elapsed}ms`);
  } catch (err: any) {
    console.error("[IngestionManager] Ingest error:", err.message);
  } finally {
    isIngesting = false;
  }
}

export function startIngestionLoop(): void {
  if (ingestInterval) {
    console.log("[IngestionManager] Loop already running");
    return;
  }

  console.log(`[IngestionManager] Starting ingestion loop (${INGEST_INTERVAL_MS}ms interval)`);
  
  runFullIngest();
  
  ingestInterval = setInterval(() => {
    runFullIngest();
  }, INGEST_INTERVAL_MS);
}

export function stopIngestionLoop(): void {
  if (ingestInterval) {
    clearInterval(ingestInterval);
    ingestInterval = null;
    console.log("[IngestionManager] Ingestion loop stopped");
  }
}

export function getIngestionStatus(): {
  isIngesting: boolean;
  lastFullIngest: number;
  lastDepthIngest: number;
  lastFundingIngest: number;
  lastLiquidationIngest: number;
  depthTokens: number;
  fundingTokens: number;
  liquidationTokens: number;
} {
  return {
    isIngesting,
    lastFullIngest,
    lastDepthIngest: getDepthIngestTime(),
    lastFundingIngest: getLastFundingIngestTime(),
    lastLiquidationIngest: getLastLiquidationIngestTime(),
    depthTokens: Object.keys(getDepthCache()).length,
    fundingTokens: Object.keys(getFundingCache()).length,
    liquidationTokens: Object.keys(getLiquidationCache()).length,
  };
}

export function getFullStressReport(): StressResult & { commentary: string } {
  const stress = computeStress();
  const commentary = getStressCommentary(stress);
  return { ...stress, commentary };
}

export function getSummaryReport(): {
  dominantFactor: string;
  marketRegime: string;
  stressScore: number;
  stressRegime: string;
  keyMetrics: {
    btcDepth10bps: number;
    avgFundingRate: number;
    totalLiquidations: number;
    avgSpreadBps: number;
  };
  ts: number;
} {
  const stress = computeStress();
  
  const topDriver = stress.drivers[0];
  const dominantFactor = topDriver 
    ? `${topDriver.category}: ${topDriver.description}`
    : "No significant stress factors";

  const btcDepth = stress.depth["BTC"]?.bands?.["10bps"]?.totalUSD || 0;
  const avgFunding = stress.summary.funding.avgFundingRate;
  const totalLiq = stress.summary.liquidations.totalLiquidations;
  const avgSpread = stress.summary.depth.avgSpreadBps;

  let marketRegime = "NORMAL";
  if (stress.regime === "EXTREME") marketRegime = "CRISIS";
  else if (stress.regime === "HIGH") marketRegime = "STRESSED";
  else if (stress.regime === "MODERATE") marketRegime = "CAUTIOUS";

  return {
    dominantFactor,
    marketRegime,
    stressScore: stress.stressScore,
    stressRegime: stress.regime,
    keyMetrics: {
      btcDepth10bps: btcDepth,
      avgFundingRate: avgFunding,
      totalLiquidations: totalLiq,
      avgSpreadBps: avgSpread,
    },
    ts: Date.now(),
  };
}
