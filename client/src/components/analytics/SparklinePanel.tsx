import { useEffect, useRef, useState } from "react";
import Card from "./Card";
import Sparkline from "./Sparkline";

type DataPoint = { v: number };

type DepthBand = {
  bidUSD: number;
  askUSD: number;
};

type TokenDepth = {
  mid: number;
  bands: Record<string, DepthBand>;
};

type FundingData = {
  fundingRate: number;
};

type Props = {
  depth: Record<string, TokenDepth> | undefined;
  funding: Record<string, FundingData> | undefined;
  selectedToken: string;
};

export default function SparklinePanel({ depth, funding, selectedToken }: Props) {
  const [priceSeries, setPriceSeries] = useState<Record<string, DataPoint[]>>({});
  const [depthSeries, setDepthSeries] = useState<Record<string, DataPoint[]>>({});
  const [fundingSeries, setFundingSeries] = useState<Record<string, DataPoint[]>>({});
  
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    const now = Date.now();
    if (now - lastUpdateRef.current < 4000) return;
    lastUpdateRef.current = now;

    if (depth) {
      const latestPrices: Record<string, number> = {};
      for (const sym of Object.keys(depth)) {
        latestPrices[sym] = depth[sym]?.mid || 0;
      }

      setPriceSeries((prev) => {
        const next = { ...prev };
        for (const sym of Object.keys(latestPrices)) {
          const val = latestPrices[sym];
          if (val > 0) {
            if (!next[sym]) next[sym] = [];
            next[sym] = [...next[sym], { v: val }].slice(-30);
          }
        }
        return next;
      });

      const btcTen = depth["BTC"]?.bands?.["10bps"];
      const btcDepth = (btcTen?.bidUSD ?? 0) + (btcTen?.askUSD ?? 0);

      if (btcDepth > 0) {
        setDepthSeries((prev) => {
          const next = { ...prev };
          if (!next["BTC"]) next["BTC"] = [];
          next["BTC"] = [...next["BTC"], { v: btcDepth }].slice(-30);
          return next;
        });
      }
    }

    if (funding) {
      const btcFunding = funding["BTC"]?.fundingRate || 0;

      setFundingSeries((prev) => {
        const next = { ...prev };
        if (!next["BTC"]) next["BTC"] = [];
        next["BTC"] = [...next["BTC"], { v: btcFunding * 100 }].slice(-30);
        return next;
      });
    }
  }, [depth, funding]);

  const priceData = priceSeries[selectedToken] || [];
  const depthData = depthSeries["BTC"] || [];
  const fundingData = fundingSeries["BTC"] || [];

  return (
    <Card title="Live Sparklines (30-point rolling window)">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: "#8ea3c7", marginBottom: 6, textTransform: "uppercase" }}>
            {selectedToken} Price
          </div>
          <Sparkline data={priceData} color="#5cb85c" />
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#8ea3c7", marginBottom: 6, textTransform: "uppercase" }}>
            BTC 10bps Depth
          </div>
          <Sparkline data={depthData} color="#00D9FF" />
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#8ea3c7", marginBottom: 6, textTransform: "uppercase" }}>
            BTC Funding Rate
          </div>
          <Sparkline data={fundingData} color="#F5C211" />
        </div>
      </div>
    </Card>
  );
}
