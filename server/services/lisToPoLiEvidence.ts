import type { PoLiEvidenceBundle } from "../../shared/poliEvidence";

export function lisStateToEvidenceBundle(liquidityState: any): PoLiEvidenceBundle {
  const venue = liquidityState?.venue ?? "unknown";
  const symbol = liquidityState?.symbol ?? "UNKNOWN";

  const latest = liquidityState?.latest;        // from /state endpoint
  const stateSnapshot = liquidityState?.stateSnapshot;

  const tsLatest = latest?.ts ?? Date.now();
  const tsState = stateSnapshot?.timestamp ?? tsLatest; // adapt if needed

  const blocks = [];

  if (stateSnapshot) {
    blocks.push({
      type: "TSLE_STATE",
      venue,
      symbol,
      ts: tsState,
      quality: Number.isFinite(stateSnapshot?.confidence) ? stateSnapshot.confidence : 0.7,
      payload: stateSnapshot,
    });
  }

  if (latest) {
    // We need depth bands in canonical format. If latest doesn’t carry bands,
    // include whatever your LiquidityState exposes (depth25/depth50 etc) and
    // optionally attach “bands” if available upstream.
    blocks.push({
      type: "POLI_POINT",
      venue,
      symbol,
      ts: tsLatest,
      quality: 0.8,
      payload: latest,
    });

    // If your LiquidityState already includes banded depth, map it here.
    // If not, you can pass a synthetic bands object using depth25/depth50.
    const bands = liquidityState?.bands ?? {
      "pct_0.25": { total_notional: latest?.depth25 ?? 0 },
      "pct_0.5":  { total_notional: latest?.depth50 ?? 0 },
    };

    blocks.push({
      type: "DEPTH_BANDS",
      venue,
      symbol,
      ts: tsLatest,
      quality: 0.85,
      payload: { bands },
    });
  }

  return {
    symbol,
    venue,
    timestamp: Date.now(),
    blocks,
  };
}