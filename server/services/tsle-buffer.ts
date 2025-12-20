// TSLE — Time-Series Liquidity Engine
// In-memory ring buffer for rolling liquidity history
// Venue: Binance only | Market: Spot only | No persistence

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
}

// Singleton instance
export const tsleBuffer = new TSLEBuffer();

export type { TSLEPoint, LISSnapshot };
