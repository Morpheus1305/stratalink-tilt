import { PERP_SYMBOLS } from "../aggregator/config/symbols";
import { tapeStore } from "../../server/services/tapeStore";

function safePushToTape(evt: any) {
  if (evt && tapeStore?.push) {
    try { tapeStore.push(evt); } catch { }
  }
}

/**
 * Liquidation Engine
 * 
 * NOTE: Uses simulated liquidation data for MVP because:
 * - Binance forceOrder API is geo-blocked (451 error in this region)
 * - OKX/Bybit liquidation endpoints require authentication
 * - Real-time liquidation feeds typically need WebSocket connections
 * 
 * The mock generator produces realistic volume patterns based on token size.
 * Replace generateMockLiquidations() with real exchange connectors when available.
 */

export type LiquidationData = {
  longLiquidationsUSD: number;
  shortLiquidationsUSD: number;
  totalLiquidationsUSD: number;
  imbalance: number;
  count: number;
  source: string;
  ts: number;
};

let LIQUIDATION_CACHE: Record<string, LiquidationData> = {};
let LAST_INGEST = 0;

export function getLiquidationCache(): Record<string, LiquidationData> {
  return LIQUIDATION_CACHE;
}

export function getLastLiquidationIngestTime(): number {
  return LAST_INGEST;
}

function generateMockLiquidations(symbol: string): LiquidationData {
  const key = symbol.replace("USDT", "");
  const baseLong = key === "BTC" ? 5000000 : key === "ETH" ? 2000000 : 500000;
  const baseShort = key === "BTC" ? 4500000 : key === "ETH" ? 1800000 : 450000;
  
  const variance = 0.3;
  const longLiq = baseLong * (1 + (Math.random() - 0.5) * variance);
  const shortLiq = baseShort * (1 + (Math.random() - 0.5) * variance);
  const total = longLiq + shortLiq;
  const imbalance = total > 0 ? (longLiq - shortLiq) / total : 0;

  return {
    longLiquidationsUSD: longLiq,
    shortLiquidationsUSD: shortLiq,
    totalLiquidationsUSD: total,
    imbalance,
    count: Math.floor(Math.random() * 500) + 100,
    source: "simulated",
    ts: Date.now(),
  };
}

export async function ingestLiquidations(): Promise<void> {
  const out: Record<string, LiquidationData> = {};

  for (const symbol of PERP_SYMBOLS) {
    const key = symbol.replace("USDT", "");
    
    const data = generateMockLiquidations(symbol);
    out[key] = data;
    
    const totalM = (data.totalLiquidationsUSD / 1_000_000).toFixed(2);
    const imbalanceStr = (data.imbalance * 100).toFixed(1);
    const skew = data.imbalance > 0.1 ? "LONG-HEAVY" : data.imbalance < -0.1 ? "SHORT-HEAVY" : "BALANCED";
    console.log(`[LiquidationEngine] ${key}: $${totalM}M total, ${imbalanceStr}% imbalance (${skew})`);

    safePushToTape({
      id: `imbalance-${key}-${Date.now()}`,
      ts: Date.now(),
      type: "IMBALANCE",
      venue: "unknown" as any,
      symbol: key,
      payload: {
        imbalancePct: data.imbalance,
        totalUsd: data.totalLiquidationsUSD,
      },
    });
  }

  LIQUIDATION_CACHE = out;
  LAST_INGEST = Date.now();
}

export function getLiquidationSummary(): {
  totalLongLiquidations: number;
  totalShortLiquidations: number;
  totalLiquidations: number;
  netImbalance: number;
  liquidationRegime: "LONG_SQUEEZE" | "SHORT_SQUEEZE" | "BALANCED";
} {
  const cache = getLiquidationCache();
  
  let totalLong = 0;
  let totalShort = 0;
  
  for (const key of Object.keys(cache)) {
    totalLong += cache[key].longLiquidationsUSD;
    totalShort += cache[key].shortLiquidationsUSD;
  }
  
  const total = totalLong + totalShort;
  const netImbalance = total > 0 ? (totalLong - totalShort) / total : 0;
  
  let regime: "LONG_SQUEEZE" | "SHORT_SQUEEZE" | "BALANCED" = "BALANCED";
  if (netImbalance > 0.2) regime = "LONG_SQUEEZE";
  else if (netImbalance < -0.2) regime = "SHORT_SQUEEZE";

  return {
    totalLongLiquidations: totalLong,
    totalShortLiquidations: totalShort,
    totalLiquidations: total,
    netImbalance,
    liquidationRegime: regime,
  };
}
