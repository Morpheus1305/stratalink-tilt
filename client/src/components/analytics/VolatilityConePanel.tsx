import Card from "./Card";

export default function VolatilityConePanel() {
  return (
    <Card title="Volatility Cone (Planned)">
      <div style={{ fontSize: 13, color: "#c3d0ea", marginBottom: 8 }}>
        This panel will display realised vs implied volatility across 1d / 7d /
        30d windows once the volatility backend is wired in.
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
        <code>GET /api/vol/{"{symbol}"}</code> with realised & implied vol
        term-structure.
      </div>
    </Card>
  );
}
