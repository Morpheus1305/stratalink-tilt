// Execution integrity score for TSLE Engine

const EXECUTION_SCORES: Record<string, number> = {
  BTC: 92,
  ETH: 88,
  SOL: 80,
  LINK: 78,
  NEAR: 72,
  AVAX: 74,
  DOT: 70,
  ADA: 65,
  XRP: 62,
  DOGE: 58,
};

export function getExecutionIntegrityScore(token: string): number {
  return EXECUTION_SCORES[token] ?? 65;
}
