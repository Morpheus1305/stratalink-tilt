export type EvidenceLevel = "L0_NONE" | "L1_TSLE" | "L2_DEPTH" | "L3_CROSS_VENUE";

export type PoLiEvidenceBlock =
  | { type: "TSLE_STATE"; venue: string; symbol: string; ts: number; quality: number; payload: any }
  | { type: "DEPTH_BANDS"; venue: string; symbol: string; ts: number; quality: number; payload: any }
  | { type: "POLI_POINT"; venue: string; symbol: string; ts: number; quality: number; payload: any }
  | { type: "DIVERGENCE"; venuePair: string; symbol: string; ts: number; quality: number; payload: any };

export type PoLiEvidenceBundle = {
  symbol: string;
  venue: string;                 // “focused venue”
  timestamp: number;             // bundle stamp
  blocks: PoLiEvidenceBlock[];
};