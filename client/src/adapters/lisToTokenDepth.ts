// client/src/adapters/lisToTokenDepth.ts

type DepthBand = {
  bidUSD: number;
  askUSD: number;
  totalUSD: number;
  imbalance: number;
};

export type TokenDepth = {
  mid: number;
  spread: number;
  spreadBps: number;
  bands: {
    "10bps": DepthBand;
    "25bps": DepthBand;
    "50bps": DepthBand;
    "100bps": DepthBand;
    "200bps": DepthBand;
  };
  source: string;
  ts: number;
};

function computeImbalance(bid: number, ask: number): number {
  const total = bid + ask;
  if (!total) return 0;
  return ((bid - ask) / total) * 100;
}

function convertBand(lisBand: any): DepthBand {
  const bid = lisBand?.bid_notional ?? 0;
  const ask = lisBand?.ask_notional ?? 0;
  const total = lisBand?.total_notional ?? bid + ask;

  return {
    bidUSD: bid,
    askUSD: ask,
    totalUSD: total,
    imbalance: computeImbalance(bid, ask),
  };
}

function getBand(bands: any, ...keys: string[]): any {
  for (const key of keys) {
    if (bands[key]) return bands[key];
  }
  return {};
}

export function lisSnapshotToTokenDepth(snapshot: any): TokenDepth {
  const bands = snapshot?.bands ?? {};

  return {
    mid: snapshot?.mid_price ?? 0,
    spread: snapshot?.spread?.absolute ?? 0,
    spreadBps: snapshot?.spread?.bps ?? 0,
    source: snapshot?.venue ?? "unknown",
    ts: snapshot?.timestamp ?? Date.now(),

    bands: {
      "10bps": convertBand(getBand(bands, "pct_0.1", "pct_0_1")),
      "25bps": convertBand(getBand(bands, "pct_0.25", "pct_0_25")),
      "50bps": convertBand(getBand(bands, "pct_0.5", "pct_0_5")),
      "100bps": convertBand(getBand(bands, "pct_1")),
      "200bps": convertBand(getBand(bands, "pct_2")),
    },
  };
}
