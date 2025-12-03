import { useEffect, useRef, useState } from "react";
import Card from "./Card";

type DepthBand = {
  bidUSD: number;
  askUSD: number;
};

type TokenDepth = {
  bands: Record<string, DepthBand>;
};

type Props = {
  depth: Record<string, TokenDepth> | undefined;
};

export default function LiquidityVelocityPanel({ depth }: Props) {
  const [delta, setDelta] = useState<number | null>(null);
  const prevDepthRef = useRef<number | null>(null);

  useEffect(() => {
    if (!depth || !depth["BTC"]) return;

    const ten = depth["BTC"].bands?.["10bps"];
    const total = (ten?.bidUSD ?? 0) + (ten?.askUSD ?? 0);

    if (prevDepthRef.current != null) {
      const prev = prevDepthRef.current;
      setDelta(total - prev);
    }

    prevDepthRef.current = total;
  }, [depth]);

  let label = "Stable";
  let color = "#8ea3c7";

  if (delta != null) {
    if (delta < -5_000_000) {
      label = "Fast Outflows";
      color = "#d9534f";
    } else if (delta < -1_000_000) {
      label = "Eroding Depth";
      color = "#f0ad4e";
    } else if (delta > 5_000_000) {
      label = "Strong Inflows";
      color = "#5cb85c";
    } else if (delta > 1_000_000) {
      label = "Recovering Liquidity";
      color = "#8bc34a";
    }
  }

  return (
    <Card title="Liquidity Velocity (BTC 10bps)">
      <div style={{ fontSize: 13, color: "#c3d0ea", marginBottom: 6 }}>
        {delta == null ? (
          "Waiting for second snapshot to compute depth velocity…"
        ) : (
          <>
            Latest change in BTC 10bps depth:{" "}
            <strong
              style={{ color }}
            >{`${delta >= 0 ? "+" : ""}$${(delta / 1_000_000).toFixed(2)}M`}</strong>
          </>
        )}
      </div>
      <div
        data-testid="badge-velocity"
        style={{
          fontSize: 12,
          color,
          padding: "4px 8px",
          borderRadius: 999,
          border: `1px solid ${color}`,
          display: "inline-block",
        }}
      >
        {label}
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: "#8ea3c7" }}>
        Computed from consecutive polling intervals of BTC depth at 10bps.
      </div>
    </Card>
  );
}
