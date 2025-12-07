import express from "express";

const router = express.Router();

async function fetchJSON(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Bad response " + url);
  return res.json();
}

async function getBinanceFunding(symbol: string) {
  const mapped = symbol.toUpperCase() + "USDT";
  const data = await fetchJSON(
    `https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${mapped}`
  ) as { lastFundingRate: string };
  return {
    venue: "Binance",
    rate: parseFloat(data.lastFundingRate),
    apr: parseFloat(data.lastFundingRate) * 3 * 365 * 100,
  };
}

async function getBybitFunding(symbol: string) {
  const mapped = symbol.toUpperCase() + "USDT";
  const data = await fetchJSON(
    `https://api.bybit.com/v5/market/funding/history?category=linear&symbol=${mapped}`
  ) as { result: { list: { fundingRate: string }[] } };
  const latest = data.result.list[0];
  const rate = parseFloat(latest.fundingRate);
  return {
    venue: "Bybit",
    rate,
    apr: rate * 3 * 365 * 100,
  };
}

async function getOKXFunding(symbol: string) {
  const mapped = `${symbol.toUpperCase()}-USDT-SWAP`;
  const data = await fetchJSON(
    `https://www.okx.com/api/v5/public/funding-rate?instId=${mapped}`
  ) as { data: { fundingRate: string }[] };
  const rate = parseFloat(data.data[0].fundingRate);
  return {
    venue: "OKX",
    rate,
    apr: rate * 3 * 365 * 100,
  };
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

    const settled = await Promise.allSettled([
      getBinanceFunding(symbol),
      getBybitFunding(symbol),
      getOKXFunding(symbol),
    ]);

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

    const rates = results.map((r) => r.rate).sort((a, b) => a - b);
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
