export const STATIC_TSLE_SCORES: Record<string, number> = {
  BTC: 95,
  ETH: 88,
  SOL: 82,
  LINK: 80,
  NEAR: 76,
  AVAX: 74,
  DOT: 72,
  ADA: 68,
  XRP: 64,
  DOGE: 58,
};

export function getTsleRegime(score: number): string {
  if (score >= 90) return "Ultra-Tight";
  if (score >= 75) return "Tight";
  if (score >= 60) return "Constructive";
  if (score >= 45) return "Patchy";
  if (score >= 30) return "Thin";
  return "Broken";
}

export function getStaticTsle(symbol: string): { score: number; regime: string } | null {
  const score = STATIC_TSLE_SCORES[symbol];
  if (score === undefined) return null;
  return { score, regime: getTsleRegime(score) };
}
