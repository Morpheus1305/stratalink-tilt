import Card from "./Card";
import Sparkline from "./Sparkline";

type Point = { t: number; v: number };
type Series = Point[];

type Props = {
  token: string;
  price: Series;
  depth: Series;
  funding: Series;
};

function normalizePct(series: Series): { v: number }[] {
  if (!series || series.length < 2) return [];
  const base = series[0].v;
  if (!base || base === 0) return series.map(() => ({ v: 0 }));
  return series.map((p) => ({ v: ((p.v / base) - 1) * 100 }));
}

function latest(series: Series): Point | null {
  if (!series || !series.length) return null;
  return series[series.length - 1];
}

function pctChange(series: Series): number | null {
  if (!series || series.length < 2) return null;
  const first = series[0].v;
  const last = series[series.length - 1].v;
  if (!first) return null;
  return (last / first - 1) * 100;
}

export default function LiveSparklinesPanel({
  token,
  price,
  depth,
  funding,
}: Props) {
  const priceLast = latest(price);
  const pricePct = pctChange(price);

  const depthLast = latest(depth);
  const depthPct = pctChange(depth);

  const fundingLast = latest(funding);
  const fundingPct = pctChange(funding);

  const priceSpark = normalizePct(price);
  const depthSpark = normalizePct(depth);
  const fundingSpark = normalizePct(funding);

  const pctFmt = (v: number | null) =>
    v == null ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

  return (
    <Card title="Live Sparklines (30-point rolling window)">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 24,
          alignItems: "flex-start",
        }}
      >
        {/* Token price */}
        <div>
          <div
            style={{
              fontSize: 11,
              color: "#8ea3c7",
              letterSpacing: 1.5,
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            {token} Price
          </div>
          <div style={{ fontSize: 14, marginBottom: 2 }}>
            {priceLast ? `$${priceLast.v.toLocaleString()}` : "—"}
            <span
              style={{
                marginLeft: 8,
                fontSize: 11,
                color: pricePct != null && pricePct >= 0 ? "#5cb85c" : "#d9534f",
              }}
            >
              {pctFmt(pricePct)}
            </span>
          </div>
          <Sparkline
            data={priceSpark}
            color="#5cb85c"
            yFormatter={(v) => v.toFixed(2) + "%"}
          />
        </div>

        {/* 10bps depth */}
        <div>
          <div
            style={{
              fontSize: 11,
              color: "#8ea3c7",
              letterSpacing: 1.5,
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            {token} 10bps Depth (USD)
          </div>
          <div style={{ fontSize: 14, marginBottom: 2 }}>
            {depthLast ? `$${(depthLast.v / 1_000_000).toFixed(2)}M` : "—"}
            <span
              style={{
                marginLeft: 8,
                fontSize: 11,
                color: depthPct != null && depthPct >= 0 ? "#5cb85c" : "#d9534f",
              }}
            >
              {pctFmt(depthPct)}
            </span>
          </div>
          <Sparkline
            data={depthSpark}
            color="#2cc7ff"
            yFormatter={(v) => v.toFixed(2) + "%"}
          />
        </div>

        {/* Funding */}
        <div>
          <div
            style={{
              fontSize: 11,
              color: "#8ea3c7",
              letterSpacing: 1.5,
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            {token} Funding Rate
          </div>
          <div style={{ fontSize: 14, marginBottom: 2 }}>
            {fundingLast ? (fundingLast.v * 100).toFixed(4) + "%" : "—"}
            <span
              style={{
                marginLeft: 8,
                fontSize: 11,
                color:
                  fundingPct != null && fundingPct >= 0 ? "#5cb85c" : "#d9534f",
              }}
            >
              {pctFmt(fundingPct)}
            </span>
          </div>
          <Sparkline
            data={fundingSpark}
            color="#ffcc33"
            yFormatter={(v) => v.toFixed(2) + "%"}
            zeroLine={true}
          />
        </div>
      </div>
    </Card>
  );
}
