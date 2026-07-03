// Execution integrity score for TSLE Engine
// Fetched from the backend L5F analytics system — no hardcoded scores.

const cache = new Map<string, { score: number; ts: number }>();
const CACHE_TTL_MS = 30_000;

export async function getExecutionIntegrityScore(token: string): Promise<number> {
  const cached = cache.get(token);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.score;
  }

  try {
    const res = await fetch(`/api/analytics/l5f/snapshot/${encodeURIComponent(token)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    // L5F exec_integrity on [0,1]; multiply by 100 for score
    const score = typeof json.factors?.exec_integrity === "number"
      ? Math.round(json.factors.exec_integrity * 100)
      : 65;
    cache.set(token, { score, ts: Date.now() });
    return score;
  } catch {
    return cached?.score ?? 65;
  }
}
