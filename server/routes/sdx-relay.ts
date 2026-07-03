/**
 * SDX Relay  —  MTF (FINMA-regulated, SIX Digital Exchange, Switzerland)
 * Operated by SIX Group (Swiss stock exchange operator). Institutional-grade
 * regulated infrastructure for digital bonds, structured products, tokenized funds.
 * Requires SDX_API_KEY for live data.
 *
 * Routes:
 *   GET /spot/depth?symbol=BCSPX  → MTF order book snapshot
 *   GET /health                   → connectivity status
 */
import { Router, Request, Response } from "express";
import { tsleBuffer, tsleStateEngine, type LISSnapshot } from "../services/tsle-buffer";

const router = Router();
const VENUE   = "sdx";
const TIMEOUT = 8_000;

const SUPPORTED_SYMBOLS = ["BCSPX", "BIB01", "BUIDL"];

const HARDCODED_PRICE: Record<string, number> = {
  BCSPX: 510.0,
  BIB01: 103.0,
  BUIDL: 1.00,
};

const POOL_SIZE: Record<string, number> = {
  BCSPX: 6_000_000,
  BIB01: 6_000_000,
  BUIDL: 4_000_000,
};

const SPREAD_BPS: Record<string, number> = {
  BCSPX: 20,
  BIB01: 15,
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
  const mid    = HARDCODED_PRICE[symbol] ?? 100;
  const spread = SPREAD_BPS[symbol]     ?? 20;
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
  const apiKey = process.env.SDX_API_KEY;
  const apiUrl = process.env.SDX_API_URL ?? "https://api.six-digital-exchange.com";
  if (!apiKey) throw new Error("SDX_API_KEY not configured — requires SIX Digital Exchange institutional agreement");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const resp = await fetch(
      `${apiUrl}/v1/instruments/${symbol.toUpperCase()}/orderbook`,
      { signal: controller.signal, headers: { "X-API-Key": apiKey, "User-Agent": "StrataLink-LIS/1.0" } }
    );
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`SDX API HTTP ${resp.status}`);
    return resp.json();
  } catch (e: any) {
    clearTimeout(timer);
    throw new Error(e.name === "AbortError" ? `SDX timeout after ${TIMEOUT}ms` : e.message);
  }
}

router.get("/spot/depth", async (req: Request, res: Response) => {
  if (!authCheck(req, res)) return;
  const symbol = ((req.query.symbol as string) || "BCSPX").toUpperCase();
  if (!SUPPORTED_SYMBOLS.includes(symbol)) {
    return res.status(400).json({ ok: false, error: `Symbol ${symbol} not supported on SDX. Supported: ${SUPPORTED_SYMBOLS.join(", ")}` });
  }

  let snapshot = buildSyntheticSnapshot(symbol);
  let synthetic = true;
  let liveError = "";

  if (process.env.SDX_API_KEY) {
    try {
      const data = await fetchLiveDepth(symbol);
      const bids = data?.bids ?? [];
      const asks = data?.asks ?? [];
      if (bids.length > 0 && asks.length > 0) {
        const bestBid = parseFloat(bids[0]?.price ?? bids[0][0] ?? "0");
        const bestAsk = parseFloat(asks[0]?.price ?? asks[0][0] ?? "0");
        const mid = (bestBid + bestAsk) / 2;
        if (mid > 0) {
          snapshot.mid_price = mid;
          snapshot.spread = { absolute: bestAsk - bestBid, bps: ((bestAsk - bestBid) / mid) * 10_000 };
          synthetic = false;
        } else {
          liveError = "Zero mid-price";
        }
      } else {
        liveError = "Empty order book";
      }
    } catch (e: any) {
      liveError = e.message;
    }
  } else {
    liveError = "SDX_API_KEY not configured";
  }

  if (liveError) console.log(`[SDX] Live unavailable (${liveError}), synthetic fallback for ${symbol}`);

  tsleBuffer.record(snapshot);
  const tsle = tsleStateEngine.transition(VENUE, symbol, tsleBuffer.getHistory(VENUE, symbol), snapshot.spread.bps);
  (snapshot as any).tsle = tsle;
  (snapshot as any).provenance = {
    sourceVenue: "SIX Digital Exchange (SDX)",
    venueType: "mtf",
    regulated: true,
    regulator: "FINMA",
    jurisdiction: "Switzerland",
    parentGroup: "SIX Group",
    transport: synthetic ? "synthetic" : "relay",
    synthetic,
    status: synthetic ? "unconfigured" : "live",
    note: synthetic ? "Live data requires SDX_API_KEY — FINMA-regulated institutional agreement required" : undefined,
  };

  return res.json({ ok: true, ...snapshot });
});

router.get("/health", (_req: Request, res: Response) => {
  res.json({
    ok: !!process.env.SDX_API_KEY,
    venue: VENUE,
    venueName: "SIX Digital Exchange (SDX)",
    venueType: "mtf",
    regulated: true,
    regulator: "FINMA",
    status: process.env.SDX_API_KEY ? "configured" : "unconfigured",
    supportedSymbols: SUPPORTED_SYMBOLS,
  });
});

export default router;
