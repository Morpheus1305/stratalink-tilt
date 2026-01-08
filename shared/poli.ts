export const POLI_CONTRACT_VERSION = "1.0.0";

export type RagStatus = 'GREEN' | 'AMBER' | 'ORANGE' | 'RED';
export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type VerifyState = 'VALID' | 'WARNING' | 'INVALID' | 'PASS' | 'FAIL';
export type PoLiStatus = 'ok' | 'insufficient' | 'error';
export type PoLiRating = 'A' | 'B' | 'C' | 'D' | 'F';
export type RiskBand = 'low' | 'medium' | 'high' | 'critical';

export interface PoLiContext {
  token: string;
  venue: string;
  symbol: string;
  scope: 'spot' | 'perp' | 'futures';
  timestamp: number;
}

export interface PoLiDriver {
  metricId: string;
  label: string;
  value: number | string;
  unit?: string;
  direction?: 'up' | 'down' | 'flat';
}

export interface PoLiVerify {
  source: string;
  locked: boolean;
  tags: string[];
}

export interface PoLiPillar {
  id: string;
  name: string;
  score: number;
  rating: PoLiRating;
  band: RiskBand;
  confidence: { score: number; rationale: string };
  drivers: PoLiDriver[];
  flags: string[];
  verify: PoLiVerify;
}

export interface PoLiSnapshot {
  version: string;
  status: PoLiStatus;
  context: PoLiContext;
  score: number;
  rating: PoLiRating;
  band: RiskBand;
  delta: { score: number; direction: string };
  confidence: { score: number; rationale: string };
  pillars: Record<string, PoLiPillar>;
  flags: string[];
  summary: string;
  verify: PoLiVerify;
}

export function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}

export function poliRatingFromScore(score: number): PoLiRating {
  if (score >= 80) return 'A';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  if (score >= 20) return 'D';
  return 'F';
}

export function riskBandFromScore(score: number): RiskBand {
  if (score >= 75) return 'low';
  if (score >= 50) return 'medium';
  if (score >= 25) return 'high';
  return 'critical';
}

export function makeEmptyPoLiSnapshot(opts: {
  token: string;
  venue: string;
  symbol?: string;
  scope?: PoLiContext['scope'];
  status?: PoLiStatus;
  summary?: string;
}): PoLiSnapshot {
  return {
    version: POLI_CONTRACT_VERSION,
    status: opts.status ?? 'insufficient',
    context: {
      token: opts.token,
      venue: opts.venue,
      symbol: opts.symbol ?? opts.token,
      scope: opts.scope ?? 'spot',
      timestamp: Date.now(),
    },
    score: 0,
    rating: 'F',
    band: 'critical',
    delta: { score: 0, direction: 'unknown' },
    confidence: { score: 0, rationale: 'No data' },
    pillars: {},
    flags: [],
    summary: opts.summary ?? 'Empty PoLi snapshot.',
    verify: { source: 'VERIFY_v3.0', locked: false, tags: [] },
  };
}

export interface PoLiMetric {
  key: string;
  label: string;
  value: number | string;
  unit: string;
}

export interface InputCategory {
  score: number;
  state: VerifyState;
  highlights?: string[];
  metrics?: PoLiMetric[];
}

export interface PillarData {
  score: number;
  rag: RagStatus;
  summary: string;
  inputs: Record<string, InputCategory>;
}

export interface TrendPoint {
  t: string;
  score: number;
}

export interface PoLiPayload {
  meta: {
    token: string;
    window: string;
    venues: string[];
    last_updated: string;
    versions: {
      verify: string;
      poli: string;
      tsle: string;
    };
  };
  overall: {
    score: number;
    rag: RagStatus;
    confidence: Confidence;
    coverage: {
      venues_covered: number;
      venues_expected: number;
      regimes_observed: string[];
      min_required_regimes_met: boolean;
    };
    trend: {
      window_points: TrendPoint[];
      delta_7d: number;
      direction: 'UP' | 'DOWN' | 'FLAT';
    };
  };
  pillars: {
    executability_cefi: PillarData;
    market_coherence: PillarData;
    onchain_executability: PillarData;
    method_integrity: PillarData;
  };
}

export type PillarKey = keyof PoLiPayload['pillars'];

export const PILLAR_LABELS: Record<PillarKey, string> = {
  executability_cefi: 'Executability (CeFi)',
  market_coherence: 'Market Coherence',
  onchain_executability: 'On-chain Executability',
  method_integrity: 'Method Integrity'
};

export function getRagColor(rag: RagStatus): string {
  switch (rag) {
    case 'GREEN': return '#10b981';
    case 'AMBER': return '#f59e0b';
    case 'ORANGE': return '#f97316';
    case 'RED': return '#ef4444';
  }
}

export function getStateColor(state: VerifyState): string {
  switch (state) {
    case 'VALID':
    case 'PASS':
      return '#10b981';
    case 'WARNING':
      return '#f59e0b';
    case 'INVALID':
    case 'FAIL':
      return '#ef4444';
  }
}
