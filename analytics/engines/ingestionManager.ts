import { ingestDepth, getDepthCache, getLastIngestTime as getDepthIngestTime } from "./depthEngine";
import { ingestFunding, getFundingCache, getLastFundingIngestTime } from "./fundingEngine";
import { ingestLiquidations, getLiquidationCache, getLastLiquidationIngestTime } from "./liquidationEngine";
import { computeStress, getStressCommentary, StressResult } from "./stressEngine";
import { recordDepthSnapshot } from "../../server/services/depthHistoryStore";
import { appendDactEvent } from "../../server/services/dact-tape";
import { cleanseAndFeedBuffer } from "../../server/services/dact-cleanse";
import { computeAnalyticsSnapshot } from "../../server/services/analytics-layer";
import { evaluateAndNotify } from "../../server/services/alert-service";
import { pushIngestCycleAlerts } from "../../server/services/liveAlertsService";
import type { DivergenceReport, DivergenceSignal } from "../../server/services/divergence-detector";

let isIngesting = false;
let lastFullIngest = 0;
let ingestInterval: NodeJS.Timeout | null = null;

const INGEST_INTERVAL_MS = 5000;

/**
 * Normalise a relay response `bands` object into a consistent keyed map,
 * handling all three band-key formats used across relay routes:
 *   "pct_0.25" (dot)  |  "pct_0_25" (underscore)  |  "25bps" (legacy CEX)
 */
function extractRelayBands(rawBands: any): Record<string, { bid: number; ask: number; total: number }> {
  const result: Record<string, { bid: number; ask: number; total: number }> = {};
  if (!rawBands) return result;

  const specs: Array<{ key: string; alts: string[] }> = [
    { key: "pct_0.1",  alts: ["pct_0_1",  "10bps"]  },
    { key: "pct_0.25", alts: ["pct_0_25", "25bps"]  },
    { key: "pct_0.5",  alts: ["pct_0_5",  "50bps"]  },
    { key: "pct_1.0",  alts: ["pct_1_0",  "100bps"] },
    { key: "pct_2.0",  alts: ["pct_2_0",  "200bps"] },
  ];

  for (const { key, alts } of specs) {
    const entry = rawBands[key] ?? rawBands[alts[0]] ?? rawBands[alts[1]] ?? null;
    if (entry) {
      const bid   = entry.bid_notional  ?? entry.bidUSD  ?? 0;
      const ask   = entry.ask_notional  ?? entry.askUSD  ?? 0;
      const total = entry.total_notional ?? entry.totalUSD ?? (bid + ask);
      result[key] = { bid, ask, total };
    } else {
      result[key] = { bid: 0, ask: 0, total: 0 };
    }
  }
  return result;
}

/**
 * Write core-venue DEPTH_CACHE entries to the DACT tape only.
 * DACT is the sole write target from ingestion. tsleBuffer is no longer
 * written directly — it is populated downstream by cleanseAndFeedBuffer().
 *
 * Payload carries full per-band bid/ask/total so the cleansing stage has
 * everything it needs to convert to LISSnapshot format.
 */
function feedDepthToDact(): void {
  const cache = getDepthCache();
  const now = Date.now();

  for (const [symbol, depth] of Object.entries(cache)) {
    const sym = symbol.toUpperCase();
    const b = depth.bands as any;

    const venue     = depth.source || "binance";
    const timestamp = depth.ts || now;
    const midPrice  = depth.mid ?? 0;
    const spreadBps = depth.spreadBps ?? 0;

    const b10  = b["10bps"]  ?? {};
    const b25  = b["25bps"]  ?? {};
    const b50  = b["50bps"]  ?? {};
    const b100 = b["100bps"] ?? {};
    const b200 = b["200bps"] ?? {};

    appendDactEvent({
      timestamp,
      eventType: "DEPTH_UPDATE",
      venue,
      asset: sym,
      summary: `mid=$${midPrice?.toFixed(2) ?? "?"} spread=${spreadBps?.toFixed(1) ?? "?"}bps`,
      payload: {
        mid_price:       midPrice,
        spread_bps:      spreadBps,
        // Full per-band notional — required by dact-cleanse → tsleBuffer conversion
        depth_10bps:     b10.totalUSD  ?? 0,
        depth_bid_10bps: b10.bidUSD    ?? 0,
        depth_ask_10bps: b10.askUSD    ?? 0,
        depth_25bps:     b25.totalUSD  ?? 0,
        depth_bid_25bps: b25.bidUSD    ?? 0,
        depth_ask_25bps: b25.askUSD    ?? 0,
        depth_50bps:     b50.totalUSD  ?? 0,
        depth_bid_50bps: b50.bidUSD    ?? 0,
        depth_ask_50bps: b50.askUSD    ?? 0,
        depth_100bps:    b100.totalUSD ?? 0,
        depth_bid_100bps:b100.bidUSD   ?? 0,
        depth_ask_100bps:b100.askUSD   ?? 0,
        depth_200bps:    b200.totalUSD ?? 0,
        depth_bid_200bps:b200.bidUSD   ?? 0,
        depth_ask_200bps:b200.askUSD   ?? 0,
      },
      provenance: {
        sourceVenue: venue,
        transport:   "direct",
        engine:      "ingestionManager-v1.1",
        dactVersion: "1.1",
        latencyMs:   0,
      },
    });
  }
}

const TRACKED_SYMBOLS = [
  'BTC', 'ETH', 'USDT', 'USDC', 'DAI',
  'BNB', 'CRO', 'OKB', 'UNI', 'CAKE',
  'LINK', 'AAVE', 'MKR', 'SNX', 'COMP',
  'SOL', 'XRP', 'DOGE', 'ADA', 'AVAX',
  // extended
  'TON', 'USDE', 'HYPE',
  // Digital Securities & RWA — Phase 1
  'PAXG', 'XAUT', 'ONDO', 'BUIDL', 'OUSG',
  // Digital Securities & RWA — Phase 2 (security token exchange assets)
  'BENJI', 'VBILL', 'USDY', 'BCSPX', 'BIB01', 'ACRED',
];

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

// ILU-25 symbol groups used across relay venues
const ILU_BYBIT_SYMBOLS   = ["BTC", "ETH", "SOL", "XRP", "DOGE", "BNB", "ADA", "AVAX",
                              "LINK", "MKR", "AAVE", "UNI", "OKB", "CRO",
                              "USDC", "DAI", "USDT", "COMP", "SNX", "CAKE",
                              "TON", "USDE", "HYPE",
                              "PAXG", "XAUT", "ONDO"];
const ILU_DYDX_SYMBOLS    = ["BTC", "ETH", "SOL", "XRP", "DOGE", "BNB", "ADA", "AVAX",
                              "LINK", "MKR", "AAVE", "UNI", "COMP", "SNX", "TON"];
const ILU_HL_SYMBOLS      = ["BTC", "ETH", "SOL", "XRP", "DOGE", "BNB", "ADA", "AVAX",
                              "LINK", "MKR", "AAVE", "UNI", "COMP", "SNX", "TON", "HYPE"];
const ILU_OKX_SYMBOLS     = ["BTC", "ETH", "SOL", "XRP", "ADA", "AVAX", "LINK", "DOGE",
                              "BNB", "OKB", "CRO", "UNI", "CAKE",
                              "AAVE", "MKR", "SNX", "COMP", "DAI",
                              "TON", "USDE", "HYPE",
                              "PAXG", "XAUT", "ONDO"];
const ILU_BITGET_SYMBOLS  = ["BTC", "ETH", "SOL", "XRP", "DOGE", "BNB", "AVAX",
                              "LINK", "ADA", "UNI", "MKR", "AAVE", "COMP", "SNX",
                              "CAKE", "CRO", "OKB", "USDC", "DAI",
                              "TON", "USDE", "HYPE",
                              "PAXG", "XAUT", "ONDO"];
const ILU_GMX_SYMBOLS     = ["BTC", "ETH", "SOL", "LINK", "UNI"];
const ILU_CURVE_SYMBOLS   = ["BTC", "ETH", "USDC", "USDT", "DAI", "USDE"];
const ILU_UNISWAP_SYMBOLS = ["BTC", "ETH", "LINK", "UNI", "AAVE", "MKR", "COMP", "DAI", "USDC", "USDT", "USDE",
                              "PAXG", "XAUT", "ONDO", "BUIDL", "OUSG"];
const ILU_OTC_SYMBOLS     = ["BTC", "ETH", "SOL", "XRP", "DOGE", "BNB", "ADA", "AVAX",
                              "LINK", "MKR", "AAVE", "UNI", "OKB", "CRO",
                              "USDT", "USDC", "DAI", "COMP", "SNX", "CAKE",
                              "TON"];

// Phase 2 — Security Token Exchange symbol groups
const ILU_SECURITIZE_SYMBOLS = ["BUIDL", "OUSG", "ACRED"];
const ILU_ARCHAX_SYMBOLS     = ["BUIDL", "OUSG", "BENJI", "VBILL", "BCSPX", "BIB01"];
const ILU_INX_SYMBOLS        = ["ONDO", "BUIDL"];
const ILU_TZERO_SYMBOLS      = ["ONDO", "BUIDL"];
const ILU_SDX_SYMBOLS        = ["BCSPX", "BIB01", "BUIDL"];
const ILU_ADDX_SYMBOLS       = ["BUIDL", "OUSG", "BENJI", "USDY"];

// L2 DEX symbol groups — kept narrow (top-liquidity pairs only) to avoid
// overwhelming the ingest loop with slow DeFiLlama/Graph calls.
const ILU_AERODROME_SYMBOLS      = ["ETH", "BTC", "USDC"];
const ILU_VELODROME_SYMBOLS      = ["ETH", "BTC", "USDC", "USDT"];
const ILU_PANCAKESWAP_SYMBOLS    = ["BNB", "ETH", "BTC", "USDT", "USDC"];
const ILU_WORLDCHAIN_SYMBOLS     = ["ETH", "USDC"];
const ILU_SYNCSWAP_SYMBOLS       = ["ETH", "BTC", "USDC"];
const ILU_LINEA_SYMBOLS          = ["ETH", "BTC", "USDC"];
const ILU_SCROLL_SYMBOLS         = ["ETH", "BTC", "USDC"];

const RELAY_VENUES: { path: string; symbols: string[] }[] = [
  { path: "/api/bybit/spot/depth",        symbols: ILU_BYBIT_SYMBOLS   },
  { path: "/api/bitget/spot/depth",       symbols: ILU_BITGET_SYMBOLS  },
  { path: "/api/okx/spot/depth",          symbols: ILU_OKX_SYMBOLS     },
  { path: "/api/dydx/perps/depth",        symbols: ILU_DYDX_SYMBOLS    },
  { path: "/api/hyperliquid/perps/depth", symbols: ILU_HL_SYMBOLS      },
  { path: "/api/gmx/perps/depth",         symbols: ILU_GMX_SYMBOLS     },
  { path: "/api/deribit/spot/depth",      symbols: ["BTC", "ETH"]      },
  { path: "/api/uniswap/spot/depth",      symbols: ILU_UNISWAP_SYMBOLS },
  { path: "/api/curve/spot/depth",        symbols: ILU_CURVE_SYMBOLS   },
  { path: "/api/otc/spot/depth",          symbols: ILU_OTC_SYMBOLS     },
  // L2 DEX relays (Base, Optimism, BSC, WorldChain, zkSync, Linea, Scroll)
  { path: "/api/aerodrome/spot/depth",         symbols: ILU_AERODROME_SYMBOLS   },
  { path: "/api/velodrome/spot/depth",         symbols: ILU_VELODROME_SYMBOLS   },
  { path: "/api/pancakeswap/spot/depth",       symbols: ILU_PANCAKESWAP_SYMBOLS },
  { path: "/api/uniswap-worldchain/spot/depth",symbols: ILU_WORLDCHAIN_SYMBOLS  },
  { path: "/api/syncswap/spot/depth",          symbols: ILU_SYNCSWAP_SYMBOLS    },
  { path: "/api/linea-dex/spot/depth",         symbols: ILU_LINEA_SYMBOLS       },
  { path: "/api/scroll-dex/spot/depth",        symbols: ILU_SCROLL_SYMBOLS      },
  // Phase 2 — Security Token Exchange Relays
  { path: "/api/securitize/spot/depth",   symbols: ILU_SECURITIZE_SYMBOLS },
  { path: "/api/archax/spot/depth",       symbols: ILU_ARCHAX_SYMBOLS     },
  { path: "/api/inx/spot/depth",          symbols: ILU_INX_SYMBOLS        },
  { path: "/api/tzero/spot/depth",        symbols: ILU_TZERO_SYMBOLS      },
  { path: "/api/sdx/spot/depth",          symbols: ILU_SDX_SYMBOLS        },
  { path: "/api/addx/spot/depth",         symbols: ILU_ADDX_SYMBOLS       },
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
          .then(async r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const data = await r.json() as Record<string, any>;
            if (data?.ok) {
              const venueId   = String(data.venue ?? path.split("/")[2] ?? "unknown").toLowerCase();
              const midPrice  = data.mid_price != null ? Number(data.mid_price) : 0;
              const spreadBps = data.spread?.bps != null ? Number(data.spread.bps) : 0;
              const bands     = extractRelayBands(data.bands);

              appendDactEvent({
                timestamp: Date.now(),
                eventType: "DEPTH_UPDATE",
                venue: venueId,
                asset: sym,
                summary: `mid=${midPrice ? "$" + midPrice.toFixed(2) : "?"} spread=${spreadBps ? spreadBps.toFixed(1) + "bps" : "?"}`,
                payload: {
                  mid_price:       midPrice,
                  spread_bps:      spreadBps,
                  // Full per-band notional — required by dact-cleanse → tsleBuffer conversion
                  depth_10bps:     bands["pct_0.1"]?.total  ?? 0,
                  depth_bid_10bps: bands["pct_0.1"]?.bid    ?? 0,
                  depth_ask_10bps: bands["pct_0.1"]?.ask    ?? 0,
                  depth_25bps:     bands["pct_0.25"]?.total ?? 0,
                  depth_bid_25bps: bands["pct_0.25"]?.bid   ?? 0,
                  depth_ask_25bps: bands["pct_0.25"]?.ask   ?? 0,
                  depth_50bps:     bands["pct_0.5"]?.total  ?? 0,
                  depth_bid_50bps: bands["pct_0.5"]?.bid    ?? 0,
                  depth_ask_50bps: bands["pct_0.5"]?.ask    ?? 0,
                  depth_100bps:    bands["pct_1.0"]?.total  ?? 0,
                  depth_bid_100bps:bands["pct_1.0"]?.bid    ?? 0,
                  depth_ask_100bps:bands["pct_1.0"]?.ask    ?? 0,
                  depth_200bps:    bands["pct_2.0"]?.total  ?? 0,
                  depth_bid_200bps:bands["pct_2.0"]?.bid    ?? 0,
                  depth_ask_200bps:bands["pct_2.0"]?.ask    ?? 0,
                },
                provenance: {
                  sourceVenue: String(data.provenance?.sourceVenue ?? venueId),
                  transport:   String(data.provenance?.transport ?? "relay"),
                  engine:      "ingestionManager-v1.1",
                  dactVersion: "1.1",
                  latencyMs:   typeof data.provenance?.latencyMs === "number" ? data.provenance.latencyMs : 0,
                },
              });
            }
          })
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

    // Change 1: DACT is now the single write target from ingestion.
    // feedDepthToDact() writes core-venue depth to DACT only (no tsleBuffer write).
    // cleanseAndFeedBuffer() reads new DACT events, applies STRATA AI cleansing,
    // and feeds only observed, non-manipulative events into tsleBuffer.
    feedDepthToDact();
    cleanseAndFeedBuffer();

    // Relay venues write to DACT asynchronously (fire-and-forget).
    // Their events will be picked up by cleanseAndFeedBuffer() on the next cycle.
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
    console.error("[IngestionManager] Ingest error:", err instanceof Error ? err.message : String(err));
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
