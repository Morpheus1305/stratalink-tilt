// server/routes/tsle.ts

import express, { Request, Response } from "express";
import { computeTsleDepthSummary, DepthSnapshotInput, VenueDepthBand, Side } from "../../lib/tsle/depthEngine";
import axios from "axios";

const router = express.Router();

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
