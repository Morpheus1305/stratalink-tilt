// client/src/services/lis.ts

export async function fetchLiquiditySnapshot(
  symbol: string,
  venue: "binance" | "coinbase" | "okx" | "kraken"
) {
  const url = `/api/lis/${venue}/depth?symbol=${symbol}`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`LIS fetch failed: ${res.status}`);
  }

  return res.json();
}
