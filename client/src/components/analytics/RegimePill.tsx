type Props = {
  stressScore?: number;
  regime?: string;
};

export default function RegimePill({ stressScore = 0, regime }: Props) {
  let label = "Calm";
  let bg = "#1b3b2a";
  let fg = "#8af0b2";

  if (regime === "HIGH" || regime === "EXTREME" || stressScore >= 60) {
    label = "Deleveraging / Stress";
    bg = "#3a1114";
    fg = "#ff9fa8";
  } else if (regime === "MODERATE" || stressScore >= 30) {
    label = "Rotation / Cautious Risk-Off";
    bg = "#3a2b10";
    fg = "#ffd88a";
  }

  return (
    <div
      data-testid="pill-regime"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        borderRadius: 999,
        background: bg,
        color: fg,
        fontSize: 12,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: fg,
        }}
      />
      <span style={{ textTransform: "uppercase", letterSpacing: 1 }}>
        {label}
      </span>
      <span style={{ opacity: 0.7 }}>
        · Stress {stressScore?.toFixed?.(0) ?? 0}/100
      </span>
    </div>
  );
}
