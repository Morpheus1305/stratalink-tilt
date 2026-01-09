// server/services/getLiquidityState.ts
import { tsleBuffer, tsleStateEngine, buildLiquidityState } from "./tsle-buffer";

export function getLiquidityState(venue: string, symbol: string) {
  const buffer = tsleBuffer.getHistory(venue, symbol);
  const stateSnapshot = tsleStateEngine.getState(venue, symbol);
  const trend = tsleBuffer.getTrend(venue, symbol);
  const signals = tsleBuffer.getSignals(venue, symbol);
  const latest = tsleBuffer.getLatest(venue, symbol);

  return buildLiquidityState(
    venue,
    symbol,
    buffer,
    stateSnapshot,
    trend,
    signals,
    latest
  );
}