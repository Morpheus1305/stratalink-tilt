import Card from "./Card";
import { Grid } from "./Grid";

type DepthBand = {
  bidUSD: number;
  askUSD: number;
  totalUSD: number;
  imbalance: number;
};

type TokenDepth = {
  mid: number;
  spreadBps: number;
  bands: Record<string, DepthBand>;
  source: string;
};

type Props = {
  depth: Record<string, TokenDepth> | undefined;
};

function getRating(depth10bpsUSD: number) {
  if (!depth10bpsUSD || depth10bpsUSD <= 0) return { rating: "Unrated", color: "#777" };
  if (depth10bpsUSD > 40_000_000) return { rating: "A", color: "#5cb85c" };
  if (depth10bpsUSD > 20_000_000) return { rating: "BBB", color: "#f0ad4e" };
  return { rating: "BB", color: "#d9534f" };
}

export default function TokenLiquidityCards({ depth }: Props) {
  if (!depth || !Object.keys(depth).length) {
    return <Card title="Token Liquidity Overview">No depth data.</Card>;
  }

  const symbols = Object.keys(depth);

  return (
    <Card title="Token Liquidity Snapshot">
      <Grid cols={3} gap={12}>
        {symbols.map((sym) => {
          const row = depth[sym];
          const ten = row?.bands?.["10bps"];
          const total = (ten?.bidUSD ?? 0) + (ten?.askUSD ?? 0);
          const { rating, color } = getRating(total);
          const imbalance = ten?.imbalance ?? 0;

          const skewLabel =
            Math.abs(imbalance) < 0.05
              ? "Balanced"
              : imbalance > 0
              ? "Bid-skew"
              : "Ask-skew";

          const mid = row?.mid;
          const skewPct = Math.min(Math.abs(imbalance) * 100, 100);

          return (
            <div
              key={sym}
              data-testid={`card-liquidity-${sym}`}
              style={{
                background: "#050814",
                borderRadius: 10,
                padding: 12,
                border: "1px solid #1a2138",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 4,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "#8ea3c7",
                    letterSpacing: 1.5,
                  }}
                >
                  {sym}
                </div>
                <span
                  style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 999,
                    border: `1px solid ${color}`,
                    color,
                  }}
                >
                  {rating}
                </span>
              </div>

              <div style={{ fontSize: 16, fontWeight: 600 }}>
                {mid ? `$${mid.toLocaleString()}` : "—"}
              </div>

              <div style={{ fontSize: 11, color: "#c3d0ea" }}>
                10bps Depth:{" "}
                <strong>
                  {total ? `$${(total / 1_000_000).toFixed(2)}M` : "—"}
                </strong>
              </div>

              <div style={{ fontSize: 11, color: "#c3d0ea" }}>
                Book Skew: {skewLabel}{" "}
                {imbalance ? `(${(imbalance * 100).toFixed(1)}%)` : ""}
              </div>

              <div
                style={{
                  height: 6,
                  borderRadius: 999,
                  background: "#151a2b",
                  overflow: "hidden",
                  marginTop: 4,
                }}
              >
                <div
                  style={{
                    width: `${skewPct}%`,
                    height: "100%",
                    background:
                      imbalance >= 0
                        ? "linear-gradient(90deg, #5cb85c, #ffffff40)"
                        : "linear-gradient(90deg, #d9534f, #ffffff40)",
                    marginLeft: imbalance >= 0 ? 0 : `${100 - skewPct}%`,
                    transition: "width 0.2s ease",
                  }}
                />
              </div>
            </div>
          );
        })}
      </Grid>
    </Card>
  );
}
