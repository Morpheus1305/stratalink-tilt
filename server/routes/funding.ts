import express from "express";

const router = express.Router();

const PROXY_BASE = "https://api.stratalink.dev";

// Direct exchange fetchers (fallback)
async function getOKXFundingDirect(symbol: string) {
  const mapped = `${symbol.toUpperCase()}-USDT-SWAP`;
  const res = await fetch(`https://www.okx.com/api/v5/public/funding-rate?instId=${mapped}`);
  if (!res.ok) throw new Error("OKX failed");
  const data = await res.json() as { data: { fundingRate: string }[] };
  const rate = parseFloat(data.data[0].fundingRate);
  return { venue: "OKX", rate, apr: rate * 3 * 365 * 100, ok: true, error: null };
}

function classifyRegime(rate: number): string {
  if (Math.abs(rate) < 0.0001) return "Ultra-Tight";
  if (Math.abs(rate) < 0.0005) return "Tight";
  if (Math.abs(rate) < 0.0015) return "Neutral";
  return "Stressed";
}

router.get("/snapshot", async (req, res) => {
  try {
    const symbol = ((req.query.symbol as string) || "BTC").toUpperCase();
    
    // Try proxy first (unified multi-venue endpoint)
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      const proxyRes = await fetch(`${PROXY_BASE}/funding/snapshot?symbol=${symbol}`, {
        signal: controller.signal
      });
      clearTimeout(timeout);
      
      if (proxyRes.ok) {
        const proxyData = await proxyRes.json() as {
          symbol: string;
          venues: { venue: string; rate: number; apr: number; ok?: boolean; error?: string | null }[];
          medianRate: number;
          avgRate: number;
          headlineRate?: number;
          regime: string;
        };
        
        // Return proxy response directly if it has data
        if (proxyData.venues && proxyData.venues.length > 0) {
          // Ensure venues have ok/error fields
          const normalizedVenues = proxyData.venues.map(v => ({
            venue: v.venue,
            rate: v.rate,
            apr: v.apr,
            ok: v.ok ?? true,
            error: v.error ?? null
          }));

          const headlineRate = proxyData.headlineRate ?? proxyData.medianRate;

          return res.json({
            symbol: proxyData.symbol,
            source: "proxy",
            venues: normalizedVenues,
            medianRate: proxyData.medianRate,
            avgRate: proxyData.avgRate,
            headlineRate,
            regime: proxyData.regime || classifyRegime(proxyData.avgRate),
            timestamp: Date.now()
          });
        }
      }
    } catch (proxyErr) {
      console.log("[Funding] Proxy failed, using fallback");
    }

    // Fallback to direct OKX call
    const settled = await Promise.allSettled([getOKXFundingDirect(symbol)]);
    const results: { venue: string; rate: number; apr: number; ok: boolean; error: string | null }[] = [];
    for (const r of settled) {
      if (r.status === "fulfilled") {
        results.push(r.value);
      }
    }

    if (results.length === 0) {
      return res.status(503).json({
        symbol,
        source: "fallback",
        venues: [],
        medianRate: 0,
        avgRate: 0,
        headlineRate: 0,
        regime: "Unavailable",
        timestamp: Date.now(),
      });
    }

    const rates = results.map((v) => v.rate).sort((a, b) => a - b);
    const medianRate = rates[Math.floor(rates.length / 2)];
    const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length;
    const regime = classifyRegime(avgRate);

    res.json({
      symbol,
      source: "fallback",
      venues: results,
      medianRate,
      avgRate,
      headlineRate: medianRate,
      regime,
      timestamp: Date.now()
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
