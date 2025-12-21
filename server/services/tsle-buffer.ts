// TSLE — Time-Series Liquidity Engine
// In-memory ring buffer for rolling liquidity history
// Venue: Binance only | Market: Spot only | No persistence

// ============================================================================
// TSLE INVARIANT — DO NOT VIOLATE
// ============================================================================
// TSLE is liquidity-native by definition.
// It tracks execution quality and liquidity regime over time.
//
// ALLOWED INPUTS:
//   - PoLi score (derived from depth/balance/spread)
//   - Depth bands (10bps, 25bps, 50bps, 100bps, 200bps)
//   - Bid/ask imbalance ratios
//   - Regime flags (stable, fragile, strengthening, critical)
//   - Fragility signals (depth erosion, PoLi drops)
//
// FORBIDDEN INPUTS:
//   - Price (spot, mid, mark, index)
//   - Returns or price changes
//   - Volatility metrics
//   - OHLC / candlestick data
//   - Any price-derived indicator
//
// Price may NEVER be a direct or indirect TSLE input.
// ============================================================================

interface TSLEPoint {
  ts: number;           // epoch ms
  depth25: number;      // total executable depth @ 25 bps (USD)
  depth50: number;      // total executable depth @ 50 bps (USD)
  imbalance2550: number; // avg imbalance across 25–50 bps (-1 to 1)
  poli: number;         // derived PoLi score (0–100)
}

interface LISBand {
  bid_notional?: number;
  ask_notional?: number;
  total_notional?: number;
}

interface LISSnapshot {
  venue: string;
  symbol: string;
  timestamp: number;
  mid_price: number;
  spread?: {
    absolute?: number;
    bps?: number;
  };
  bands?: Record<string, LISBand>;
}

// TSLE Memory: Rolling buffer per (venue, symbol)
// Retention: last N = 10 snapshots (no persistence)
const BUFFER_SIZE = 10;

class TSLEBuffer {
  private buffers: Map<string, TSLEPoint[]> = new Map();

  private getKey(venue: string, symbol: string): string {
    return `${venue.toLowerCase()}:${symbol.toUpperCase()}`;
  }

  private computePoLi(depth25: number, depth50: number, imbalance: number, spreadBps: number): number {
    // PoLi Score Computation (0–100)
    // Based on: depth quality (40 pts) + balance (35 pts) + spread penalty (25 pts)
    
    // Depth quality score (0–40)
    const totalDepth = depth25 + depth50;
    let depthScore = 0;
    if (totalDepth >= 10_000_000) depthScore = 40;
    else if (totalDepth >= 5_000_000) depthScore = 35;
    else if (totalDepth >= 2_000_000) depthScore = 28;
    else if (totalDepth >= 1_000_000) depthScore = 20;
    else if (totalDepth >= 500_000) depthScore = 12;
    else depthScore = Math.max(0, Math.floor((totalDepth / 500_000) * 12));

    // Balance score (0–35) - penalize imbalance
    const absImbalance = Math.abs(imbalance);
    let balanceScore = 35;
    if (absImbalance > 0.5) balanceScore = 10;
    else if (absImbalance > 0.3) balanceScore = 20;
    else if (absImbalance > 0.15) balanceScore = 28;
    else balanceScore = 35;

    // Spread penalty (0–25)
    let spreadScore = 25;
    if (spreadBps > 10) spreadScore = 5;
    else if (spreadBps > 5) spreadScore = 15;
    else if (spreadBps > 2) spreadScore = 20;
    else spreadScore = 25;

    return Math.min(100, Math.max(0, depthScore + balanceScore + spreadScore));
  }

  private computeImbalance(bands: Record<string, LISBand> | undefined): { depth25: number; depth50: number; imbalance: number } {
    if (!bands) {
      return { depth25: 0, depth50: 0, imbalance: 0 };
    }

    // Get 25 bps band
    const band25 = bands["pct_0.25"] || bands["pct_0_25"];
    const bid25 = band25?.bid_notional ?? 0;
    const ask25 = band25?.ask_notional ?? 0;
    const depth25 = band25?.total_notional ?? (bid25 + ask25);

    // Get 50 bps band
    const band50 = bands["pct_0.5"] || bands["pct_0_5"];
    const bid50 = band50?.bid_notional ?? 0;
    const ask50 = band50?.ask_notional ?? 0;
    const depth50 = band50?.total_notional ?? (bid50 + ask50);

    // Calculate imbalance across 25-50 bps
    // Imbalance = (bid - ask) / (bid + ask), ranges from -1 (all asks) to 1 (all bids)
    const totalBid = bid25 + bid50;
    const totalAsk = ask25 + ask50;
    const total = totalBid + totalAsk;
    const imbalance = total > 0 ? (totalBid - totalAsk) / total : 0;

    return { depth25, depth50, imbalance };
  }

  public record(snapshot: LISSnapshot): TSLEPoint | null {
    // Only process Binance spot for now
    if (snapshot.venue.toLowerCase() !== "binance") {
      return null;
    }

    const key = this.getKey(snapshot.venue, snapshot.symbol);
    const { depth25, depth50, imbalance } = this.computeImbalance(snapshot.bands);
    const spreadBps = snapshot.spread?.bps ?? 0;
    const poli = this.computePoLi(depth25, depth50, imbalance, spreadBps);

    const point: TSLEPoint = {
      ts: snapshot.timestamp || Date.now(),
      depth25,
      depth50,
      imbalance2550: Math.round(imbalance * 1000) / 1000, // 3 decimal precision
      poli,
    };

    // Get or create buffer
    let buffer = this.buffers.get(key);
    if (!buffer) {
      buffer = [];
      this.buffers.set(key, buffer);
    }

    // Ring buffer: remove oldest if at capacity
    if (buffer.length >= BUFFER_SIZE) {
      buffer.shift();
    }

    buffer.push(point);

    console.log(`[TSLE] Recorded ${key}: depth25=$${(depth25/1e6).toFixed(2)}M, poli=${poli}`);

    return point;
  }

  public getHistory(venue: string, symbol: string, limit?: number): TSLEPoint[] {
    const key = this.getKey(venue, symbol);
    const buffer = this.buffers.get(key) || [];
    
    if (limit && limit < buffer.length) {
      return buffer.slice(-limit);
    }
    
    return [...buffer];
  }

  public getLatest(venue: string, symbol: string): TSLEPoint | null {
    const key = this.getKey(venue, symbol);
    const buffer = this.buffers.get(key);
    
    if (!buffer || buffer.length === 0) {
      return null;
    }
    
    return buffer[buffer.length - 1];
  }

  public getStats(venue: string, symbol: string): {
    count: number;
    oldestTs: number | null;
    newestTs: number | null;
    avgPoli: number | null;
    minPoli: number | null;
    maxPoli: number | null;
  } {
    const key = this.getKey(venue, symbol);
    const buffer = this.buffers.get(key) || [];

    if (buffer.length === 0) {
      return {
        count: 0,
        oldestTs: null,
        newestTs: null,
        avgPoli: null,
        minPoli: null,
        maxPoli: null,
      };
    }

    const poliValues = buffer.map(p => p.poli);
    const sum = poliValues.reduce((a, b) => a + b, 0);

    return {
      count: buffer.length,
      oldestTs: buffer[0].ts,
      newestTs: buffer[buffer.length - 1].ts,
      avgPoli: Math.round((sum / buffer.length) * 10) / 10,
      minPoli: Math.min(...poliValues),
      maxPoli: Math.max(...poliValues),
    };
  }

  public getBufferKeys(): string[] {
    return Array.from(this.buffers.keys());
  }

  // Trend Detection Methods

  public getTrend(venue: string, symbol: string, windowSize: number = 12): TSLETrend {
    const key = this.getKey(venue, symbol);
    const buffer = this.buffers.get(key) || [];

    if (buffer.length < 3) {
      return {
        direction: "insufficient_data",
        poliChange: 0,
        poliVelocity: 0,
        depthChange: 0,
        depthVelocity: 0,
        imbalanceShift: 0,
        momentum: "neutral",
        confidence: 0,
      };
    }

    // Use last N points or all if less than windowSize
    const window = buffer.slice(-Math.min(windowSize, buffer.length));
    
    // De-duplicate timestamps (keep last occurrence)
    const uniqueWindow: TSLEPoint[] = [];
    const seenTs = new Set<number>();
    for (let i = window.length - 1; i >= 0; i--) {
      if (!seenTs.has(window[i].ts)) {
        seenTs.add(window[i].ts);
        uniqueWindow.unshift(window[i]);
      }
    }

    if (uniqueWindow.length < 2) {
      return {
        direction: "insufficient_data",
        poliChange: 0,
        poliVelocity: 0,
        depthChange: 0,
        depthVelocity: 0,
        imbalanceShift: 0,
        momentum: "neutral",
        confidence: 0,
      };
    }

    const latest = uniqueWindow[uniqueWindow.length - 1];
    const oldest = uniqueWindow[0];

    // Time span in minutes - guard against zero/very small spans
    const timeSpanMs = latest.ts - oldest.ts;
    const timeSpanMin = Math.max(timeSpanMs / 60000, 0.0833); // minimum 5 seconds

    // PoLi changes
    const poliChange = latest.poli - oldest.poli;
    const poliVelocity = poliChange / timeSpanMin;

    // Depth changes (use average of depth25+depth50)
    const latestDepth = (latest.depth25 + latest.depth50) / 2;
    const oldestDepth = (oldest.depth25 + oldest.depth50) / 2;
    const depthChange = oldestDepth > 0 ? ((latestDepth - oldestDepth) / oldestDepth) * 100 : 0;
    const depthVelocity = depthChange / timeSpanMin;

    // Imbalance shift
    const imbalanceShift = latest.imbalance2550 - oldest.imbalance2550;

    // Determine trend direction
    let direction: TSLETrend["direction"];
    if (Math.abs(poliChange) < 2) {
      direction = "stable";
    } else if (poliChange > 0) {
      direction = "rising";
    } else {
      direction = "falling";
    }

    // Momentum: compare recent half to older half (need at least 4 points for meaningful comparison)
    let momentum: TSLETrend["momentum"] = "neutral";
    if (uniqueWindow.length >= 4) {
      const midPoint = Math.floor(uniqueWindow.length / 2);
      const recentHalf = uniqueWindow.slice(midPoint);
      const olderHalf = uniqueWindow.slice(0, midPoint);
      
      const recentAvgPoli = recentHalf.reduce((s, p) => s + p.poli, 0) / recentHalf.length;
      const olderAvgPoli = olderHalf.reduce((s, p) => s + p.poli, 0) / olderHalf.length;

      const momentumDelta = recentAvgPoli - olderAvgPoli;
      if (momentumDelta > 3) momentum = "accelerating";
      else if (momentumDelta < -3) momentum = "decelerating";
    }

    // Confidence based on sample size, time span, and consistency
    const poliStdDev = this.stdDev(uniqueWindow.map(p => p.poli));
    const consistency = poliStdDev < 5 ? 1 : poliStdDev < 10 ? 0.7 : 0.4;
    const sampleConfidence = Math.min(1, uniqueWindow.length / 12);
    // Also factor in time span (more time = more confidence)
    const timeConfidence = Math.min(1, timeSpanMin / 5); // 5 minutes for full confidence
    const confidence = Math.round(consistency * sampleConfidence * timeConfidence * 100) / 100;

    return {
      direction,
      poliChange: Math.round(poliChange * 10) / 10,
      poliVelocity: Math.round(poliVelocity * 100) / 100,
      depthChange: Math.round(depthChange * 10) / 10,
      depthVelocity: Math.round(depthVelocity * 100) / 100,
      imbalanceShift: Math.round(imbalanceShift * 1000) / 1000,
      momentum,
      confidence,
    };
  }

  public getSignals(venue: string, symbol: string): TSLESignal[] {
    const key = this.getKey(venue, symbol);
    const buffer = this.buffers.get(key) || [];
    const signals: TSLESignal[] = [];

    // Need at least 2 points for comparison
    if (buffer.length < 2) return signals;

    const latest = buffer[buffer.length - 1];
    const prev = buffer[buffer.length - 2];
    
    // Guard against undefined prev (shouldn't happen with length check, but be safe)
    if (!prev || !latest) return signals;

    const trend = this.getTrend(venue, symbol, 12);

    // Signal 1: Sudden PoLi drop (≥5 points in one tick)
    const poliDrop = prev.poli - latest.poli;
    if (poliDrop >= 5) {
      signals.push({
        type: "poli_drop",
        severity: poliDrop >= 10 ? "high" : "medium",
        message: `PoLi dropped ${poliDrop.toFixed(0)} points`,
        value: latest.poli,
        threshold: 5,
      });
    }

    // Signal 2: Depth erosion (>10% drop) - guard against zero/NaN
    const latestDepth = latest.depth25 + latest.depth50;
    const prevDepth = prev.depth25 + prev.depth50;
    if (prevDepth > 0 && latestDepth >= 0) {
      const depthDelta = prevDepth - latestDepth;
      const dropPct = (depthDelta / prevDepth) * 100;
      if (dropPct > 10 && !isNaN(dropPct)) {
        signals.push({
          type: "depth_erosion",
          severity: dropPct > 20 ? "high" : "medium",
          message: `Depth eroded ${dropPct.toFixed(1)}% in last tick`,
          value: latestDepth,
          threshold: prevDepth * 0.9,
        });
      }
    }

    // Signal 3: Imbalance swing (>0.2 shift)
    const imbalanceShift = Math.abs(latest.imbalance2550 - prev.imbalance2550);
    if (imbalanceShift > 0.2) {
      const direction = latest.imbalance2550 > prev.imbalance2550 ? "bid-heavy" : "ask-heavy";
      signals.push({
        type: "imbalance_swing",
        severity: "medium",
        message: `Order flow shifted ${direction}`,
        value: latest.imbalance2550,
        threshold: 0.2,
      });
    }

    // Signal 4: Trend reversal detection (only if trend calculation is valid)
    if (trend.confidence > 0.3 && trend.direction === "falling" && trend.momentum === "decelerating") {
      signals.push({
        type: "trend_warning",
        severity: "high",
        message: "Liquidity deteriorating with negative momentum",
        value: trend.poliVelocity,
        threshold: 0,
      });
    }

    // Signal 5: Recovery signal (only if trend calculation is valid)
    if (trend.confidence > 0.3 && trend.direction === "rising" && trend.momentum === "accelerating" && latest.poli > 70) {
      signals.push({
        type: "recovery",
        severity: "low",
        message: "Liquidity recovering with positive momentum",
        value: trend.poliVelocity,
        threshold: 0,
      });
    }

    return signals;
  }

  private stdDev(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map(v => Math.pow(v - mean, 2));
    return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / values.length);
  }
}

interface TSLETrend {
  direction: "rising" | "falling" | "stable" | "insufficient_data";
  poliChange: number;      // absolute change over window
  poliVelocity: number;    // points per minute
  depthChange: number;     // percentage change
  depthVelocity: number;   // percent per minute
  imbalanceShift: number;  // change in imbalance
  momentum: "accelerating" | "decelerating" | "neutral";
  confidence: number;      // 0-1 confidence score
}

interface TSLESignal {
  type: "poli_drop" | "depth_erosion" | "imbalance_swing" | "trend_warning" | "recovery";
  severity: "low" | "medium" | "high";
  message: string;
  value: number;
  threshold: number;
}

// ============================================================================
// TSLE STATE ENGINE — Deterministic Liquidity State Machine
// ============================================================================
// 
// TSLE INVARIANT
// TSLE is liquidity-native by definition.
// Price may never be a direct or indirect TSLE input.
//
// ALLOWED INPUTS (per poll):
//   - depth25 (total executable depth @ 25 bps)
//   - depth50 (total executable depth @ 50 bps)
//   - imbalance2550 (avg imbalance across 25–50 bps)
//   - poli (existing PoLi score)
//   - spread (for confirmation only)
//
// FORBIDDEN INPUTS:
//   - price, returns, volatility, OHLC, candles
//
// ============================================================================

export enum TSLE_STATE {
  STABLE = "STABLE",           // depth25/50 stable or improving, imbalance low, poli flat/rising
  THINNING = "THINNING",       // depth declining ≥3 polls, poli slope negative
  FRAGILE = "FRAGILE",         // depth materially reduced, imbalance worsening, poli dropping
  DISLOCATED = "DISLOCATED",   // depth collapse OR fragile + sharp spread expansion
}

// State severity ordering (lower = healthier)
const STATE_SEVERITY: Record<TSLE_STATE, number> = {
  [TSLE_STATE.STABLE]: 0,
  [TSLE_STATE.THINNING]: 1,
  [TSLE_STATE.FRAGILE]: 2,
  [TSLE_STATE.DISLOCATED]: 3,
};

// No-flicker confirmation requirements
const CONFIRMATION_FORWARD: Record<string, number> = {
  "STABLE→THINNING": 3,
  "THINNING→FRAGILE": 2,
  "FRAGILE→DISLOCATED": 1,
};

const CONFIRMATION_REVERSE: Record<string, number> = {
  "DISLOCATED→FRAGILE": 3,
  "FRAGILE→THINNING": 3,
  "THINNING→STABLE": 4,
  "DISLOCATED→THINNING": 4,
  "DISLOCATED→STABLE": 5,
  "FRAGILE→STABLE": 4,
};

interface TSLEStateTransition {
  from: TSLE_STATE | null;
  to: TSLE_STATE;
  ts: number;
  reason: string;
  confidence: number;
  inputs: {
    poli: number;
    depth25: number;
    depth50: number;
    imbalance: number;
    poliDelta?: number;
    depthDeltaPct?: number;
  };
}

interface TSLEStateSnapshot {
  state: TSLE_STATE;
  since: number;
  durationMs: number;
  transitionCount: number;
  lastTransition: TSLEStateTransition | null;
  pendingState: TSLE_STATE | null;
  confirmationProgress: number;
  confirmationRequired: number;
}

interface TSLEOutput {
  tsle_state: TSLE_STATE;
  reason: string;
  confidence: number;
}

class TSLEStateEngine {
  private states: Map<string, TSLE_STATE> = new Map();
  private stateTimestamps: Map<string, number> = new Map();
  private transitions: Map<string, TSLEStateTransition[]> = new Map();
  private transitionCounts: Map<string, number> = new Map();
  
  // No-flicker tracking: pending state and confirmation count
  private pendingStates: Map<string, TSLE_STATE> = new Map();
  private confirmationCounts: Map<string, number> = new Map();

  private getKey(venue: string, symbol: string): string {
    return `${venue.toLowerCase()}:${symbol.toUpperCase()}`;
  }

  private analyzeBuffer(buffer: TSLEPoint[]): {
    depthTrend: "declining" | "stable" | "improving";
    consecutiveDeclines: number;
    poliSlope: number;
    avgImbalance: number;
    imbalanceTrend: "worsening" | "stable" | "improving";
    poliDrop: number;
  } {
    if (buffer.length < 2) {
      return {
        depthTrend: "stable",
        consecutiveDeclines: 0,
        poliSlope: 0,
        avgImbalance: 0,
        imbalanceTrend: "stable",
        poliDrop: 0,
      };
    }

    // Count consecutive depth declines from most recent
    let consecutiveDeclines = 0;
    for (let i = buffer.length - 1; i > 0; i--) {
      const curr = buffer[i].depth25 + buffer[i].depth50;
      const prev = buffer[i - 1].depth25 + buffer[i - 1].depth50;
      if (curr < prev * 0.98) { // 2% threshold
        consecutiveDeclines++;
      } else {
        break;
      }
    }

    // Depth trend over full buffer
    const firstDepth = buffer[0].depth25 + buffer[0].depth50;
    const lastDepth = buffer[buffer.length - 1].depth25 + buffer[buffer.length - 1].depth50;
    const depthChange = firstDepth > 0 ? (lastDepth - firstDepth) / firstDepth : 0;
    const depthTrend = depthChange < -0.05 ? "declining" : depthChange > 0.05 ? "improving" : "stable";

    // PoLi slope (points per poll)
    const poliFirst = buffer[0].poli;
    const poliLast = buffer[buffer.length - 1].poli;
    const poliSlope = (poliLast - poliFirst) / (buffer.length - 1);

    // PoLi drop over last Y polls (use min of 5 or buffer length)
    const lookback = Math.min(5, buffer.length);
    const poliDrop = buffer[buffer.length - lookback].poli - poliLast;

    // Imbalance analysis
    const imbalances = buffer.map(p => Math.abs(p.imbalance2550));
    const avgImbalance = imbalances.reduce((a, b) => a + b, 0) / imbalances.length;
    const firstHalfImb = imbalances.slice(0, Math.floor(imbalances.length / 2));
    const secondHalfImb = imbalances.slice(Math.floor(imbalances.length / 2));
    const firstAvg = firstHalfImb.reduce((a, b) => a + b, 0) / (firstHalfImb.length || 1);
    const secondAvg = secondHalfImb.reduce((a, b) => a + b, 0) / (secondHalfImb.length || 1);
    const imbalanceTrend = secondAvg > firstAvg * 1.1 ? "worsening" : secondAvg < firstAvg * 0.9 ? "improving" : "stable";

    return {
      depthTrend,
      consecutiveDeclines,
      poliSlope,
      avgImbalance,
      imbalanceTrend,
      poliDrop,
    };
  }

  public computeRawState(
    buffer: TSLEPoint[],
    spreadBps?: number
  ): { state: TSLE_STATE; reason: string; confidence: number } {
    if (buffer.length === 0) {
      return { state: TSLE_STATE.STABLE, reason: "No data yet", confidence: 0 };
    }

    const latest = buffer[buffer.length - 1];
    const analysis = this.analyzeBuffer(buffer);
    const { depthTrend, consecutiveDeclines, poliSlope, avgImbalance, imbalanceTrend, poliDrop } = analysis;

    // DISLOCATED: depth collapse OR FRAGILE + spread expansion
    if (depthTrend === "declining" && consecutiveDeclines >= 5 && latest.poli < 50) {
      return { 
        state: TSLE_STATE.DISLOCATED, 
        reason: `Depth collapse (${consecutiveDeclines} consecutive declines, PoLi ${latest.poli})`,
        confidence: 90 + Math.min(10, consecutiveDeclines),
      };
    }
    if (latest.poli < 30) {
      return { 
        state: TSLE_STATE.DISLOCATED, 
        reason: `PoLi critically low (${latest.poli})`,
        confidence: 95,
      };
    }
    if (spreadBps && spreadBps > 20 && latest.poli < 50 && imbalanceTrend === "worsening") {
      return { 
        state: TSLE_STATE.DISLOCATED, 
        reason: `Spread blowout (${spreadBps.toFixed(1)}bps) with fragile liquidity`,
        confidence: 85,
      };
    }

    // FRAGILE: depth materially reduced + imbalance worsening + poli dropping
    const fragileConditions = [
      depthTrend === "declining",
      imbalanceTrend === "worsening",
      poliDrop >= 5,
    ].filter(Boolean).length;

    if (fragileConditions >= 2 && latest.poli < 60) {
      return { 
        state: TSLE_STATE.FRAGILE, 
        reason: `Fragile: ${depthTrend} depth, ${imbalanceTrend} imbalance, PoLi dropped ${poliDrop.toFixed(0)}pts`,
        confidence: 60 + fragileConditions * 10,
      };
    }
    if (avgImbalance > 0.35 && latest.poli < 65) {
      return { 
        state: TSLE_STATE.FRAGILE, 
        reason: `High avg imbalance (${(avgImbalance * 100).toFixed(0)}%) with weak PoLi`,
        confidence: 70,
      };
    }

    // THINNING: depth declining ≥3 consecutive polls, poli slope negative
    if (consecutiveDeclines >= 3 && poliSlope < 0) {
      return { 
        state: TSLE_STATE.THINNING, 
        reason: `Depth declining (${consecutiveDeclines} polls), PoLi slope ${poliSlope.toFixed(1)}/poll`,
        confidence: 50 + Math.min(30, consecutiveDeclines * 5),
      };
    }
    if (latest.poli >= 50 && latest.poli < 70 && poliSlope <= 0) {
      return { 
        state: TSLE_STATE.THINNING, 
        reason: `PoLi in thinning range (${latest.poli})`,
        confidence: 60,
      };
    }
    if (avgImbalance > 0.20) {
      return { 
        state: TSLE_STATE.THINNING, 
        reason: `Elevated imbalance (${(avgImbalance * 100).toFixed(0)}%)`,
        confidence: 55,
      };
    }

    // STABLE: depth stable/improving, imbalance low, poli flat/rising
    const stableConfidence = Math.min(100, 
      70 + 
      (depthTrend === "improving" ? 10 : 0) + 
      (poliSlope > 0 ? 10 : 0) + 
      (avgImbalance < 0.10 ? 10 : 0)
    );
    return { 
      state: TSLE_STATE.STABLE, 
      reason: `Healthy: ${depthTrend} depth, PoLi ${latest.poli}, imbalance ${(avgImbalance * 100).toFixed(0)}%`,
      confidence: stableConfidence,
    };
  }

  public transition(
    venue: string,
    symbol: string,
    buffer: TSLEPoint[],
    spreadBps?: number
  ): TSLEOutput {
    if (venue.toLowerCase() !== "binance") {
      return { tsle_state: TSLE_STATE.STABLE, reason: "Non-Binance venue", confidence: 0 };
    }

    const key = this.getKey(venue, symbol);
    const currentState = this.states.get(key) || TSLE_STATE.STABLE;
    const { state: rawState, reason, confidence } = this.computeRawState(buffer, spreadBps);

    // If raw state matches current, reset pending
    if (rawState === currentState) {
      this.pendingStates.delete(key);
      this.confirmationCounts.delete(key);
      return { tsle_state: currentState, reason, confidence };
    }

    // Determine confirmation requirement
    const transitionKey = `${currentState}→${rawState}`;
    const isForward = STATE_SEVERITY[rawState] > STATE_SEVERITY[currentState];
    const confirmationRequired = isForward 
      ? (CONFIRMATION_FORWARD[transitionKey] || 2)
      : (CONFIRMATION_REVERSE[transitionKey] || 3);

    // Check if this is the same pending state
    const pendingState = this.pendingStates.get(key);
    if (pendingState === rawState) {
      // Increment confirmation count
      const count = (this.confirmationCounts.get(key) || 0) + 1;
      this.confirmationCounts.set(key, count);

      if (count >= confirmationRequired) {
        // Transition confirmed!
        const point = buffer[buffer.length - 1];
        const prevPoint = buffer.length > 1 ? buffer[buffer.length - 2] : null;
        
        const transition: TSLEStateTransition = {
          from: currentState,
          to: rawState,
          ts: point.ts,
          reason,
          confidence,
          inputs: {
            poli: point.poli,
            depth25: point.depth25,
            depth50: point.depth50,
            imbalance: point.imbalance2550,
            poliDelta: prevPoint ? point.poli - prevPoint.poli : undefined,
            depthDeltaPct: prevPoint 
              ? ((point.depth25 + point.depth50 - prevPoint.depth25 - prevPoint.depth50) / 
                 (prevPoint.depth25 + prevPoint.depth50 || 1)) * 100 
              : undefined,
          },
        };

        // Commit state change
        this.states.set(key, rawState);
        this.stateTimestamps.set(key, point.ts);
        
        let history = this.transitions.get(key) || [];
        history.push(transition);
        if (history.length > 50) history = history.slice(-50);
        this.transitions.set(key, history);
        
        this.transitionCounts.set(key, (this.transitionCounts.get(key) || 0) + 1);
        this.pendingStates.delete(key);
        this.confirmationCounts.delete(key);

        console.log(`[TSLE State] ${key}: ${currentState} → ${rawState} | ${reason} (confirmed after ${count} polls)`);
        return { tsle_state: rawState, reason, confidence };
      }

      // Still pending
      return { 
        tsle_state: currentState, 
        reason: `Pending ${rawState}: ${count}/${confirmationRequired} confirmations`,
        confidence: confidence * (count / confirmationRequired),
      };
    }

    // New pending state
    this.pendingStates.set(key, rawState);
    this.confirmationCounts.set(key, 1);
    return { 
      tsle_state: currentState, 
      reason: `Pending ${rawState}: 1/${confirmationRequired} confirmations`,
      confidence: confidence * (1 / confirmationRequired),
    };
  }

  public getState(venue: string, symbol: string): TSLEStateSnapshot {
    const key = this.getKey(venue, symbol);
    const state = this.states.get(key) || TSLE_STATE.STABLE;
    const since = this.stateTimestamps.get(key) || Date.now();
    const history = this.transitions.get(key) || [];
    const count = this.transitionCounts.get(key) || 0;
    const pendingState = this.pendingStates.get(key) || null;
    const confirmationProgress = this.confirmationCounts.get(key) || 0;
    
    const transitionKey = pendingState ? `${state}→${pendingState}` : "";
    const isForward = pendingState ? STATE_SEVERITY[pendingState] > STATE_SEVERITY[state] : false;
    const confirmationRequired = pendingState 
      ? (isForward ? (CONFIRMATION_FORWARD[transitionKey] || 2) : (CONFIRMATION_REVERSE[transitionKey] || 3))
      : 0;

    return {
      state,
      since,
      durationMs: Date.now() - since,
      transitionCount: count,
      lastTransition: history.length > 0 ? history[history.length - 1] : null,
      pendingState,
      confirmationProgress,
      confirmationRequired,
    };
  }

  public getTransitionHistory(venue: string, symbol: string, limit?: number): TSLEStateTransition[] {
    const key = this.getKey(venue, symbol);
    const history = this.transitions.get(key) || [];
    return limit ? history.slice(-limit) : [...history];
  }

  public getAllStates(): Map<string, TSLE_STATE> {
    return new Map(this.states);
  }
}

// Singleton instances
export const tsleBuffer = new TSLEBuffer();
export const tsleStateEngine = new TSLEStateEngine();

export type { TSLEPoint, LISSnapshot, TSLETrend, TSLESignal, TSLEStateTransition, TSLEStateSnapshot };
