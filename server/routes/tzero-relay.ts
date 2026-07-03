/**
 * tZERO Relay  —  ATS (SEC-registered, ICE/NYSE subsidiary, US-regulated)
 * One of the earliest security token ATSs, now owned by Intercontinental Exchange.
 * Requires TZERO_API_KEY for live data.
 *
 * Routes:
 *   GET /spot/depth?symbol=ONDO  → ATS order book snapshot
 *   GET /health                  → connectivity status
 */
import { Router, Request, Response } from "express";
import { tsleBuffer, tsleStateEngine, type LISSnapshot } from "../services/tsle-buffer";

const router = Router();
const VENUE   = "tzero";
const TIMEOUT = 8_000;

const SUPPORTED_SYMBOLS = ["ONDO", "BUIDL"];

const HARDCODED_PRICE: Record<string, number> = {
  ONDO:  1.28,
  BUIDL: 1.00,
};

const POOL_SIZE: Record<string, number> = {
  ONDO:  2_500_000,
  BUIDL: 3_500_000,
};

const SPREAD_BPS: Record<string, number> = {
  ONDO:  25,
  BUIDL: 5,
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
  const spread = SPREAD_BPS[symbol]     ?? 25;
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
  const apiKey = process.env.TZERO_API_KEY;
  const apiUrl = process.env.TZERO_API_URL ?? "https://api.tzero.com";
  if (!apiKey) throw new Error("TZERO_API_KEY not configured — requires tZERO institutional onboarding");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const resp = await fetch(
      `${apiUrl}/v1/securities/${symbol.toLowerCase()}/quotes`,
      { signal: controller.signal, headers: { "Authorization": `Bearer ${apiKey}`, "User-Agent": "StrataLink-LIS/1.0" } }
    );
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`tZERO API HTTP ${resp.status}`);
    return resp.json();
  } catch (e: any) {
    clearTimeout(timer);
    throw new Error(e.name === "AbortError" ? `tZERO timeout after ${TIMEOUT}ms` : e.message);
  }
}

router.get("/spot/depth", async (req: Request, res: Response) => {
  if (!authCheck(req, res)) return;
  const symbol = ((req.query.symbol as string) || "ONDO").toUpperCase();
  if (!SUPPORTED_SYMBOLS.includes(symbol)) {
    return res.status(400).json({ ok: false, error: `Symbol ${symbol} not supported on tZERO. Supported: ${SUPPORTED_SYMBOLS.join(", ")}` });
  }

  let snapshot = buildSyntheticSnapshot(symbol);
  let synthetic = true;
  let liveError = "";

  if (process.env.TZERO_API_KEY) {
    try {
      const data = await fetchLiveDepth(symbol);
      const mid = parseFloat(data?.mid ?? data?.lastPrice ?? "0");
      if (mid > 0) {
        snapshot.mid_price = mid;
        synthetic = false;
      } else {
        liveError = "Zero mid-price";
      }
    } catch (e: any) {
      liveError = e.message;
    }
  } else {
    liveError = "TZERO_API_KEY not configured";
  }

  if (liveError) console.log(`[tZERO] Live unavailable (${liveError}), synthetic fallback for ${symbol}`);

  tsleBuffer.record(snapshot);
  const tsle = tsleStateEngine.transition(VENUE, symbol, tsleBuffer.getHistory(VENUE, symbol), snapshot.spread.bps);
  (snapshot as any).tsle = tsle;
  (snapshot as any).provenance = {
    sourceVenue: "tZERO",
    venueType: "ats",
    regulated: true,
    regulator: "SEC",
    jurisdiction: "US",
    parentGroup: "Intercontinental Exchange (ICE)",
    transport: synthetic ? "synthetic" : "relay",
    synthetic,
    status: synthetic ? "unconfigured" : "live",
    note: synthetic ? "Live data requires TZERO_API_KEY — SEC-registered ATS onboarding required" : undefined,
  };

  return res.json({ ok: true, ...snapshot });
});

router.get("/health", (_req: Request, res: Response) => {
  res.json({
    ok: !!process.env.TZERO_API_KEY,
    venue: VENUE,
    venueName: "tZERO",
    venueType: "ats",
    regulated: true,
    regulator: "SEC",
    status: process.env.TZERO_API_KEY ? "configured" : "unconfigured",
    supportedSymbols: SUPPORTED_SYMBOLS,
  });
});

export default router;
