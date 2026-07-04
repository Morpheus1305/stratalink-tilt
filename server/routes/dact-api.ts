import { Router, Request, Response } from "express";
import { getDactEvents, getDactStats, getVenueStatMap } from "../services/dact-tape";
import { VENUE_CONFIGS } from "../../shared/venue-config";

const router = Router();

const VENUE_META: Record<string, { type: string; chain: string; group: string }> = {
  binance:            { type: "CEX",      chain: "cross-chain", group: "Centralised Exchanges" },
  coinbase:           { type: "CEX",      chain: "cross-chain", group: "Centralised Exchanges" },
  kraken:             { type: "CEX",      chain: "cross-chain", group: "Centralised Exchanges" },
  okx:                { type: "CEX",      chain: "cross-chain", group: "Centralised Exchanges" },
  bybit:              { type: "CEX",      chain: "cross-chain", group: "Centralised Exchanges" },
  deribit:            { type: "CEX",      chain: "cross-chain", group: "Centralised Exchanges" },
  bitget:             { type: "CEX",      chain: "cross-chain", group: "Centralised Exchanges" },
  hyperliquid:        { type: "DEX-PERP", chain: "hyperliquid-l1", group: "DEX Perpetuals" },
  dydx:               { type: "DEX-PERP", chain: "cosmos",      group: "DEX Perpetuals" },
  gmx:                { type: "DEX-PERP", chain: "arbitrum",    group: "DEX Perpetuals" },
  uniswap:            { type: "AMM",      chain: "ethereum",    group: "DEX Spot" },
  curve:              { type: "AMM",      chain: "ethereum",    group: "DEX Spot" },
  aerodrome:          { type: "AMM",      chain: "base",        group: "L2 DEX" },
  velodrome:          { type: "AMM",      chain: "optimism",    group: "L2 DEX" },
  pancakeswap:        { type: "AMM",      chain: "bnb",         group: "L2 DEX" },
  "uniswap-worldchain": { type: "AMM",   chain: "worldchain",  group: "L2 DEX" },
  syncswap:           { type: "AMM",      chain: "zksync",      group: "L2 DEX" },
  "linea-dex":        { type: "AMM",      chain: "linea",       group: "L2 DEX" },
  "scroll-dex":       { type: "AMM",      chain: "scroll",      group: "L2 DEX" },
  otc:                { type: "RFQ",      chain: "cross-chain", group: "Dark / Institutional" },
  securitize:         { type: "ATS",      chain: "ethereum",    group: "Regulated STE" },
  archax:             { type: "MTF",      chain: "ethereum",    group: "Regulated STE" },
  inx:                { type: "ATS",      chain: "ethereum",    group: "Regulated STE" },
  tzero:              { type: "ATS",      chain: "ethereum",    group: "Regulated STE" },
  sdx:                { type: "MTF",      chain: "ethereum",    group: "Regulated STE" },
  addx:               { type: "ATS",      chain: "ethereum",    group: "Regulated STE" },
};

router.get("/events", (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit ?? 100), 500);
  const eventType = String(req.query.eventType ?? "ALL");
  const venue = String(req.query.venue ?? "ALL");
  const asset = String(req.query.asset ?? "ALL");
  const sourceClass = String(req.query.sourceClass ?? "ALL");

  const events = getDactEvents({ limit, eventType, venue, asset, sourceClass });
  res.json({ ok: true, events, count: events.length, timestamp: Date.now() });
});

router.get("/stats", (_req: Request, res: Response) => {
  res.json({ ok: true, stats: getDactStats(), timestamp: Date.now() });
});

router.get("/venues", (_req: Request, res: Response) => {
  const statMap = getVenueStatMap();
  const venues = Object.keys(VENUE_CONFIGS).map(id => {
    const cfg = VENUE_CONFIGS[id];
    const vs = statMap[id] ?? null;
    const meta = VENUE_META[id] ?? { type: "REST", chain: "unknown", group: "Other" };
    return {
      id,
      displayName: cfg.displayName,
      type: meta.type,
      chain: meta.chain,
      group: meta.group,
      status: vs?.status ?? "OFFLINE",
      lastEventTs: vs?.lastEventTs ?? 0,
      p95LatencyMs: vs?.p95LatencyMs ?? 0,
      eventsPerMin: vs?.eventsPerMin ?? 0,
      sourceClass: vs?.sourceClass ?? "synthetic",
      transport: vs?.transport ?? "unknown",
      syntheticReason: vs?.syntheticReason,
    };
  });
  res.json({ ok: true, venues, timestamp: Date.now() });
});

export default router;
