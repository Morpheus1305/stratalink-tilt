// server/routes/depth.ts
import express from "express";
import type { Request, Response } from "express";

const router = express.Router();

type DepthVenue = {
  venue: string; // display name
  bid: number;   // notional within band (USD/quote)
  ask: number;   // notional within band (USD/quote)
  ok: boolean;
  error?: string | null;
};

type DepthResponse = {
  symbol: string;
  bps: number;
  venues: DepthVenue[];
  totalBid: number;
  totalAsk: number;
  symmetry: number; // bid/(bid+ask) 0..1
  timestamp: number;
  source: "live" | "fallback";
};

// ---------------------------
// Helpers
// ---------------------------
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const num = (x: unknown, d = 0) => (Number.isFinite(Number(x)) ? Number(x) : d);

function normalizeToken(raw: unknown): string {
  return String(raw ?? "BTC").toUpperCase().trim();
}

function normalizeVenue(raw: unknown): string {
  return String(raw ?? "coinbase").toLowerCase().trim();
}

function parseBps(raw: unknown): number {
  // default 25 bps; clamp to sane range
  return clamp(num(raw, 25), 1, 500);
}

function computeSymmetry(totalBid: number, totalAsk: number): number {
  const denom = totalBid + totalAsk;
  if (!Number.isFinite(denom) || denom <= 0) return 0.5;
  return clamp(totalBid / denom, 0, 1);
}

function midFromTop(bidPx: number, askPx: number): number {
  if (!Number.isFinite(bidPx) || !Number.isFinite(askPx) || bidPx <= 0 || askPx <= 0) return NaN;
  return (bidPx + askPx) / 2;
}

/**
 * Sum notional within ±bps around mid:
 * - bids included if price >= mid*(1 - bps/10000)
 * - asks included if price <= mid*(1 + bps/10000)
 * Notional = price * size (quote currency).
 */
function notionalWithinBps(args: {
  bids: Array<[number, number]>;
  asks: Array<[number, number]>;
  bps: number;
}): { bidNotional: number; askNotional: number; mid: number } {
  const bids = args.bids.filter(([p, s]) => Number.isFinite(p) && Number.isFinite(s) && p > 0 && s > 0);
  const asks = args.asks.filter(([p, s]) => Number.isFinite(p) && Number.isFinite(s) && p > 0 && s > 0);

  const topBid = bids.length ? bids[0][0] : NaN;
  const topAsk = asks.length ? asks[0][0] : NaN;
  const mid = midFromTop(topBid, topAsk);

  if (!Number.isFinite(mid) || mid <= 0) {
    return { bidNotional: 0, askNotional: 0, mid: NaN };
  }

  const band = args.bps / 10000;
  const bidFloor = mid * (1 - band);
  const askCeil = mid * (1 + band);

  let bidNotional = 0;
  for (const [p, s] of bids) {
    if (p < bidFloor) break; // bids sorted desc
    bidNotional += p * s;
  }

  let askNotional = 0;
  for (const [p, s] of asks) {
    if (p > askCeil) break; // asks sorted asc
    askNotional += p * s;
  }

  return {
    bidNotional: Number.isFinite(bidNotional) ? bidNotional : 0,
    askNotional: Number.isFinite(askNotional) ? askNotional : 0,
    mid,
  };
}

async function fetchJson<T>(url: string, timeoutMs = 3500): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

// ---------------------------
// Venue fetchers (public)
// ---------------------------

type Book = { bids: Array<[number, number]>; asks: Array<[number, number]> };

function tokenToBinanceSymbol(token: string): string {
  // conservative default: token/USDT
  return `${token}USDT`;
}

function tokenToOKXInstrument(token: string): string {
  return `${token}-USDT`;
}

function tokenToCoinbaseProduct(token: string): string {
  return `${token}-USD`;
}

function tokenToKrakenPair(token: string): string {
  // Kraken uses XBT for BTC
  const base = token === "BTC" ? "XBT" : token;
  return `${base}USD`;
}

async function getBinanceBook(token: string): Promise<Book> {
  const symbol = tokenToBinanceSymbol(token);
  type R = { bids: [string, string][]; asks: [string, string][] };
  const url = `https://api.binance.com/api/v3/depth?symbol=${encodeURIComponent(symbol)}&limit=1000`;
  const data = await fetchJson<R>(url);
  return {
    bids: data.bids.map(([p, q]) => [Number(p), Number(q)]),
    asks: data.asks.map(([p, q]) => [Number(p), Number(q)]),
  };
}

async function getCoinbaseBook(token: string): Promise<Book> {
  const product = tokenToCoinbaseProduct(token);
  // level=2 returns aggregated book
  type R = { bids: [string, string, string][]; asks: [string, string, string][] };
  const url = `https://api.exchange.coinbase.com/products/${encodeURIComponent(product)}/book?level=2`;
  const data = await fetchJson<R>(url);
  return {
    bids: data.bids.map(([p, s]) => [Number(p), Number(s)]),
    asks: data.asks.map(([p, s]) => [Number(p), Number(s)]),
  };
}

async function getKrakenBook(token: string): Promise<Book> {
  const pair = tokenToKrakenPair(token);
  type R = {
    error: string[];
    result: Record<string, { bids: [string, string, string][]; asks: [string, string, string][] }>;
  };
  const url = `https://api.kraken.com/0/public/Depth?pair=${encodeURIComponent(pair)}&count=200`;
  const data = await fetchJson<R>(url);
  if (data.error && data.error.length) throw new Error(data.error.join("; "));
  const key = Object.keys(data.result)[0];
  const book = data.result[key];
  return {
    bids: book.bids.map(([p, s]) => [Number(p), Number(s)]),
    asks: book.asks.map(([p, s]) => [Number(p), Number(s)]),
  };
}

async function getOKXBook(token: string): Promise<Book> {
  const instId = tokenToOKXInstrument(token);
  type R = { code: string; msg: string; data: Array<{ bids: [string, string, string, string][]; asks: [string, string, string, string][] }> };
  const url = `https://www.okx.com/api/v5/market/books?instId=${encodeURIComponent(instId)}&sz=400`;
  const data = await fetchJson<R>(url);
  if (data.code !== "0") throw new Error(`OKX ${data.code}: ${data.msg}`);
  const d = data.data?.[0];
  if (!d) throw new Error("OKX empty data");
  return {
    bids: d.bids.map(([p, s]) => [Number(p), Number(s)]),
    asks: d.asks.map(([p, s]) => [Number(p), Number(s)]),
  };
}

async function fetchVenueDepth(venue: string, token: string, bps: number): Promise<DepthVenue> {
  const v = venue.toLowerCase();
  const display = v.toUpperCase();

  try {
    let book: Book;

    if (v === "binance") book = await getBinanceBook(token);
    else if (v === "coinbase") book = await getCoinbaseBook(token);
    else if (v === "kraken") book = await getKrakenBook(token);
    else if (v === "okx") book = await getOKXBook(token);
    else {
      return { venue: display, bid: 0, ask: 0, ok: false, error: `Unsupported venue: ${venue}` };
    }

    // ensure sort order for early break logic
    book.bids.sort((a, b) => b[0] - a[0]);
    book.asks.sort((a, b) => a[0] - b[0]);

    const { bidNotional, askNotional } = notionalWithinBps({ bids: book.bids, asks: book.asks, bps });

    return {
      venue: display,
      bid: Number.isFinite(bidNotional) ? bidNotional : 0,
      ask: Number.isFinite(askNotional) ? askNotional : 0,
      ok: true,
      error: null,
    };
  } catch (err: any) {
    return {
      venue: display,
      bid: 0,
      ask: 0,
      ok: false,
      error: err?.message ? String(err.message) : "Fetch failed",
    };
  }
}

// ---------------------------
// Routes
// ---------------------------

/**
 * GET /api/depth?token=BTC&venue=coinbase&bps=25
 * or /api/depth?token=BTC&venues=coinbase,binance,kraken&bps=25
 */
router.get("/", async (req: Request, res: Response) => {
  const token = normalizeToken(req.query.token);
  const bps = parseBps(req.query.bps);

  // support either `venue` or `venues=a,b,c`
  const venuesParam = req.query.venues
    ? String(req.query.venues)
    : String(req.query.venue ?? "coinbase");

  const venues = venuesParam
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  // Cap to keep response reasonable
  const venueList = venues.slice(0, 6);

  const results = await Promise.all(venueList.map((v) => fetchVenueDepth(v, token, bps)));

  const totalBid = results.reduce((acc, r) => acc + (Number.isFinite(r.bid) ? r.bid : 0), 0);
  const totalAsk = results.reduce((acc, r) => acc + (Number.isFinite(r.ask) ? r.ask : 0), 0);

  // "live" if any venue succeeded
  const source: DepthResponse["source"] = results.some((r) => r.ok) ? "live" : "fallback";

  const out: DepthResponse = {
    symbol: token,
    bps,
    venues: results,
    totalBid,
    totalAsk,
    symmetry: computeSymmetry(totalBid, totalAsk),
    timestamp: Date.now(),
    source,
  };

  return res.json(out);
});

export default router;