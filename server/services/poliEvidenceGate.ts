import type { PoLiEvidenceBundle, EvidenceLevel } from "../../shared/poliEvidence";

export type EvidenceGateResult = {
  ok: boolean;
  level: EvidenceLevel;
  reasons: string[];
  verifyFlags: string[]; // e.g. ["VERIFY_OK"] or ["VERIFY_INSUFFICIENT","VERIFY_STALE"]
};

type GateOpts = {
  maxAgeMsTSLE: number;
  maxAgeMsDepth: number;
  requireDepthBands: ("pct_0.25" | "pct_0.5")[]; // 25 & 50 bps equivalents
};

export function evaluateEvidenceLadder(
  bundle: PoLiEvidenceBundle,
  opts: GateOpts
): EvidenceGateResult {
  const reasons: string[] = [];
  const flags: string[] = [];

  const now = Date.now();

  const tsle = bundle.blocks.find(b => b.type === "TSLE_STATE");
  const depth = bundle.blocks.find(b => b.type === "DEPTH_BANDS");
  const poli  = bundle.blocks.find(b => b.type === "POLI_POINT");

  // L1: TSLE must be present + fresh
  if (!tsle) {
    reasons.push("Missing TSLE evidence.");
    flags.push("VERIFY_INSUFFICIENT");
    return { ok: false, level: "L0_NONE", reasons, verifyFlags: flags };
  }
  if (now - tsle.ts > opts.maxAgeMsTSLE) {
    reasons.push(`TSLE evidence stale (${now - tsle.ts}ms).`);
    flags.push("VERIFY_STALE");
    return { ok: false, level: "L1_TSLE", reasons, verifyFlags: flags };
  }

  // L2: depth bands must be present + fresh + contain required bands
  if (!depth) {
    reasons.push("Missing Depth Bands evidence.");
    flags.push("VERIFY_PARTIAL");
    return { ok: false, level: "L1_TSLE", reasons, verifyFlags: flags };
  }
  if (now - depth.ts > opts.maxAgeMsDepth) {
    reasons.push(`Depth evidence stale (${now - depth.ts}ms).`);
    flags.push("VERIFY_STALE");
    return { ok: false, level: "L2_DEPTH", reasons, verifyFlags: flags };
  }

  const bands = (depth.payload?.bands ?? {}) as Record<string, { total_notional?: number }>;
  for (const k of opts.requireDepthBands) {
    const v = bands[k]?.total_notional ?? 0;
    if (!Number.isFinite(v) || v <= 0) {
      reasons.push(`Depth band ${k} missing/zero.`);
      flags.push("VERIFY_PARTIAL");
      return { ok: false, level: "L2_DEPTH", reasons, verifyFlags: flags };
    }
  }

  // Optional sanity: PoLi point present (helps confidence)
  if (!poli) {
    reasons.push("Missing PoLi point evidence (non-fatal).");
    flags.push("VERIFY_PARTIAL");
  }

  // If we get here, we have live TSLE + depth sufficiency
  flags.push("VERIFY_OK");
  return { ok: true, level: "L2_DEPTH", reasons, verifyFlags: flags };
}