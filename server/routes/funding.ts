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
  return { venue: "OKX", rate, apr: rate * 3 * 365 * 100 };
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
          venues: { venue: string; rate: number; apr: number }[];
          medianRate: number;
          avgRate: number;
          regime: string;
        };
        
        // Return proxy response directly if it has data
        if (proxyData.venues && proxyData.venues.length > 0) {
          return res.json({
            symbol: proxyData.symbol,
            rate: proxyData.medianRate,
            apr: proxyData.medianRate * 3 * 365 * 100,
            venues: proxyData.venues,
            medianRate: proxyData.medianRate,
            avgRate: proxyData.avgRate,
            regime: proxyData.regime || classifyRegime(proxyData.avgRate),
            change24h: null,
            timestamp: Date.now(),
            source: "proxy"
          });
        }
      }
    } catch (proxyErr) {
      console.log("[Funding] Proxy failed, using fallback");
    }

    // Fallback to direct OKX call
    const settled = await Promise.allSettled([getOKXFundingDirect(symbol)]);
    const results = settled
      .filter((r): r is PromiseFulfilledResult<{ venue: string; rate: number; apr: number }> => 
        r.status === "fulfilled"
      )
      .map((r) => r.value);

    if (results.length === 0) {
      return res.status(503).json({
        symbol,
        venues: [],
        medianRate: null,
        avgRate: null,
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
      rate: medianRate,
      apr: medianRate * 3 * 365 * 100,
      venues: results,
      medianRate,
      avgRate,
      regime,
      change24h: null,
      timestamp: Date.now(),
      source: "fallback"
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
