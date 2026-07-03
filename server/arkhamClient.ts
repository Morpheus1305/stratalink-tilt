import axios from 'axios';

const ARKHAM_API_KEY = process.env.ARKHAM_API_KEY;
const ARKHAM_BASE_URL = 'https://api.arkhamintelligence.com';

const arkhamClient = axios.create({
  baseURL: ARKHAM_BASE_URL,
  headers: {
    'Authorization': `Bearer ${ARKHAM_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

export interface ArkhamEntity {
  id: string;
  name: string;
  type: string;
  address?: string;
  balance?: string;
  lastActivity?: string;
  riskScore?: number;
  labels?: string[];
}

export interface FragmentationData {
  token: string;
  totalLiquidity: string;
  cexShare: number;
  dexShare: number;
  topVenues: Array<{
    name: string;
    share: number;
    volume24h: string;
  }>;
  concentrationScore: number;
}

export interface MMIntegrityScore {
  entity: string;
  integrityScore: number;
  washTradingRisk: string;
  spoofingRisk: string;
  layeringRisk: string;
  avgSpreadAdherence: number;
  uptimePercentage: number;
  lastAssessment: string;
}

export interface PoLiPlusMetric {
  metric: string;
  value: string;
  benchmark: string;
  status: 'GOOD' | 'CAUTION' | 'CRITICAL';
  change24h: number;
  source: string;
}

export interface IdentityAlert {
  id: string;
  timestamp: string;
  entityId: string;
  entityName: string;
  alertType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  transactionHash?: string;
  amount?: string;
  status: 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED';
}

export interface RegSurveillanceSnapshot {
  totalEntitiesMonitored: number;
  highRiskEntities: number;
  sanctionedAddresses: number;
  pendingInvestigations: number;
  complianceScore: number;
  recentViolations: Array<{
    id: string;
    type: string;
    entity: string;
    timestamp: string;
    severity: string;
  }>;
  jurisdictionCoverage: Array<{
    region: string;
    coverage: number;
  }>;
}

// ─── Arkham API Functions ────────────────────────────────────────────────────
// When the Arkham API is unavailable (no key configured, network error, etc.)
// these functions return empty structures rather than fabricated data.
// The UI handles empty-state rendering with appropriate messaging.

export async function getEntityAttribution(entity: string): Promise<ArkhamEntity[]> {
  if (!ARKHAM_API_KEY) {
    console.log('[Arkham] No API key configured — entity attribution unavailable');
    return [];
  }
  try {
    const response = await arkhamClient.get(`/intelligence/address/${entity}`);
    return response.data;
  } catch (error) {
    console.log('[Arkham] Entity attribution API unavailable for:', entity);
    return [];
  }
}

export async function getFragmentationData(token: string): Promise<FragmentationData | null> {
  if (!ARKHAM_API_KEY) {
    console.log('[Arkham] No API key configured — fragmentation data unavailable');
    return null;
  }
  try {
    const response = await arkhamClient.get(`/transfers/token/${token}/stats`);
    return response.data;
  } catch (error) {
    console.log('[Arkham] Fragmentation API unavailable for:', token);
    return null;
  }
}

export async function getMMIntegrityScores(): Promise<MMIntegrityScore[]> {
  if (!ARKHAM_API_KEY) {
    console.log('[Arkham] No API key configured — MM integrity scores unavailable');
    return [];
  }
  try {
    const response = await arkhamClient.get('/intelligence/market-makers');
    return response.data;
  } catch (error) {
    console.log('[Arkham] MM integrity API unavailable');
    return [];
  }
}

export async function getPoLiPlusMetrics(): Promise<PoLiPlusMetric[]> {
  if (!ARKHAM_API_KEY) {
    console.log('[Arkham] No API key configured — PoLi+ metrics unavailable');
    return [];
  }
  try {
    const response = await arkhamClient.get('/analytics/liquidity-plus');
    return response.data;
  } catch (error) {
    console.log('[Arkham] PoLi+ API unavailable');
    return [];
  }
}

export async function getIdentityAlerts(): Promise<IdentityAlert[]> {
  if (!ARKHAM_API_KEY) {
    console.log('[Arkham] No API key configured — identity alerts unavailable');
    return [];
  }
  try {
    const response = await arkhamClient.get('/alerts');
    return response.data;
  } catch (error) {
    console.log('[Arkham] Identity alerts API unavailable');
    return [];
  }
}

export async function getRegSurveillanceSnapshot(): Promise<RegSurveillanceSnapshot | null> {
  if (!ARKHAM_API_KEY) {
    console.log('[Arkham] No API key configured — regulatory surveillance unavailable');
    return null;
  }
  try {
    const response = await arkhamClient.get('/compliance/surveillance');
    return response.data;
  } catch (error) {
    console.log('[Arkham] Regulatory surveillance API unavailable');
    return null;
  }
}

export const arkhamService = {
  getEntityAttribution,
  getFragmentationData,
  getMMIntegrityScores,
  getPoLiPlusMetrics,
  getIdentityAlerts,
  getRegSurveillanceSnapshot,
};
