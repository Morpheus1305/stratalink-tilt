import Card from "./Card";

type StressDriver = {
  category: string;
  description: string;
  severity: string;
  contribution: number;
};

type Props = {
  drivers?: StressDriver[];
};

export default function StressHeatmap({ drivers = [] }: Props) {
  if (!drivers || !drivers.length) {
    return (
      <Card title="Stress Attribution Heatmap">
        <div style={{ fontSize: 13, color: "#c3d0ea" }}>
          No specific drivers flagged. Market microstructure appears orderly.
        </div>
      </Card>
    );
  }

  const buckets: Record<string, { label: string; score: number; color: string }> = {
    depth: { label: "Depth / Orderbook", score: 0, color: "#ff6b6b" },
    funding: { label: "Funding / Leverage", score: 0, color: "#f7b733" },
    liquidation: { label: "Liquidations", score: 0, color: "#f25f5c" },
    spreads: { label: "Spreads / Volatility", score: 0, color: "#4ecdc4" },
    cexdex: { label: "CEX / DEX Imbalance", score: 0, color: "#556bff" },
  };

  for (const d of drivers) {
    const text = (d.description || d.category || "").toLowerCase();
    if (text.includes("depth") || text.includes("thin")) {
      buckets.depth.score += d.contribution || 10;
    }
    if (text.includes("funding")) {
      buckets.funding.score += d.contribution || 10;
    }
    if (text.includes("liquidation")) {
      buckets.liquidation.score += d.contribution || 10;
    }
    if (text.includes("spread") || text.includes("volatility")) {
      buckets.spreads.score += d.contribution || 7;
    }
    if (text.includes("cex") || text.includes("dex")) {
      buckets.cexdex.score += d.contribution || 5;
    }
  }

  const rows = Object.values(buckets).filter((b) => b.score > 0);
  if (!rows.length) {
    return (
      <Card title="Stress Attribution Heatmap">
        <div style={{ fontSize: 13, color: "#c3d0ea" }}>
          No specific drivers flagged. Market microstructure appears orderly.
        </div>
      </Card>
    );
  }

  const maxScore = Math.max(...rows.map((r) => r.score), 1);

  return (
    <Card title="Active Stress Drivers (Attribution)">
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((r) => {
          const pct = (r.score / maxScore) * 100;
          return (
            <div key={r.label} style={{ fontSize: 12 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <span>{r.label}</span>
                <span style={{ opacity: 0.8 }}>+{r.score}</span>
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 999,
                  background: "#151a2b",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    background: `linear-gradient(90deg, ${r.color}, #ffffff40)`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
