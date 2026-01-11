// server/routes/tape.ts
// REST API for Liquidity Tape

import { Router } from "express";
import type { Request, Response } from "express";
import type { LiquidityTapeEvent, LiquidityVenue, LiquidityTapeEventType } from "../../shared/liquidityTape";
import { tapeStore, type TapeQuery } from "../services/tapeStore";

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

  const q: TapeQuery = {};
  if (symbol && typeof symbol === "string") q.symbol = symbol.toUpperCase();
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
  return res.json({ ok: true, count: events.length, events });
});

router.get("/latest", (req: Request, res: Response) => {
  const n = Math.min(Number(req.query.n) || 10, 100);
  const events = tapeStore.latest(n);
  return res.json({ ok: true, count: events.length, events });
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

router.post("/", (req: Request, res: Response) => {
  const event = req.body as LiquidityTapeEvent;

  if (!event?.id || !event.ts || !event.type || !event.venue || !event.symbol) {
    return res.status(400).json({
      ok: false,
      error: "Missing required fields: id, ts, type, venue, symbol, payload",
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

  const accepted = tapeStore.pushBatch(events);
  return res.json({ ok: true, accepted });
});

export default router;
