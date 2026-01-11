/**
 * PoLi Evidence Types
 * 
 * Shared type definitions for PoLi evidence bundles and levels.
 * The actual route implementation is in server/routes/poliEvidence.ts.
 */

export type EvidenceLevel = "L0_NONE" | "L1_TSLE" | "L2_DEPTH" | "L3_DIVERGENCE" | "L4_INTEGRITY";

export type EvidenceBlock = {
  type: string;
  ts?: number;
  payload?: Record<string, unknown>;
};

export type PoLiEvidenceBundle = {
  venue: string;
  symbol: string;
  timestamp: number;
  blocks: EvidenceBlock[];
};
