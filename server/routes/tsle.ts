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

function classifyQualityBand(
  cap10: number,
  cap25: number,
  cap50: number,
  funding: WorkerFundingResponse["regime"]
): TsleBand {
  if (cap25 === 0 && cap10 === 0) return "Broken";

  if (cap25 >= 50_000_000 && (funding === "Ultra-Tight" || funding === "Tight"))
    return "Ultra-Tight";

  if (cap25 >= 20_000_000) return "Tight";

  if (cap25 >= 5_000_000) return "Moderate";

  if (cap10 > 0) return "Thin";

  return "Broken";
}

function fmtUsd(n: number): string {
  if (!isFinite(n) || n <= 0) return "$0";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
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
    const depthJson = (await depthRes.json()) as WorkerDepthResponse;

    // ---- 2) Fetch aggregated FUNDING ----
    const fundingRes = await fetch(
      `${WORKER_BASE}/funding?symbol=${encodeURIComponent(symbol)}`
    );
    if (!fundingRes.ok) {
      throw new Error(`Funding worker error ${fundingRes.status}`);
    }
    const fundingJson = (await fundingRes.json()) as WorkerFundingResponse;

    const levels: DepthLevelKey[] = ["10", "25", "50", "100", "200"];

    const bandData = levels.map((bps) => {
      const cap = depthJson.levels[bps]?.aggregate?.totalUsd ?? 0;
      return { bps: Number(bps), capacityUsd: cap };
    });

    const byBps = Object.fromEntries(
      bandData.map((b) => [b.bps, b.capacityUsd])
    ) as Record<number, number>;

    const quality = classifyQualityBand(
      byBps[10],
      byBps[25],
      byBps[50],
      fundingJson.regime
    );

    const notes: string[] = [];
    notes.push(
      `Max notional within 25bps ≈ ${fmtUsd(byBps[25])}; within 50bps ≈ ${fmtUsd(
        byBps[50]
      )}.`
    );
    notes.push(
      `Funding regime: ${fundingJson.regime} (headline rate: ${
        (fundingJson.headlineRate * 100).toFixed(4)
      }%).`
    );

    if (quality === "Ultra-Tight")
      notes.push("Books support institutional block execution.");
    else if (quality === "Tight")
      notes.push("Healthy books; slicing recommended for larger clips.");
    else if (quality === "Moderate")
      notes.push("Serviceable liquidity; TWAP recommended.");
    else if (quality === "Thin")
      notes.push("Execution risk elevated; monitor refills closely.");
    else notes.push("Impaired conditions; avoid large flow.");

    res.json({
      symbol,
      asOf: new Date().toISOString(),
      bands: bandData,
      total10bps: byBps[10] ?? 0,
      total25bps: byBps[25] ?? 0,
      total50bps: byBps[50] ?? 0,
      total100bps: byBps[100] ?? 0,
      total200bps: byBps[200] ?? 0,
      qualityBand: quality,
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
