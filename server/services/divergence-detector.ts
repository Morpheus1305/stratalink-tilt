/**
 * VENUE DIVERGENCE DETECTOR
 * 
 * Detects regime signals when Reference and Stress venues show
 * materially different liquidity conditions.
 * 
 * Core principle: Divergence between venue types is itself a signal.
 * - Reference STABLE + Stress FRAGILE = Early warning (leverage stress building)
 * - Both FRAGILE = Confirmed cross-venue stress
 * - Stress STABLE + Reference FRAGILE = Rare spot-specific issue
 */

import { DIVERGENCE_THRESHOLDS } from "../../shared/venue-config";

export interface VenueSnapshot {
  venue: string;
  poli: number;
  depth25: number;
  depth50: number;
  spreadBps: number;
  imbalance2550: number;
  tsleState: string;
  timestamp: number;
}

export interface DivergenceSignal {
  type: "POLI" | "DEPTH" | "SPREAD" | "IMBALANCE" | "STATE";
  severity: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  referenceVenue: string;
  stressVenue: string;
  referenceValue: number | string;
  stressValue: number | string;
  delta: number;
  threshold: number;
  message: string;
  timestamp: number;
}

export interface DivergenceReport {
  hasDivergence: boolean;
  signals: DivergenceSignal[];
  summary: string;
  regime: "NORMAL" | "EARLY_WARNING" | "STRESS_BUILDING" | "CONFIRMED_STRESS";
  timestamp: number;
}

/**
 * Compare two venue snapshots and detect divergence signals
 */
export function detectDivergence(
  referenceSnapshot: VenueSnapshot,
  stressSnapshot: VenueSnapshot
): DivergenceSignal[] {
  const signals: DivergenceSignal[] = [];
  const now = Date.now();

  // PoLi Divergence
  const poliDelta = Math.abs(referenceSnapshot.poli - stressSnapshot.poli);
  if (poliDelta >= DIVERGENCE_THRESHOLDS.poliDivergence) {
    const severity = poliDelta >= 30 ? "CRITICAL" : poliDelta >= 20 ? "HIGH" : "MODERATE";
    signals.push({
      type: "POLI",
      severity,
      referenceVenue: referenceSnapshot.venue,
      stressVenue: stressSnapshot.venue,
      referenceValue: referenceSnapshot.poli,
      stressValue: stressSnapshot.poli,
      delta: poliDelta,
      threshold: DIVERGENCE_THRESHOLDS.poliDivergence,
      message: `PoLi divergence: ${referenceSnapshot.venue} (${referenceSnapshot.poli}) vs ${stressSnapshot.venue} (${stressSnapshot.poli})`,
      timestamp: now,
    });
  }

  // Depth Divergence (using depth50 as primary metric)
  const avgRefDepth = (referenceSnapshot.depth25 + referenceSnapshot.depth50) / 2;
  const avgStressDepth = (stressSnapshot.depth25 + stressSnapshot.depth50) / 2;
  const depthRatio = avgRefDepth > 0 ? Math.abs(avgRefDepth - avgStressDepth) / avgRefDepth : 0;
  
  if (depthRatio >= DIVERGENCE_THRESHOLDS.depthDivergence) {
    const severity = depthRatio >= 0.5 ? "HIGH" : "MODERATE";
    signals.push({
      type: "DEPTH",
      severity,
      referenceVenue: referenceSnapshot.venue,
      stressVenue: stressSnapshot.venue,
      referenceValue: avgRefDepth,
      stressValue: avgStressDepth,
      delta: depthRatio * 100,
      threshold: DIVERGENCE_THRESHOLDS.depthDivergence * 100,
      message: `Depth divergence: ${(depthRatio * 100).toFixed(0)}% difference between venues`,
      timestamp: now,
    });
  }

  // Spread Divergence
  // Note: Only check spread divergence when we have actual spread data (non-zero values)
  // TSLEPoint doesn't currently store spread, so this check is skipped until data is available
  const hasSpreadData = referenceSnapshot.spreadBps > 0 || stressSnapshot.spreadBps > 0;
  if (hasSpreadData) {
    const spreadDelta = Math.abs(referenceSnapshot.spreadBps - stressSnapshot.spreadBps);
    if (spreadDelta >= DIVERGENCE_THRESHOLDS.spreadDivergence) {
      const severity = spreadDelta >= 15 ? "HIGH" : spreadDelta >= 10 ? "MODERATE" : "LOW";
      signals.push({
        type: "SPREAD",
        severity,
        referenceVenue: referenceSnapshot.venue,
        stressVenue: stressSnapshot.venue,
        referenceValue: referenceSnapshot.spreadBps,
        stressValue: stressSnapshot.spreadBps,
        delta: spreadDelta,
        threshold: DIVERGENCE_THRESHOLDS.spreadDivergence,
        message: `Spread divergence: ${spreadDelta.toFixed(1)}bps gap between venues`,
        timestamp: now,
      });
    }
  }

  // Imbalance Divergence
  const imbalanceDelta = Math.abs(referenceSnapshot.imbalance2550 - stressSnapshot.imbalance2550);
  if (imbalanceDelta >= DIVERGENCE_THRESHOLDS.imbalanceDivergence) {
    const severity = imbalanceDelta >= 0.4 ? "HIGH" : "MODERATE";
    signals.push({
      type: "IMBALANCE",
      severity,
      referenceVenue: referenceSnapshot.venue,
      stressVenue: stressSnapshot.venue,
      referenceValue: referenceSnapshot.imbalance2550,
      stressValue: stressSnapshot.imbalance2550,
      delta: imbalanceDelta * 100,
      threshold: DIVERGENCE_THRESHOLDS.imbalanceDivergence * 100,
      message: `Imbalance divergence: ${(imbalanceDelta * 100).toFixed(0)}% difference`,
      timestamp: now,
    });
  }

  // State Divergence (qualitative)
  const stableStates = ["STABLE", "STRENGTHENING"];
  const stressStates = ["FRAGILE", "DISLOCATED", "THINNING"];
  
  const refIsStable = stableStates.includes(referenceSnapshot.tsleState);
  const stressIsStable = stableStates.includes(stressSnapshot.tsleState);
  const refIsStress = stressStates.includes(referenceSnapshot.tsleState);
  const stressIsStress = stressStates.includes(stressSnapshot.tsleState);

  if (refIsStable && stressIsStress) {
    signals.push({
      type: "STATE",
      severity: stressSnapshot.tsleState === "DISLOCATED" ? "CRITICAL" : "HIGH",
      referenceVenue: referenceSnapshot.venue,
      stressVenue: stressSnapshot.venue,
      referenceValue: referenceSnapshot.tsleState,
      stressValue: stressSnapshot.tsleState,
      delta: 0,
      threshold: 0,
      message: `State divergence: ${referenceSnapshot.venue} ${referenceSnapshot.tsleState} but ${stressSnapshot.venue} ${stressSnapshot.tsleState}`,
      timestamp: now,
    });
  }

  return signals;
}

/**
 * Generate a divergence report from signals
 * 
 * Regime classification follows doctrine principles:
 * - NORMAL: No signals or only MODERATE/LOW severity signals
 * - EARLY_WARNING: At least one HIGH-severity signal or STATE divergence
 * - STRESS_BUILDING: STATE divergence with HIGH-severity signals
 * - CONFIRMED_STRESS: CRITICAL signals or multiple HIGH signals
 */
export function generateDivergenceReport(signals: DivergenceSignal[]): DivergenceReport {
  const now = Date.now();

  if (signals.length === 0) {
    return {
      hasDivergence: false,
      signals: [],
      summary: "No cross-venue divergence detected. Venues are aligned.",
      regime: "NORMAL",
      timestamp: now,
    };
  }

  // Determine regime based on signals
  const hasCritical = signals.some(s => s.severity === "CRITICAL");
  const hasHigh = signals.some(s => s.severity === "HIGH");
  const hasStateDivergence = signals.some(s => s.type === "STATE");
  const highCount = signals.filter(s => s.severity === "HIGH").length;
  const signalCount = signals.length;

  let regime: DivergenceReport["regime"];
  let summary: string;

  if (hasCritical || (hasHigh && highCount >= 3)) {
    // Critical or multiple high-severity signals = confirmed stress
    regime = "CONFIRMED_STRESS";
    summary = "Critical cross-venue stress detected. Multiple venues showing divergent conditions.";
  } else if (hasStateDivergence && hasHigh) {
    // State divergence with high signals = stress building
    regime = "STRESS_BUILDING";
    summary = "Stress building in leverage venues. Reference venues still stable.";
  } else if (hasStateDivergence || hasHigh) {
    // State divergence or high signals alone = early warning
    regime = "EARLY_WARNING";
    summary = "Early warning: significant divergence detected between reference and stress venues.";
  } else {
    // Only MODERATE/LOW signals = remain NORMAL but note minor divergence
    regime = "NORMAL";
    summary = `Minor divergence detected: ${signalCount} moderate signal(s). Venues substantially aligned.`;
  }

  return {
    hasDivergence: regime !== "NORMAL", // Only flag hasDivergence for non-NORMAL regimes
    signals,
    summary,
    regime,
    timestamp: now,
  };
}

/**
 * Compute PoLi from depth bands
 */
export function computePoliFromDepth(depth25: number, depth50: number): number {
  if (depth25 <= 0 || depth50 <= 0) return 0;
  
  const ratio = depth25 / depth50;
  const balanceScore = Math.min(100, ratio * 100);
  const depthScore = Math.min(100, (depth25 / 1000000) * 10);
  
  return Math.round((balanceScore * 0.6 + depthScore * 0.4));
}

/**
 * Compute imbalance from bid/ask depths
 */
export function computeImbalance(bidDepth: number, askDepth: number): number {
  const total = bidDepth + askDepth;
  if (total <= 0) return 0;
  return (bidDepth - askDepth) / total;
}
