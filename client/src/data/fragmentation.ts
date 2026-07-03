// Market fragmentation score for TSLE Engine
// Fetched from the backend L5F analytics system — no hardcoded scores.

const cache = new Map<string, { score: number; ts: number }>();
const CACHE_TTL_MS = 30_000;

export async function getFragmentationScore(token: string): Promise<number> {
  const cached = cache.get(token);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.score;
  }

  try {
    const res = await fetch(`/api/analytics/l5f/snapshot/${encodeURIComponent(token)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    // L5F fragmentation is an inverted HHI on [0,1]; multiply by 100 for score
    const score = typeof json.factors?.fragmentation === "number"
      ? Math.round(json.factors.fragmentation * 100)
      : 60;
    cache.set(token, { score, ts: Date.now() });
    return score;
  } catch {
    // Return last cached value if available, otherwise neutral 60
    return cached?.score ?? 60;
  }
}
