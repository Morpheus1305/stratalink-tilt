import { TokenLiquiditySummary } from "@/types/liquidity";

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
  },
];

export async function fetchTokenLiquiditySummary(): Promise<TokenLiquiditySummary[]> {
  try {
    const res = await fetch("/api/liquidity/summary");
    if (!res.ok) {
      return syntheticSummary;
    }
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      return syntheticSummary;
    }
    return data;
  } catch (e) {
    return syntheticSummary;
  }
}
