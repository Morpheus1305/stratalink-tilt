import { ingestDepth, getDepthCache, getLastIngestTime as getDepthIngestTime } from "./depthEngine";
import { ingestFunding, getFundingCache, getLastFundingIngestTime } from "./fundingEngine";
import { ingestLiquidations, getLiquidationCache, getLastLiquidationIngestTime } from "./liquidationEngine";
import { computeStress, getStressCommentary, StressResult } from "./stressEngine";
import { recordDepthSnapshot } from "../../server/services/depthHistoryStore";
import { tsleBuffer } from "../../server/services/tsle-buffer";

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
    if (!["BTC", "ETH", "SOL"].includes(sym)) continue;

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
