// server/services/lisToPoLiEvidence.ts
/**
 * LIS (LiquidityState) → PoLi-grade Evidence Bundle
 *
 * Contract for downstream gating:
 * - bundle.blocks MUST contain TSLE_STATE when TSLE is available
 * - DEPTH_BANDS should contain at least pct_0.25 and pct_0.5 totals when available
 *
 * This file is intentionally defensive: it supports multiple LiquidityState shapes.
 */

export type PoLiEvidenceBlock = {
  type: "TSLE_STATE" | "POLI_POINT" | "DEPTH_BANDS" | "DIVERGENCE";
  venue?: string;
  symbol?: string;
  ts?: number;
  quality?: number;
  payload?: any;
  venuePair?: string;
};

export type PoLiEvidenceBundle = {
  venue: string;
  symbol: string;
  timestamp: number;
  blocks: PoLiEvidenceBlock[];
};

type AnyLiquidityState = any;

function num(x: unknown): number | undefined {
  const n = Number(x);
  return Number.isFinite(n) ? n : undefined;
}

function clamp01(x: unknown): number | undefined {
  const n = Number(x);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(0, Math.min(1, n));
}

function normalizeConfidence(raw: unknown): number | undefined {
  const n = Number(raw);
  if (!Number.isFinite(n)) return undefined;
  // Accept 0..1 or 0..100
  return n > 1 ? clamp01(n / 100) : clamp01(n);
}

/**
 * Primary mapper
 */
export function lisStateToEvidenceBundle(liquidityState: AnyLiquidityState): PoLiEvidenceBundle {
  const venue = String(liquidityState?.venue ?? "unknown").toLowerCase();
  const symbol = String(liquidityState?.symbol ?? "UNKNOWN").toUpperCase();

  // ✅ Debug marker (remove later)
  // If you don't see this in logs when hitting /api/poli/evidence, you're not executing this file.
  console.log("[lisToPoLiEvidence] mapper active", { venue, symbol });

  const blocks: PoLiEvidenceBlock[] = [];

  const stateSnapshot = liquidityState?.stateSnapshot ?? null;

  // TSLE state can exist in either of these (we support both):
  const tsleState =
    stateSnapshot?.state ??
    liquidityState?.state ??
    liquidityState?.tsle_state ??
    liquidityState?.tsleState;

  // Latest point can exist in these places:
  // - liquidityState.latest (as per /api/lis)
  // - liquidityState.latestPoint / liquidityState.latestSnapshot (fallback)
  // - last element of liquidityState.history (fallback)
  const history = Array.isArray(liquidityState?.history) ? liquidityState.history : [];
  const latestFromHistory = history.length ? history[history.length - 1] : null;

  const latest =
    liquidityState?.latest ??
    liquidityState?.latestPoint ??
    liquidityState?.latestSnapshot ??
    latestFromHistory ??
    null;

  const tsLatest =
    num(latest?.ts) ??
    num(stateSnapshot?.since) ??
    Date.now();

  // ------------------------------------------------------------
  // 1) TSLE_STATE (authoritative)
  // ------------------------------------------------------------
  if (tsleState) {
    const rawConf =
      stateSnapshot?.confidence ??
      latest?.confidence ??
      liquidityState?.trend?.confidence ??
      liquidityState?.confidence;

    blocks.push({
      type: "TSLE_STATE",
      venue,
      symbol,
      ts: num(stateSnapshot?.since) ?? tsLatest,
      quality: 1,
      payload: {
        state: String(tsleState),
        confidence: normalizeConfidence(rawConf),
        raw: stateSnapshot ?? { state: tsleState },
      },
    });
  }

  // ------------------------------------------------------------
  // 2) POLI_POINT (latest computed point from TSLE buffer)
  // ------------------------------------------------------------
  if (latest && (num(latest?.ts) || num(latest?.poli) || num(latest?.depth25) || num(latest?.depth50))) {
    blocks.push({
      type: "POLI_POINT",
      venue,
      symbol,
      ts: num(latest?.ts) ?? tsLatest,
      quality: 0.9,
      payload: latest,
    });
  }

  // ------------------------------------------------------------
  // 3) DEPTH_BANDS (canonical: pct_0.25 and pct_0.5 totals)
  // ------------------------------------------------------------
  const depth25 = num(latest?.depth25);
  const depth50 = num(latest?.depth50);

  if (Number.isFinite(depth25) || Number.isFinite(depth50)) {
    blocks.push({
      type: "DEPTH_BANDS",
      venue,
      symbol,
      ts: num(latest?.ts) ?? tsLatest,
      quality: 0.85,
      payload: {
        bands: {
          "pct_0.25": { total_notional: depth25 ?? 0 },
          "pct_0.5": { total_notional: depth50 ?? 0 },
        },
        raw: { depth25, depth50 },
      },
    });
  }

  return {
    venue,
    symbol,
    timestamp: Date.now(),
    blocks,
  };
}

export default lisStateToEvidenceBundle;