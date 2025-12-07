import express from "express";

const router = express.Router();

const PROXY_BASE = "https://api.stratalink.dev";

interface DepthVenue {
  venue: string;
  bid: number;
  ask: number;
  ok: boolean;
}

interface DepthSnapshot {
  symbol: string;
  bps: number;
  venues: DepthVenue[];
  totalBid: number;
  totalAsk: number;
  symmetry: number;
  timestamp: number;
}

// Direct OKX depth fallback
async function getOKXDepthDirect(symbol: string, bps: number): Promise<DepthVenue> {
  try {
    const instId = `${symbol.toUpperCase()}-USDT-SWAP`;
    const res = await fetch(`https://www.okx.com/api/v5/market/books?instId=${instId}&sz=400`);
    if (!res.ok) throw new Error("OKX failed");
    
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

    return { venue: "OKX", bid, ask, ok: true };
  } catch {
    return { venue: "OKX", bid: 0, ask: 0, ok: false };
  }
}

router.get("/snapshot", async (req, res) => {
  try {
    const symbol = ((req.query.symbol as string) || "BTC").toUpperCase();
    const bps = Number(req.query.bps) || 10;

    // Try proxy first
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      const proxyRes = await fetch(
        `${PROXY_BASE}/depth/snapshot?symbol=${symbol}&bps=${bps}`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);
      
      if (proxyRes.ok) {
        const proxyData = await proxyRes.json() as DepthSnapshot;
        
        if (proxyData.venues && proxyData.venues.some(v => v.ok)) {
          return res.json({
            ...proxyData,
            source: "proxy"
          });
        }
      }
    } catch (proxyErr) {
      console.log("[Depth] Proxy failed, using fallback");
    }

    // Fallback to direct OKX
    const okxResult = await getOKXDepthDirect(symbol, bps);
    const venues = [okxResult];
    const active = venues.filter(v => v.ok);
    
    const totalBid = active.reduce((a, v) => a + v.bid, 0);
    const totalAsk = active.reduce((a, v) => a + v.ask, 0);
    const symmetry = totalBid + totalAsk === 0 
      ? 0 
      : Math.min(totalBid, totalAsk) / Math.max(totalBid, totalAsk);

    res.json({
      symbol,
      bps,
      venues,
      totalBid,
      totalAsk,
      symmetry,
      timestamp: Date.now(),
      source: "fallback"
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
