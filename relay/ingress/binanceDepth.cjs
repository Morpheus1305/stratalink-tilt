const https = require('https');

const BINANCE_API = 'api.binance.com';

const SYMBOL_MAP = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
  SOL: 'SOLUSDT',
  LINK: 'LINKUSDT',
  AVAX: 'AVAXUSDT'
};

const DEPTH_BANDS = [0.001, 0.0025, 0.005, 0.01, 0.02];

function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'LIS-Ingress/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Invalid JSON response'));
        }
      });
    }).on('error', reject);
  });
}

async function fetchOrderbook(symbol) {
  const tradingPair = SYMBOL_MAP[symbol.toUpperCase()];
  if (!tradingPair) {
    throw new Error(`Unknown symbol: ${symbol}`);
  }

  const url = `https://${BINANCE_API}/api/v3/depth?symbol=${tradingPair}&limit=1000`;
  const data = await httpGet(url);

  if (!data.bids || !data.asks) {
    throw new Error('Invalid orderbook response');
  }

  return {
    bids: data.bids.map(([price, size]) => [parseFloat(price), parseFloat(size)]),
    asks: data.asks.map(([price, size]) => [parseFloat(price), parseFloat(size)])
  };
}

function calculateBands(orderbook, midPrice) {
  const bands = {};

  for (const pct of DEPTH_BANDS) {
    const bandKey = `pct_${pct}`;
    const upperBound = midPrice * (1 + pct);
    const lowerBound = midPrice * (1 - pct);

    let bidNotional = 0;
    let askNotional = 0;

    for (const [price, size] of orderbook.bids) {
      if (price >= lowerBound) {
        bidNotional += price * size;
      }
    }

    for (const [price, size] of orderbook.asks) {
      if (price <= upperBound) {
        askNotional += price * size;
      }
    }

    bands[bandKey] = {
      bid_notional: bidNotional,
      ask_notional: askNotional,
      total_notional: bidNotional + askNotional
    };
  }

  return bands;
}

async function getDepth(symbol) {
  const orderbook = await fetchOrderbook(symbol);

  if (orderbook.bids.length === 0 || orderbook.asks.length === 0) {
    throw new Error('Empty orderbook');
  }

  const bestBid = orderbook.bids[0][0];
  const bestAsk = orderbook.asks[0][0];
  const midPrice = (bestBid + bestAsk) / 2;
  const spreadAbsolute = bestAsk - bestBid;
  const spreadBps = (spreadAbsolute / midPrice) * 10000;

  const bands = calculateBands(orderbook, midPrice);

  return {
    venue: 'binance',
    symbol: symbol.toUpperCase(),
    timestamp: Date.now(),
    mid_price: midPrice,
    spread: {
      absolute: spreadAbsolute,
      bps: spreadBps
    },
    bands
  };
}

module.exports = { getDepth, fetchOrderbook, SYMBOL_MAP };

if (require.main === module) {
  const symbol = process.argv[2] || 'BTC';
  console.log(`Fetching Binance depth for ${symbol}...`);
  getDepth(symbol)
    .then(data => console.log(JSON.stringify(data, null, 2)))
    .catch(err => console.error('Error:', err.message));
}
