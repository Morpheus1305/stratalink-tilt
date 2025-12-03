import { getDepthCache, getDepthSummary } from "./depthEngine";
import { getFundingCache, getFundingSummary } from "./fundingEngine";
import { getLiquidationCache, getLiquidationSummary } from "./liquidationEngine";

export type StressRegime = "LOW" | "MODERATE" | "HIGH" | "EXTREME";

export type StressDriver = {
  category: "FUNDING" | "LIQUIDATION" | "DEPTH" | "SPREAD";
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  contribution: number;
};

export type StressResult = {
  stressScore: number;
  regime: StressRegime;
  drivers: StressDriver[];
  depth: ReturnType<typeof getDepthCache>;
  funding: ReturnType<typeof getFundingCache>;
  liquidations: ReturnType<typeof getLiquidationCache>;
  summary: {
    depth: ReturnType<typeof getDepthSummary>;
    funding: ReturnType<typeof getFundingSummary>;
    liquidations: ReturnType<typeof getLiquidationSummary>;
  };
  ts: number;
};

export function computeStress(): StressResult {
  const depth = getDepthCache();
  const funding = getFundingCache();
  const liquidations = getLiquidationCache();
  
  const depthSummary = getDepthSummary();
  const fundingSummary = getFundingSummary();
  const liqSummary = getLiquidationSummary();

  let score = 0;
  const drivers: StressDriver[] = [];

  for (const key of Object.keys(funding)) {
    const fr = funding[key]?.fundingRate ?? 0;
    
    if (fr < -0.0005) {
      score += 15;
      drivers.push({
        category: "FUNDING",
        description: `Funding inversion on ${key} (${(fr * 100).toFixed(3)}%)`,
        severity: "HIGH",
        contribution: 15,
      });
    } else if (fr < -0.0001) {
      score += 8;
      drivers.push({
        category: "FUNDING",
        description: `Negative funding on ${key} (${(fr * 100).toFixed(3)}%)`,
        severity: "MEDIUM",
        contribution: 8,
      });
    } else if (fr > 0.001) {
      score += 5;
      drivers.push({
        category: "FUNDING",
        description: `Elevated positive funding on ${key} (${(fr * 100).toFixed(3)}%)`,
        severity: "LOW",
        contribution: 5,
      });
    }
  }

  for (const key of Object.keys(liquidations)) {
    const { imbalance, totalLiquidationsUSD } = liquidations[key];
    const notional = totalLiquidationsUSD;
    
    if (notional > 10_000_000 && imbalance < -0.3) {
      score += 20;
      drivers.push({
        category: "LIQUIDATION",
        description: `Long-liquidation cascade on ${key} ($${(notional / 1e6).toFixed(1)}M)`,
        severity: "HIGH",
        contribution: 20,
      });
    } else if (notional > 10_000_000 && imbalance > 0.3) {
      score += 15;
      drivers.push({
        category: "LIQUIDATION",
        description: `Short-liquidation cascade on ${key} ($${(notional / 1e6).toFixed(1)}M)`,
        severity: "MEDIUM",
        contribution: 15,
      });
    } else if (notional > 5_000_000) {
      score += 5;
      drivers.push({
        category: "LIQUIDATION",
        description: `Elevated liquidations on ${key} ($${(notional / 1e6).toFixed(1)}M)`,
        severity: "LOW",
        contribution: 5,
      });
    }
  }

  const btc = depth["BTC"];
  if (btc) {
    const ten = btc.bands?.["10bps"];
    if (ten) {
      const totalDepth = ten.totalUSD;
      if (totalDepth < 5_000_000) {
        score += 25;
        drivers.push({
          category: "DEPTH",
          description: `Critical BTC depth at 10bps ($${(totalDepth / 1e6).toFixed(1)}M)`,
          severity: "HIGH",
          contribution: 25,
        });
      } else if (totalDepth < 15_000_000) {
        score += 15;
        drivers.push({
          category: "DEPTH",
          description: `Thin BTC depth at 10bps ($${(totalDepth / 1e6).toFixed(1)}M)`,
          severity: "MEDIUM",
          contribution: 15,
        });
      } else if (totalDepth < 30_000_000) {
        score += 8;
        drivers.push({
          category: "DEPTH",
          description: `Moderate BTC depth at 10bps ($${(totalDepth / 1e6).toFixed(1)}M)`,
          severity: "LOW",
          contribution: 8,
        });
      }
    }

    if (btc.spreadBps > 10) {
      score += 15;
      drivers.push({
        category: "SPREAD",
        description: `Wide BTC spread (${btc.spreadBps.toFixed(1)}bps)`,
        severity: "HIGH",
        contribution: 15,
      });
    } else if (btc.spreadBps > 5) {
      score += 8;
      drivers.push({
        category: "SPREAD",
        description: `Elevated BTC spread (${btc.spreadBps.toFixed(1)}bps)`,
        severity: "MEDIUM",
        contribution: 8,
      });
    }
  }

  let totalAltDepth10 = 0;
  const altTokens = ["ETH", "SOL", "XRP", "ADA", "AVAX"];
  for (const token of altTokens) {
    const d = depth[token];
    if (d?.bands?.["10bps"]) {
      totalAltDepth10 += d.bands["10bps"].totalUSD;
    }
  }
  
  if (totalAltDepth10 < 10_000_000) {
    score += 10;
    drivers.push({
      category: "DEPTH",
      description: `Thin alt-coin depth at 10bps ($${(totalAltDepth10 / 1e6).toFixed(1)}M total)`,
      severity: "MEDIUM",
      contribution: 10,
    });
  }

  let regime: StressRegime;
  if (score >= 60) regime = "EXTREME";
  else if (score >= 40) regime = "HIGH";
  else if (score >= 20) regime = "MODERATE";
  else regime = "LOW";

  return {
    stressScore: Math.min(score, 100),
    regime,
    drivers: drivers.sort((a, b) => b.contribution - a.contribution),
    depth,
    funding,
    liquidations,
    summary: {
      depth: depthSummary,
      funding: fundingSummary,
      liquidations: liqSummary,
    },
    ts: Date.now(),
  };
}

export function getStressCommentary(stress: StressResult): string {
  const { stressScore, regime, drivers } = stress;
  
  if (regime === "LOW") {
    return `Market structure is healthy with a stress score of ${stressScore}. No significant risk drivers detected. Normal trading conditions prevail.`;
  }
  
  if (regime === "MODERATE") {
    const topDriver = drivers[0];
    return `Elevated market stress at ${stressScore}/100. Primary concern: ${topDriver?.description || "multiple factors"}. Monitor for deterioration.`;
  }
  
  if (regime === "HIGH") {
    const topDrivers = drivers.slice(0, 2).map(d => d.description).join("; ");
    return `High market stress detected (${stressScore}/100). Key drivers: ${topDrivers}. Exercise caution and consider reducing risk exposure.`;
  }
  
  const criticalDrivers = drivers.filter(d => d.severity === "HIGH");
  return `EXTREME stress conditions (${stressScore}/100). ${criticalDrivers.length} critical factors active: ${criticalDrivers.map(d => d.description).join("; ")}. Risk management protocols advised.`;
}
