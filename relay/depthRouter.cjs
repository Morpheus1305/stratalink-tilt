/**
 * LIS Depth Router
 * ----------------
 * Canonical entry point for orderbook depth across venues.
 * Each venue adapter must expose: getDepth(symbol)
 *
 * This router decides:
 *  - which venues support depth
 *  - which adapter is called
 *  - how errors are surfaced upstream (TILT-safe)
 */

// Ingress adapters
const { getDepth: getBinanceDepth } = require("./ingress/binanceDepth.cjs");
const { getDepth: getCoinbaseDepth } = require("./ingress/coinbaseDepth.cjs");

// Capability registry (used by UI + guards)
const DEPTH_CAPABLE_VENUES = {
  binance: true,
  coinbase: true,
  okx: false,     // placeholder
  kraken: false   // placeholder
};

/**
 * Get normalized depth snapshot for a venue + symbol
 *
 * @param {string} venue   e.g. "binance", "coinbase"
 * @param {string} symbol  e.g. "BTC", "ETH", "LTC"
 */
async function getDepth(venue, symbol) {
  if (!venue || !symbol) {
    throw new Error("Venue and symbol are required");
  }

  const v = venue.toLowerCase();

  if (!DEPTH_CAPABLE_VENUES[v]) {
    throw new Error(`Depth not available for ${symbol} on ${venue}`);
  }

  switch (v) {
    case "binance":
      return getBinanceDepth(symbol);

    case "coinbase":
      return getCoinbaseDepth(symbol);

    default:
      throw new Error(`Unsupported venue: ${venue}`);
  }
}

/**
 * Expose depth capability map (for UI dropdowns, etc.)
 */
function getDepthCapableVenues() {
  return DEPTH_CAPABLE_VENUES;
}

module.exports = {
  getDepth,
  getDepthCapableVenues
};

if (require.main === module) {
  const venue = process.argv[2] || 'binance';
  const symbol = process.argv[3] || 'BTC';
  console.log(`Fetching ${venue} depth for ${symbol}...`);
  getDepth(venue, symbol)
    .then(data => console.log(JSON.stringify(data, null, 2)))
    .catch(err => console.error('Error:', err.message));
}
