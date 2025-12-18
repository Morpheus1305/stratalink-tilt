import { useEffect, useState, useRef } from "react";
import { fetchLiquiditySnapshot } from "@/services/lis";

type LisBand = {
  bid_notional?: number;
  ask_notional?: number;
  total_notional?: number;
};

type LisSnapshot = {
  venue: string;
  symbol: string;
  quote: string;
  timestamp: number;
  mid_price: number;
  spread?: {
    absolute: number;
    bps: number;
  };
  bands?: Record<string, LisBand>;
};

const TOKENS = ["BTC", "ETH", "SOL", "LINK", "AVAX"];
const VENUES = ["binance", "coinbase", "okx", "kraken"] as const;
type Venue = typeof VENUES[number];

function computeImbalance(
  bid?: number,
  ask?: number,
  total?: number
): number {
  if (!bid || !ask || !total || total === 0) return 0;
  return (bid - ask) / total;
}

export default function LiquidityTruthConsole() {
  const [token, setToken] = useState("BTC");
  const [venue, setVenue] = useState<Venue>("binance");
  const [data, setData] = useState<LisSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setError(null);

      try {
        const snapshot = await fetchLiquiditySnapshot(token, venue);
        if (mounted) {
          setData(snapshot);
          isInitialLoad.current = false;
        }
      } catch (err: any) {
        if (mounted) setError(err?.message ?? "Load failed");
      }
    }

    load();
    const id = setInterval(load, 5000);

    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [token, venue]);

  useEffect(() => {
    isInitialLoad.current = true;
  }, [token, venue]);

  return (
    <div
      style={{
        padding: 24,
        fontFamily: "Inter, system-ui, sans-serif",
        background: "#050814",
        color: "#e5e7eb",
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>
        Liquidity Truth Console
      </h1>
      <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 16 }}>
        LIS - Liquidity Ingestion Service - Ground Truth View
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 12, marginBottom: 4, color: "#94a3b8" }}>Token</div>
          <select 
            value={token} 
            onChange={(e) => setToken(e.target.value)} 
            data-testid="select-token"
            style={selectStyle}
          >
            {TOKENS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <div style={{ fontSize: 12, marginBottom: 4, color: "#94a3b8" }}>Venue</div>
          <select 
            value={venue} 
            onChange={(e) => setVenue(e.target.value as Venue)} 
            data-testid="select-venue"
            style={selectStyle}
          >
            {VENUES.map((v) => (
              <option key={v} value={v}>{v.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      {isInitialLoad.current && !data && !error && (
        <div style={{ color: "#94a3b8" }}>Loading LIS snapshot...</div>
      )}
      {error && <div style={{ color: "#ef4444" }}>{error}</div>}

      {data && (
        <>
          {/* Summary */}
          <div style={{ marginBottom: 16 }}>
            <strong>{data.venue.toUpperCase()} {data.symbol}</strong>
            <div>
              Mid: ${data.mid_price.toFixed(2)} - Spread:{" "}
              {data.spread?.bps ?? 0} bps
            </div>
          </div>

          {/* Bands Table */}
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginBottom: 24,
            }}
          >
            <thead>
              <tr style={{ color: "#94a3b8", fontSize: 12 }}>
                <th align="left">Band</th>
                <th align="right">Bid USD</th>
                <th align="right">Ask USD</th>
                <th align="right">Total USD</th>
                <th align="right">Imbalance</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.bands ?? {}).map(([band, b]) => {
                const imbalance = computeImbalance(
                  b.bid_notional,
                  b.ask_notional,
                  b.total_notional
                );

                return (
                  <tr key={band} style={{ borderTop: "1px solid #111827" }}>
                    <td>{band}</td>
                    <td align="right">
                      ${b.bid_notional?.toLocaleString() ?? "0"}
                    </td>
                    <td align="right">
                      ${b.ask_notional?.toLocaleString() ?? "0"}
                    </td>
                    <td align="right">
                      ${b.total_notional?.toLocaleString() ?? "0"}
                    </td>
                    <td
                      align="right"
                      style={{
                        color:
                          imbalance >= 0 ? "#22c55e" : "#ef4444",
                      }}
                    >
                      {(imbalance * 100).toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Raw JSON */}
          <details>
            <summary style={{ cursor: "pointer", marginBottom: 8 }}>
              Raw LIS JSON
            </summary>
            <pre
              style={{
                background: "#020617",
                padding: 12,
                fontSize: 11,
                overflowX: "auto",
              }}
            >
              {JSON.stringify(data, null, 2)}
            </pre>
          </details>
        </>
      )}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  background: "#020617",
  color: "#e5e7eb",
  border: "1px solid #1e293b",
  padding: "8px 12px",
  borderRadius: 6,
  fontSize: 14,
  minWidth: 120,
};
