import { Router } from "express";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { getDepth, getDepthCapableVenues, VENUE_CAPABILITIES } = require("../../relay/depthRouter.cjs");

const router = Router();

router.get("/depth", async (req, res) => {
  try {
    const { venue, symbol } = req.query;
    if (!venue || !symbol) {
      return res.status(400).json({ error: "venue and symbol required" });
    }
    const data = await getDepth(venue as string, symbol as string);
    res.json(data);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/venues", (_req, res) => {
  res.json(VENUE_CAPABILITIES);
});

router.get("/:venue/depth", async (req, res) => {
  try {
    const { venue } = req.params;
    const { symbol } = req.query;
    if (!symbol) {
      return res.status(400).json({ error: "symbol required" });
    }
    const data = await getDepth(venue, symbol as string);
    res.json(data);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
