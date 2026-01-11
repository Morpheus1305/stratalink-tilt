// server/services/tapeStore.ts
// RING BUFFER for Liquidity Tape events

import type { LiquidityTapeEvent, LiquidityVenue, LiquidityTapeEventType } from "../../shared/liquidityTape";

export type TapeQuery = {
  symbol?: string;
  venue?: LiquidityVenue;
  type?: LiquidityTapeEventType;
  since?: number;
  until?: number;
  limit?: number;
};

const DEFAULT_MAX_EVENTS = 10_000;

function clamp(n: unknown, fallback: number, min: number, max: number): number {
  const num = Number(n);
  if (Number.isNaN(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}

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

  pushBatch(events: LiquidityTapeEvent[]): number {
    for (const e of events) this.push(e);
    return events.length;
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
    if (q.until) {
      results = results.filter((e) => e.ts <= q.until!);
    }

    results.sort((a, b) => b.ts - a.ts);

    const limit = q.limit ?? 100;
    return results.slice(0, limit);
  }

  latest(n = 1): LiquidityTapeEvent[] {
    return this.buffer.slice(-n).reverse();
  }

  latestBy(number = DEFAULT_LATEST_LIMIT): LiquidityTapeEvent[] {
    return this.latest(clamp(number, DEFAULT_LATEST_LIMIT, 1, 500));
  }

  size(): number {
    return this.buffer.length;
  }

  snapshot(): LiquidityTapeEvent[] {
    return [...this.buffer];
  }
}

const DEFAULT_LATEST_LIMIT = 100;

export const tapeStore = new TapeStore();
