const DEFILLAMA_POOLS_URL = "https://yields.llama.fi/pools";
const CACHE_TTL_MS   = 60_000;
const FETCH_TIMEOUT  = 8_000;

let _cache: { pools: any[]; fetchedAt: number } | null = null;

/**
 * Returns the DeFiLlama /pools dataset, fetching at most once per 60 seconds.
 *
 * yields.llama.fi/pools is a single endpoint that returns 100k+ pools across
 * all chains (~200MB of JSON). Every relay route that needs TVL data for pool
 * depth estimation calls this — without a shared cache each symbol in a 5-second
 * ingest cycle would independently download the entire dataset.
 *
 * Callers filter the returned array by project/chain/symbol themselves.
 * Returns an empty array on fetch failure so callers fall through to synthetic depth.
 */
export async function getDefiLlamaPools(): Promise<any[]> {
  const now = Date.now();
  if (_cache && now - _cache.fetchedAt < CACHE_TTL_MS) {
    return _cache.pools;
  }
  try {
    const res = await fetch(DEFILLAMA_POOLS_URL, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });
    if (!res.ok) return _cache?.pools ?? [];
    const data = await res.json();
    const pools: any[] = data?.data ?? [];
    _cache = { pools, fetchedAt: Date.now() };
    return pools;
  } catch {
    return _cache?.pools ?? [];
  }
}
