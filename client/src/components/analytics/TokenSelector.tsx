const GROUPS: { label: string; tokens: string[] }[] = [
  {
    label: "Layer 1 / Majors",
    tokens: ["BTC", "ETH", "SOL", "ADA", "AVAX", "NEAR"],
  },
  {
    label: "DeFi / Infrastructure",
    tokens: ["LINK", "MATIC", "DOT"],
  },
  {
    label: "Other Large Caps",
    tokens: ["XRP"],
  },
];

export default function TokenSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>
      <label
        style={{
          fontSize: 11,
          color: "#8ea3c7",
          letterSpacing: 1,
          textTransform: "uppercase",
        }}
      >
        Token Focus
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid="select-token-focus"
        style={{
          padding: "8px 12px",
          background: "#0b1020",
          color: "#fff",
          borderRadius: 8,
          border: "1px solid #1a2138",
          fontSize: 14,
          minWidth: 220,
        }}
      >
        {GROUPS.map((g) => (
          <optgroup key={g.label} label={g.label}>
            {g.tokens.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
