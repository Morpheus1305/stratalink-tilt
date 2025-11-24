/**
 * Get PoLi Liquidity Rating based on score
 * 
 * Rating Scale:
 * - AAA: 95-100 (Exceptional liquidity quality)
 * - AA: 90-94 (High liquidity quality)
 * - A: 85-89 (Strong liquidity quality)
 * - BBB: 75-84 (Adequate liquidity)
 * - BB: 65-74 (Vulnerable liquidity)
 * - B: 55-64 (Weak liquidity)
 * - CCC: 40-54 (Distressed liquidity)
 * - CC: 25-39 (Severe liquidity stress)
 * - C: 10-24 (Illiquid)
 * - D: 0-9 (Non-functioning liquidity)
 * 
 * @param score - PoLi score (0-100). Values outside this range are clamped.
 * @returns Rating string (AAA, AA, A, BBB, BB, B, CCC, CC, C, or D)
 */
export function getPoLiRating(score: number): string {
  // Clamp score to valid range [0, 100]
  const clampedScore = Math.max(0, Math.min(100, score));
  
  if (clampedScore >= 95) return 'AAA';
  if (clampedScore >= 90) return 'AA';
  if (clampedScore >= 85) return 'A';
  if (clampedScore >= 75) return 'BBB';
  if (clampedScore >= 65) return 'BB';
  if (clampedScore >= 55) return 'B';
  if (clampedScore >= 40) return 'CCC';
  if (clampedScore >= 25) return 'CC';
  if (clampedScore >= 10) return 'C';
  return 'D';
}
