// server/routes/tape.ts
// REST API for Liquidity Tape

import { Router } from "express";
import type { Request, Response } from "express";
import type { LiquidityTapeEvent, LiquidityVenue, LiquidityTapeEventType } from "../../shared/liquidityTape";
import { tapeStore, type TapeQuery } from "../services/tapeStore";
import { resolveVenueSymbols, normalizeCanonicalSymbols } from "../services/symbols";

const router = Router();

function parseFilter<T extends string>(val: unknown, valid: T[]): T | undefined {
  if (typeof val !== "string") return undefined;
  const lower = val.toLowerCase() as T;
  return valid.includes(lower) ? lower : undefined;
}

function parseLiquidityTapeEventType(val: unknown): LiquidityTapeEventType | undefined {
  const VALID_TYPES: LiquidityTapeEventType[] = [
    "DEPTH_UPDATE",
    "SPREAD_UPDATE",
    "FUNDING_RATE",
    "IMBALANCE",
    "MARK_PRICE",
  ];
  if (typeof val !== "string") return undefined;
  const upper = val.toUpperCase() as LiquidityTapeEventType;
  return VALID_TYPES.includes(upper) ? upper : undefined;
}

router.get("/stream", (_req: Request, _res: Response, next) => {
  next();
});

router.get("/", (req: Request, res: Response) => {
  const { symbol, venue, type, since, until, limit } = req.query;

  const canon = typeof symbol === "string" ? symbol : undefined;
  const resolvedSymbols = canon ? resolveVenueSymbols(canon) : undefined;

  const q: TapeQuery = {};
  if (resolvedSymbols) q.symbols = resolvedSymbols;
  if (venue) {
    const v = parseFilter(venue, ["binance", "coinbase", "kraken", "okx", "bybit", "dex", "unknown"] as LiquidityVenue[]);
    if (v) q.venue = v;
  }
  if (type) {
    const t = parseLiquidityTapeEventType(type);
    if (t) q.type = t;
  }
  if (since) q.since = Number(since);
  if (until) q.until = Number(until);
  if (limit) q.limit = Math.min(Number(limit) || 100, 1000);

  const events = tapeStore.query(q);
  return res.json({ ok: true, count: events.length, events, resolvedSymbols: resolvedSymbols ?? [] });
});

router.get("/latest", (req: Request, res: Response) => {
  const { symbol, venue, type, since, limit } = req.query;

  const canon = typeof symbol === "string" ? symbol : undefined;
  const resolvedSymbols = canon ? resolveVenueSymbols(canon) : undefined;

  const q: TapeQuery = {
    symbols: resolvedSymbols,
    venue: typeof venue === "string" ? venue as LiquidityVenue : undefined,
    type: typeof type === "string" ? type as LiquidityTapeEventType : undefined,
    since: typeof since === "string" ? Number(since) : undefined,
    limit: Math.min(Number(limit) || 10, 100),
  };

  const events = tapeStore.query(q);
  res.json({ ok: true, count: events.length, events, resolvedSymbols: resolvedSymbols ?? [] });
});

router.get("/snapshot", (_req: Request, res: Response) => {
  const events = tapeStore.snapshot();
  return res.json({
    ok: true,
    count: events.length,
    bufferSize: tapeStore.size(),
    events,
  });
});

router.get("/health", (_req: Request, res: Response) => {
  const now = Date.now();
  const fiveSecAgo = now - 5000;
  const fiveMinAgo = now - 5 * 60 * 1000;

  const allEvents = tapeStore.snapshot();

  const VENUES: LiquidityVenue[] = ["binance", "coinbase", "kraken", "okx", "bybit", "dex"];

  const venues: Record<string, {
    status: "ok" | "degraded" | "down" | "unknown";
    last_ts_ingest: number | null;
    msg_rate_5s: number | null;
    lag_ms: number | null;
    errors_5m: number | null;
  }> = {};

  for (const v of VENUES) {
    const venueEvents = allEvents.filter((e) => e.venue === v);
    const lastEvent = venueEvents[0];
    const last_ts_ingest = lastEvent?.ts ?? null;

    const recentEvents = venueEvents.filter((e) => e.ts >= fiveSecAgo);
    const msg_rate_5s = recentEvents.length;

    const errorsRecent = venueEvents.filter(
      (e) => e.ts >= fiveMinAgo && e.type === "IMBALANCE"
    ).length;

    let lag_ms: number | null = null;
    if (lastEvent?.payload && typeof lastEvent.payload === "object") {
      const p = lastEvent.payload as Record<string, unknown>;
      if (typeof p.event_ts === "number" && typeof lastEvent.ts === "number") {
        lag_ms = lastEvent.ts - (p.event_ts as number);
      }
    }

    let status: "ok" | "degraded" | "down" | "unknown" = "unknown";
    if (last_ts_ingest !== null) {
      const ageSec = (now - last_ts_ingest) / 1000;
      if (ageSec < 10) status = "ok";
      else if (ageSec < 60) status = "degraded";
      else status = "down";
    }

    venues[v] = {
      status,
      last_ts_ingest,
      msg_rate_5s,
      lag_ms,
      errors_5m: errorsRecent,
    };
  }

  return res.json({
    server_ts: now,
    venues,
  });
});

router.get("/debug/summary", (_req: Request, res: Response) => {
  const events = tapeStore.snapshot();

  const byVenue: Record<string, { count: number; lastTs: number | null }> = {};
  const bySymbol: Record<string, number> = {};

  for (const e of events) {
    // venue stats
    if (!byVenue[e.venue]) byVenue[e.venue] = { count: 0, lastTs: null };
    byVenue[e.venue].count += 1;
    byVenue[e.venue].lastTs = byVenue[e.venue].lastTs === null ? e.ts : Math.max(byVenue[e.venue].lastTs!, e.ts);

    // symbol stats
    bySymbol[e.symbol] = (bySymbol[e.symbol] ?? 0) + 1;
  }

  const topSymbols = Object.entries(bySymbol)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([symbol, count]) => ({ symbol, count }));

  res.json({
    ok: true,
    bufferSize: tapeStore.size(),
    venues: byVenue,
    topSymbols,
  });
});

/**
 * Binance Authenticity Rule:
 * Accept Binance only if venue === "binance" AND payload.provenance.sourceVenue === "binance" AND payload.provenance.transport === "relay"
 * This prevents fallback mislabeling forever.
 */
function validateBinanceAuthenticity(event: LiquidityTapeEvent): { valid: boolean; error?: string } {
  if (event.venue !== "binance") {
    return { valid: true };
  }

  const provenance = (event.payload as any)?.provenance;
  if (!provenance) {
    return { valid: false, error: "Binance event missing provenance" };
  }

  if (provenance.sourceVenue !== "binance") {
    return { valid: false, error: `Binance event has wrong sourceVenue: ${provenance.sourceVenue}` };
  }

  if (provenance.transport !== "relay") {
    return { valid: false, error: `Binance event has wrong transport: ${provenance.transport}` };
  }

  return { valid: true };
}

router.post("/", (req: Request, res: Response) => {
  const event = req.body as LiquidityTapeEvent;

  if (!event?.id || !event.ts || !event.type || !event.venue || !event.symbol) {
    return res.status(400).json({
      ok: false,
      error: "Missing required fields: id, ts, type, venue, symbol, payload",
    });
  }

  const binanceCheck = validateBinanceAuthenticity(event);
  if (!binanceCheck.valid) {
    console.error(`[Tape] Binance authenticity REJECTED: ${binanceCheck.error}`);
    return res.status(400).json({
      ok: false,
      error: `Binance authenticity check failed: ${binanceCheck.error}`,
    });
  }

  tapeStore.push(event);
  return res.json({ ok: true, accepted: 1 });
});

router.post("/batch", (req: Request, res: Response) => {
  const events = req.body as LiquidityTapeEvent[];

  if (!Array.isArray(events)) {
    return res.status(400).json({ ok: false, error: "Expected array of events" });
  }

  const validEvents: LiquidityTapeEvent[] = [];
  const rejected: { index: number; error: string }[] = [];

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const binanceCheck = validateBinanceAuthenticity(event);
    if (!binanceCheck.valid) {
      console.error(`[Tape] Batch index ${i}: Binance authenticity REJECTED: ${binanceCheck.error}`);
      rejected.push({ index: i, error: binanceCheck.error! });
    } else {
      validEvents.push(event);
    }
  }

  const accepted = tapeStore.pushBatch(validEvents);
  return res.json({
    ok: true,
    accepted,
    rejected: rejected.length > 0 ? rejected : undefined,
  });
});

export default router;
