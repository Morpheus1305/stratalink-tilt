export async function fetchLiquiditySnapshot(symbol: string): Promise<any> {
  try {
    const response = await fetch(`/api/analytics/depth?symbol=${symbol}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch liquidity snapshot: ${response.status}`);
    }
    const data = await response.json();
    
    const tokenData = data.depth?.[symbol];
    if (!tokenData) {
      return null;
    }

    return {
      mid_price: tokenData.mid ?? 0,
      spread: {
        absolute: tokenData.spread ?? 0,
        bps: tokenData.spreadBps ?? 0,
      },
      bands: {
        pct_0_1: tokenData.bands?.["10bps"] ? {
          bid_notional: tokenData.bands["10bps"].bidUSD ?? 0,
          ask_notional: tokenData.bands["10bps"].askUSD ?? 0,
          total_notional: (tokenData.bands["10bps"].bidUSD ?? 0) + (tokenData.bands["10bps"].askUSD ?? 0),
        } : { bid_notional: 0, ask_notional: 0, total_notional: 0 },
        pct_0_25: tokenData.bands?.["25bps"] ? {
          bid_notional: tokenData.bands["25bps"].bidUSD ?? 0,
          ask_notional: tokenData.bands["25bps"].askUSD ?? 0,
          total_notional: (tokenData.bands["25bps"].bidUSD ?? 0) + (tokenData.bands["25bps"].askUSD ?? 0),
        } : { bid_notional: 0, ask_notional: 0, total_notional: 0 },
        pct_0_5: tokenData.bands?.["50bps"] ? {
          bid_notional: tokenData.bands["50bps"].bidUSD ?? 0,
          ask_notional: tokenData.bands["50bps"].askUSD ?? 0,
          total_notional: (tokenData.bands["50bps"].bidUSD ?? 0) + (tokenData.bands["50bps"].askUSD ?? 0),
        } : { bid_notional: 0, ask_notional: 0, total_notional: 0 },
        pct_1: tokenData.bands?.["100bps"] ? {
          bid_notional: tokenData.bands["100bps"].bidUSD ?? 0,
          ask_notional: tokenData.bands["100bps"].askUSD ?? 0,
          total_notional: (tokenData.bands["100bps"].bidUSD ?? 0) + (tokenData.bands["100bps"].askUSD ?? 0),
        } : { bid_notional: 0, ask_notional: 0, total_notional: 0 },
        pct_2: tokenData.bands?.["200bps"] ? {
          bid_notional: tokenData.bands["200bps"].bidUSD ?? 0,
          ask_notional: tokenData.bands["200bps"].askUSD ?? 0,
          total_notional: (tokenData.bands["200bps"].bidUSD ?? 0) + (tokenData.bands["200bps"].askUSD ?? 0),
        } : { bid_notional: 0, ask_notional: 0, total_notional: 0 },
      },
      metrics: {
        bid_ask_balance: tokenData.imbalance ?? 0,
      },
      venue: tokenData.source ?? "unknown",
    };
  } catch (error) {
    console.error("[LIS] Failed to fetch liquidity snapshot:", error);
    return null;
  }
}
