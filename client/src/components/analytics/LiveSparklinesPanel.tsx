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
  return series.map((p) => ({ v: ((p.v / base) - 1) * 100 }));
}

function latest(series: Series) {
  if (!series || series.length === 0) return null;
  return series[series.length - 1];
}

function pctChange(series: Series): number | null {
  if (series.length < 2) return null;
  const first = series[0].v;
  const last = series[series.length - 1].v;
  return (last / first - 1) * 100;
}

const pctFmt = (v: number | null) =>
  v == null ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

export default function LiveSparklinesPanel({ token, price, depth, funding }: Props) {
  const priceLast = latest(price);
  const pricePct = pctChange(price);

  const depthLast = latest(depth);
  const depthPct = pctChange(depth);

  const fundingLast = latest(funding);
  const fundingPct = pctChange(funding);

  const priceSpark = normalizePct(price);
  const depthSpark = normalizePct(depth);
  const fundingSpark = normalizePct(funding);

  return (
    <Card title="Live Microstructure Sparklines (30-point window)">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 30,
        }}
      >
        {/* PRICE */}
        <div>
          <div style={{ fontSize: 11, color: "#8ea3c7", marginBottom: 4, letterSpacing: 1.5 }}>
            {token} Price
          </div>
          <div style={{ fontSize: 14, marginBottom: 6 }}>
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
            filled={true}
            animate={true}
            yFormatter={(v) => v.toFixed(2) + "%"}
            dynamicFill={false}
          />
        </div>

        {/* DEPTH → Filled, animated, dynamic color */}
        <div>
          <div style={{ fontSize: 11, color: "#8ea3c7", marginBottom: 4, letterSpacing: 1.5 }}>
            {token} 10bps Depth
          </div>
          <div style={{ fontSize: 14, marginBottom: 6 }}>
            {depthLast ? `$${(depthLast.v / 1_000_000).toFixed(2)}M` : "—"}
            <span
              style={{
                marginLeft: 8,
                fontSize: 11,
                color: depthPct != null && depthPct >= 0 ? "#23e07b" : "#ff5252",
              }}
            >
              {pctFmt(depthPct)}
            </span>
          </div>
          <Sparkline
            data={depthSpark}
            color="#2cc7ff"
            filled={true}
            dynamicFill={true}
            animate={true}
            yFormatter={(v) => v.toFixed(2) + "%"}
          />
        </div>

        {/* FUNDING */}
        <div>
          <div style={{ fontSize: 11, color: "#8ea3c7", marginBottom: 4, letterSpacing: 1.5 }}>
            {token} Funding Rate
          </div>
          <div style={{ fontSize: 14, marginBottom: 6 }}>
            {fundingLast ? (fundingLast.v * 100).toFixed(4) + "%" : "—"}
            <span
              style={{
                marginLeft: 8,
                fontSize: 11,
                color: fundingPct != null && fundingPct >= 0 ? "#5cb85c" : "#d9534f",
              }}
            >
              {pctFmt(fundingPct)}
            </span>
          </div>
          <Sparkline
            data={fundingSpark}
            color="#ffcc33"
            filled={false}
            animate={true}
            yFormatter={(v) => v.toFixed(2) + "%"}
            dynamicFill={false}
          />
        </div>
      </div>
    </Card>
  );
}
