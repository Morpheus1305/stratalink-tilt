// server/routes/depth.ts
import { Router } from "express";
import type { Request, Response } from "express";

const router = Router();

/**
 * Depth API response (what your UI/TSLE expects today)
 */
type DepthVenue = {
  venue: string; // e.g. "BINANCE" | "COINBASE" | "KRAKEN" | "OKX"
  bid: number; // USD notional within bps band
  ask: number; // USD notional within bps band
  ok: boolean;
  error: string | null;
};

type DepthResponse = {
  symbol: string;
  bps: number;
  venues: DepthVenue[];
  totalBid: number;
  totalAsk: number;
  symmetry: number; // totalBid / (totalBid + totalAsk)
  timestamp: number;
  source: "live" | "fallback";
};

// ----------------------------
// Helpers
// ----------------------------
const num = (x: unknown, d = 0) => (Number.isFinite(Number(x)) ? Number(x) : d);
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function upperVenue(v: string) {
  return String(v || "").trim().toUpperCase();
}

function normalizeTokenSymbol(tokenOrSymbol: string) {
  // used for display, defaults to BTC if missing
  const raw = String(tokenOrSymbol ?? "").trim();
  return (raw || "BTC").toUpperCase();
}

/**
 * Convert user token/symbol into a venue-specific market identifier.
 * - Binance: BTCUSDT
 * - Coinbase: BTC-USD
 * - Kraken: XBTUSD (Kraken uses XBT for BTC)
 * - OKX: BTC-USDT
 *
 * User can override with ?symbol=... (we respect it and try to coerce).
 */
function toVenueSymbol(params: { token: string; venue: string; symbol?: string }) {
  const token = normalizeTokenSymbol(params.symbol ?? params.token);
  const venue = String(params.venue ?? "").toLowerCase();

  // If user already passed a venue-style symbol, try to keep it.
  const raw = String(params.symbol ?? "").trim();
  const hasDash = raw.includes("-");
  const hasUnderscore = raw.includes("_");

  if (venue === "binance") {
    // Binance commonly uses BTCUSDT; accept BTCUSDT or BTC-USDT or BTC_USDT
    if (raw) {
      return raw.replace("-", "").replace("_", "").toUpperCase();
    }
    return `${token}USDT`;
  }

  if (venue === "coinbase") {
    // Coinbase Exchange API expects BTC-USD
    if (raw) {
      if (raw.includes("-")) return raw.toUpperCase();
      if (raw.length >= 6) {
        // BTCUSD -> BTC-USD (best effort)
        return `${raw.slice(0, 3).toUpperCase()}-${raw.slice(3).toUpperCase()}`;
      }
      return `${token}-USD`;
    }
    return `${token}-USD`;
  }

  if (venue === "kraken") {
    // Kraken uses XBT for BTC
    const base = token === "BTC" ? "XBT" : token;
    if (raw) {
      // BTCUSD / XBTUSD / BTC-USD → normalize
      const r = raw.replace("-", "").replace("_", "").toUpperCase();
      return r.startsWith("BTC") ? `XBT${r.slice(3)}` : r;
    }
    return `${base}USD`;
  }

  if (venue === "okx") {
    // OKX expects BTC-USDT
    if (raw) {
      if (hasDash) return raw.toUpperCase();
      if (hasUnderscore) return raw.replace("_", "-").toUpperCase();
      // BTCUSDT -> BTC-USDT
      if (raw.length >= 6) return `${raw.slice(0, 3).toUpperCase()}-${raw.slice(3).toUpperCase()}`;
      return `${token}-USDT`;
    }
    return `${token}-USDT`;
  }

  // Default best effort
  if (raw) return raw.toUpperCase();
  return token;
}

function symmetry(totalBid: number, totalAsk: number) {
  const denom = totalBid + totalAsk;
  if (denom <= 0) return 0.5;
  return totalBid / denom;
}

async function fetchJson(url: string, opts?: { timeoutMs?: number; headers?: Record<string, string> }) {
  const timeoutMs = opts?.timeoutMs ?? 6000;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(opts?.headers ?? {}),
      },
      signal: controller.signal,
    });

    const text = await resp.text();
    if (!resp.ok) {
      return { ok: false as const, status: resp.status, text };
    }

    // Some APIs return JSON; guard parse
    try {
      return { ok: true as const, json: JSON.parse(text) };
    } catch {
      return { ok: false as const, status: 200, text };
    }
  } finally {
    clearTimeout(t);
  }
}

/**
 * Compute USD notional depth within +/-bps from mid.
 * bids/asks arrays are [price, qty] as numbers.
 */
function computeBandDepthUSD(args: {
  bids: Array<[number, number]>;
  asks: Array<[number, number]>;
  bps: number;
}) {
  const { bids, asks } = args;
  const bpsClamped = clamp(args.bps, 1, 500);

  const bestBid = bids.length ? bids[0][0] : 0;
  const bestAsk = asks.length ? asks[0][0] : 0;

  if (!(bestBid > 0 && bestAsk > 0)) {
    return { bidUSD: 0, askUSD: 0, mid: 0, band: bpsClamped };
  }

  const mid = (bestBid + bestAsk) / 2;
  const bandFrac = bpsClamped / 10000;

  const bidFloor = mid * (1 - bandFrac);
  const askCeil = mid * (1 + bandFrac);

  let bidUSD = 0;
  for (const [p, q] of bids) {
    if (p < bidFloor) break;
    bidUSD += p * q;
  }

  let askUSD = 0;
  for (const [p, q] of asks) {
    if (p > askCeil) break;
    askUSD += p * q;
  }

  return { bidUSD, askUSD, mid, band: bpsClamped };
}

// ----------------------------
// Venue Fetchers
// ----------------------------

async function getBinanceDepthViaRelay(params: { symbol: string; limit: number }) {
  const RELAY_BASE = process.env.RELAY_BASE_URL || "https://relay.stratalink.ai";
  // Canonical relay endpoint (Option A)
  const url = `${RELAY_BASE}/binance/depth?symbol=${encodeURIComponent(params.symbol)}&limit=${params.limit}`;

  const out = await fetchJson(url, { timeoutMs: 7000 });

  if (!out.ok) {
    return { ok: false, error: `Relay HTTP error` };
  }

  const j = out.json as any;

  // Expect Binance style: { lastUpdateId, bids:[[price,qty],...], asks:[[price,qty],...] }
  const bidsRaw = Array.isArray(j?.bids) ? j.bids : [];
  const asksRaw = Array.isArray(j?.asks) ? j.asks : [];

  const bids: Array<[number, number]> = bidsRaw
    .map((r: any) => [num(r?.[0]), num(r?.[1])])
    .filter(([p, q]: [number, number]) => p > 0 && q > 0);

  const asks: Array<[number, number]> = asksRaw
    .map((r: any) => [num(r?.[0]), num(r?.[1])])
    .filter(([p, q]: [number, number]) => p > 0 && q > 0);

  return { ok: true, bids, asks };
}

async function getCoinbaseDepthDirect(params: { productId: string; level: 2 | 3 }) {
  // Coinbase Exchange (legacy) public endpoint
  const url = `https://api.exchange.coinbase.com/products/${encodeURIComponent(params.productId)}/book?level=${params.level}`;
  const out = await fetchJson(url, { timeoutMs: 7000 });

  if (!out.ok) return { ok: false, error: `Coinbase HTTP error` };

  const j = out.json as any;
  const bidsRaw = Array.isArray(j?.bids) ? j.bids : [];
  const asksRaw = Array.isArray(j?.asks) ? j.asks : [];

  const bids: Array<[number, number]> = bidsRaw
    .map((r: any) => [num(r?.[0]), num(r?.[1])])
    .filter(([p, q]: [number, number]) => p > 0 && q > 0);

  const asks: Array<[number, number]> = asksRaw
    .map((r: any) => [num(r?.[0]), num(r?.[1])])
    .filter(([p, q]: [number, number]) => p > 0 && q > 0);

  return { ok: true, bids, asks };
}

async function getKrakenDepthDirect(params: { pair: string; count: number }) {
  const url = `https://api.kraken.com/0/public/Depth?pair=${encodeURIComponent(params.pair)}&count=${params.count}`;
  const out = await fetchJson(url, { timeoutMs: 7000 });

  if (!out.ok) return { ok: false, error: `Kraken HTTP error` };

  const j = out.json as any;
  const result = j?.result;
  if (!result || typeof result !== "object") return { ok: false, error: "Kraken malformed result" };

  const key = Object.keys(result)[0];
  const book = result[key];

  const bidsRaw = Array.isArray(book?.bids) ? book.bids : [];
  const asksRaw = Array.isArray(book?.asks) ? book.asks : [];

  // Kraken: [price, volume, timestamp]
  const bids: Array<[number, number]> = bidsRaw
    .map((r: any) => [num(r?.[0]), num(r?.[1])])
    .filter(([p, q]: [number, number]) => p > 0 && q > 0);

  const asks: Array<[number, number]> = asksRaw
    .map((r: any) => [num(r?.[0]), num(r?.[1])])
    .filter(([p, q]: [number, number]) => p > 0 && q > 0);

  return { ok: true, bids, asks };
}

async function getOKXDepthDirect(params: { instId: string; sz: number }) {
  // OKX books: /api/v5/market/books?instId=BTC-USDT&sz=200
  const url = `https://www.okx.com/api/v5/market/books?instId=${encodeURIComponent(params.instId)}&sz=${params.sz}`;
  const out = await fetchJson(url, { timeoutMs: 7000 });

  if (!out.ok) return { ok: false, error: `OKX HTTP error` };

  const j = out.json as any;
  const data0 = Array.isArray(j?.data) ? j.data[0] : null;

  const bidsRaw = Array.isArray(data0?.bids) ? data0.bids : [];
  const asksRaw = Array.isArray(data0?.asks) ? data0.asks : [];

  // OKX: [price, size, ...]
  const bids: Array<[number, number]> = bidsRaw
    .map((r: any) => [num(r?.[0]), num(r?.[1])])
    .filter(([p, q]: [number, number]) => p > 0 && q > 0);

  const asks: Array<[number, number]> = asksRaw
    .map((r: any) => [num(r?.[0]), num(r?.[1])])
    .filter(([p, q]: [number, number]) => p > 0 && q > 0);

  return { ok: true, bids, asks };
}

// ----------------------------
// Route
// ----------------------------

/**
 * GET /api/depth?token=BTC&venue=coinbase&bps=25
 * Optional: &symbol=BTC-USD (coinbase) / BTCUSDT (binance) / XBTUSD (kraken)
 */
router.get("/", async (req: Request, res: Response) => {
  const token = normalizeTokenSymbol((req.query.token as string) ?? "BTC");
  const venueIn = String((req.query.venue as string) ?? "coinbase").toLowerCase();
  const bps = clamp(num(req.query.bps, 10), 1, 500);

  const userSymbol = (req.query.symbol as string | undefined) ?? undefined;
  const symbolForVenue = toVenueSymbol({ token, venue: venueIn, symbol: userSymbol });

  const timestamp = Date.now();

  // Default response skeleton
  const resp: DepthResponse = {
    symbol: token,
    bps,
    venues: [],
    totalBid: 0,
    totalAsk: 0,
    symmetry: 0.5,
    timestamp,
    source: "fallback",
  };

  // Helper to append a venue line item
  const pushVenue = (v: DepthVenue) => {
    resp.venues.push(v);
    resp.totalBid += v.bid;
    resp.totalAsk += v.ask;
    resp.symmetry = symmetry(resp.totalBid, resp.totalAsk);
  };

  try {
    // ---- BINANCE via relay (Option A) ----
    if (venueIn === "binance") {
      const relay = await getBinanceDepthViaRelay({ symbol: symbolForVenue, limit: 1000 });

      if (!relay.ok) {
        pushVenue({
          venue: "BINANCE",
          bid: 0,
          ask: 0,
          ok: false,
          error: "Binance relay failed",
        });
        resp.source = "fallback";
        return res.json(resp);
      }

      const { bidUSD, askUSD } = computeBandDepthUSD({ bids: relay.bids, asks: relay.asks, bps });

      pushVenue({
        venue: "BINANCE",
        bid: bidUSD,
        ask: askUSD,
        ok: true,
        error: null,
      });

      resp.source = "live";
      return res.json(resp);
    }

    // ---- COINBASE direct (public) ----
    if (venueIn === "coinbase") {
      const book = await getCoinbaseDepthDirect({ productId: symbolForVenue, level: 2 });

      if (!book.ok) {
        pushVenue({
          venue: "COINBASE",
          bid: 0,
          ask: 0,
          ok: false,
          error: "Coinbase fetch failed",
        });
        resp.source = "fallback";
        return res.json(resp);
      }

      const { bidUSD, askUSD } = computeBandDepthUSD({ bids: book.bids, asks: book.asks, bps });

      pushVenue({
        venue: "COINBASE",
        bid: bidUSD,
        ask: askUSD,
        ok: true,
        error: null,
      });

      resp.source = "live";
      return res.json(resp);
    }

    // ---- KRAKEN direct (public) ----
    if (venueIn === "kraken") {
      const book = await getKrakenDepthDirect({ pair: symbolForVenue, count: 200 });

      if (!book.ok) {
        pushVenue({
          venue: "KRAKEN",
          bid: 0,
          ask: 0,
          ok: false,
          error: "Kraken fetch failed",
        });
        resp.source = "fallback";
        return res.json(resp);
      }

      const { bidUSD, askUSD } = computeBandDepthUSD({ bids: book.bids, asks: book.asks, bps });

      pushVenue({
        venue: "KRAKEN",
        bid: bidUSD,
        ask: askUSD,
        ok: true,
        error: null,
      });

      resp.source = "live";
      return res.json(resp);
    }

    // ---- OKX direct (public) ----
    if (venueIn === "okx") {
      const book = await getOKXDepthDirect({ instId: symbolForVenue, sz: 400 });

      if (!book.ok) {
        pushVenue({
          venue: "OKX",
          bid: 0,
          ask: 0,
          ok: false,
          error: "OKX fetch failed",
        });
        resp.source = "fallback";
        return res.json(resp);
      }

      const { bidUSD, askUSD } = computeBandDepthUSD({ bids: book.bids, asks: book.asks, bps });

      pushVenue({
        venue: "OKX",
        bid: bidUSD,
        ask: askUSD,
        ok: true,
        error: null,
      });

      resp.source = "live";
      return res.json(resp);
    }

    // Unknown venue
    pushVenue({
      venue: upperVenue(venueIn),
      bid: 0,
      ask: 0,
      ok: false,
      error: `Unsupported venue: ${venueIn}`,
    });
    resp.source = "fallback";
    return res.status(400).json(resp);
  } catch (err: any) {
    pushVenue({
      venue: upperVenue(venueIn),
      bid: 0,
      ask: 0,
      ok: false,
      error: err?.message ? String(err.message) : "Unknown error",
    });
    resp.source = "fallback";
    return res.status(500).json(resp);
  }
});

export default router;