type DepthHistoryPoint = {
  ts: number;
  depth50bps: number;
  spreadBps: number;
};

const WINDOW_DURATION: Record<string, number> = {
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

const TOKEN_DEPTH_BASE: Record<string, number> = {
  BTC: 8_000_000,
  ETH: 5_000_000,
  SOL: 2_500_000,
  XRP: 1_500_000,
  ADA: 1_200_000,
  AVAX: 1_000_000,
  LINK: 900_000,
  DOT: 800_000,
  NEAR: 600_000,
  MATIC: 500_000,
};

const TOKEN_SPREAD_BASE: Record<string, number> = {
  BTC: 1.5,
  ETH: 2.0,
  SOL: 3.0,
  XRP: 2.5,
  ADA: 4.0,
  AVAX: 5.0,
  LINK: 3.5,
  DOT: 4.5,
  NEAR: 5.5,
  MATIC: 6.0,
};

export async function getOrderbookDepthHistory(
  token: string,
  window: string
): Promise<DepthHistoryPoint[]> {
  const duration = WINDOW_DURATION[window] || WINDOW_DURATION["24h"];
  const now = Date.now();

  const numPoints = window === "1h" ? 30 : window === "24h" ? 48 : window === "7d" ? 84 : 60;
  const interval = duration / numPoints;

  const baseDepth = TOKEN_DEPTH_BASE[token] || 1_000_000;
  const baseSpread = TOKEN_SPREAD_BASE[token] || 4.0;

  const points: DepthHistoryPoint[] = [];
  let depth = baseDepth;

  for (let i = numPoints; i >= 0; i--) {
    const ts = now - i * interval;

    const depthShock = (Math.random() - 0.5) * 0.08;
    depth = depth * (1 + depthShock);
    depth = Math.max(depth, baseDepth * 0.5);
    depth = Math.min(depth, baseDepth * 1.8);

    const spreadNoise = (Math.random() - 0.5) * 2;
    const spreadBps = Math.max(0.5, baseSpread + spreadNoise);

    points.push({
      ts: Math.floor(ts),
      depth50bps: Math.round(depth),
      spreadBps: Number(spreadBps.toFixed(2)),
    });
  }

  return points;
}
