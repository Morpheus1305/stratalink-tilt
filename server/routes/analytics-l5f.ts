import { Router, Request, Response } from 'express';
import { computeAnalyticsSnapshot, type TsleAggregate } from '../services/analytics-layer';
import { getStoredHistory } from '../services/depthHistoryStore';

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

// Full ILU-25 symbol allowlist  -  25 canonical tokens
const VALID_SYMBOLS = new Set([
  'BTC', 'ETH',                               // Reserve
  'USDT', 'USDC', 'DAI',                      // Stablecoin Infrastructure
  'BNB', 'CRO', 'OKB', 'UNI', 'CAKE',        // Exchange & Trading Infrastructure
  'LINK', 'AAVE', 'MKR', 'SNX', 'COMP',      // Financial Infrastructure
  'SOL', 'XRP', 'DOGE', 'ADA', 'AVAX',       // High-Volume Liquidity
  // extended/legacy (accepted but not ILU-25 core)
  'USDE', 'HYPE', 'TON', 'ARB', 'OP',
  // Digital Securities & RWA  (ILU-25 Phase 1 — commodity tokens + governance)
  'PAXG', 'XAUT', 'ONDO', 'BUIDL', 'OUSG',
  // Digital Securities & RWA  (ILU-31 Phase 2 — security token exchange assets)
  'BENJI', 'VBILL', 'USDY', 'BCSPX', 'BIB01', 'ACRED',
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

// ─── Session Comparison Endpoint ────────────────────────────────────────────
// Compares current session metrics against the oldest available session window.
// Returns { hasData: false } when < 10 data points exist (still warming up).
router.get('/session-comparison/:symbol', (req: Request, res: Response) => {
  const symbol = (req.params.symbol || 'BTC').toUpperCase();

  const allHistory = getStoredHistory(symbol, 48 * 60 * 60 * 1000); // up to 48h

  if (allHistory.length < 10) {
    return res.json({
      ok: true,
      hasData: false,
      reason: `Collecting session baseline — ${allHistory.length} of 10 required points recorded.`,
      pointsCollected: allHistory.length,
    });
  }

  // Window: compare the oldest 20% of points vs the newest 20%
  const windowSize = Math.max(3, Math.floor(allHistory.length * 0.20));
  const priorWindow = allHistory.slice(0, windowSize);
  const currentWindow = allHistory.slice(-windowSize);

  const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;

  const priorDepth10  = avg(priorWindow.map(p => p.depth10bps));
  const priorDepth25  = avg(priorWindow.map(p => p.depth25bps));
  const priorDepth50  = avg(priorWindow.map(p => p.depth50bps));
  const priorSpread   = avg(priorWindow.map(p => p.spreadBps));

  const curDepth10    = avg(currentWindow.map(p => p.depth10bps));
  const curDepth25    = avg(currentWindow.map(p => p.depth25bps));
  const curDepth50    = avg(currentWindow.map(p => p.depth50bps));
  const curSpread     = avg(currentWindow.map(p => p.spreadBps));

  const pctDelta = (cur: number, prior: number) =>
    prior === 0 ? 0 : ((cur - prior) / prior) * 100;

  const oldestTs = allHistory[0].ts;
  const newestTs = allHistory[allHistory.length - 1].ts;
  const spanHours = (newestTs - oldestTs) / 3_600_000;

  const windowLabel = spanHours >= 22
    ? '24h ago'
    : spanHours >= 1
    ? `${spanHours.toFixed(1)}h ago`
    : 'session start';

  return res.json({
    ok: true,
    hasData: true,
    windowLabel,
    spanHours: +spanHours.toFixed(2),
    pointCount: allHistory.length,
    comparison: {
      depth10: { prior: priorDepth10, current: curDepth10, deltaPct: pctDelta(curDepth10, priorDepth10) },
      depth25: { prior: priorDepth25, current: curDepth25, deltaPct: pctDelta(curDepth25, priorDepth25) },
      depth50: { prior: priorDepth50, current: curDepth50, deltaPct: pctDelta(curDepth50, priorDepth50) },
      spread:  { prior: priorSpread,  current: curSpread,  deltaPct: pctDelta(curSpread,  priorSpread) },
    },
  });
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
