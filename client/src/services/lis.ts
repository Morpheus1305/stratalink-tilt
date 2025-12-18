// client/src/services/lis.ts

export async function fetchLiquiditySnapshot(
  symbol: string,
  venue: "binance" | "coinbase" | "okx" | "kraken"
) {
  const baseUrl =
    import.meta.env.VITE_LIS_BASE_URL ??
    "https://relay.stratalink.ai";

  const url = `${baseUrl}/${venue}/depth?symbol=${symbol}`;

  const res = await fetch(url, {
    headers: {
      "x-relay-key": import.meta.env.VITE_LIS_RELAY_KEY ?? "",
    },
  });

  if (!res.ok) {
    throw new Error(`LIS fetch failed: ${res.status}`);
  }

  return res.json();
}
