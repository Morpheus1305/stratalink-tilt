// server/routes/tsle.ts
import { Router } from "express";
import type { Request, Response } from "express";
import { computeTSLEFromReq } from "../services/tsleCompute";

const router = Router();

/**
 * GET /api/tsle?token=BTC&venue=coinbase&side=buy&size=100000
 * TSLE endpoint: thin wrapper around computeTSLE()
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const out = await computeTSLEFromReq(req);

    // ✅ Return the compute output directly (prevents drift)
    return res.json(out);
  } catch (err) {
    console.error("[TSLE] route error:", err);
    return res.status(500).json({
      ok: false,
      error: "TSLE compute failed",
    });
  }
});

export default router;