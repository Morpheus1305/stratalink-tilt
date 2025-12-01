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

async function generateMockEntityAttribution(entity: string): Promise<ArkhamEntity[]> {
  const mockEntities: ArkhamEntity[] = [
    {
      id: `entity_${entity}_1`,
      name: `${entity} Foundation Treasury`,
      type: 'Foundation',
      address: '0x' + Math.random().toString(16).substring(2, 42),
      balance: `$${(Math.random() * 500000000 + 100000000).toFixed(0)}`,
      lastActivity: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
      riskScore: Math.floor(Math.random() * 30),
      labels: ['Foundation', 'Treasury', 'Long-term Holder'],
    },
    {
      id: `entity_${entity}_2`,
      name: `${entity} Market Maker Alpha`,
      type: 'Market Maker',
      address: '0x' + Math.random().toString(16).substring(2, 42),
      balance: `$${(Math.random() * 50000000 + 10000000).toFixed(0)}`,
      lastActivity: new Date(Date.now() - Math.random() * 3600000).toISOString(),
      riskScore: Math.floor(Math.random() * 20 + 10),
      labels: ['Market Maker', 'High Volume', 'Active'],
    },
    {
      id: `entity_${entity}_3`,
      name: `${entity} VC Fund Holdings`,
      type: 'Investment Fund',
      address: '0x' + Math.random().toString(16).substring(2, 42),
      balance: `$${(Math.random() * 200000000 + 50000000).toFixed(0)}`,
      lastActivity: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(),
      riskScore: Math.floor(Math.random() * 15),
      labels: ['VC', 'Seed Investor', 'Lock-up Period'],
    },
    {
      id: `entity_${entity}_4`,
      name: 'Jump Trading',
      type: 'Trading Firm',
      address: '0x' + Math.random().toString(16).substring(2, 42),
      balance: `$${(Math.random() * 100000000 + 20000000).toFixed(0)}`,
      lastActivity: new Date(Date.now() - Math.random() * 3600000).toISOString(),
      riskScore: Math.floor(Math.random() * 25 + 5),
      labels: ['Trading Firm', 'HFT', 'Cross-Exchange'],
    },
    {
      id: `entity_${entity}_5`,
      name: 'Wintermute',
      type: 'Market Maker',
      address: '0x' + Math.random().toString(16).substring(2, 42),
      balance: `$${(Math.random() * 80000000 + 15000000).toFixed(0)}`,
      lastActivity: new Date(Date.now() - Math.random() * 7200000).toISOString(),
      riskScore: Math.floor(Math.random() * 20 + 8),
      labels: ['Market Maker', 'Multi-Chain', 'Active'],
    },
  ];
  return mockEntities;
}

function generateMockFragmentationData(token: string): FragmentationData {
  const venues = [
    { name: 'Binance', share: 28 + Math.random() * 10, volume24h: `$${(Math.random() * 500 + 200).toFixed(0)}M` },
    { name: 'Coinbase', share: 18 + Math.random() * 8, volume24h: `$${(Math.random() * 300 + 100).toFixed(0)}M` },
    { name: 'OKX', share: 12 + Math.random() * 6, volume24h: `$${(Math.random() * 200 + 80).toFixed(0)}M` },
    { name: 'Uniswap', share: 8 + Math.random() * 5, volume24h: `$${(Math.random() * 150 + 50).toFixed(0)}M` },
    { name: 'Kraken', share: 6 + Math.random() * 4, volume24h: `$${(Math.random() * 100 + 40).toFixed(0)}M` },
  ];

  const cexShare = 72 + Math.random() * 10;
  return {
    token,
    totalLiquidity: `$${(Math.random() * 2 + 1).toFixed(2)}B`,
    cexShare,
    dexShare: 100 - cexShare,
    topVenues: venues,
    concentrationScore: 65 + Math.random() * 20,
  };
}

function generateMockMMIntegrityScores(): MMIntegrityScore[] {
  const marketMakers = ['Wintermute', 'Jump Trading', 'GSR', 'Alameda Research (Legacy)', 'DWF Labs', 'Amber Group'];
  return marketMakers.map(mm => ({
    entity: mm,
    integrityScore: Math.floor(60 + Math.random() * 35),
    washTradingRisk: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)],
    spoofingRisk: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)],
    layeringRisk: ['Low', 'Medium'][Math.floor(Math.random() * 2)],
    avgSpreadAdherence: 85 + Math.random() * 12,
    uptimePercentage: 95 + Math.random() * 4.5,
    lastAssessment: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString(),
  }));
}

function generateMockPoLiPlusMetrics(): PoLiPlusMetric[] {
  return [
    { metric: 'Entity-Weighted Depth', value: '$48.2M', benchmark: '> $30M', status: 'GOOD', change24h: 2.4, source: 'Arkham + PoLi' },
    { metric: 'Identified MM Coverage', value: '78%', benchmark: '> 70%', status: 'GOOD', change24h: 1.2, source: 'Arkham Intel' },
    { metric: 'Wash Trade Adjusted Volume', value: '$892M', benchmark: 'N/A', status: 'GOOD', change24h: -3.1, source: 'Arkham Analysis' },
    { metric: 'Counterparty Risk Score', value: '24/100', benchmark: '< 30', status: 'GOOD', change24h: -2.8, source: 'Arkham Risk' },
    { metric: 'Exchange Concentration', value: '42%', benchmark: '< 50%', status: 'GOOD', change24h: 0.5, source: 'PoLi + Arkham' },
    { metric: 'Smart Money Flow (7D)', value: '+$12.4M', benchmark: 'N/A', status: 'GOOD', change24h: 8.2, source: 'Arkham Flow' },
    { metric: 'Whale Activity Index', value: '68/100', benchmark: '40-80', status: 'CAUTION', change24h: 12.5, source: 'Arkham Intel' },
    { metric: 'DEX Liquidity Health', value: '82/100', benchmark: '> 75', status: 'GOOD', change24h: -1.4, source: 'PoLi DEX' },
  ];
}

function generateMockIdentityAlerts(): IdentityAlert[] {
  const alertTypes = ['Large Transfer', 'Wallet Cluster Activity', 'Exchange Deposit', 'Smart Contract Interaction', 'Cross-Chain Bridge'];
  const severities: Array<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'> = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  const statuses: Array<'NEW' | 'ACKNOWLEDGED' | 'RESOLVED'> = ['NEW', 'ACKNOWLEDGED', 'RESOLVED'];
  const entities = ['Jump Trading', 'Wintermute', 'Unknown Whale', 'FTX Bankruptcy Estate', 'Binance Hot Wallet', 'Coinbase Prime'];

  return Array.from({ length: 12 }, (_, i) => ({
    id: `alert_${Date.now()}_${i}`,
    timestamp: new Date(Date.now() - Math.random() * 86400000 * 2).toISOString(),
    entityId: `entity_${i}`,
    entityName: entities[Math.floor(Math.random() * entities.length)],
    alertType: alertTypes[Math.floor(Math.random() * alertTypes.length)],
    severity: severities[Math.floor(Math.random() * severities.length)],
    description: `Detected unusual ${alertTypes[Math.floor(Math.random() * alertTypes.length)].toLowerCase()} activity`,
    transactionHash: '0x' + Math.random().toString(16).substring(2, 66),
    amount: `$${(Math.random() * 10 + 0.5).toFixed(2)}M`,
    status: statuses[Math.floor(Math.random() * statuses.length)],
  })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

function generateMockRegSurveillanceSnapshot(): RegSurveillanceSnapshot {
  return {
    totalEntitiesMonitored: 12847,
    highRiskEntities: 234,
    sanctionedAddresses: 1892,
    pendingInvestigations: 18,
    complianceScore: 94,
    recentViolations: [
      { id: 'v1', type: 'OFAC Match', entity: 'Unknown Wallet', timestamp: new Date(Date.now() - 3600000).toISOString(), severity: 'HIGH' },
      { id: 'v2', type: 'Suspicious Pattern', entity: 'Mixer Service', timestamp: new Date(Date.now() - 7200000).toISOString(), severity: 'MEDIUM' },
      { id: 'v3', type: 'Threshold Breach', entity: 'Trading Bot', timestamp: new Date(Date.now() - 14400000).toISOString(), severity: 'LOW' },
    ],
    jurisdictionCoverage: [
      { region: 'United States', coverage: 98 },
      { region: 'European Union', coverage: 95 },
      { region: 'United Kingdom', coverage: 97 },
      { region: 'Singapore', coverage: 92 },
      { region: 'Japan', coverage: 89 },
    ],
  };
}

export async function getEntityAttribution(entity: string): Promise<ArkhamEntity[]> {
  try {
    const response = await arkhamClient.get(`/intelligence/address/${entity}`);
    return response.data;
  } catch (error) {
    console.log('[Arkham] Using mock data for entity attribution:', entity);
    return generateMockEntityAttribution(entity);
  }
}

export async function getFragmentationData(token: string): Promise<FragmentationData> {
  try {
    const response = await arkhamClient.get(`/transfers/token/${token}/stats`);
    return response.data;
  } catch (error) {
    console.log('[Arkham] Using mock data for fragmentation:', token);
    return generateMockFragmentationData(token);
  }
}

export async function getMMIntegrityScores(): Promise<MMIntegrityScore[]> {
  try {
    const response = await arkhamClient.get('/intelligence/market-makers');
    return response.data;
  } catch (error) {
    console.log('[Arkham] Using mock data for MM integrity scores');
    return generateMockMMIntegrityScores();
  }
}

export async function getPoLiPlusMetrics(): Promise<PoLiPlusMetric[]> {
  try {
    const response = await arkhamClient.get('/analytics/liquidity-plus');
    return response.data;
  } catch (error) {
    console.log('[Arkham] Using mock data for PoLi+ metrics');
    return generateMockPoLiPlusMetrics();
  }
}

export async function getIdentityAlerts(): Promise<IdentityAlert[]> {
  try {
    const response = await arkhamClient.get('/alerts');
    return response.data;
  } catch (error) {
    console.log('[Arkham] Using mock data for identity alerts');
    return generateMockIdentityAlerts();
  }
}

export async function getRegSurveillanceSnapshot(): Promise<RegSurveillanceSnapshot> {
  try {
    const response = await arkhamClient.get('/compliance/surveillance');
    return response.data;
  } catch (error) {
    console.log('[Arkham] Using mock data for regulatory surveillance');
    return generateMockRegSurveillanceSnapshot();
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
