import Card from "./Card";
import { Grid } from "./Grid";

type FundingData = {
  fundingRate: number;
  fundingRateAnnualized: number;
  source: string;
};

type Props = {
  funding: Record<string, FundingData> | undefined;
};

function classify(rate: number) {
  if (rate < -0.001) return { label: "Short crowded", color: "#5cb85c" };
  if (rate < 0) return { label: "Mild short bias", color: "#8bc34a" };
  if (rate < 0.001) return { label: "Neutral", color: "#ffd54f" };
  return { label: "Long crowded", color: "#ff7043" };
}

export default function FundingPanel({ funding }: Props) {
  const keys = Object.keys(funding || {});

  if (!keys.length) {
    return <Card title="Perpetual Funding">No funding data.</Card>;
  }

  return (
    <Card title="Perpetual Funding (Snapshot)">
      <Grid cols={3} gap={12}>
        {keys.map((k) => {
          const f = funding![k];
          const rate = f?.fundingRate ?? 0;
          const annualised = f?.fundingRateAnnualized ?? rate * 3 * 365 * 100;
          const { label, color } = classify(rate);

          return (
            <div
              key={k}
              data-testid={`card-funding-analytics-${k}`}
              style={{
                background: "#050814",
                borderRadius: 10,
                padding: 12,
                border: "1px solid #1a2138",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "#8ea3c7",
                  letterSpacing: 1.5,
                }}
              >
                {k} Perps
              </div>
              <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>
                {(rate * 100).toFixed(4)}%
              </div>
              <div style={{ fontSize: 11, color: "#c3d0ea" }}>
                Annualised ~ {annualised.toFixed(2)}%
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  padding: "2px 6px",
                  borderRadius: 999,
                  border: `1px solid ${color}`,
                  color,
                  display: "inline-block",
                }}
              >
                {label}
              </div>
            </div>
          );
        })}
      </Grid>
    </Card>
  );
}
