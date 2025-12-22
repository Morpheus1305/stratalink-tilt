/**
 * ALERTS API ROUTES
 * 
 * CRUD operations for alert rules and alert history.
 * Integrates with divergence detection for real-time stress alerts.
 */

import { Router, Request, Response } from "express";
import { insertAlertRuleSchema } from "../../shared/schema";
import {
  createAlertRule,
  getAlertRules,
  getAlertRuleById,
  updateAlertRule,
  deleteAlertRule,
  getAlertHistory,
  evaluateAndNotify,
} from "../services/alert-service";
import { detectDivergence, generateDivergenceReport, VenueSnapshot } from "../services/divergence-detector";
import { tsleBuffer, tsleStateEngine } from "../services/tsle-buffer";

const router = Router();

router.get("/rules", async (req: Request, res: Response) => {
  try {
    const rules = await getAlertRules();
    const formattedRules = rules.map(rule => ({
      ...rule,
      lastTriggered: rule.lastTriggered?.toISOString() || null,
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString(),
    }));
    res.json(formattedRules);
  } catch (error) {
    console.error("[Alerts] Failed to fetch rules:", error);
    res.status(500).json({ error: "Failed to fetch alert rules" });
  }
});

router.get("/rules/:id", async (req: Request, res: Response) => {
  try {
    const rule = await getAlertRuleById(req.params.id);
    if (!rule) {
      return res.status(404).json({ error: "Alert rule not found" });
    }
    res.json({
      ...rule,
      lastTriggered: rule.lastTriggered?.toISOString() || null,
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("[Alerts] Failed to fetch rule:", error);
    res.status(500).json({ error: "Failed to fetch alert rule" });
  }
});

router.post("/rules", async (req: Request, res: Response) => {
  try {
    const parsed = insertAlertRuleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
    }

    const id = parsed.data.id || `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const rule = await createAlertRule({
      id,
      name: parsed.data.name,
      enabled: parsed.data.enabled ?? true,
      symbol: parsed.data.symbol ?? null,
      triggerType: parsed.data.triggerType,
      severityThreshold: parsed.data.severityThreshold,
      regimeThreshold: parsed.data.regimeThreshold ?? null,
      poliThreshold: parsed.data.poliThreshold ?? null,
      depthDivergenceThreshold: parsed.data.depthDivergenceThreshold ?? null,
      notifyEmail: parsed.data.notifyEmail ?? false,
      emailRecipients: parsed.data.emailRecipients ?? null,
      notifyWebhook: parsed.data.notifyWebhook ?? false,
      webhookUrl: parsed.data.webhookUrl ?? null,
      cooldownMinutes: parsed.data.cooldownMinutes ?? 15,
    });

    res.status(201).json({
      ...rule,
      lastTriggered: rule.lastTriggered?.toISOString() || null,
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("[Alerts] Failed to create rule:", error);
    res.status(500).json({ error: "Failed to create alert rule" });
  }
});

router.patch("/rules/:id", async (req: Request, res: Response) => {
  try {
    const existingRule = await getAlertRuleById(req.params.id);
    if (!existingRule) {
      return res.status(404).json({ error: "Alert rule not found" });
    }

    const updates: Record<string, unknown> = {};
    const allowedFields = [
      "name", "enabled", "symbol", "triggerType", "severityThreshold",
      "regimeThreshold", "poliThreshold", "depthDivergenceThreshold",
      "notifyEmail", "emailRecipients", "notifyWebhook", "webhookUrl", "cooldownMinutes"
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const rule = await updateAlertRule(req.params.id, updates);
    if (!rule) {
      return res.status(500).json({ error: "Failed to update rule" });
    }

    res.json({
      ...rule,
      lastTriggered: rule.lastTriggered?.toISOString() || null,
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("[Alerts] Failed to update rule:", error);
    res.status(500).json({ error: "Failed to update alert rule" });
  }
});

router.delete("/rules/:id", async (req: Request, res: Response) => {
  try {
    const existingRule = await getAlertRuleById(req.params.id);
    if (!existingRule) {
      return res.status(404).json({ error: "Alert rule not found" });
    }

    await deleteAlertRule(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error("[Alerts] Failed to delete rule:", error);
    res.status(500).json({ error: "Failed to delete alert rule" });
  }
});

router.get("/history", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const ruleId = req.query.ruleId as string | undefined;

    const history = await getAlertHistory(limit, ruleId);
    const formattedHistory = history.map(entry => ({
      ...entry,
      triggeredAt: entry.triggeredAt.toISOString(),
    }));

    res.json(formattedHistory);
  } catch (error) {
    console.error("[Alerts] Failed to fetch history:", error);
    res.status(500).json({ error: "Failed to fetch alert history" });
  }
});

router.post("/evaluate/:symbol", async (req: Request, res: Response) => {
  try {
    const symbol = req.params.symbol.toUpperCase();

    const latestCoinbase = tsleBuffer.getLatest("coinbase", symbol);
    const latestBinance = tsleBuffer.getLatest("binance", symbol);

    if (!latestCoinbase || !latestBinance) {
      return res.status(400).json({ 
        error: "Insufficient data",
        message: "Both Coinbase and Binance data required for divergence evaluation"
      });
    }

    const coinbaseStateSnapshot = tsleStateEngine.getState("coinbase", symbol);
    const binanceStateSnapshot = tsleStateEngine.getState("binance", symbol);

    const referenceSnapshot: VenueSnapshot = {
      venue: "coinbase",
      poli: latestCoinbase.poli,
      depth25: latestCoinbase.depth25,
      depth50: latestCoinbase.depth50,
      spreadBps: 0,
      imbalance2550: latestCoinbase.imbalance2550,
      tsleState: coinbaseStateSnapshot.state,
      timestamp: latestCoinbase.ts,
    };

    const stressSnapshot: VenueSnapshot = {
      venue: "binance",
      poli: latestBinance.poli,
      depth25: latestBinance.depth25,
      depth50: latestBinance.depth50,
      spreadBps: 0,
      imbalance2550: latestBinance.imbalance2550,
      tsleState: binanceStateSnapshot.state,
      timestamp: latestBinance.ts,
    };

    const signals = detectDivergence(referenceSnapshot, stressSnapshot);
    const report = generateDivergenceReport(signals);

    const evaluationResult = await evaluateAndNotify({
      symbol,
      divergenceReport: report,
      signals,
    });

    res.json({
      symbol,
      divergenceReport: report,
      evaluation: evaluationResult,
    });
  } catch (error) {
    console.error("[Alerts] Evaluation failed:", error);
    res.status(500).json({ error: "Failed to evaluate alerts" });
  }
});

router.post("/test-notification/:ruleId", async (req: Request, res: Response) => {
  try {
    const rule = await getAlertRuleById(req.params.ruleId);
    if (!rule) {
      return res.status(404).json({ error: "Alert rule not found" });
    }

    const testSignal = {
      type: "POLI" as const,
      severity: "HIGH" as const,
      referenceVenue: "coinbase",
      stressVenue: "binance",
      referenceValue: 85,
      stressValue: 60,
      delta: 25,
      threshold: 15,
      message: "[TEST] PoLi divergence: coinbase (85) vs binance (60)",
      timestamp: Date.now(),
    };

    const testReport = {
      hasDivergence: true,
      signals: [testSignal],
      summary: "[TEST] Cross-venue divergence detected for testing purposes.",
      regime: "EARLY_WARNING" as const,
      timestamp: Date.now(),
    };

    const result = await evaluateAndNotify({
      symbol: rule.symbol || "BTC",
      divergenceReport: testReport,
      signals: [testSignal],
    });

    res.json({
      message: "Test notification triggered",
      result: result.results.find(r => r.ruleId === rule.id) || { status: "SKIPPED", error: "Rule did not match" },
    });
  } catch (error) {
    console.error("[Alerts] Test notification failed:", error);
    res.status(500).json({ error: "Failed to send test notification" });
  }
});

export default router;
