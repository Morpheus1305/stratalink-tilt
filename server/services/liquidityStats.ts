type Snapshot = {
  ts: number;
  depthUsd50bps: number;
  spreadBps: number;
};

type StabilityStats = {
  stabilityScore: number;
  halfLifeMinutes: number;
  volatility: number;
  meanDepth: number;
  minDepth: number;
  maxDepth: number;
};

export function computeStabilityStats(snapshots: Snapshot[]): StabilityStats {
  if (snapshots.length === 0) {
    return {
      stabilityScore: 0,
      halfLifeMinutes: 0,
      volatility: 0,
      meanDepth: 0,
      minDepth: 0,
      maxDepth: 0,
    };
  }

  const depths = snapshots.map((s) => s.depthUsd50bps);
  const meanDepth = depths.reduce((a, b) => a + b, 0) / depths.length;
  const minDepth = Math.min(...depths);
  const maxDepth = Math.max(...depths);

  const variance =
    depths.reduce((sum, d) => sum + Math.pow(d - meanDepth, 2), 0) / depths.length;
  const stdDev = Math.sqrt(variance);
  const volatility = (stdDev / meanDepth) * 100;

  const stabilityScore = Math.max(0, Math.min(100, 100 - volatility * 5));

  let autocorr = 0;
  if (depths.length > 1) {
    const n = depths.length - 1;
    let sumProduct = 0;
    let sumSquare = 0;
    for (let i = 0; i < n; i++) {
      const diff1 = depths[i] - meanDepth;
      const diff2 = depths[i + 1] - meanDepth;
      sumProduct += diff1 * diff2;
      sumSquare += diff1 * diff1;
    }
    autocorr = sumSquare > 0 ? sumProduct / sumSquare : 0;
  }

  const avgInterval =
    snapshots.length > 1
      ? (snapshots[snapshots.length - 1].ts - snapshots[0].ts) /
        (snapshots.length - 1) /
        60000
      : 15;

  const halfLifeMinutes =
    autocorr > 0 && autocorr < 1
      ? Math.max(5, -avgInterval / Math.log(autocorr))
      : 30;

  return {
    stabilityScore: Number(stabilityScore.toFixed(1)),
    halfLifeMinutes: Number(halfLifeMinutes.toFixed(1)),
    volatility: Number(volatility.toFixed(2)),
    meanDepth: Math.round(meanDepth),
    minDepth: Math.round(minDepth),
    maxDepth: Math.round(maxDepth),
  };
}
