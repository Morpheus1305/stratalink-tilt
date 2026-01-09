// server/services/lisToPoLiEvidence.ts
/**
 * LIS (LiquidityState) → PoLi-grade Evidence Bundle
 *
 * Goal:
 * - Produce a canonical, timestamped evidence bundle PoLi can gate on.
 * - MUST emit TSLE_STATE when LiquidityState has stateSnapshot (your current shape does).
 *
 * LiquidityState shape observed from /api/lis and /api/lis/tsle/dashboard:
 * - liquidityState.stateSnapshot.state   (e.g. "STABLE")
 * - liquidityState.latest.ts            (number timestamp)
 * - liquidityState.latest.depth25/depth50/poli/imbalance2550
 * - liquidityState.trend (optional)
 */

type AnyLiquidityState = any;

export type PoLiEvidenceBlock =
  | {
      type: "TSLE_STATE";
      venue: string;
      symbol: string;
      ts: number;
      quality: number; // 0..1
      payload: {
        state: string;
        confidence?: number; // 0..1 (optional)
        raw?: any;
      };
    }
  | {
      type: "POLI_POINT";
      venue: string;
      symbol: string;
      ts: number;
      quality: number;
      payload: any;
    }
  | {
      type: "DEPTH_BANDS";
      venue: string;
      symbol: string;
      ts: number;
      quality: number;
      payload: {
        bands: Record<
          string,
          {
            total_notional?: number;
            bid_notional?: number;
            ask_notional?: number;
          }
        >;
        raw?: any;
      };
    }
  | {
      type: "DIVERGENCE";
      venuePair: string;
      symbol: string;
      ts: number;
      quality: number;
      payload: any;
    };

export type PoLiEvidenceBundle = {
  venue: string;
  symbol: string;
  timestamp: number;
  blocks: PoLiEvidenceBlock[];
};

function clamp01(x: unknown): number | undefined {
  const n = Number(x);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(0, Math.min(1, n));
}

function num(x: unknown): number | undefined {
  const n = Number(x);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Build a PoLiEvidenceBundle from LiquidityState.
 * This is the critical standardization step for Phase 2 gating.
 */
export function lisStateToEvidenceBundle(liquidityState: AnyLiquidityState): PoLiEvidenceBundle {
  const venue = String(liquidityState?.venue ?? "unknown").toLowerCase();
  const symbol = String(liquidityState?.symbol ?? "UNKNOWN").toUpperCase();

  const latest = liquidityState?.latest ?? null;
  const stateSnapshot = liquidityState?.stateSnapshot ?? null;

  // Use latest.ts where available; otherwise fallback to now.
  const tsLatest = num(latest?.ts) ?? Date.now();

  const blocks: PoLiEvidenceBlock[] = [];

  // ------------------------------------------------------------
  // 1) TSLE_STATE (MUST EMIT if stateSnapshot exists) ✅
  // ------------------------------------------------------------
  if (stateSnapshot?.state) {
    // Confidence normalization:
    // - Your LIS endpoints often carry confidence as 0..100 on some payloads,
    //   but LiquidityState.stateSnapshot doesn’t always have it.
    // - We accept either 0..1 or 0..100 and normalize to 0..1 when possible.
    const rawConf = stateSnapshot?.confidence ?? latest?.confidence ?? liquidityState?.trend?.confidence;

    let conf01: number | undefined = undefined;
    const n = Number(rawConf);
    if (Number.isFinite(n)) {
      // If it looks like 0..100, normalize
      conf01 = n > 1 ? clamp01(n / 100) : clamp01(n);
    }

    blocks.push({
      type: "TSLE_STATE",
      venue,
      symbol,
      // Prefer "since" if present; otherwise anchor to latest.ts so freshness works.
      ts: num(stateSnapshot?.since) ?? tsLatest,
      quality: 1,
      payload: {
        state: String(stateSnapshot.state),
        confidence: conf01,
        raw: stateSnapshot,
      },
    });
  }

  // ------------------------------------------------------------
  // 2) POLI_POINT (latest point evidence) ✅
  // ------------------------------------------------------------
  if (latest) {
    blocks.push({
      type: "POLI_POINT",
      venue,
      symbol,
      ts: tsLatest,
      quality: 0.9,
      payload: latest,
    });
  }

  // ------------------------------------------------------------
  // 3) DEPTH_BANDS (canonical 25/50 bps mapping) ✅
  // ------------------------------------------------------------
  // Your LiquidityState.latest exposes depth25/depth50; the depth route exposes detailed bands.
  // For gating we only need pct_0.25 and pct_0.5 total notionals.
  const depth25 = num(latest?.depth25);
  const depth50 = num(latest?.depth50);

  const bands = {
    "pct_0.25": { total_notional: depth25 ?? 0 },
    "pct_0.5": { total_notional: depth50 ?? 0 },
  };

  // Only add DEPTH_BANDS if we have at least one numeric depth value (still fine if one is 0).
  if (Number.isFinite(depth25) || Number.isFinite(depth50)) {
    blocks.push({
      type: "DEPTH_BANDS",
      venue,
      symbol,
      ts: tsLatest,
      quality: 0.85,
      payload: {
        bands,
        raw: { depth25, depth50 },
      },
    });
  }

  // ------------------------------------------------------------
  // 4) (Optional) DIVERGENCE block
  // ------------------------------------------------------------
  // Not emitted here because LiquidityState is per-venue.
  // Cross-venue divergence can be added later by composing a multi-venue bundle.

  return {
    venue,
    symbol,
    timestamp: Date.now(),
    blocks,
  };
}

export default lisStateToEvidenceBundle;