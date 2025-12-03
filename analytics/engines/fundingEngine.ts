import { fetchBybitPerpTicker } from "../aggregator/exchanges/bybit";
import { fetchOKXFundingRate } from "../aggregator/exchanges/okx";
import { PERP_SYMBOLS } from "../aggregator/config/symbols";

export type FundingData = {
  fundingRate: number;
  fundingRateAnnualized: number;
  markPrice: number;
  nextFundingTime: number;
  openInterest?: number;
  openInterestValue?: number;
  source: string;
  ts: number;
};

let FUNDING_CACHE: Record<string, FundingData> = {};
let LAST_INGEST = 0;

export function getFundingCache(): Record<string, FundingData> {
  return FUNDING_CACHE;
}

export function getLastFundingIngestTime(): number {
  return LAST_INGEST;
}

async function fetchFundingFromBybit(symbol: string): Promise<FundingData | null> {
  try {
    const data = await fetchBybitPerpTicker(symbol);
    const fundingRate = data.fundingRate;
    return {
      fundingRate,
      fundingRateAnnualized: fundingRate * 3 * 365 * 100,
      markPrice: data.markPrice,
      nextFundingTime: data.nextFundingTime,
      openInterest: data.openInterest,
      openInterestValue: data.openInterestValue,
      source: "bybit",
      ts: Date.now(),
    };
  } catch {
    return null;
  }
}

async function fetchFundingFromOKX(symbol: string): Promise<FundingData | null> {
  try {
    const okxSymbol = symbol.replace("USDT", "-USDT-SWAP");
    const data = await fetchOKXFundingRate(okxSymbol);
    return {
      fundingRate: data.fundingRate,
      fundingRateAnnualized: data.fundingRate * 3 * 365 * 100,
      markPrice: 0,
      nextFundingTime: data.nextFundingTime,
      source: "okx",
      ts: Date.now(),
    };
  } catch {
    return null;
  }
}

export async function ingestFunding(): Promise<void> {
  const out: Record<string, FundingData> = {};

  for (const symbol of PERP_SYMBOLS) {
    const key = symbol.replace("USDT", "");
    
    let data = await fetchFundingFromBybit(symbol);
    if (!data) {
      data = await fetchFundingFromOKX(symbol);
    }

    if (data) {
      out[key] = data;
      const frDisplay = (data.fundingRate * 100).toFixed(4);
      const annualized = data.fundingRateAnnualized.toFixed(2);
      console.log(`[FundingEngine] ${key}: Rate ${frDisplay}% (${annualized}% APR) via ${data.source}`);
    } else {
      console.debug(`[FundingEngine] No funding data for ${symbol}`);
    }
  }

  FUNDING_CACHE = out;
  LAST_INGEST = Date.now();
}

export function getFundingSummary(): {
  avgFundingRate: number;
  maxFundingRate: number;
  minFundingRate: number;
  totalOpenInterest: number;
  fundingRegime: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
} {
  const cache = getFundingCache();
  const rates = Object.values(cache).map((f) => f.fundingRate);
  
  if (!rates.length) {
    return {
      avgFundingRate: 0,
      maxFundingRate: 0,
      minFundingRate: 0,
      totalOpenInterest: 0,
      fundingRegime: "NEUTRAL",
    };
  }

  const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
  const max = Math.max(...rates);
  const min = Math.min(...rates);
  const totalOI = Object.values(cache).reduce(
    (acc, f) => acc + (f.openInterestValue || 0),
    0
  );

  let regime: "POSITIVE" | "NEGATIVE" | "NEUTRAL" = "NEUTRAL";
  if (avg > 0.0001) regime = "POSITIVE";
  else if (avg < -0.0001) regime = "NEGATIVE";

  return {
    avgFundingRate: avg,
    maxFundingRate: max,
    minFundingRate: min,
    totalOpenInterest: totalOI,
    fundingRegime: regime,
  };
}
