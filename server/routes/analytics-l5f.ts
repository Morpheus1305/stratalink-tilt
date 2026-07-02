import { Router, Request, Response } from 'express';
import { computeAnalyticsSnapshot, type TsleAggregate } from '../services/analytics-layer';

const router = Router();

interface CacheEntry {
  aggregate: TsleAggregate;
  computedAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 4_000;

function getCached(symbol: string): TsleAggregate | null {
  const entry = cache.get(symbol);
  if (!entry) return null;
  if (Date.now() - entry.computedAt > CACHE_TTL_MS) {
    cache.delete(symbol);
    return null;
  }
  return entry.aggregate;
}

function setCache(symbol: string, aggregate: TsleAggregate): void {
  cache.set(symbol, { aggregate, computedAt: Date.now() });
}

// Full ILU-20 symbol allowlist  -  all 20 canonical tokens
const VALID_SYMBOLS = new Set([
  'BTC', 'ETH',                               // Reserve
  'USDT', 'USDC', 'DAI',                      // Stablecoin Infrastructure
  'BNB', 'CRO', 'OKB', 'UNI', 'CAKE',        // Exchange & Trading Infrastructure
  'LINK', 'AAVE', 'MKR', 'SNX', 'COMP',      // Financial Infrastructure
  'SOL', 'XRP', 'DOGE', 'ADA', 'AVAX',       // High-Volume Liquidity
  // extended/legacy (accepted but not ILU-20 core)
  'USDE', 'HYPE', 'TON', 'ARB', 'OP',
]);

router.get('/snapshot/:symbol', (req: Request, res: Response) => {
  const symbol = String(req.params.symbol ?? '').toUpperCase();

  if (!VALID_SYMBOLS.has(symbol)) {
    return res.status(400).json({
      error: `Invalid symbol. Must be one of: ${[...VALID_SYMBOLS].join(', ')}`,
    });
  }

  try {
    const cached = getCached(symbol);
    if (cached) {
      return res.json({ ok: true, cached: true, aggregate: cached });
    }

    const aggregate = computeAnalyticsSnapshot(symbol);

    if (!aggregate) {
      return res.status(503).json({
        ok: false,
        error: `No buffer data for ${symbol}. Feed may still be warming up.`,
      });
    }

    setCache(symbol, aggregate);
    return res.json({ ok: true, cached: false, aggregate });

  } catch (err: any) {
    console.error('[Analytics] /snapshot error:', err);
    return res.status(500).json({
      ok: false,
      error: 'Failed to compute analytics snapshot',
    });
  }
});

router.get('/health', (_req: Request, res: Response) => {
  return res.json({
    ok: true,
    service: 'Stratalink Analytics Layer  -  L5F',
    version: '0.1.0',
    timestamp: Date.now(),
    cachedSymbols: [...cache.keys()],
    supportedSymbols: [...VALID_SYMBOLS],
  });
});

export default router;
