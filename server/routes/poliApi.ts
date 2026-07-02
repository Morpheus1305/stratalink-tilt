// server/routes/poliApi.ts
// API routes for PoLi Engine  -  exposes PoLi snapshots and evidence table
// This is the clean consumer of DACT v0.1

import { Router } from "express";
import type { Request, Response } from "express";
type LiquidityVenue = string;
import {
  computePoLiSnapshot,
  getPoLiEvidence,
  getPoLiWithEvidence,
  getCachedPoLiSnapshot,
  clearPoLiCache,
} from "../services/poliEngine";

const router = Router();

const VALID_VENUES: LiquidityVenue[] = ["binance", "coinbase", "kraken", "okx", "bybit"];

function isValidVenue(v: string): v is LiquidityVenue {
  return VALID_VENUES.includes(v as LiquidityVenue);
}

function parseWindowMs(query: unknown): number {
  const val = Number(query);
  if (!Number.isFinite(val) || val <= 0) return 60_000;
  return Math.min(Math.max(val, 5_000), 300_000);
}

router.get("/snapshot", (req: Request, res: Response) => {
  const venue = String(req.query.venue ?? "binance").toLowerCase();
  const symbol = String(req.query.symbol ?? "BTC").toUpperCase();
  const windowMs = parseWindowMs(req.query.window);
  const cached = req.query.cached !== "false";

  if (!isValidVenue(venue)) {
    return res.status(400).json({
      error: `Invalid venue. Must be one of: ${VALID_VENUES.join(", ")}`,
    });
  }

  try {
    const snapshot = cached
      ? getCachedPoLiSnapshot(venue, symbol, windowMs)
      : computePoLiSnapshot(venue, symbol, windowMs);

    return res.json({
      ok: true,
      snapshot,
    });
  } catch (err: any) {
    console.error("[PoLi API] snapshot error:", err);
    return res.status(500).json({ error: "Failed to compute PoLi snapshot" });
  }
});

router.get("/evidence", (req: Request, res: Response) => {
  const venue = String(req.query.venue ?? "binance").toLowerCase();
  const symbol = String(req.query.symbol ?? "BTC").toUpperCase();
  const windowMs = parseWindowMs(req.query.window);

  if (!isValidVenue(venue)) {
    return res.status(400).json({
      error: `Invalid venue. Must be one of: ${VALID_VENUES.join(", ")}`,
    });
  }

  try {
    const evidence = getPoLiEvidence(venue, symbol, windowMs);

    return res.json({
      ok: true,
      evidence,
    });
  } catch (err: any) {
    console.error("[PoLi API] evidence error:", err);
    return res.status(500).json({ error: "Failed to get PoLi evidence" });
  }
});

router.get("/full", (req: Request, res: Response) => {
  const venue = String(req.query.venue ?? "binance").toLowerCase();
  const symbol = String(req.query.symbol ?? "BTC").toUpperCase();
  const windowMs = parseWindowMs(req.query.window);

  if (!isValidVenue(venue)) {
    return res.status(400).json({
      error: `Invalid venue. Must be one of: ${VALID_VENUES.join(", ")}`,
    });
  }

  try {
    const { snapshot, evidence } = getPoLiWithEvidence(venue, symbol, windowMs);

    return res.json({
      ok: true,
      snapshot,
      evidence,
    });
  } catch (err: any) {
    console.error("[PoLi API] full error:", err);
    return res.status(500).json({ error: "Failed to get PoLi with evidence" });
  }
});

router.get("/multi", (req: Request, res: Response) => {
  const venue = String(req.query.venue ?? "binance").toLowerCase();
  const symbolsParam = req.query.symbols;
  const windowMs = parseWindowMs(req.query.window);

  if (!isValidVenue(venue)) {
    return res.status(400).json({
      error: `Invalid venue. Must be one of: ${VALID_VENUES.join(", ")}`,
    });
  }

  const symbols: string[] = typeof symbolsParam === "string"
    ? symbolsParam.split(",").map(s => s.trim().toUpperCase()).filter(Boolean)
    : ["BTC", "ETH", "SOL"];

  try {
    const snapshots: Record<string, ReturnType<typeof getCachedPoLiSnapshot>> = {};

    for (const symbol of symbols) {
      snapshots[symbol] = getCachedPoLiSnapshot(venue, symbol, windowMs);
    }

    return res.json({
      ok: true,
      venue,
      count: symbols.length,
      snapshots,
    });
  } catch (err: any) {
    console.error("[PoLi API] multi error:", err);
    return res.status(500).json({ error: "Failed to get multi-symbol PoLi snapshots" });
  }
});

router.post("/cache/clear", (_req: Request, res: Response) => {
  try {
    clearPoLiCache();
    return res.json({ ok: true, message: "PoLi cache cleared" });
  } catch (err: any) {
    console.error("[PoLi API] cache clear error:", err);
    return res.status(500).json({ error: "Failed to clear PoLi cache" });
  }
});

router.get("/health", (_req: Request, res: Response) => {
  return res.json({
    ok: true,
    service: "PoLi DACT Engine",
    dactVersion: "v0.1",
    timestamp: Date.now(),
    description: "PoLi engine consuming DACT v0.1 events without contamination",
    supportedVenues: VALID_VENUES,
    endpoints: [
      "GET /api/poli/dact/snapshot?venue=binance&symbol=BTC",
      "GET /api/poli/dact/evidence?venue=binance&symbol=BTC",
      "GET /api/poli/dact/full?venue=binance&symbol=BTC",
      "GET /api/poli/dact/multi?venue=binance&symbols=BTC,ETH,SOL",
      "POST /api/poli/dact/cache/clear",
      "GET /api/poli/dact/health",
    ],
  });
});

export default router;
