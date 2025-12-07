import express from "express";
import { computeTsleDepthSummary, type Side, type VenueDepthBand } from "../../lib/tsle/depthEngine";

const router = express.Router();

const PROXY_BASE = "https://api.stratalink.dev";

interface DepthVenue {
  venue: string;
  bid: number;
  ask: number;
  ok: boolean;
}

async function fetchDepthAtBps(symbol: string, bps: number): Promise<DepthVenue[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const res = await fetch(`${PROXY_BASE}/depth/snapshot?symbol=${symbol}&bps=${bps}`, {
      signal: controller.signal
    });
    clearTimeout(timeout);
    
    if (res.ok) {
      const data = await res.json() as { venues: DepthVenue[] };
      if (data.venues?.length > 0) return data.venues;
    }
  } catch {}
  
  // Fallback to direct OKX
  try {
    const instId = `${symbol.toUpperCase()}-USDT-SWAP`;
    const res = await fetch(`https://www.okx.com/api/v5/market/books?instId=${instId}&sz=400`);
    if (!res.ok) return [];
    
    const json = await res.json() as { data: { bids: string[][]; asks: string[][] }[] };
    const ob = json.data[0];
    
    const bestBid = parseFloat(ob.bids[0][0]);
    const bestAsk = parseFloat(ob.asks[0][0]);
    const mid = (bestBid + bestAsk) / 2;
    const threshold = mid * (bps / 10000);

    let bid = 0, ask = 0;
    for (const lvl of ob.bids) {
      const p = parseFloat(lvl[0]);
      const q = parseFloat(lvl[1]);
      if (p >= mid - threshold) bid += p * q;
    }
    for (const lvl of ob.asks) {
      const p = parseFloat(lvl[0]);
      const q = parseFloat(lvl[1]);
      if (p <= mid + threshold) ask += p * q;
    }

    return [{ venue: "OKX", bid, ask, ok: true }];
  } catch {
    return [];
  }
}

router.get("/depth", async (req, res) => {
  try {
    const symbol = ((req.query.symbol as string) || "BTC").toUpperCase();
    const side = ((req.query.side as string) || "buy").toLowerCase() as Side;
    const requestedSize = Number(req.query.size) || 100000;

    // Fetch depth at multiple bps levels
    const [d10, d25, d50, d100, d200] = await Promise.all([
      fetchDepthAtBps(symbol, 10),
      fetchDepthAtBps(symbol, 25),
      fetchDepthAtBps(symbol, 50),
      fetchDepthAtBps(symbol, 100),
      fetchDepthAtBps(symbol, 200),
    ]);

    // Build venue depth bands from the fetched data
    const venueMap = new Map<string, VenueDepthBand>();
    
    const processVenues = (venues: DepthVenue[], bandKey: keyof VenueDepthBand) => {
      for (const v of venues) {
        if (!v.ok) continue;
        const existing = venueMap.get(v.venue) || {
          venue: v.venue,
          depth10bps: 0,
          depth25bps: 0,
          depth50bps: 0,
          depth100bps: 0,
          depth200bps: 0,
        };
        const depth = side === "buy" ? v.ask : v.bid;
        (existing as any)[bandKey] = depth;
        venueMap.set(v.venue, existing);
      }
    };

    processVenues(d10, "depth10bps");
    processVenues(d25, "depth25bps");
    processVenues(d50, "depth50bps");
    processVenues(d100, "depth100bps");
    processVenues(d200, "depth200bps");

    const venues = Array.from(venueMap.values());

    const summary = computeTsleDepthSummary(
      { symbol, venues },
      { side, requestedSize }
    );

    res.json({
      ...summary,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
