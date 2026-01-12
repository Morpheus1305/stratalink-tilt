// server/services/symbols.ts
import type { LiquidityVenue } from "../../shared/liquidityTape";

export type CanonicalSymbol = string;

const CANONICAL_MAP: Record<string, Partial<Record<LiquidityVenue, string>>> = {
  "ETH-USD": { coinbase: "ETH-USD", binance: "ETHUSDT", kraken: "ETHUSD" },
  "BTC-USD": { coinbase: "BTC-USD", binance: "BTCUSDT", kraken: "XBTUSD" },
  "SOL-USD": { coinbase: "SOL-USD", binance: "SOLUSDT", kraken: "SOLUSD" },
};

export function normalizeCanonicalSymbol(input: string): string {
  return input.trim().toUpperCase();
}

export function resolveVenueSymbols(canonical: CanonicalSymbol): string[] {
  const c = normalizeCanonicalSymbol(canonical);
  const m = CANONICAL_MAP[c];

  if (m) {
    const out = new Set<string>([c]);
    for (const k of Object.keys(m) as LiquidityVenue[]) {
      const s = m[k];
      if (s) out.add(String(s).toUpperCase());
    }
    return Array.from(out);
  }

  return [c];
}

export function normalizeCanonicalSymbols(symbols: string | string[] | undefined): string[] | undefined {
  if (!symbols) return undefined;
  const arr = Array.isArray(symbols) ? symbols : [symbols];
  const out: string[] = [];
  for (const s of arr) {
    out.push(...resolveVenueSymbols(s));
  }
  return out.length > 0 ? out : undefined;
}
