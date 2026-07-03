/**
 * ADDX Relay  —  MTF (MAS-regulated, Singapore)
 * MAS-licensed private exchange for tokenized funds, private credit,
 * and structured notes. Strong Asia-Pacific institutional presence.
 * Requires ADDX_API_KEY for live data.
 *
 * Routes:
 *   GET /spot/depth?symbol=BUIDL  → MTF order book snapshot
 *   GET /health                   → connectivity status
 */
import { Router, Request, Response } from "express";
import { tsleBuffer, tsleStateEngine, type LISSnapshot } from "../services/tsle-buffer";

const router = Router();
const VENUE   = "addx";
const TIMEOUT = 8_000;

const SUPPORTED_SYMBOLS = ["BUIDL", "OUSG", "BENJI", "USDY"];

const HARDCODED_PRICE: Record<string, number> = {
  BUIDL: 1.000,
  OUSG:  1.085,
  BENJI: 1.000,
  USDY:  1.000,
};

const POOL_SIZE: Record<string, number> = {
  BUIDL: 5_000_000,
  OUSG:  3_000_000,
  BENJI: 2_500_000,
  USDY:  4_000_000,
};

const SPREAD_BPS: Record<string, number> = {
  BUIDL: 5,
  OUSG:  10,
  BENJI: 8,
  USDY:  8,
};

function authCheck(req: Request, res: Response): boolean {
  const secret = process.env.RELAY_SECRET;
  if (!secret) return true;
  if (req.headers["x-relay-secret"] !== secret) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return false;
  }
  return true;
}

function buildSyntheticSnapshot(symbol: string): LISSnapshot {
  const mid    = HARDCODED_PRICE[symbol] ?? 1;
  const spread = SPREAD_BPS[symbol]     ?? 10;
  const pool   = POOL_SIZE[symbol]      ?? 2_000_000;
  const bands: Record<string, { bid_notional: number; ask_notional: number; total_notional: number }> = {};
  for (const bps of [0.1, 0.25, 0.5, 1, 2]) {
    const total = pool * (bps / 2);
    bands[`pct_${bps}`] = {
      bid_notional: Math.round(total * 0.5),
      ask_notional: Math.round(total * 0.5),
      total_notional: Math.round(total),
    };
  }
  return {
    venue: VENUE, symbol: symbol.toUpperCase(), timestamp: Date.now(),
    mid_price: mid,
    spread: { absolute: mid * (spread / 10_000), bps: spread },
    bands,
  };
}

async function fetchLiveDepth(symbol: string): Promise<any> {
  const apiKey = process.env.ADDX_API_KEY;
  const apiUrl = process.env.ADDX_API_URL ?? "https://api.addx.co";
  if (!apiKey) throw new Error("ADDX_API_KEY not configured — requires MAS-regulated ADDX onboarding");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const resp = await fetch(
      `${apiUrl}/v1/products/${symbol.toLowerCase()}/market`,
      { signal: controller.signal, headers: { "X-API-Key": apiKey, "User-Agent": "StrataLink-LIS/1.0" } }
    );
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`ADDX API HTTP ${resp.status}`);
    return resp.json();
  } catch (e: any) {
    clearTimeout(timer);
    throw new Error(e.name === "AbortError" ? `ADDX timeout after ${TIMEOUT}ms` : e.message);
  }
}

router.get("/spot/depth", async (req: Request, res: Response) => {
  if (!authCheck(req, res)) return;
  const symbol = ((req.query.symbol as string) || "BUIDL").toUpperCase();
  if (!SUPPORTED_SYMBOLS.includes(symbol)) {
    return res.status(400).json({ ok: false, error: `Symbol ${symbol} not supported on ADDX. Supported: ${SUPPORTED_SYMBOLS.join(", ")}` });
  }

  let snapshot = buildSyntheticSnapshot(symbol);
  let synthetic = true;
  let liveError = "";

  if (process.env.ADDX_API_KEY) {
    try {
      const data = await fetchLiveDepth(symbol);
      const nav = parseFloat(data?.nav ?? data?.price ?? data?.midPrice ?? "0");
      if (nav > 0) {
        snapshot.mid_price = nav;
        synthetic = false;
      } else {
        liveError = "Zero NAV in live response";
      }
    } catch (e: any) {
      liveError = e.message;
    }
  } else {
    liveError = "ADDX_API_KEY not configured";
  }

  if (liveError) console.log(`[ADDX] Live unavailable (${liveError}), synthetic fallback for ${symbol}`);

  tsleBuffer.record(snapshot);
  const tsle = tsleStateEngine.transition(VENUE, symbol, tsleBuffer.getHistory(VENUE, symbol), snapshot.spread.bps);
  (snapshot as any).tsle = tsle;
  (snapshot as any).provenance = {
    sourceVenue: "ADDX",
    venueType: "mtf",
    regulated: true,
    regulator: "MAS",
    jurisdiction: "Singapore",
    transport: synthetic ? "synthetic" : "relay",
    synthetic,
    status: synthetic ? "unconfigured" : "live",
    note: synthetic ? "Live data requires ADDX_API_KEY — MAS-regulated institutional onboarding required" : undefined,
  };

  return res.json({ ok: true, ...snapshot });
});

router.get("/health", (_req: Request, res: Response) => {
  res.json({
    ok: !!process.env.ADDX_API_KEY,
    venue: VENUE,
    venueName: "ADDX",
    venueType: "mtf",
    regulated: true,
    regulator: "MAS",
    status: process.env.ADDX_API_KEY ? "configured" : "unconfigured",
    supportedSymbols: SUPPORTED_SYMBOLS,
  });
});

export default router;
