const https = require('https');

const COINBASE_API = 'api.exchange.coinbase.com';

const SYMBOL_MAP = {
  BTC: 'BTC-USD',
  ETH: 'ETH-USD',
  SOL: 'SOL-USD',
  LINK: 'LINK-USD',
  AVAX: 'AVAX-USD'
};

const DEPTH_BANDS = {
  pct_0_001: 0.001,
  pct_0_0025: 0.0025,
  pct_0_005: 0.005,
  pct_0_01: 0.01,
  pct_0_02: 0.02
};

function httpGet(path) {
  return new Promise((resolve, reject) => {
    https.get(
      { hostname: COINBASE_API, path, headers: { 'User-Agent': 'LIS/1.0' } },
      res => {
        let data = '';
        res.on('data', d => (data += d));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error('Invalid JSON'));
          }
        });
      }
    ).on('error', reject);
  });
}

async function fetchOrderbook(symbol) {
  const product = SYMBOL_MAP[symbol.toUpperCase()];
  if (!product) throw new Error(`Unsupported symbol: ${symbol}`);

  const book = await httpGet(`/products/${product}/book?level=2`);

  return {
    bids: book.bids.map(([p, q]) => [Number(p), Number(q)]),
    asks: book.asks.map(([p, q]) => [Number(p), Number(q)])
  };
}

function aggregate(levels, predicate) {
  let total = 0;
  for (const [price, size] of levels) {
    if (!predicate(price)) break;
    total += price * size;
  }
  return total;
}

async function getDepth(symbol) {
  const { bids, asks } = await fetchOrderbook(symbol);

  if (!bids.length || !asks.length) {
    throw new Error('Empty orderbook');
  }

  const bestBid = bids[0][0];
  const bestAsk = asks[0][0];
  const mid = (bestBid + bestAsk) / 2;
  const spreadAbs = bestAsk - bestBid;
  const spreadBps = (spreadAbs / mid) * 10_000;

  const bands = {};
  let bidAll = 0;
  let askAll = 0;

  for (const [key, pct] of Object.entries(DEPTH_BANDS)) {
    const bidLimit = mid * (1 - pct);
    const askLimit = mid * (1 + pct);

    const bid = aggregate(bids, p => p >= bidLimit);
    const ask = aggregate(asks, p => p <= askLimit);

    bidAll += bid;
    askAll += ask;

    bands[key] = {
      bid_notional: Number(bid.toFixed(2)),
      ask_notional: Number(ask.toFixed(2)),
      total_notional: Number((bid + ask).toFixed(2))
    };
  }

  const denom = bidAll + askAll;

  return {
    venue: 'coinbase',
    symbol: symbol.toUpperCase(),
    quote: 'USD',
    timestamp: Date.now(),
    mid_price: Number(mid.toFixed(8)),
    spread: {
      absolute: Number(spreadAbs.toFixed(8)),
      bps: Number(spreadBps.toFixed(4))
    },
    bands,
    metrics: {
      bid_ask_balance: denom ? bidAll / denom : 0,
      depth_asymmetry: denom ? Math.abs(bidAll - askAll) / denom : 0,
      source: 'lis-v1'
    }
  };
}

module.exports = { getDepth, SYMBOL_MAP };
