// server/services/tapeStore.ts
// RING BUFFER for Liquidity Tape events

import type { LiquidityTapeEvent, TapeQuery } from "../../shared/liquidityTape";

const DEFAULT_MAX_EVENTS = 10_000;

class TapeStore {
  private buffer: LiquidityTapeEvent[] = [];
  private maxEvents = DEFAULT_MAX_EVENTS;

  constructor(maxEvents = DEFAULT_MAX_EVENTS) {
    this.maxEvents = maxEvents;
  }

  push(event: LiquidityTapeEvent): void {
    if (this.buffer.length >= this.maxEvents) {
      this.buffer.shift();
    }
    this.buffer.push(event);
  }

  query(q: TapeQuery): LiquidityTapeEvent[] {
    let results = [...this.buffer];

    if (q.symbol) {
      results = results.filter((e) => e.symbol === q.symbol);
    }
    if (q.venue) {
      results = results.filter((e) => e.venue === q.venue);
    }
    if (q.type) {
      results = results.filter((e) => e.type === q.type);
    }
    if (q.since) {
      results = results.filter((e) => e.ts >= q.since!);
    }

    results.sort((a, b) => b.ts - a.ts);

    const limit = q.limit ?? 100;
    return results.slice(0, limit);
  }

  latest(n = 1): LiquidityTapeEvent[] {
    return this.buffer.slice(-n).reverse();
  }

  size(): number {
    return this.buffer.length;
  }
}

export const tapeStore = new TapeStore();
