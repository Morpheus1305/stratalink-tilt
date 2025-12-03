import Card from "./Card";

export default function CexDexGauge() {
  return (
    <Card title="CEX / DEX Spread Divergence (Planned)">
      <div style={{ fontSize: 13, color: "#c3d0ea", marginBottom: 8 }}>
        This gauge will track the spread differential between centralised
        venues and leading DEXs for the selected token.
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
        <code>GET /api/spreads/cex-dex/{"{symbol}"}</code> with best bid/ask
        per venue.
      </div>
    </Card>
  );
}
