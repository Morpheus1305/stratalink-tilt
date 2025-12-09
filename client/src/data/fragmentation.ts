// Market fragmentation score for TSLE Engine

const FRAGMENTATION_SCORES: Record<string, number> = {
  BTC: 85,
  ETH: 82,
  SOL: 75,
  LINK: 70,
  NEAR: 65,
  AVAX: 68,
  DOT: 62,
  ADA: 58,
  XRP: 55,
  DOGE: 52,
};

export function getFragmentationScore(token: string): number {
  return FRAGMENTATION_SCORES[token] ?? 60;
}
