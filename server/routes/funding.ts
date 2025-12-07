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
  );
  return {
    venue: "Binance",
    rate: parseFloat(data.lastFundingRate),
    apr: parseFloat(data.lastFundingRate) * 3 * 365 * 100,
    raw: data,
  };
}

async function getBybitFunding(symbol: string) {
  const mapped = symbol.toUpperCase() + "USDT";
  const data = await fetchJSON(
    `https://api.bybit.com/v5/market/funding/history?category=linear&symbol=${mapped}`
  );
  const latest = data.result.list[0];
  const rate = parseFloat(latest.fundingRate);

  return {
    venue: "Bybit",
    rate,
    apr: rate * 3 * 365 * 100,
    raw: latest,
  };
}

async function getOKXFunding(symbol: string) {
  const mapped = `${symbol.toUpperCase()}-USDT-SWAP`;
  const data = await fetchJSON(
    `https://www.okx.com/api/v5/public/funding-rate?instId=${mapped}`
  );

  const rate = parseFloat(data.data[0].fundingRate);
  return {
    venue: "OKX",
    rate,
    apr: rate * 3 * 365 * 100,
    raw: data.data[0],
  };
}

router.get("/snapshot", async (req, res) => {
  try {
    const symbol = (req.query.symbol as string)?.toUpperCase() || "BTC";

    const venues = req.query.venues
      ? (req.query.venues as string).split(",")
      : ["binance", "bybit", "okx"];

    const promises: Promise<{ venue: string; rate: number; apr: number; raw: any }>[] = [];
    if (venues.includes("binance")) promises.push(getBinanceFunding(symbol));
    if (venues.includes("bybit")) promises.push(getBybitFunding(symbol));
    if (venues.includes("okx")) promises.push(getOKXFunding(symbol));

    const settled = await Promise.allSettled(promises);
    const results = settled
      .filter((r): r is PromiseFulfilledResult<{ venue: string; rate: number; apr: number; raw: any }> => r.status === "fulfilled")
      .map((r) => r.value);

    if (results.length === 0) {
      return res.status(503).json({
        symbol,
        error: "All exchange APIs failed",
        venues: [],
        medianRate: null,
        avgRate: null,
        regime: "Unavailable",
        timestamp: Date.now(),
      });
    }

    const rates = results.map((r) => r.rate).sort((a, b) => a - b);
    const median = rates[Math.floor(rates.length / 2)];
    const avg = rates.reduce((a, b) => a + b, 0) / rates.length;

    const regime =
      Math.abs(median) < 0.0001
        ? "Ultra-Tight"
        : Math.abs(median) < 0.0005
        ? "Tight"
        : Math.abs(median) < 0.002
        ? "Neutral"
        : "Stressed";

    res.json({
      symbol,
      rate: median,
      apr: median * 3 * 365 * 100,
      venues: results,
      medianRate: median,
      avgRate: avg,
      regime,
      change24h: null,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
