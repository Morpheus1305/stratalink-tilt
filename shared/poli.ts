export type RagStatus = 'GREEN' | 'AMBER' | 'ORANGE' | 'RED';
export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type VerifyState = 'VALID' | 'WARNING' | 'INVALID' | 'PASS' | 'FAIL';

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
