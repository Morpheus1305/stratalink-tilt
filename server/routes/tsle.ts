// server/routes/tsle.ts

import express, { Request, Response } from "express";
import { computeTsleDepthSummary, DepthSnapshotInput, VenueDepthBand, Side } from "../../lib/tsle/depthEngine";
import axios from "axios";

const router = express.Router();

const WORKER_BASE =
  process.env.LIQUIDITY_WORKER_BASE ||
  "https://hidden-star-5c73.rob-mcdermott.workers.dev";

// Depth levels for snapshot
type DepthLevelKey = "10" | "25" | "50" | "100" | "200";

interface WorkerDepthResponse {
  symbol: string;
  source: string;
  levels: Record<
    DepthLevelKey,
    {
      mid: number | null;
      aggregate: {
        bidUsd: number;
        askUsd: number;
        totalUsd: number;
      };
    }
  >;
}

interface WorkerFundingResponse {
  symbol: string;
  source: string;
  venues: {
    venue: string;
    ok: boolean;
    rate: number | null;
    apr: number | null;
    error: string | null;
  }[];
  headlineRate: number;
  medianRate: number;
  avgRate: number;
  regime: "Ultra-Tight" | "Tight" | "Neutral" | "Stressed";
}

type TsleBand =
  | "Ultra-Tight"
  | "Tight"
  | "Moderate"
  | "Thin"
  | "Broken";

function computeDepthScore(d25: number): number {
  if (d25 > 50_000_000) return 100;
  if (d25 > 20_000_000) return 80;
  if (d25 > 10_000_000) return 60;
  if (d25 > 5_000_000) return 40;
  if (d25 > 1_000_000) return 20;
  return 5;
}

function computeRegime(depthScore: number): TsleBand {
  if (depthScore >= 80) return "Ultra-Tight";
  if (depthScore >= 60) return "Tight";
  if (depthScore >= 40) return "Moderate";
  if (depthScore >= 20) return "Thin";
  return "Broken";
}

function computeExecutionNotes(regime: TsleBand): string[] {
  const notes: string[] = [];
  
  if (regime === "Ultra-Tight") {
    notes.push("Books support institutional block execution.");
    notes.push("Minimal slippage expected for clips up to $10M.");
  } else if (regime === "Tight") {
    notes.push("Healthy books; slicing recommended for larger clips.");
    notes.push("TWAP over 15-30 min suggested for $5M+ orders.");
  } else if (regime === "Moderate") {
    notes.push("Serviceable liquidity; TWAP recommended.");
    notes.push("Consider splitting across multiple venues.");
  } else if (regime === "Thin") {
    notes.push("Execution risk elevated; monitor refills closely.");
    notes.push("Limit order preferred; avoid market sweeps.");
  } else {
    notes.push("Impaired conditions; avoid large flow.");
    notes.push("Wait for liquidity recovery or use OTC desk.");
  }
  
  return notes;
}

function fmtUsd(n: number): string {
  if (!isFinite(n) || n <= 0) return "$0";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

//
// --- DEPTH NORMALIZATION (NEW WORKER FORMAT) ---
//
// Worker returns: { aggregate: { levels: { "10": { totalUsd }, ... } } }
//

function normalizeDepth(workerDepth: any): Record<string, number> {
  // Handle missing or malformed response
  if (!workerDepth) {
    return { "10": 0, "25": 0, "50": 0, "100": 0, "200": 0 };
  }

  // New format: aggregate.levels.XX.totalUsd
  const aggLevels = workerDepth.aggregate?.levels;
  if (aggLevels) {
    const out: Record<string, number> = {};
    for (const key of ["10", "25", "50", "100", "200"]) {
      out[key] = aggLevels[key]?.totalUsd ?? 0;
    }
    return out;
  }

  // Fallback: levels.XX.totalUsd or levels.XX.aggregate.totalUsd
  const levels = workerDepth.levels;
  if (levels && typeof levels === "object" && !Array.isArray(levels)) {
    const out: Record<string, number> = {};
    for (const key of ["10", "25", "50", "100", "200"]) {
      const lv = levels[key];
      out[key] = lv?.totalUsd ?? lv?.aggregate?.totalUsd ?? 0;
    }
    return out;
  }

  return { "10": 0, "25": 0, "50": 0, "100": 0, "200": 0 };
}

router.get("/snapshot", async (req: Request, res: Response) => {
  const symbol = (req.query.symbol as string) || "BTC";

  try {
    // ---- 1) Fetch aggregated DEPTH ----
    const depthRes = await fetch(
      `${WORKER_BASE}/depth?symbol=${encodeURIComponent(symbol)}`
    );
    if (!depthRes.ok) {
      throw new Error(`Depth worker error ${depthRes.status}`);
    }
    const depthJson = await depthRes.json();

    // ---- 2) Fetch aggregated FUNDING ----
    const fundingRes = await fetch(
      `${WORKER_BASE}/funding?symbol=${encodeURIComponent(symbol)}`
    );
    if (!fundingRes.ok) {
      throw new Error(`Funding worker error ${fundingRes.status}`);
    }
    const fundingJson = (await fundingRes.json()) as WorkerFundingResponse;

    // Normalize depth using the new worker format
    const depth = normalizeDepth(depthJson);
    const d10 = depth["10"];
    const d25 = depth["25"];
    const d50 = depth["50"];
    const d100 = depth["100"];
    const d200 = depth["200"];

    // Compute depth score and regime
    const depthScore = computeDepthScore(d25);
    const regime = computeRegime(depthScore);

    // Build execution notes
    const notes = computeExecutionNotes(regime);
    notes.unshift(
      `Max notional within 25bps ≈ ${fmtUsd(d25)}; within 50bps ≈ ${fmtUsd(d50)}.`
    );
    notes.push(
      `Funding regime: ${fundingJson.regime} (headline rate: ${(fundingJson.headlineRate * 100).toFixed(4)}%).`
    );

    // Build bands array for UI
    const bands = [
      { bps: 10, capacityUsd: d10 },
      { bps: 25, capacityUsd: d25 },
      { bps: 50, capacityUsd: d50 },
      { bps: 100, capacityUsd: d100 },
      { bps: 200, capacityUsd: d200 },
    ];

    res.json({
      symbol,
      asOf: new Date().toISOString(),
      depthBands: depth,
      bands,
      total10bps: d10,
      total25bps: d25,
      total50bps: d50,
      total100bps: d100,
      total200bps: d200,
      depthScore,
      regime,
      qualityBand: regime,
      fundingRegime: fundingJson.regime,
      headlineFundingRate: fundingJson.headlineRate,
      venues: fundingJson.venues,
      notes,
    });
  } catch (err: any) {
    res.status(500).json({
      error: "TSLE_SNAPSHOT_ERROR",
      message: err.message ?? "Unknown error",
    });
  }
});

/**
 * GET /api/tsle/depth?symbol=BTC&side=buy&size=100000
 *
 * This endpoint:
 *  - Calls your existing depth snapshot route (/api/depth/snapshot) at multiple bps levels
 *  - Normalises the result into DepthSnapshotInput
 *  - Feeds it to the TSLE engine
 *  - Returns a TSLE summary object for the UI
 */

interface DepthVenue {
  venue: string;
  bid: number;
  ask: number;
  ok: boolean;
}

interface DepthResponse {
  symbol: string;
  bps: number;
  venues: DepthVenue[];
  totalBid: number;
  totalAsk: number;
  timestamp: number;
  source: string;
}

router.get("/depth", async (req: Request, res: Response) => {
  try {
    const symbol = (req.query.symbol as string || "BTC").toUpperCase();
    const side = ((req.query.side as string) || "buy").toLowerCase() as Side;
    const requestedSize = parseFloat((req.query.size as string) || "100000");

    const baseUrl =
      process.env.DEPTH_INTERNAL_URL ||
      `http://127.0.0.1:${process.env.PORT || 5000}`;

    // Fetch depth at all required bps levels in parallel
    const bpsLevels = [10, 25, 50, 100, 200];
    const depthPromises = bpsLevels.map(bps =>
      axios.get<DepthResponse>(`${baseUrl}/api/depth/snapshot?symbol=${encodeURIComponent(symbol)}&bps=${bps}`, { timeout: 8000 })
        .then(r => ({ bps, data: r.data }))
        .catch(() => ({ bps, data: null }))
    );

    const depthResults = await Promise.all(depthPromises);

    // Build venue depth bands from the fetched data
    const venueMap = new Map<string, VenueDepthBand>();

    for (const result of depthResults) {
      if (!result.data?.venues) continue;
      
      for (const v of result.data.venues) {
        if (!v.ok) continue;
        
        const existing = venueMap.get(v.venue) || {
          venue: v.venue,
          depth10bps: 0,
          depth25bps: 0,
          depth50bps: 0,
          depth100bps: 0,
          depth200bps: 0,
        };

        // Use ask depth for buy side, bid depth for sell side
        const depth = side === "buy" ? v.ask : v.bid;

        switch (result.bps) {
          case 10: existing.depth10bps = depth; break;
          case 25: existing.depth25bps = depth; break;
          case 50: existing.depth50bps = depth; break;
          case 100: existing.depth100bps = depth; break;
          case 200: existing.depth200bps = depth; break;
        }

        venueMap.set(v.venue, existing);
      }
    }

    const venues = Array.from(venueMap.values());
    const asOf = depthResults.find(r => r.data)?.data?.timestamp 
      ? new Date(depthResults.find(r => r.data)!.data!.timestamp).toISOString() 
      : new Date().toISOString();

    const snapshotInput: DepthSnapshotInput = {
      symbol,
      asOf,
      venues,
    };

    const summary = computeTsleDepthSummary(snapshotInput, {
      side,
      requestedSize,
    });

    res.json({
      ok: true,
      symbol: summary.symbol,
      side: summary.side,
      requestedSize: summary.requestedSize,
      estImpactBps: summary.estImpactBps,
      regime: summary.regime,
      score: summary.score,
      maxSizeAt25bps: summary.maxSizeAt25bps,
      maxSizeAt50bps: summary.maxSizeAt50bps,
      maxSizeAt100bps: summary.maxSizeAt100bps,
      totals: {
        depth10bps: summary.totalDepth10bps,
        depth25bps: summary.totalDepth25bps,
        depth50bps: summary.totalDepth50bps,
        depth100bps: summary.totalDepth100bps,
        depth200bps: summary.totalDepth200bps,
      },
      venues: summary.venues,
      asOf: snapshotInput.asOf,
      source: "tsle-depth-engine",
    });
  } catch (err: any) {
    console.error("[TSLE] depth error:", err?.message || err);

    res.status(500).json({
      ok: false,
      error: "TSLE_DEPTH_ERROR",
      message:
        err?.message ||
        "Failed to compute TSLE depth. Check server logs for details.",
    });
  }
});

export default router;
