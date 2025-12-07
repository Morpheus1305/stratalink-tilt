export interface TsleDepthSummary {
  symbol: string;
  side: "buy" | "sell";
  maxSizeAt25bps: number;
  maxSizeAt50bps: number;
  maxSizeAt100bps: number;
  requestedSize: number;
  estImpactBps: number;
  regime: "Ultra-Tight" | "Tight" | "Neutral" | "Stressed" | "Broken";
  score: number;
  totalDepth10bps: number;
  totalDepth25bps: number;
  totalDepth50bps: number;
  totalDepth100bps: number;
  totalDepth200bps: number;
  venues: {
    venue: string;
    share25bps: number;
    share50bps: number;
    share100bps: number;
  }[];
  timestamp: number;
}

export async function fetchTsleDepth(
  symbol: string,
  side: "buy" | "sell" = "buy",
  size: number = 100000
): Promise<TsleDepthSummary> {
  const res = await fetch(
    `/api/tsle/depth?symbol=${symbol}&side=${side}&size=${size}`
  );
  if (!res.ok) throw new Error("TSLE fetch failed");
  return res.json();
}

export function formatUSD(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export function getRegimeColor(regime: TsleDepthSummary["regime"]): string {
  switch (regime) {
    case "Ultra-Tight":
      return "text-emerald-400";
    case "Tight":
      return "text-sky-400";
    case "Neutral":
      return "text-slate-400";
    case "Stressed":
      return "text-amber-400";
    case "Broken":
      return "text-red-400";
    default:
      return "text-slate-400";
  }
}

export function getRegimeBadgeColor(regime: TsleDepthSummary["regime"]): string {
  switch (regime) {
    case "Ultra-Tight":
      return "border-emerald-500 text-emerald-400";
    case "Tight":
      return "border-sky-500 text-sky-400";
    case "Neutral":
      return "border-slate-500 text-slate-400";
    case "Stressed":
      return "border-amber-500 text-amber-400";
    case "Broken":
      return "border-red-500 text-red-400";
    default:
      return "border-slate-500 text-slate-400";
  }
}
