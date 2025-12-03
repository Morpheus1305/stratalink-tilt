import { Router, Request, Response } from "express";
import { getAggregatedPrice, getMultiplePrices } from "./aggregator/aggregator";
import { DEPTH_TOKENS } from "./aggregator/config/symbols";
import { getDepthCache, getDepthSummary } from "./engines/depthEngine";
import { getFundingCache, getFundingSummary } from "./engines/fundingEngine";
import { getLiquidationCache, getLiquidationSummary } from "./engines/liquidationEngine";
import { 
  getIngestionStatus, 
  getFullStressReport, 
  getSummaryReport,
  runFullIngest 
} from "./engines/ingestionManager";

const router = Router();

router.get("/price", async (req: Request, res: Response) => {
  try {
    const symbol = (req.query.symbol as string) || "BTC";
    const quote = (req.query.quote as string) || "USD";
    
    const price = await getAggregatedPrice({ symbol, quote });
    res.json(price);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/prices", async (req: Request, res: Response) => {
  try {
    const symbolsParam = req.query.symbols as string;
    const symbols = symbolsParam 
      ? symbolsParam.split(",").map(s => s.trim().toUpperCase())
      : DEPTH_TOKENS;
    
    const prices = await getMultiplePrices(symbols);
    res.json({ prices, ts: Date.now() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/depth", (req: Request, res: Response) => {
  try {
    const symbol = req.query.symbol as string;
    const cache = getDepthCache();
    
    if (symbol) {
      const tokenDepth = cache[symbol.toUpperCase()];
      if (!tokenDepth) {
        return res.status(404).json({ error: `No depth data for ${symbol}` });
      }
      return res.json({ symbol: symbol.toUpperCase(), ...tokenDepth });
    }
    
    res.json({ 
      depth: cache, 
      summary: getDepthSummary(),
      ts: Date.now() 
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/funding", (req: Request, res: Response) => {
  try {
    const symbol = req.query.symbol as string;
    const cache = getFundingCache();
    
    if (symbol) {
      const tokenFunding = cache[symbol.toUpperCase()];
      if (!tokenFunding) {
        return res.status(404).json({ error: `No funding data for ${symbol}` });
      }
      return res.json({ symbol: symbol.toUpperCase(), ...tokenFunding });
    }
    
    res.json({ 
      funding: cache, 
      summary: getFundingSummary(),
      ts: Date.now() 
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/liquidations", (req: Request, res: Response) => {
  try {
    const symbol = req.query.symbol as string;
    const cache = getLiquidationCache();
    
    if (symbol) {
      const tokenLiq = cache[symbol.toUpperCase()];
      if (!tokenLiq) {
        return res.status(404).json({ error: `No liquidation data for ${symbol}` });
      }
      return res.json({ symbol: symbol.toUpperCase(), ...tokenLiq });
    }
    
    res.json({ 
      liquidations: cache, 
      summary: getLiquidationSummary(),
      ts: Date.now() 
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/stress", (req: Request, res: Response) => {
  try {
    const stress = getFullStressReport();
    res.json({
      stressScore: stress.stressScore,
      regime: stress.regime,
      drivers: stress.drivers,
      commentary: stress.commentary,
      ts: stress.ts,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/stress/full", (req: Request, res: Response) => {
  try {
    const stress = getFullStressReport();
    res.json(stress);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/summary", (req: Request, res: Response) => {
  try {
    const summary = getSummaryReport();
    res.json({
      dominant_factor: summary.dominantFactor,
      market_regime: summary.marketRegime,
      stress_score: summary.stressScore,
      stress_regime: summary.stressRegime,
      key_metrics: summary.keyMetrics,
      ts: summary.ts,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/status", (req: Request, res: Response) => {
  try {
    const status = getIngestionStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/ingest", async (req: Request, res: Response) => {
  try {
    await runFullIngest();
    res.json({ success: true, message: "Ingest completed", ts: Date.now() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
