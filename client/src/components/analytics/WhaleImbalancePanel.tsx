import Card from "./Card";

type LiquidationData = {
  longs: number;
  shorts: number;
  imbalance: number;
};

type Props = {
  liquidations: Record<string, LiquidationData> | undefined;
};

export default function WhaleImbalancePanel({ liquidations }: Props) {
  const entries: { token: string; longs: number; shorts: number; imbalance: number }[] =
    Object.keys(liquidations || {}).map((k) => ({
      token: k,
      longs: liquidations![k].longs ?? 0,
      shorts: liquidations![k].shorts ?? 0,
      imbalance: liquidations![k].imbalance ?? 0,
    }));

  const notable = entries.filter((e) => {
    const notional = e.longs + e.shorts;
    return notional > 500_000 && Math.abs(e.imbalance) > 0.05;
  });

  return (
    <Card title="Whale Imbalance & Liquidations">
      {!notable.length ? (
        <div style={{ fontSize: 13, color: "#c3d0ea" }}>
          No large directional liquidation skews detected in the last window.
        </div>
      ) : (
        <ul style={{ paddingLeft: 16, fontSize: 13, color: "#c3d0ea", margin: 0 }}>
          {notable.map((e) => {
            const notional = (e.longs + e.shorts) / 1_000_000;
            const side =
              e.imbalance < 0 ? "Long liquidations dominant" : "Short liquidations dominant";
            const color = e.imbalance < 0 ? "#d9534f" : "#5cb85c";
            return (
              <li key={e.token} style={{ marginBottom: 4 }} data-testid={`item-whale-${e.token}`}>
                <span style={{ color, fontWeight: 600 }}>{e.token}</span> ·{" "}
                {side} · ~${notional.toFixed(1)}M notional
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
