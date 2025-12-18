// client/src/adapters/lisToTokenDepth.ts

type DepthBand = {
  bid: number;
  ask: number;
  totalUSD: number;
  imbalance: number;
};

type TokenDepth = {
  mid: number;
  spread: number;
  spreadbps: number;
  bands: {
    "10bps": DepthBand;
    "25bps": DepthBand;
    "50bps": DepthBand;
    "100bps": DepthBand;
    "200bps": DepthBand;
  };
  source: string;
  imbalance: number;
};

function computeImbalance(bid: number, ask: number, total: number): number {
  if (!total) return 0;
  return (bid - ask) / total;
}

function convertBand(lisBand: any): DepthBand {
  const bid = lisBand?.bid_notional ?? 0;
  const ask = lisBand?.ask_notional ?? 0;
  const total = lisBand?.total_notional ?? 0;

  return {
    bid,
    ask,
    totalUSD: total,
    imbalance: computeImbalance(bid, ask, total),
  };
}

export function lisSnapshotToTokenDepth(snapshot: any): TokenDepth {
  const bands = snapshot?.bands ?? {};

  return {
    mid: snapshot?.mid_price ?? 0,
    spread: snapshot?.spread?.absolute ?? 0,
    spreadbps: snapshot?.spread?.bps ?? 0,
    source: snapshot?.venue ?? "unknown",
    imbalance: snapshot?.metrics?.bid_ask_balance ?? 0,

    bands: {
      "10bps": convertBand(bands.pct_0_1),
      "25bps": convertBand(bands.pct_0_25),
      "50bps": convertBand(bands.pct_0_5),
      "100bps": convertBand(bands.pct_1),
      "200bps": convertBand(bands.pct_2),
    },
  };
}