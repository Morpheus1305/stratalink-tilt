import { Router } from "express";
import type { Request, Response } from "express";
import {
  tsleBuffer,
  tsleStateEngine,
  type LISSnapshot,
} from "../services/tsle-buffer";

const router = Router();

const HYPERLIQUID_API = "https://api.hyperliquid.xyz/info";

function authCheck(req: Request, res: Response): boolean {
  const secret = process.env.RELAY_SECRET;
  if (!secret) return true;
  const provided = req.headers["x-relay-secret"] as string;
  if (provided !== secret) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return false;
  }
  return true;
}

function normalizeHyperliquidOrderbook(
  data: any,
  symbol: string
): LISSnapshot {
  const levels = data?.levels ?? [[], []];
  const bids: { px: number; sz: number }[] = (levels[0] ?? []).map((l: any) => ({
    px: parseFloat(l.px),
    sz: parseFloat(l.sz),
  }));
  const asks: { px: number; sz: number }[] = (levels[1] ?? []).map((l: any) => ({
    px: parseFloat(l.px),
    sz: parseFloat(l.sz),
  }));

  const bestBid = bids[0]?.px ?? 0;
  const bestAsk = asks[0]?.px ?? 0;
  const midPrice = (bestBid + bestAsk) / 2;
  const spreadAbsolute = bestAsk - bestBid;
  const spreadBps = midPrice > 0 ? (spreadAbsolute / midPrice) * 10_000 : 0;

  const bpsLevels = [0.1, 0.25, 0.5, 1, 2];
  const bands: Record<string, { bid_notional: number; ask_notional: number; total_notional: number }> = {};

  for (const bps of bpsLevels) {
    const range = midPrice * (bps / 100);
    const bidFloor = midPrice - range;
    const askCeil = midPrice + range;

    let bidNotional = 0;
    for (const b of bids) {
      if (b.px >= bidFloor) bidNotional += b.px * b.sz;
    }

    let askNotional = 0;
    for (const a of asks) {
      if (a.px <= askCeil) askNotional += a.px * a.sz;
    }

    bands[`pct_${bps}`] = {
      bid_notional: bidNotional,
      ask_notional: askNotional,
      total_notional: bidNotional + askNotional,
    };
  }

  return {
    venue: "hyperliquid",
    symbol: symbol.toUpperCase(),
    timestamp: Date.now(),
    mid_price: midPrice,
    spread: { absolute: spreadAbsolute, bps: spreadBps },
    bands,
  };
}

router.get("/perps/depth", async (req: Request, res: Response) => {
  if (!authCheck(req, res)) return;

  const symbol = String(req.query.symbol ?? "BTC").toUpperCase();

  try {
    const response = await fetch(HYPERLIQUID_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "l2Book",
        coin: symbol,
      }),
    });

    if (!response.ok) {
      return res.status(response.status).json({ ok: false, error: `Hyperliquid API ${response.status}` });
    }

    const data = await response.json();

    if (!data?.levels) {
      return res.status(502).json({ ok: false, error: "Empty Hyperliquid response" });
    }

    const snapshot = normalizeHyperliquidOrderbook(data, symbol);
    (snapshot as any).market = "perps";
    (snapshot as any).provenance = {
      sourceVenue: "hyperliquid",
      transport: "relay",
      engine: "hyperliquid-relay-v1",
      ts_fetch: Date.now(),
    };

    tsleBuffer.record(snapshot);
    const buffer = tsleBuffer.getHistory("hyperliquid", symbol);
    const tsle = tsleStateEngine.transition("hyperliquid", symbol, buffer, snapshot.spread.bps);
    (snapshot as any).tsle = tsle;

    return res.json({ ok: true, ...snapshot });
  } catch (err: any) {
    console.error("[Hyperliquid Relay]", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get("/perps/meta", async (req: Request, res: Response) => {
  if (!authCheck(req, res)) return;

  try {
    const response = await fetch(HYPERLIQUID_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "meta" }),
    });

    if (!response.ok) {
      return res.status(response.status).json({ ok: false, error: `Hyperliquid API ${response.status}` });
    }

    const data = await response.json();
    const universe = (data?.universe ?? []).map((u: any) => ({
      name: u.name,
      szDecimals: u.szDecimals,
      maxLeverage: u.maxLeverage,
    }));

    return res.json({ ok: true, venue: "hyperliquid", instruments: universe, count: universe.length });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get("/perps/funding", async (req: Request, res: Response) => {
  if (!authCheck(req, res)) return;

  const symbol = String(req.query.symbol ?? "BTC").toUpperCase();

  try {
    const response = await fetch(HYPERLIQUID_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "clearinghouseState",
        user: "0x0000000000000000000000000000000000000000",
      }),
    });

    if (!response.ok) {
      return res.status(response.status).json({ ok: false, error: `Hyperliquid API ${response.status}` });
    }

    const data = await response.json();

    return res.json({
      ok: true,
      venue: "hyperliquid",
      symbol,
      data,
      ts: Date.now(),
    });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get("/health", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    venue: "hyperliquid",
    engine: "hyperliquid-relay-v1",
    ts: Date.now(),
  });
});

export default router;
