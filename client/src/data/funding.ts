// Funding data fetcher for TSLE Engine

export interface FundingData {
  symbol: string;
  rate: number;
  apr: number;
  regime: string;
}

export async function getFundingForToken(token: string): Promise<FundingData> {
  try {
    const res = await fetch(`/api/analytics/funding?symbol=${encodeURIComponent(token)}`);
    if (!res.ok) {
      return createFallbackFunding(token);
    }
    const data = await res.json();
    const tokenData = data.tokens?.find((t: any) => t.symbol === token);
    return tokenData || createFallbackFunding(token);
  } catch {
    return createFallbackFunding(token);
  }
}

function createFallbackFunding(token: string): FundingData {
  const rates: Record<string, number> = {
    BTC: 0.0001,
    ETH: 0.00008,
    SOL: -0.00005,
    LINK: 0.00012,
    NEAR: 0.00015,
    AVAX: 0.0001,
    DOT: 0.00008,
    ADA: 0.00018,
    XRP: 0.00022,
    DOGE: 0.00025,
  };
  const rate = rates[token] ?? 0.0001;
  return {
    symbol: token,
    rate,
    apr: rate * 365 * 3 * 100,
    regime: rate > 0.0002 ? "Stressed" : rate > 0.0001 ? "Elevated" : "Neutral",
  };
}
