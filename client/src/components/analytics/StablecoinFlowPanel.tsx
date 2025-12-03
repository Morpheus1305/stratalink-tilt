import Card from "./Card";

export default function StablecoinFlowPanel() {
  return (
    <Card title="Net Stablecoin Flows (Planned)">
      <div style={{ fontSize: 13, color: "#c3d0ea", marginBottom: 8 }}>
        This panel will show net USDC / USDT flows into and out of major
        venues, plus dominance shifts and pool imbalances.
      </div>
      <div
        style={{
          marginTop: 8,
          borderRadius: 10,
          border: "1px dashed #30384d",
          padding: 12,
          fontSize: 12,
          color: "#8ea3c7",
        }}
      >
        Backend hook required:{" "}
        <code>GET /api/flows/stablecoins</code> with per-chain / per-venue
        aggregates.
      </div>
    </Card>
  );
}
