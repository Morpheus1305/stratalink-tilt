// server/services/symbols.ts
type LiquidityVenue = string;

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
  const out = new Set<string>([c]);

  // NEW: if canonical looks like XXX-YYY or XXX/YYY or XXX_YYY, include base XXX
  const mPair = c.match(/^([A-Z0-9]+)[-_/]([A-Z0-9]+)$/);
  if (mPair?.[1]) out.add(mPair[1]);

  const m = CANONICAL_MAP[c];
  if (m) {
    for (const v of Object.keys(m) as LiquidityVenue[]) {
      const s = m[v];
      if (s) out.add(String(s).toUpperCase());
    }
  }

  return Array.from(out);
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
