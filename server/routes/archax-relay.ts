/**
 * Archax Relay  —  MTF (Multilateral Trading Facility, FCA-regulated, UK)
 * First FCA-regulated digital securities exchange. Lists tokenized MMFs,
 * bonds, and equities. Requires ARCHAX_API_KEY for live data.
 *
 * Routes:
 *   GET /spot/depth?symbol=BENJI  → MTF order book snapshot
 *   GET /health                   → connectivity status
 */
import { Router, Request, Response } from "express";
import { tsleBuffer, tsleStateEngine, type LISSnapshot } from "../services/tsle-buffer";

const router = Router();
const VENUE   = "archax";
const TIMEOUT = 8_000;

const SUPPORTED_SYMBOLS = ["BUIDL", "OUSG", "BENJI", "VBILL", "BCSPX", "BIB01"];

const HARDCODED_PRICE: Record<string, number> = {
  BUIDL: 1.000,
  OUSG:  1.085,
  BENJI: 1.000,
  VBILL: 1.000,
  BCSPX: 510.0,
  BIB01: 103.0,
};

const POOL_SIZE: Record<string, number> = {
  BUIDL:  8_000_000,
  OUSG:   4_000_000,
  BENJI:  3_000_000,
  VBILL:  3_000_000,
  BCSPX:  5_000_000,
  BIB01:  5_000_000,
};

const SPREAD_BPS: Record<string, number> = {
  BUIDL: 5,
  OUSG:  10,
  BENJI: 8,
  VBILL: 8,
  BCSPX: 25,
  BIB01: 20,
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
  const spread = SPREAD_BPS[symbol]     ?? 15;
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
  const apiKey = process.env.ARCHAX_API_KEY;
  const apiUrl = process.env.ARCHAX_API_URL ?? "https://api.archax.com";
  if (!apiKey) throw new Error("ARCHAX_API_KEY not configured — requires FCA-regulated onboarding");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const resp = await fetch(
      `${apiUrl}/v1/instruments/${symbol.toLowerCase()}/orderbook`,
      { signal: controller.signal, headers: { "X-API-Key": apiKey, "User-Agent": "StrataLink-LIS/1.0" } }
    );
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`Archax API HTTP ${resp.status}`);
    return resp.json();
  } catch (e: any) {
    clearTimeout(timer);
    throw new Error(e.name === "AbortError" ? `Archax timeout after ${TIMEOUT}ms` : e.message);
  }
}

router.get("/spot/depth", async (req: Request, res: Response) => {
  if (!authCheck(req, res)) return;
  const symbol = ((req.query.symbol as string) || "BUIDL").toUpperCase();
  if (!SUPPORTED_SYMBOLS.includes(symbol)) {
    return res.status(400).json({ ok: false, error: `Symbol ${symbol} not supported on Archax. Supported: ${SUPPORTED_SYMBOLS.join(", ")}` });
  }

  let snapshot: LISSnapshot;
  let synthetic = true;
  let liveError = "";

  if (process.env.ARCHAX_API_KEY) {
    try {
      const data = await fetchLiveDepth(symbol);
      const bids = data?.bids ?? [];
      const asks = data?.asks ?? [];
      if (bids.length > 0 && asks.length > 0) {
        const bestBid = parseFloat(bids[0][0]);
        const bestAsk = parseFloat(asks[0][0]);
        const mid     = (bestBid + bestAsk) / 2;
        if (mid > 0) {
          snapshot = buildSyntheticSnapshot(symbol);
          snapshot.mid_price = mid;
          snapshot.spread = { absolute: bestAsk - bestBid, bps: ((bestAsk - bestBid) / mid) * 10_000 };
          synthetic = false;
        } else {
          liveError = "Zero mid-price";
          snapshot = buildSyntheticSnapshot(symbol);
        }
      } else {
        liveError = "Empty order book";
        snapshot = buildSyntheticSnapshot(symbol);
      }
    } catch (e: any) {
      liveError = e.message;
      snapshot = buildSyntheticSnapshot(symbol);
    }
  } else {
    liveError = "ARCHAX_API_KEY not configured";
    snapshot = buildSyntheticSnapshot(symbol);
  }

  if (liveError) {
    console.log(`[Archax] Live unavailable (${liveError}), synthetic fallback for ${symbol}`);
  }

  tsleBuffer.record(snapshot);
  const tsle = tsleStateEngine.transition(VENUE, symbol, tsleBuffer.getHistory(VENUE, symbol), snapshot.spread.bps);
  (snapshot as any).tsle = tsle;
  (snapshot as any).provenance = {
    sourceVenue: "Archax",
    venueType: "mtf",
    regulated: true,
    regulator: "FCA",
    jurisdiction: "UK",
    transport: synthetic ? "synthetic" : "relay",
    synthetic,
    status: synthetic ? "unconfigured" : "live",
    note: synthetic ? "Live data requires ARCHAX_API_KEY — FCA-regulated institutional onboarding required" : undefined,
  };

  return res.json({ ok: true, ...snapshot });
});

router.get("/health", (_req: Request, res: Response) => {
  const configured = !!process.env.ARCHAX_API_KEY;
  res.json({
    ok: configured,
    venue: VENUE,
    venueName: "Archax",
    venueType: "mtf",
    regulated: true,
    regulator: "FCA",
    status: configured ? "configured" : "unconfigured",
    supportedSymbols: SUPPORTED_SYMBOLS,
    note: configured ? undefined : "ARCHAX_API_KEY required — contact Archax for FCA-regulated institutional API access",
  });
});

export default router;
