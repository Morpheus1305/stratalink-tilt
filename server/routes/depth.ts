// server/routes/depth.ts
import { Router } from "express";
import type { Request, Response } from "express";

const router = Router();

/**
 * Stratalink Depth Endpoint (Phase 1)
 * -----------------------------------
 * GET /api/depth?token=BTC&venue=coinbase&bps=25
 *
 * Returns a stable response shape used by TSLE/PoLi wiring:
 * {
 *   symbol, bps,
 *   venues: [{ venue, bid, ask, ok, error }],
 *   totalBid, totalAsk, symmetry,
 *   timestamp,
 *   source: "live" | "fallback"
 * }
 *
 * Important:
 * - "bid"/"ask" are currently "liquidity notional proxies" derived from top-of-book levels.
 * - This is intentionally simple/stable while we wire in full depth quality math later.
 */

type DepthVenue = {
  venue: string; // "BINANCE" | "COINBASE" | "KRAKEN" | "OKX"
  bid: number;   // summed notional (price * qty) across top N bids
  ask: number;   // summed notional (price * qty) across top N asks
  ok: boolean;
  error: string | null;
};

type DepthResponse = {
  symbol: string;
  bps: number;
  venues: DepthVenue[];
  totalBid: number;
  totalAsk: number;
  symmetry: number;
  timestamp: number;
  source: "live" | "fallback";
};

// -------------------------
// tiny helpers
// -------------------------
const num = (x: unknown, d = 0) => (Number.isFinite(Number(x)) ? Number(x) : d);
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const lower = (s: unknown) => String(s ?? "").trim().toLowerCase();
const upper = (s: unknown) => String(s ?? "").trim().toUpperCase();

function computeSymmetry(totalBid: number, totalAsk: number): number {
  const denom = totalBid + totalAsk;
  if (!Number.isFinite(denom) || denom <= 0) return 0.5;
  return totalBid / denom;
}

function sumNotional(levels: Array<[string, string]>, maxLevels = 50): number {
  let total = 0;
  for (let i = 0; i < Math.min(levels.length, maxLevels); i++) {
    const p = num(levels[i][0], 0);
    const q = num(levels[i][1], 0);
    total += p * q;
  }
  return total;
}

// -------------------------
// Venue mappers
// -------------------------
function mapBinanceSymbol(token: string): string {
  // Phase 1 convention: BTC -> BTCUSDT
  return `${token}USDT`;
}

function mapCoinbaseProduct(token: string): string {
  // Phase 1 convention: BTC -> BTC-USD
  return `${token}-USD`;
}

function mapKrakenPair(token: string): string {
  // Kraken uses XBT for BTC
  if (token === "BTC") return "XBTUSD";
  return `${token}USD`;
}

function mapOKXInstId(token: string): string {
  // OKX common: BTC-USDT
  return `${token}-USDT`;
}

// -------------------------
// BINANCE VIA RELAY (Option A)
// -------------------------
async function getBinanceDepthViaRelay(token: string): Promise<DepthVenue> {
  const relayBase = (process.env.RELAY_BASE_URL || "https://relay.stratalink.ai").replace(/\/$/, "");
  const relayKey = process.env.RELAY_KEY;

  const symbol = mapBinanceSymbol(token);
  const limit = 1000;

  // Try a few common relay mount patterns.
  // (Your exact worker/nginx path may differ; this list maximizes chance of success.)
  const candidates = [
    // Pattern A: /binance/depth
    `${relayBase}/binance/depth?symbol=${encodeURIComponent(symbol)}&limit=${limit}`,
    // Pattern B: /depth?venue=binance
    `${relayBase}/depth?venue=binance&symbol=${encodeURIComponent(symbol)}&limit=${limit}`,
    // Pattern C: /api/binance/depth
    `${relayBase}/api/binance/depth?symbol=${encodeURIComponent(symbol)}&limit=${limit}`,
    // Pattern D: /api/depth?venue=binance
    `${relayBase}/api/depth?venue=binance&symbol=${encodeURIComponent(symbol)}&limit=${limit}`,
  ];

  let lastErr = "Relay fetch failed";

  for (const url of candidates) {
    try {
      const resp = await fetch(url, {
        headers: {
          Accept: "application/json",
          ...(relayKey ? { "x-relay-key": relayKey } : {}),
        },
      });

      if (!resp.ok) {
        lastErr = `HTTP ${resp.status}`;
        continue;
      }

      const data = (await resp.json()) as any;

      // Expect Binance-like shape: { bids: [[price, qty],...], asks: [[price, qty],...] }
      const bids: Array<[string, string]> = Array.isArray(data?.bids) ? data.bids : [];
      const asks: Array<[string, string]> = Array.isArray(data?.asks) ? data.asks : [];

      if (!bids.length && !asks.length) {
        lastErr = "Empty orderbook from relay";
        continue;
      }

      const bidNotional = sumNotional(bids, 50);
      const askNotional = sumNotional(asks, 50);

      return { venue: "BINANCE", bid: bidNotional, ask: askNotional, ok: true, error: null };
    } catch (e: any) {
      lastErr = e?.message ?? "relay_error";
      continue;
    }
  }

  return { venue: "BINANCE", bid: 0, ask: 0, ok: false, error: lastErr };
}

// -------------------------
// COINBASE DIRECT
// -------------------------
async function getCoinbaseDepthDirect(token: string): Promise<DepthVenue> {
  const productId = mapCoinbaseProduct(token);

  try {
    // Coinbase Exchange book endpoint (level=2 is aggregated)
    const url = `https://api.exchange.coinbase.com/products/${encodeURIComponent(productId)}/book?level=2`;

    const resp = await fetch(url, { headers: { Accept: "application/json" } });
    if (!resp.ok) {
      return { venue: "COINBASE", bid: 0, ask: 0, ok: false, error: `HTTP ${resp.status}` };
    }

    const data = (await resp.json()) as { bids?: Array<[string, string]>; asks?: Array<[string, string]> };

    const bids = Array.isArray(data?.bids) ? data.bids : [];
    const asks = Array.isArray(data?.asks) ? data.asks : [];

    const bidNotional = sumNotional(bids, 50);
    const askNotional = sumNotional(asks, 50);

    return { venue: "COINBASE", bid: bidNotional, ask: askNotional, ok: true, error: null };
  } catch (e: any) {
    return { venue: "COINBASE", bid: 0, ask: 0, ok: false, error: e?.message ?? "coinbase_error" };
  }
}

// -------------------------
// KRAKEN DIRECT (optional but useful)
// -------------------------
async function getKrakenDepthDirect(token: string): Promise<DepthVenue> {
  const pair = mapKrakenPair(token);

  try {
    const url = `https://api.kraken.com/0/public/Depth?pair=${encodeURIComponent(pair)}&count=50`;
    const resp = await fetch(url, { headers: { Accept: "application/json" } });

    if (!resp.ok) {
      return { venue: "KRAKEN", bid: 0, ask: 0, ok: false, error: `HTTP ${resp.status}` };
    }

    const data = (await resp.json()) as any;
    const resultKey = data?.result ? Object.keys(data.result)[0] : null;
    const book = resultKey ? data.result[resultKey] : null;

    const bids: Array<[string, string]> = Array.isArray(book?.bids) ? book.bids : [];
    const asks: Array<[string, string]> = Array.isArray(book?.asks) ? book.asks : [];

    const bidNotional = sumNotional(bids, 50);
    const askNotional = sumNotional(asks, 50);

    return { venue: "KRAKEN", bid: bidNotional, ask: askNotional, ok: true, error: null };
  } catch (e: any) {
    return { venue: "KRAKEN", bid: 0, ask: 0, ok: false, error: e?.message ?? "kraken_error" };
  }
}

// -------------------------
// OKX DIRECT (optional)
// -------------------------
async function getOKXDepthDirect(token: string): Promise<DepthVenue> {
  const instId = mapOKXInstId(token);

  try {
    const url = `https://www.okx.com/api/v5/market/books?instId=${encodeURIComponent(instId)}&sz=50`;
    const resp = await fetch(url, { headers: { Accept: "application/json" } });

    if (!resp.ok) {
      return { venue: "OKX", bid: 0, ask: 0, ok: false, error: `HTTP ${resp.status}` };
    }

    const data = (await resp.json()) as any;
    const book = Array.isArray(data?.data) ? data.data[0] : null;

    // OKX: bids/asks arrays like [[price, qty, ...], ...]
    const bidsRaw: any[] = Array.isArray(book?.bids) ? book.bids : [];
    const asksRaw: any[] = Array.isArray(book?.asks) ? book.asks : [];

    const bids: Array<[string, string]> = bidsRaw.map((r) => [String(r?.[0] ?? "0"), String(r?.[1] ?? "0")]);
    const asks: Array<[string, string]> = asksRaw.map((r) => [String(r?.[0] ?? "0"), String(r?.[1] ?? "0")]);

    const bidNotional = sumNotional(bids, 50);
    const askNotional = sumNotional(asks, 50);

    return { venue: "OKX", bid: bidNotional, ask: askNotional, ok: true, error: null };
  } catch (e: any) {
    return { venue: "OKX", bid: 0, ask: 0, ok: false, error: e?.message ?? "okx_error" };
  }
}

// -------------------------
// Router handler
// -------------------------
router.get("/", async (req: Request, res: Response) => {
  try {
    const token = upper(req.query.token ?? "BTC");
    const venue = lower(req.query.venue ?? "coinbase");
    const bps = clamp(num(req.query.bps, 25), 1, 500);

    let venueResult: DepthVenue;

    if (venue === "binance") {
      // ✅ Option A: relay
      venueResult = await getBinanceDepthViaRelay(token);
    } else if (venue === "coinbase") {
      venueResult = await getCoinbaseDepthDirect(token);
    } else if (venue === "kraken") {
      venueResult = await getKrakenDepthDirect(token);
    } else if (venue === "okx") {
      venueResult = await getOKXDepthDirect(token);
    } else {
      venueResult = {
        venue: upper(venue),
        bid: 0,
        ask: 0,
        ok: false,
        error: "Unknown venue",
      };
    }

    const venues: DepthVenue[] = [venueResult];

    const totalBid = venues.reduce((acc, v) => acc + (v.ok ? num(v.bid, 0) : 0), 0);
    const totalAsk = venues.reduce((acc, v) => acc + (v.ok ? num(v.ask, 0) : 0), 0);

    const out: DepthResponse = {
      symbol: token,
      bps,
      venues,
      totalBid,
      totalAsk,
      symmetry: computeSymmetry(totalBid, totalAsk),
      timestamp: Date.now(),
      source: venueResult.ok ? "live" : "fallback",
    };

    return res.json(out);
  } catch (err: any) {
    const out: DepthResponse = {
      symbol: upper(req.query.token ?? "BTC"),
      bps: clamp(num(req.query.bps, 25), 1, 500),
      venues: [
        {
          venue: upper(req.query.venue ?? "UNKNOWN"),
          bid: 0,
          ask: 0,
          ok: false,
          error: err?.message ?? "depth_error",
        },
      ],
      totalBid: 0,
      totalAsk: 0,
      symmetry: 0.5,
      timestamp: Date.now(),
      source: "fallback",
    };

    return res.status(200).json(out);
  }
});

export default router;