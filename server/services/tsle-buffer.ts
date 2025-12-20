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

const BUFFER_SIZE = 300;

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

// Singleton instance
export const tsleBuffer = new TSLEBuffer();

export type { TSLEPoint, LISSnapshot, TSLETrend, TSLESignal };
