import { useEffect, useState } from "react";
import { fetchLiquiditySnapshot } from "@/services/lis";

/* =========================
   Canonical LIS → STRATA map
   ========================= */

const BAND_LABELS: Record<string, string> = {
  "pct_0_1": "10 bps",
  "pct_0.1": "10 bps",
  "pct_0_25": "25 bps",
  "pct_0.25": "25 bps",
  "pct_0_5": "50 bps",
  "pct_0.5": "50 bps",
  "pct_1": "100 bps",
  "pct_2": "200 bps",
};

const TOKENS = ["BTC", "ETH", "SOL", "LINK", "AVAX"];
const VENUES = ["binance", "coinbase", "okx", "kraken"] as const;

type Venue = (typeof VENUES)[number];

/* =========================
   Types
   ========================= */

type LISBand = {
  bid_notional?: number;
  ask_notional?: number;
  total_notional?: number;
};

type LISSnapshot = {
  venue: string;
  symbol: string;
  timestamp: number;
  mid_price: number;
  spread?: {
    absolute?: number;
    bps?: number;
  };
  bands?: Record<string, LISBand>;
};

/* =========================
   Helpers
   ========================= */

function formatUSD(v: number) {
  return `$${v.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function calcImbalance(bid: number, ask: number): number {
  const total = bid + ask;
  if (!total || total === 0) return 0;
  return ((bid - ask) / total) * 100;
}

/* =========================
   Component
   ========================= */

export default function LiquidityTruthConsole() {
  const [token, setToken] = useState("BTC");
  const [venue, setVenue] = useState<Venue>("binance");
  const [data, setData] = useState<LISSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    let alive = true;
    setError(null);

    fetchLiquiditySnapshot(token, venue)
      .then((res) => {
        if (!alive) return;
        setData(res);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err?.message ?? "Failed to load LIS data");
      });

    return () => {
      alive = false;
    };
  }, [token, venue]);

  return (
    <div
      style={{
        padding: 24,
        minHeight: "100vh",
        background: "#050814",
        color: "#e5e9f0",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>
        Liquidity Truth Console
      </h1>
      <div style={{ color: "#8ea3c7", marginBottom: 20 }}>
        LIS - Liquidity Ingestion Service - Ground Truth View
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 12, color: "#8ea3c7" }}>Token</div>
          <select
            value={token}
            onChange={(e) => setToken(e.target.value)}
            data-testid="select-token"
            style={selectStyle}
          >
            {TOKENS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div style={{ fontSize: 12, color: "#8ea3c7" }}>Venue</div>
          <select
            value={venue}
            onChange={(e) => setVenue(e.target.value as Venue)}
            data-testid="select-venue"
            style={selectStyle}
          >
            {VENUES.map((v) => (
              <option key={v} value={v}>
                {v.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Errors */}
      {error && (
        <div style={{ color: "#ff6b6b", marginBottom: 16 }}>
          Error fetching LIS data: {error}
        </div>
      )}

      {/* Main */}
      {data && (
        <>
          <h2 style={{ marginBottom: 8 }}>
            {data.venue.toUpperCase()} {data.symbol}
          </h2>
          <div style={{ marginBottom: 16 }}>
            Mid: <strong>${data.mid_price.toFixed(2)}</strong> - Spread:{" "}
            <strong>{data.spread?.bps ?? 0} bps</strong>
          </div>

          {/* Depth Table */}
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginBottom: 24,
            }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid #1f2937" }}>
                <th align="left">Band</th>
                <th align="right">Bid USD</th>
                <th align="right">Ask USD</th>
                <th align="right">Total USD</th>
                <th align="right">Imbalance</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.bands ?? {}).map(([key, band]) => {
                const label = BAND_LABELS[key] ?? key;
                const bid = band.bid_notional ?? 0;
                const ask = band.ask_notional ?? 0;
                const total = bid + ask;
                const imbalance = calcImbalance(bid, ask);

                return (
                  <tr key={key} style={{ borderBottom: "1px solid #0f172a" }}>
                    <td>{label}</td>
                    <td align="right">{formatUSD(bid)}</td>
                    <td align="right">{formatUSD(ask)}</td>
                    <td align="right">{formatUSD(total)}</td>
                    <td
                      align="right"
                      style={{
                        color:
                          imbalance > 0
                            ? "#22c55e"
                            : imbalance < 0
                            ? "#ef4444"
                            : "#9ca3af",
                      }}
                    >
                      {imbalance.toFixed(2)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Raw JSON */}
          <button
            onClick={() => setShowRaw((v) => !v)}
            style={buttonStyle}
            data-testid="button-toggle-raw"
          >
            {showRaw ? "Hide" : "Show"} Raw LIS JSON
          </button>

          {showRaw && (
            <pre
              style={{
                background: "#020617",
                padding: 16,
                fontSize: 12,
                overflowX: "auto",
                borderRadius: 6,
                marginTop: 8,
              }}
            >
              {JSON.stringify(data, null, 2)}
            </pre>
          )}
        </>
      )}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  background: "#020617",
  color: "#e5e9f0",
  border: "1px solid #1e293b",
  padding: "8px 12px",
  borderRadius: 6,
  fontSize: 14,
  minWidth: 120,
  marginTop: 4,
};

const buttonStyle: React.CSSProperties = {
  background: "#1e293b",
  color: "#e5e9f0",
  border: "1px solid #334155",
  padding: "8px 16px",
  borderRadius: 6,
  fontSize: 13,
  cursor: "pointer",
};
