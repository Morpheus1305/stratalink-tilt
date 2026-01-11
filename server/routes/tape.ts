// server/routes/tape.ts
// REST API for Liquidity Tape

import { Router } from "express";
import type { LiquidityTapeEvent, TapeQuery, LiquidityTapeVenue, LiquidityTapeEventType } from "../../shared/liquidityTape";
import { tapeStore } from "../services/tapeStore";

const router = Router();

router.get("/stream", (_req, _res, next) => {
  next();
});

router.get("/", (req, res) => {
  const { symbol, venue, type, since, limit } = req.query;

  const q: TapeQuery = {};
  if (symbol && typeof symbol === "string") q.symbol = symbol.toUpperCase();
  if (venue && typeof venue === "string") q.venue = venue as LiquidityTapeVenue;
  if (type && typeof type === "string") q.type = type as LiquidityTapeEventType;
  if (since) q.since = Number(since);
  if (limit) q.limit = Math.min(Number(limit) || 100, 1000);

  const events = tapeStore.query(q);
  return res.json({ ok: true, count: events.length, events });
});

router.post("/", (req, res) => {
  const event = req.body as LiquidityTapeEvent;

  if (!event?.id || !event.ts || !event.type || !event.venue || !event.symbol) {
    return res.status(400).json({
      ok: false,
      error: "Missing required fields: id, ts, type, venue, symbol",
    });
  }

  tapeStore.push(event);
  return res.json({ ok: true, accepted: 1 });
});

router.get("/latest", (req, res) => {
  const n = Math.min(Number(req.query.n) || 10, 100);
  const events = tapeStore.latest(n);
  return res.json({ ok: true, count: events.length, events });
});

export default router;
