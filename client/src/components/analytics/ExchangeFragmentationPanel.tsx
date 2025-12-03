import Card from "./Card";

type DepthEntry = {
  source: string;
};

type Props = {
  depth: Record<string, DepthEntry> | undefined;
};

export default function ExchangeFragmentationPanel({ depth }: Props) {
  if (!depth || !Object.keys(depth).length) {
    return <Card title="Exchange Fragmentation">No data.</Card>;
  }

  const counts: Record<string, number> = {};
  for (const row of Object.values(depth)) {
    const src = (row.source || "unknown").toLowerCase();
    counts[src] = (counts[src] || 0) + 1;
  }

  const total = Object.keys(depth).length || 1;
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  return (
    <Card title="Exchange Fragmentation (Dominant Source per Token)">
      <ul style={{ fontSize: 12, color: "#c3d0ea", paddingLeft: 16, margin: 0 }}>
        {entries.map(([src, cnt]) => (
          <li key={src} data-testid={`item-exchange-${src}`}>
            <strong style={{ textTransform: "capitalize" }}>{src}</strong>:{" "}
            {cnt} tokens (~{((cnt / total) * 100).toFixed(1)}%)
          </li>
        ))}
      </ul>
      <div style={{ marginTop: 8, fontSize: 11, color: "#8ea3c7" }}>
        Note: This is based on the current dominant pricing venue per token.
      </div>
    </Card>
  );
}
