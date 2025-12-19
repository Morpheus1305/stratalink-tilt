// relay/depthRouter.cjs
// Canonical depth routing layer for LIS

const binance = require('./ingress/binanceDepth.cjs');
const coinbase = require('./ingress/coinbaseDepth.cjs');

/**
 * Venue capability registry
 * This is what the UI and API trust
 */
const VENUE_CAPABILITIES = {
  BINANCE: {
    depth: false, // geo-blocked in Replit
    reason: 'env_blocked'
  },
  COINBASE: {
    depth: true
  },
  OKX: {
    depth: false
  },
  KRAKEN: {
    depth: false
  }
};

/**
 * Return list of venues and capabilities
 */
function getDepthCapableVenues() {
  return VENUE_CAPABILITIES;
}

/**
 * Canonical depth fetcher
 */
async function getDepth(venue, symbol) {
  const v = venue.toUpperCase();

  if (!VENUE_CAPABILITIES[v]) {
    throw new Error(`Unknown venue: ${venue}`);
  }

  if (!VENUE_CAPABILITIES[v].depth) {
    throw new Error(`Depth not available for ${symbol} on ${venue.toLowerCase()}`);
  }

  switch (v) {
    case 'COINBASE':
      return coinbase.getDepth(symbol);

    case 'BINANCE':
      return binance.getDepth(symbol);

    default:
      throw new Error(`No adapter implemented for ${venue}`);
  }
}

module.exports = {
  getDepth,
  getDepthCapableVenues,
  VENUE_CAPABILITIES
};
