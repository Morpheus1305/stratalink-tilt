// client/src/pages/lis-debug.tsx

import { useEffect, useState } from "react";
import { fetchLiquiditySnapshot } from "@/services/lis";

export default function LisDebugPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLiquiditySnapshot("BTC", "binance")
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message ?? "Unknown error");
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: "monospace" }}>
      <h1>LIS Debug — Binance BTC</h1>

      {loading && <p>Loading Binance liquidity from LIS…</p>}

      {error && (
        <p style={{ color: "red" }}>
          Error fetching LIS data: {error}
        </p>
      )}

      {data && (
        <>
          <p style={{ color: "green" }}>
            ✅ Successfully fetched live Binance liquidity
          </p>
          <pre
            style={{
              marginTop: 16,
              padding: 16,
              background: "#0b1020",
              color: "#dbeafe",
              overflowX: "auto",
              borderRadius: 8,
            }}
          >
            {JSON.stringify(data, null, 2)}
          </pre>
        </>
      )}
    </div>
  );
}
