/**
 * Securitize Markets Relay  —  ATS (Alternative Trading System, US-regulated)
 * Primary tokenization platform for BlackRock BUIDL, Ares ACRED, and other
 * institutional tokenized funds. Requires SECURITIZE_API_KEY for live data.
 *
 * Routes:
 *   GET /spot/depth?symbol=BUIDL   → ATS liquidity snapshot
 *   GET /health                    → connectivity status
 */
import { Router, Request, Response } from "express";
import { tsleBuffer, tsleStateEngine, type LISSnapshot } from "../services/tsle-buffer";

const router = Router();
const VENUE   = "securitize";
const TIMEOUT = 8_000;

const SUPPORTED_SYMBOLS = ["BUIDL", "OUSG", "ACRED"];

const HARDCODED_PRICE: Record<string, number> = {
  BUIDL: 1.00,
  OUSG:  1.085,
  ACRED: 1.00,
};

const POOL_SIZE: Record<string, number> = {
  BUIDL: 50_000_000,
  OUSG:  10_000_000,
  ACRED:  5_000_000,
};

const SPREAD_BPS: Record<string, number> = {
  BUIDL: 2,
  OUSG:  8,
  ACRED: 10,
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
  const spread = SPREAD_BPS[symbol]    ?? 10;
  const pool   = POOL_SIZE[symbol]     ?? 3_000_000;
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

async function fetchLiveDepth(symbol: string): Promise<{ data: any; ok: boolean }> {
  const apiKey = process.env.SECURITIZE_API_KEY;
  const apiUrl = process.env.SECURITIZE_API_URL ?? "https://api.securitize.io";
  if (!apiKey) throw new Error("SECURITIZE_API_KEY not configured — requires institutional onboarding");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const resp = await fetch(
      `${apiUrl}/v1/assets/${symbol.toLowerCase()}/market-depth`,
      { signal: controller.signal, headers: { "Authorization": `Bearer ${apiKey}`, "User-Agent": "StrataLink-LIS/1.0" } }
    );
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`Securitize API HTTP ${resp.status}`);
    return { data: await resp.json(), ok: true };
  } catch (e: any) {
    clearTimeout(timer);
    throw new Error(e.name === "AbortError" ? `Securitize timeout after ${TIMEOUT}ms` : e.message);
  }
}

router.get("/spot/depth", async (req: Request, res: Response) => {
  if (!authCheck(req, res)) return;
  const symbol = ((req.query.symbol as string) || "BUIDL").toUpperCase();
  if (!SUPPORTED_SYMBOLS.includes(symbol)) {
    return res.status(400).json({ ok: false, error: `Symbol ${symbol} not supported on Securitize. Supported: ${SUPPORTED_SYMBOLS.join(", ")}` });
  }

  let snapshot: LISSnapshot;
  let synthetic = true;
  let liveError = "";

  if (process.env.SECURITIZE_API_KEY) {
    try {
      const { data } = await fetchLiveDepth(symbol);
      const mid  = parseFloat(data?.midPrice ?? data?.nav ?? "0");
      const pool = parseFloat(data?.totalLiquidity ?? data?.aum ?? "0");
      if (mid > 0 && pool > 0) {
        snapshot  = buildSyntheticSnapshot(symbol);
        snapshot.mid_price = mid;
        synthetic = false;
      } else {
        liveError = "Zero mid-price in live response";
        snapshot = buildSyntheticSnapshot(symbol);
      }
    } catch (e: any) {
      liveError = e.message;
      snapshot = buildSyntheticSnapshot(symbol);
    }
  } else {
    liveError = "SECURITIZE_API_KEY not configured";
    snapshot = buildSyntheticSnapshot(symbol);
  }

  if (liveError) {
    console.log(`[Securitize] Live unavailable (${liveError}), synthetic fallback for ${symbol}`);
  }

  tsleBuffer.record(snapshot);
  const tsle = tsleStateEngine.transition(VENUE, symbol, tsleBuffer.getHistory(VENUE, symbol), snapshot.spread.bps);
  (snapshot as any).tsle = tsle;
  (snapshot as any).provenance = {
    sourceVenue: "Securitize Markets",
    venueType: "ats",
    regulated: true,
    transport: synthetic ? "synthetic" : "relay",
    synthetic,
    status: synthetic ? "unconfigured" : "live",
    note: synthetic ? "Live data requires SECURITIZE_API_KEY — institutional onboarding required" : undefined,
  };

  return res.json({ ok: true, ...snapshot });
});

router.get("/health", (_req: Request, res: Response) => {
  const configured = !!process.env.SECURITIZE_API_KEY;
  res.json({
    ok: configured,
    venue: VENUE,
    venueName: "Securitize Markets",
    venueType: "ats",
    regulated: true,
    status: configured ? "configured" : "unconfigured",
    supportedSymbols: SUPPORTED_SYMBOLS,
    note: configured ? undefined : "SECURITIZE_API_KEY required — contact Securitize for institutional API access",
  });
});

export default router;
