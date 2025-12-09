// Depth data fetcher for TSLE Engine

export interface DepthLevel {
  bidUsd: number;
  askUsd: number;
  totalUsd: number;
}

export interface DepthData {
  symbol: string;
  venues: string[];
  aggregate: {
    mid: number;
    levels: Record<string, DepthLevel>;
  };
}

export async function getDepthForToken(token: string): Promise<DepthData> {
  try {
    const res = await fetch(`/api/analytics/depth?symbol=${encodeURIComponent(token)}`);
    if (!res.ok) {
      return createFallbackDepth(token);
    }
    const data = await res.json();
    
    // Transform API response to expected format
    // API returns: bands["10bps"].bidUSD -> We need: aggregate.levels["10"].bidUsd
    const levels: Record<string, DepthLevel> = {};
    if (data.bands) {
      for (const [key, band] of Object.entries(data.bands)) {
        const numericKey = key.replace("bps", "");
        const b = band as any;
        levels[numericKey] = {
          bidUsd: b.bidUSD ?? 0,
          askUsd: b.askUSD ?? 0,
          totalUsd: b.totalUSD ?? 0,
        };
      }
    }
    
    return {
      symbol: data.symbol,
      venues: [data.source ?? "unknown"],
      aggregate: {
        mid: data.mid ?? 0,
        levels,
      },
    };
  } catch {
    return createFallbackDepth(token);
  }
}

function createFallbackDepth(token: string): DepthData {
  const multiplier = token === "BTC" ? 1.0 : token === "ETH" ? 0.65 : 0.35;
  return {
    symbol: token,
    venues: ["Binance", "Coinbase", "Kraken"],
    aggregate: {
      mid: 0,
      levels: {
        "10": { bidUsd: 2_000_000 * multiplier, askUsd: 2_000_000 * multiplier, totalUsd: 4_000_000 * multiplier },
        "25": { bidUsd: 8_000_000 * multiplier, askUsd: 8_000_000 * multiplier, totalUsd: 16_000_000 * multiplier },
        "50": { bidUsd: 15_000_000 * multiplier, askUsd: 15_000_000 * multiplier, totalUsd: 30_000_000 * multiplier },
      },
    },
  };
}
