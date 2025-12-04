import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type SparkPoint = { v: number; t: number };

type FeedState = {
  priceSeries: SparkPoint[];
  depthSeries: SparkPoint[];
  fundingSeries: SparkPoint[];
  token: string;
  setToken: (t: string) => void;
  stale: boolean;
};

const MicrostructureFeedContext = createContext<FeedState | null>(null);

export function useMicroFeed() {
  const ctx = useContext(MicrostructureFeedContext);
  if (!ctx) throw new Error("useMicroFeed must be inside MicrostructureFeedProvider");
  return ctx;
}

async function fetchPrice(token: string): Promise<number> {
  try {
    const res = await fetch(`/api/analytics/price?symbol=${token}`);
    if (!res.ok) throw new Error("Price fetch failed");
    const data = await res.json();
    return data.price || data.aggregatedPrice || 0;
  } catch {
    return 0;
  }
}

async function fetchDepth(token: string): Promise<number> {
  try {
    const res = await fetch(`/api/analytics/depth?symbol=${token}`);
    if (!res.ok) throw new Error("Depth fetch failed");
    const data = await res.json();
    return data.depth10bps || data.bps10 || 0;
  } catch {
    return 0;
  }
}

async function fetchFunding(token: string): Promise<number> {
  try {
    const res = await fetch(`/api/analytics/funding?symbol=${token}`);
    if (!res.ok) throw new Error("Funding fetch failed");
    const data = await res.json();
    return data.rate || data.fundingRate || 0;
  } catch {
    return 0;
  }
}

export function MicrostructureFeedProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState("BTC");

  const [priceSeries, setPriceSeries] = useState<SparkPoint[]>([]);
  const [depthSeries, setDepthSeries] = useState<SparkPoint[]>([]);
  const [fundingSeries, setFundingSeries] = useState<SparkPoint[]>([]);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    setPriceSeries([]);
    setDepthSeries([]);
    setFundingSeries([]);
  }, [token]);

  useEffect(() => {
    let mounted = true;

    const poll = async () => {
      try {
        const [price, depth, funding] = await Promise.all([
          fetchPrice(token),
          fetchDepth(token),
          fetchFunding(token),
        ]);

        if (!mounted) return;

        const now = Date.now();

        setPriceSeries((p) => [...p.slice(-29), { v: price, t: now }]);
        setDepthSeries((p) => [...p.slice(-29), { v: depth, t: now }]);
        setFundingSeries((p) => [...p.slice(-29), { v: funding, t: now }]);

        setStale(false);
      } catch (e) {
        console.log("Microstructure feed error:", e);
        setStale(true);
      }
    };

    poll();
    const id = setInterval(poll, 2000);

    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [token]);

  return (
    <MicrostructureFeedContext.Provider
      value={{
        priceSeries,
        depthSeries,
        fundingSeries,
        token,
        setToken,
        stale,
      }}
    >
      {children}
    </MicrostructureFeedContext.Provider>
  );
}
