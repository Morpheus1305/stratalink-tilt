import { TokenLiquiditySummary } from "@/types/liquidity";

const STATIC_TSLE_SCORES: Record<string, { score: number; regime: "Ultra-Tight" | "Tight" | "Constructive" | "Patchy" | "Thin" | "Broken" }> = {
  BTC: { score: 95, regime: "Ultra-Tight" },
  ETH: { score: 88, regime: "Tight" },
  SOL: { score: 82, regime: "Tight" },
  LINK: { score: 80, regime: "Tight" },
  NEAR: { score: 76, regime: "Constructive" },
  AVAX: { score: 74, regime: "Constructive" },
  DOT: { score: 72, regime: "Constructive" },
  ADA: { score: 68, regime: "Patchy" },
  XRP: { score: 64, regime: "Patchy" },
  DOGE: { score: 58, regime: "Thin" },
};

const syntheticSummary: TokenLiquiditySummary[] = [
  {
    symbol: "BTC",
    name: "Bitcoin",
    factorScore: 65,
    poliScore: 88,
    execRegime: "Ultra-Tight",
    max25bps: 29_000_000,
    max50bps: 35_000_000,
    bestVenue: "Kraken",
    depth10: 5_800_000,
    depth10Change24h: 1.8,
    riskFlag: "green",
    tsleScore: STATIC_TSLE_SCORES.BTC.score,
    tsleRegime: STATIC_TSLE_SCORES.BTC.regime,
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    factorScore: 56,
    poliScore: 82,
    execRegime: "Tight",
    max25bps: 12_500_000,
    max50bps: 18_300_000,
    bestVenue: "Coinbase",
    depth10: 3_200_000,
    depth10Change24h: -0.9,
    riskFlag: "green",
    tsleScore: STATIC_TSLE_SCORES.ETH.score,
    tsleRegime: STATIC_TSLE_SCORES.ETH.regime,
  },
  {
    symbol: "SOL",
    name: "Solana",
    factorScore: 42,
    poliScore: 71,
    execRegime: "Constructive",
    max25bps: 4_200_000,
    max50bps: 7_600_000,
    bestVenue: "Binance",
    depth10: 1_100_000,
    depth10Change24h: -4.5,
    riskFlag: "amber",
    tsleScore: STATIC_TSLE_SCORES.SOL.score,
    tsleRegime: STATIC_TSLE_SCORES.SOL.regime,
  },
  {
    symbol: "AVAX",
    name: "Avalanche",
    factorScore: 48,
    execRegime: "Constructive",
    max25bps: 2_800_000,
    max50bps: 4_900_000,
    bestVenue: "Binance",
    depth10: 780_000,
    depth10Change24h: 2.3,
    riskFlag: "amber",
    tsleScore: STATIC_TSLE_SCORES.AVAX.score,
    tsleRegime: STATIC_TSLE_SCORES.AVAX.regime,
  },
  {
    symbol: "LINK",
    name: "Chainlink",
    factorScore: 60,
    execRegime: "Tight",
    max25bps: 3_200_000,
    max50bps: 5_400_000,
    bestVenue: "Coinbase",
    depth10: 910_000,
    depth10Change24h: 0.7,
    riskFlag: "green",
    tsleScore: STATIC_TSLE_SCORES.LINK.score,
    tsleRegime: STATIC_TSLE_SCORES.LINK.regime,
  },
  {
    symbol: "DOT",
    name: "Polkadot",
    factorScore: 45,
    execRegime: "Constructive",
    max25bps: 1_600_000,
    max50bps: 2_800_000,
    bestVenue: "Binance",
    depth10: 520_000,
    depth10Change24h: -3.1,
    riskFlag: "amber",
    tsleScore: STATIC_TSLE_SCORES.DOT.score,
    tsleRegime: STATIC_TSLE_SCORES.DOT.regime,
  },
  {
    symbol: "NEAR",
    name: "NEAR Protocol",
    factorScore: 50,
    execRegime: "Constructive",
    max25bps: 1_900_000,
    max50bps: 3_200_000,
    bestVenue: "Binance",
    depth10: 610_000,
    depth10Change24h: 4.2,
    riskFlag: "green",
    tsleScore: STATIC_TSLE_SCORES.NEAR.score,
    tsleRegime: STATIC_TSLE_SCORES.NEAR.regime,
  },
  {
    symbol: "ADA",
    name: "Cardano",
    factorScore: 41,
    execRegime: "Stressed",
    max25bps: 900_000,
    max50bps: 1_600_000,
    bestVenue: "Binance",
    depth10: 360_000,
    depth10Change24h: -6.8,
    riskFlag: "amber",
    tsleScore: STATIC_TSLE_SCORES.ADA.score,
    tsleRegime: STATIC_TSLE_SCORES.ADA.regime,
  },
  {
    symbol: "XRP",
    name: "XRP",
    factorScore: 38,
    execRegime: "Block-Only",
    max25bps: 700_000,
    max50bps: 1_200_000,
    bestVenue: "Bybit",
    depth10: 310_000,
    depth10Change24h: -9.1,
    riskFlag: "red",
    tsleScore: STATIC_TSLE_SCORES.XRP.score,
    tsleRegime: STATIC_TSLE_SCORES.XRP.regime,
  },
];

const TRACKED_TOKENS = syntheticSummary.map((r) => r.symbol);

function mapFiveFactor(symbol: string, data: any) {
  return {
    factorScore: typeof data?.score === "number" ? data.score : 50,
  };
}

function mapExecutionIntel(symbol: string, data: any) {
  return {
    execRegime: (data?.regime ?? "Constructive") as TokenLiquiditySummary["execRegime"],
    max25bps: typeof data?.maxSize25bps === "number" ? data.maxSize25bps : 0,
    max50bps: typeof data?.maxSize50bps === "number" ? data.maxSize50bps : 0,
    bestVenue: (data?.bestVenue as string) ?? "Unknown",
    depth10: typeof data?.depth10bps === "number" ? data.depth10bps : 0,
    depth10Change24h:
      typeof data?.depth10bpsChange24h === "number" ? data.depth10bpsChange24h : 0,
    riskFlag: (data?.riskFlag as TokenLiquiditySummary["riskFlag"]) ?? "amber",
  };
}

interface TsleSnapshotResponse {
  symbol: string;
  depthBands: { "10": number; "25": number; "50": number; "100": number; "200": number };
  depthScore: number;
  fundingScore: number;
  tsleScore: number;
  regime: string;
  stressBucket: string;
  notes: string;
}

async function fetchTsleData(symbol: string): Promise<{ tsleScore: number | null; tsleRegime: string | null; tsleStress: string | null }> {
  try {
    const res = await fetch(`/api/tsle/snapshot?symbol=${encodeURIComponent(symbol)}`);
    if (!res.ok) return { tsleScore: null, tsleRegime: null, tsleStress: null };
    const data = (await res.json()) as TsleSnapshotResponse;
    return {
      tsleScore: data.tsleScore ?? null,
      tsleRegime: data.regime ?? null,
      tsleStress: data.stressBucket ?? null,
    };
  } catch {
    return { tsleScore: null, tsleRegime: null, tsleStress: null };
  }
}

async function fetchForToken(symbol: string): Promise<TokenLiquiditySummary> {
  const fallback = syntheticSummary.find((r) => r.symbol === symbol);
  try {
    const [fiveRes, execRes, tsleData] = await Promise.all([
      fetch(`/api/liquidity/five-factor?symbol=${encodeURIComponent(symbol)}`),
      fetch(`/api/execution/intel?symbol=${encodeURIComponent(symbol)}`),
      fetchTsleData(symbol),
    ]);

    if (!fiveRes.ok || !execRes.ok) {
      if (fallback) return { 
        ...fallback, 
        tsleScore: tsleData.tsleScore,
        tsleRegime: tsleData.tsleRegime as TokenLiquiditySummary["tsleRegime"],
        tsleStress: tsleData.tsleStress as TokenLiquiditySummary["tsleStress"],
      };
      throw new Error("One or more liquidity endpoints returned non-OK");
    }

    const [fiveData, execData] = await Promise.all([fiveRes.json(), execRes.json()]);
    const five = mapFiveFactor(symbol, fiveData);
    const exec = mapExecutionIntel(symbol, execData);

    const row: TokenLiquiditySummary = {
      symbol,
      name: fallback?.name ?? symbol,
      factorScore: five.factorScore,
      poliScore: fallback?.poliScore,
      execRegime: exec.execRegime,
      max25bps: exec.max25bps,
      max50bps: exec.max50bps,
      bestVenue: exec.bestVenue,
      depth10: exec.depth10,
      depth10Change24h: exec.depth10Change24h,
      riskFlag: exec.riskFlag,
      tsleScore: tsleData.tsleScore,
      tsleRegime: tsleData.tsleRegime as TokenLiquiditySummary["tsleRegime"],
      tsleStress: tsleData.tsleStress as TokenLiquiditySummary["tsleStress"],
    };

    return row;
  } catch (err) {
    console.error("Failed to fetch liquidity summary for", symbol, err);
    if (fallback) return fallback;

    return {
      symbol,
      name: symbol,
      factorScore: 50,
      poliScore: undefined,
      execRegime: "Constructive",
      max25bps: 0,
      max50bps: 0,
      bestVenue: "Unknown",
      depth10: 0,
      depth10Change24h: 0,
      riskFlag: "amber",
      tsleScore: null,
      tsleRegime: null,
      tsleStress: null,
    };
  }
}

export async function fetchTokenLiquiditySummary(): Promise<TokenLiquiditySummary[]> {
  try {
    const rows = await Promise.all(TRACKED_TOKENS.map(fetchForToken));
    return rows.sort((a, b) => b.factorScore - a.factorScore);
  } catch (err) {
    console.error("Falling back to synthetic league table data", err);
    return syntheticSummary;
  }
}
