import { tsleBuffer, tsleStateEngine, type LISSnapshot } from './tsle-buffer';

export interface VenueSlice {
  venue_id: string;
  depth_10bps: number;
  depth_share_pct: number;
  spread_bps: number;
  stability_score: number;
  is_regulated: boolean;
  weight_class: 'HIGH' | 'MEDIUM' | 'LOW';
  exec_integrity_score: number;
  price_leadership_score: number;
}

export type VolRegime = 'NORMAL' | 'ELEVATED' | 'STRESS';

export interface TsleAggregate {
  symbol: string;
  computed_at_utc: number;
  venue_count: number;

  total_depth_10bps: number;
  total_depth_25bps: number;
  regulated_depth_share: number;
  offshore_depth_share: number;
  fragmentation_index: number;
  spread_dispersion_bps: number;

  vol_regime: VolRegime;
  depth_decay_rate: number;
  withdrawal_velocity: number;
  spread_elasticity: number;

  l5f_depth_quality: number;
  l5f_resilience: number;
  l5f_fragmentation: number;
  l5f_exec_integrity: number;
  l5f_regime_stability: number;

  l5f_composite: number;

  venue_slices: VenueSlice[];
}

const KNOWN_VENUES = [
  'binance', 'coinbase', 'kraken', 'okx', 'bybit',
  'deribit', 'hyperliquid', 'dydx', 'uniswap',
  'bitget', 'gmx', 'curve', 'otc', 'canton',
];

const REGULATED = new Set(['coinbase', 'kraken', 'deribit']);

const VENUE_WEIGHT: Record<string, number> = {
  binance:     0.28,
  coinbase:    0.18,
  kraken:      0.14,
  okx:         0.12,
  bybit:       0.10,
  deribit:     0.08,
  hyperliquid: 0.05,
  dydx:        0.04,
  uniswap:     0.03,
  bitget:      0.03,
  gmx:         0.02,
  curve:       0.02,
  otc:         0.02,
  canton:      0.02,
};
const DEFAULT_WEIGHT = 0.02;

const clamp = (v: number, lo = 0, hi = 100): number =>
  Math.max(lo, Math.min(hi, v));

function stdDev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length);
}

function getBand(snap: any, key: string): number {
  return snap?.bands?.[key]?.total_notional ?? 0;
}

function venueWeight(venue: string): number {
  return VENUE_WEIGHT[venue.toLowerCase()] ?? DEFAULT_WEIGHT;
}

function computeDQ(
  latestByVenue: Map<string, any>,
  historyByVenue: Map<string, any[]>
): number {
  let sessionPeak = 1;
  for (const history of historyByVenue.values()) {
    for (const snap of history) {
      sessionPeak = Math.max(sessionPeak, getBand(snap, 'pct_0.1'));
    }
  }

  let weightedDepth = 0;
  let weightTotal = 0;

  for (const [venue, snap] of latestByVenue) {
    const d10 = getBand(snap, 'pct_0.1');
    const d25 = getBand(snap, 'pct_0.25');
    const rawDepth = d10 * 0.65 + d25 * 0.35;
    const premium = REGULATED.has(venue) ? 1.25 : 1.0;
    const w = venueWeight(venue);
    weightedDepth += rawDepth * premium * w;
    weightTotal += w;
  }

  if (weightTotal === 0) return 0;

  const ceiling = sessionPeak * 1.25 * weightTotal;
  return clamp((weightedDepth / ceiling) * 100);
}

interface ResilienceResult {
  r: number;
  depth_decay_rate: number;
  withdrawal_velocity: number;
  spread_elasticity: number;
}

function computeR(
  historyByVenue: Map<string, any[]>,
  spread_dispersion_bps: number,
  latestByVenue: Map<string, any>
): ResilienceResult {
  const decayScores: number[] = [];
  const velocityScores: number[] = [];
  const rawDecayRates: number[] = [];
  const rawVelocities: number[] = [];

  for (const [, history] of historyByVenue) {
    if (history.length < 3) continue;

    const oldest = history[0];
    const latest = history[history.length - 1];
    const timeMs = latest.timestamp - oldest.timestamp;
    if (timeMs < 15_000) continue;

    const timeMin = timeMs / 60_000;

    const d10Old = getBand(oldest, 'pct_0.1');
    const d10New = getBand(latest, 'pct_0.1');
    if (d10Old > 0) {
      const decayPct = (d10Old - d10New) / d10Old;
      const decayRate = decayPct / timeMin;
      rawDecayRates.push(Math.max(0, decayRate));
      const R_decay = 1.0 - clamp(decayRate / 0.25, 0, 1);
      decayScores.push(R_decay);
    }

    const spreadOld = oldest.spread?.bps ?? 0;
    const spreadNew = latest.spread?.bps ?? 0;
    if (spreadOld > 0 && timeMin > 0) {
      const widenBpsPerMin = (spreadNew - spreadOld) / timeMin;
      const widenBpsPerHr = widenBpsPerMin * 60;
      rawVelocities.push(Math.max(0, widenBpsPerHr));
      const R_vel = 1.0 - clamp(widenBpsPerHr / 50, 0, 1);
      velocityScores.push(R_vel);
    }
  }

  const avgDecay = decayScores.length
    ? decayScores.reduce((a, b) => a + b, 0) / decayScores.length
    : 0.8;

  const avgVelocity = velocityScores.length
    ? velocityScores.reduce((a, b) => a + b, 0) / velocityScores.length
    : avgDecay;

  const r = clamp((avgDecay * 0.60 + avgVelocity * 0.40) * 100);

  const depth_decay_rate =
    rawDecayRates.length
      ? Math.round((rawDecayRates.reduce((a, b) => a + b, 0) / rawDecayRates.length) * 1000) / 10
      : 0;

  const withdrawal_velocity =
    rawVelocities.length
      ? Math.round(rawVelocities.reduce((a, b) => a + b, 0) / rawVelocities.length * 10) / 10
      : 0;

  const allSpreads = [...latestByVenue.values()]
    .map(s => s.spread?.bps ?? 0)
    .filter(v => v > 0);
  const meanSpread = allSpreads.length
    ? allSpreads.reduce((a, b) => a + b, 0) / allSpreads.length
    : 1;
  const spread_elasticity =
    Math.round((spread_dispersion_bps / Math.max(meanSpread, 0.01)) * 100) / 100;

  return { r, depth_decay_rate, withdrawal_velocity, spread_elasticity };
}

interface FragResult {
  f_score: number;
  l5f_f_input: number;
  hhi: number;
}

function computeF(latestByVenue: Map<string, any>): FragResult {
  const entries = [...latestByVenue.entries()];
  const depths = entries.map(([, s]) => getBand(s, 'pct_0.1'));
  const total = depths.reduce((a, b) => a + b, 0);

  if (total === 0) return { f_score: 50, l5f_f_input: 50, hhi: 0.5 };

  const shares = depths.map(d => d / total);
  const hhi = shares.reduce((a, s) => a + s * s, 0);
  const F = (1 - hhi) * 100;

  const regDepth = entries.reduce(
    (sum, [venue, snap]) => sum + (REGULATED.has(venue) ? getBand(snap, 'pct_0.1') : 0),
    0
  );
  const regShare = regDepth / total;
  const regBonus = regShare > 0.4 ? 5 : 0;

  return {
    f_score: Math.round(F * 10) / 10,
    l5f_f_input: clamp(100 - F + regBonus),
    hhi: Math.round(hhi * 1000) / 1000,
  };
}

function computeEI(latestByVenue: Map<string, any>): number {
  const spreads = [...latestByVenue.values()]
    .map(s => s.spread?.bps ?? null)
    .filter((v): v is number => v !== null && v > 0);

  if (spreads.length === 0) return 75;

  const dispersion = stdDev(spreads);
  const meanSpread = spreads.reduce((a, b) => a + b, 0) / spreads.length;

  const EI_dispersion = clamp(100 - (dispersion / 5) * 100);
  const EI_level = clamp(100 - Math.max(0, meanSpread - 1) * (100 / 19));

  return clamp(EI_dispersion * 0.60 + EI_level * 0.40);
}

const STATE_SCORE: Record<string, number> = {
  STABLE:     1.00,
  THINNING:   0.60,
  FRAGILE:    0.20,
  DISLOCATED: 0.00,
};

const STATE_TO_REGIME: Record<string, VolRegime> = {
  STABLE:     'NORMAL',
  THINNING:   'ELEVATED',
  FRAGILE:    'STRESS',
  DISLOCATED: 'STRESS',
};

const SEVERITY = ['DISLOCATED', 'FRAGILE', 'THINNING', 'STABLE'];

interface RegimeResult {
  rs: number;
  vol_regime: VolRegime;
}

function computeRS(symbol: string, venues: string[]): RegimeResult {
  let rsSum = 0;
  let count = 0;
  let worstState = 'STABLE';

  for (const venue of venues) {
    try {
      const snap = tsleStateEngine.getState(venue, symbol);
      if (!snap) continue;

      const baseScore = STATE_SCORE[snap.state] ?? 0.5;

      const durationBonus = Math.min(snap.durationMs / (5 * 60_000), 1) * 0.15;
      const transitionPenalty = Math.min(snap.transitionCount / 10, 1) * 0.15;
      const pendingPenalty = snap.pendingState ? 0.10 : 0;
      const confirmationCredit = snap.pendingState
        ? (snap.confirmationProgress / snap.confirmationRequired) * 0.05
        : 0;

      const rs_venue = clamp(
        (baseScore + durationBonus - transitionPenalty - pendingPenalty + confirmationCredit) * 100
      );

      rsSum += rs_venue;
      count++;

      if (SEVERITY.indexOf(snap.state) < SEVERITY.indexOf(worstState)) {
        worstState = snap.state;
      }
    } catch {
    }
  }

  return {
    rs: count > 0 ? clamp(rsSum / count) : 75,
    vol_regime: STATE_TO_REGIME[worstState] ?? 'NORMAL',
  };
}

function buildVenueSlices(
  latestByVenue: Map<string, any>,
  total_depth_10bps: number
): VenueSlice[] {
  return [...latestByVenue.entries()]
    .sort(([, a], [, b]) => getBand(b, 'pct_0.1') - getBand(a, 'pct_0.1'))
    .map(([venue, snap]) => {
      const d10 = getBand(snap, 'pct_0.1');
      const share = total_depth_10bps > 0 ? (d10 / total_depth_10bps) * 100 : 0;
      const spreadBps = snap.spread?.bps ?? 0;
      const is_regulated = REGULATED.has(venue);
      const w = venueWeight(venue);

      const tsleConf: number = (snap as any).tsle?.confidence ?? 0.80;
      const stability_score = clamp(tsleConf * 100);

      const weight_class: 'HIGH' | 'MEDIUM' | 'LOW' =
        w >= 0.14 ? 'HIGH' : w >= 0.08 ? 'MEDIUM' : 'LOW';

      const price_leadership_score = Math.round(
        clamp(w * (is_regulated ? 1.3 : 1.0), 0, 1) * 100
      ) / 100;

      const exec_integrity_score = clamp(100 - Math.max(0, spreadBps - 1) * 8);

      return {
        venue_id: venue,
        depth_10bps: Math.round(d10),
        depth_share_pct: Math.round(share * 10) / 10,
        spread_bps: Math.round(spreadBps * 100) / 100,
        stability_score: Math.round(stability_score * 10) / 10,
        is_regulated,
        weight_class,
        exec_integrity_score: Math.round(exec_integrity_score * 10) / 10,
        price_leadership_score,
      };
    });
}

export function computeAnalyticsSnapshot(symbol: string): TsleAggregate | null {
  const sym = symbol.toUpperCase();

  const historyByVenue = new Map<string, any[]>();
  const latestByVenue = new Map<string, any>();

  for (const venue of KNOWN_VENUES) {
    const history = tsleBuffer.getRawHistory(venue, sym);
    if (history && history.length > 0) {
      historyByVenue.set(venue, history);
      latestByVenue.set(venue, history[history.length - 1]);
    }
  }

  if (latestByVenue.size === 0) return null;

  const venues = [...latestByVenue.keys()];

  let total10 = 0, total25 = 0, regDepth = 0;
  const allSpreads: number[] = [];

  for (const [venue, snap] of latestByVenue) {
    const d10 = getBand(snap, 'pct_0.1');
    const d25 = getBand(snap, 'pct_0.25');
    total10 += d10;
    total25 += d25;
    if (REGULATED.has(venue)) regDepth += d10;
    if (snap.spread?.bps != null) allSpreads.push(snap.spread.bps);
  }

  const spread_dispersion_bps = Math.round(stdDev(allSpreads) * 100) / 100;

  const dq = computeDQ(latestByVenue, historyByVenue);
  const { r, depth_decay_rate, withdrawal_velocity, spread_elasticity } =
    computeR(historyByVenue, spread_dispersion_bps, latestByVenue);
  const { f_score, l5f_f_input, hhi } = computeF(latestByVenue);
  const ei = computeEI(latestByVenue);
  const { rs, vol_regime } = computeRS(sym, venues);

  const l5f_composite =
    Math.round(
      clamp(0.30 * dq + 0.20 * r + 0.15 * l5f_f_input + 0.20 * ei + 0.15 * rs) * 10
    ) / 10;

  return {
    symbol: sym,
    computed_at_utc: Date.now(),
    venue_count: latestByVenue.size,

    total_depth_10bps: Math.round(total10),
    total_depth_25bps: Math.round(total25),
    regulated_depth_share: total10 > 0 ? Math.round((regDepth / total10) * 1000) / 1000 : 0,
    offshore_depth_share: total10 > 0 ? Math.round(((total10 - regDepth) / total10) * 1000) / 1000 : 1,
    fragmentation_index: hhi,
    spread_dispersion_bps,
    vol_regime,
    depth_decay_rate,
    withdrawal_velocity,
    spread_elasticity,

    l5f_depth_quality:    Math.round(dq * 10) / 10,
    l5f_resilience:       Math.round(r  * 10) / 10,
    l5f_fragmentation:    Math.round(f_score * 10) / 10,
    l5f_exec_integrity:   Math.round(ei * 10) / 10,
    l5f_regime_stability: Math.round(rs * 10) / 10,
    l5f_composite,

    venue_slices: buildVenueSlices(latestByVenue, total10),
  };
}
