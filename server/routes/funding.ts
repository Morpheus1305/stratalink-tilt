import express from "express";

const router = express.Router();

const PROXY_BASE = "https://api.stratalink.dev";
const USE_PROXY = true; // Set to true once proxy is deployed

// Direct exchange fetchers (fallback)
async function getOKXFundingDirect(symbol: string) {
  const mapped = `${symbol.toUpperCase()}-USDT-SWAP`;
  const res = await fetch(`https://www.okx.com/api/v5/public/funding-rate?instId=${mapped}`);
  if (!res.ok) throw new Error("OKX failed");
  const data = await res.json() as { data: { fundingRate: string }[] };
  const rate = parseFloat(data.data[0].fundingRate);
  return { venue: "OKX", rate, apr: rate * 3 * 365 * 100 };
}

async function getBinanceFundingDirect(symbol: string) {
  const mapped = symbol.toUpperCase() + "USDT";
  const res = await fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${mapped}`);
  if (!res.ok) throw new Error("Binance failed");
  const data = await res.json() as { lastFundingRate: string };
  const rate = parseFloat(data.lastFundingRate);
  return { venue: "Binance", rate, apr: rate * 3 * 365 * 100 };
}

async function getBybitFundingDirect(symbol: string) {
  const mapped = symbol.toUpperCase() + "USDT";
  const res = await fetch(`https://api.bybit.com/v5/market/funding/history?category=linear&symbol=${mapped}`);
  if (!res.ok) throw new Error("Bybit failed");
  const data = await res.json() as { result: { list: { fundingRate: string }[] } };
  const rate = parseFloat(data.result.list[0].fundingRate);
  return { venue: "Bybit", rate, apr: rate * 3 * 365 * 100 };
}

// Proxy fetcher
async function fetchVenueProxy(venue: string, url: string): Promise<{ venue: string; rate: number | null; apr: number | null }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    
    if (!res.ok) throw new Error(`${venue} returned ${res.status}`);
    const json = await res.json() as { rate?: number; apr?: number; fundingRate?: number };
    
    const rate = json.rate ?? json.fundingRate ?? null;
    const apr = json.apr ?? (rate ? rate * 3 * 365 * 100 : null);
    
    return { venue, rate, apr };
  } catch (err) {
    return { venue, rate: null, apr: null };
  }
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
    
    let results: { venue: string; rate: number; apr: number }[] = [];

    if (USE_PROXY) {
      // Try proxy first
      const venues = await Promise.all([
        fetchVenueProxy("Binance", `${PROXY_BASE}/perp/binance?symbol=${symbol}`),
        fetchVenueProxy("Bybit", `${PROXY_BASE}/perp/bybit?symbol=${symbol}`),
        fetchVenueProxy("OKX", `${PROXY_BASE}/perp/okx?symbol=${symbol}`),
      ]);
      results = venues.filter((v) => v.rate !== null) as { venue: string; rate: number; apr: number }[];
    }

    // Fallback to direct calls if proxy failed
    if (results.length === 0) {
      const settled = await Promise.allSettled([
        getBinanceFundingDirect(symbol),
        getBybitFundingDirect(symbol),
        getOKXFundingDirect(symbol),
      ]);
      results = settled
        .filter((r): r is PromiseFulfilledResult<{ venue: string; rate: number; apr: number }> => 
          r.status === "fulfilled"
        )
        .map((r) => r.value);
    }

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
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
