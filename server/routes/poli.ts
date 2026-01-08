import { Router } from "express";
import type { PoLiPayload, RagStatus, Confidence, PillarData } from "../../shared/poli";

const router = Router();

function generateMockPoLiData(token: string, window: string, venues: string[]): PoLiPayload {
  const baseScore = token === 'BTC' ? 78.4 : token === 'ETH' ? 72.1 : 65.8;
  const variance = () => (Math.random() - 0.5) * 10;
  
  const score = Math.max(0, Math.min(100, baseScore + variance()));
  
  const getRag = (s: number): RagStatus => {
    if (s >= 80) return 'GREEN';
    if (s >= 60) return 'AMBER';
    if (s >= 40) return 'ORANGE';
    return 'RED';
  };
  
  const getConfidence = (venueCount: number): Confidence => {
    if (venueCount >= 3) return 'HIGH';
    if (venueCount >= 2) return 'MEDIUM';
    return 'LOW';
  };
  
  const generatePillar = (name: string, baseScore: number): PillarData => {
    const pillarScore = Math.max(0, Math.min(100, baseScore + variance()));
    
    const inputConfigs: Record<string, { label: string; metrics: { key: string; label: string; value: number; unit: string }[] }> = {
      executability_cefi: {
        label: 'CeFi Execution Quality',
        metrics: [
          { key: 'depth_25bps', label: 'Depth @ 25bps', value: 2.4 + Math.random() * 0.5, unit: 'M USD' },
          { key: 'depth_50bps', label: 'Depth @ 50bps', value: 4.8 + Math.random() * 0.8, unit: 'M USD' },
          { key: 'spread_avg', label: 'Avg Spread', value: 1.2 + Math.random() * 0.3, unit: 'bps' },
          { key: 'fill_rate', label: 'Fill Rate', value: 94 + Math.random() * 5, unit: '%' }
        ]
      },
      market_coherence: {
        label: 'Cross-Venue Coherence',
        metrics: [
          { key: 'price_divergence', label: 'Price Divergence', value: 0.02 + Math.random() * 0.03, unit: '%' },
          { key: 'depth_correlation', label: 'Depth Correlation', value: 0.85 + Math.random() * 0.1, unit: '' },
          { key: 'regime_alignment', label: 'Regime Alignment', value: 90 + Math.random() * 8, unit: '%' }
        ]
      },
      onchain_executability: {
        label: 'DeFi Execution',
        metrics: [
          { key: 'dex_tvl', label: 'DEX TVL', value: 120 + Math.random() * 30, unit: 'M USD' },
          { key: 'slippage_1m', label: 'Slippage @ $1M', value: 0.3 + Math.random() * 0.2, unit: '%' },
          { key: 'pool_depth', label: 'Pool Depth', value: 45 + Math.random() * 15, unit: 'M USD' }
        ]
      },
      method_integrity: {
        label: 'Methodology Validation',
        metrics: [
          { key: 'data_freshness', label: 'Data Freshness', value: 100 - Math.random() * 5, unit: '%' },
          { key: 'venue_coverage', label: 'Venue Coverage', value: venues.length, unit: 'venues' },
          { key: 'regime_samples', label: 'Regime Samples', value: Math.floor(20 + Math.random() * 10), unit: '' }
        ]
      }
    };
    
    const config = inputConfigs[name] || inputConfigs.executability_cefi;
    
    return {
      score: pillarScore,
      rag: getRag(pillarScore),
      summary: `${name.replace(/_/g, ' ')} scoring ${pillarScore.toFixed(1)} across ${venues.length} venues`,
      inputs: {
        primary: {
          score: pillarScore + variance() * 0.5,
          state: pillarScore >= 70 ? 'VALID' : pillarScore >= 50 ? 'WARNING' : 'INVALID',
          highlights: [
            `Coverage: ${venues.length} venues active`,
            pillarScore >= 70 ? 'All thresholds met' : 'Some thresholds below target'
          ],
          metrics: config.metrics
        }
      }
    };
  };
  
  const windowPoints = Array.from({ length: 7 }, (_, i) => ({
    t: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString(),
    score: baseScore + (Math.random() - 0.5) * 15
  }));
  
  const delta7d = windowPoints[6].score - windowPoints[0].score;
  
  return {
    meta: {
      token,
      window,
      venues,
      last_updated: new Date().toISOString(),
      versions: {
        verify: '3.0',
        poli: '1.0',
        tsle: '2.0'
      }
    },
    overall: {
      score,
      rag: getRag(score),
      confidence: getConfidence(venues.length),
      coverage: {
        venues_covered: venues.length,
        venues_expected: 3,
        regimes_observed: ['NORMAL', 'THIN'],
        min_required_regimes_met: true
      },
      trend: {
        window_points: windowPoints,
        delta_7d: delta7d,
        direction: delta7d > 2 ? 'UP' : delta7d < -2 ? 'DOWN' : 'FLAT'
      }
    },
    pillars: {
      executability_cefi: generatePillar('executability_cefi', baseScore + 5),
      market_coherence: generatePillar('market_coherence', baseScore - 3),
      onchain_executability: generatePillar('onchain_executability', baseScore - 8),
      method_integrity: generatePillar('method_integrity', baseScore + 10)
    }
  };
}

router.get("/", (req, res) => {
  try {
    const token = (req.query.token as string) || 'BTC';
    const window = (req.query.window as string) || '7D';
    const venuesParam = req.query.venues as string;
    
    const venues = venuesParam === 'ALL' || !venuesParam 
      ? ['binance', 'coinbase', 'kraken']
      : venuesParam.split(',');
    
    const data = generateMockPoLiData(token, window, venues);
    res.json(data);
  } catch (error) {
    console.error('PoLi endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch PoLi data' });
  }
});

export default router;
