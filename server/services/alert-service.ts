/**
 * STRESS ALERT SERVICE
 * 
 * Manages alert rules, evaluates divergence signals against thresholds,
 * and dispatches notifications via email (Resend) and webhooks.
 * 
 * Core features:
 * - CRUD operations for alert rules (stored in PostgreSQL)
 * - Alert evaluation against divergence detection signals
 * - Email notifications via Resend API
 * - Webhook notifications with JSON payloads
 * - Cooldown management to prevent notification spam
 */

import { db } from "../db";
import { alertRules, alertHistory, SelectAlertRule, SelectAlertHistory } from "../../shared/schema";
import { eq, desc, and, gt, lt } from "drizzle-orm";
import { Resend } from "resend";
import type { DivergenceSignal, DivergenceReport } from "./divergence-detector";

const SEVERITY_ORDER = ["LOW", "MODERATE", "HIGH", "CRITICAL"] as const;
const REGIME_ORDER = ["NORMAL", "EARLY_WARNING", "STRESS_BUILDING", "CONFIRMED_STRESS"] as const;

type Severity = typeof SEVERITY_ORDER[number];
type Regime = typeof REGIME_ORDER[number];

export interface AlertEvaluationContext {
  symbol: string;
  divergenceReport: DivergenceReport;
  signals: DivergenceSignal[];
}

export interface NotificationResult {
  emailSent: boolean;
  webhookSent: boolean;
  status: "SENT" | "PARTIAL" | "FAILED" | "SKIPPED";
  error?: string;
}

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (!resendClient && process.env.RESEND_API_KEY) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

function severityMeetsThreshold(signalSeverity: string, threshold: string): boolean {
  const signalIndex = SEVERITY_ORDER.indexOf(signalSeverity as Severity);
  const thresholdIndex = SEVERITY_ORDER.indexOf(threshold as Severity);
  return signalIndex >= 0 && thresholdIndex >= 0 && signalIndex >= thresholdIndex;
}

function regimeMeetsThreshold(currentRegime: string, threshold: string): boolean {
  const currentIndex = REGIME_ORDER.indexOf(currentRegime as Regime);
  const thresholdIndex = REGIME_ORDER.indexOf(threshold as Regime);
  return currentIndex >= 0 && thresholdIndex >= 0 && currentIndex >= thresholdIndex;
}

export async function createAlertRule(rule: Omit<SelectAlertRule, 'createdAt' | 'updatedAt' | 'lastTriggered'>): Promise<SelectAlertRule> {
  const [created] = await db.insert(alertRules).values({
    ...rule,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();
  return created;
}

export async function getAlertRules(): Promise<SelectAlertRule[]> {
  return db.select().from(alertRules).orderBy(desc(alertRules.createdAt));
}

export async function getAlertRuleById(id: string): Promise<SelectAlertRule | null> {
  const [rule] = await db.select().from(alertRules).where(eq(alertRules.id, id));
  return rule || null;
}

export async function updateAlertRule(id: string, updates: Partial<SelectAlertRule>): Promise<SelectAlertRule | null> {
  const [updated] = await db.update(alertRules)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(alertRules.id, id))
    .returning();
  return updated || null;
}

export async function deleteAlertRule(id: string): Promise<boolean> {
  const result = await db.delete(alertRules).where(eq(alertRules.id, id));
  return true;
}

export async function getAlertHistory(limit: number = 50, ruleId?: string): Promise<SelectAlertHistory[]> {
  if (ruleId) {
    return db.select().from(alertHistory)
      .where(eq(alertHistory.ruleId, ruleId))
      .orderBy(desc(alertHistory.triggeredAt))
      .limit(limit);
  }
  return db.select().from(alertHistory)
    .orderBy(desc(alertHistory.triggeredAt))
    .limit(limit);
}

async function isRuleOnCooldown(rule: SelectAlertRule): Promise<boolean> {
  if (!rule.lastTriggered) return false;
  const cooldownMs = (rule.cooldownMinutes || 15) * 60 * 1000;
  const cooldownEnd = new Date(rule.lastTriggered.getTime() + cooldownMs);
  return new Date() < cooldownEnd;
}

async function sendEmailNotification(
  rule: SelectAlertRule,
  context: AlertEvaluationContext,
  matchingSignals: DivergenceSignal[]
): Promise<boolean> {
  const resend = getResendClient();
  if (!resend || !rule.emailRecipients?.length) return false;

  const signalsList = matchingSignals.map(s => 
    `- ${s.type}: ${s.message} (${s.severity})`
  ).join('\n');

  const emailBody = `
STRESS ALERT: ${rule.name}

Symbol: ${context.symbol}
Regime: ${context.divergenceReport.regime}
Summary: ${context.divergenceReport.summary}

Signals:
${signalsList}

---
Alert Rule: ${rule.name}
Trigger Type: ${rule.triggerType}
Severity Threshold: ${rule.severityThreshold}

Timestamp: ${new Date().toISOString()}
  `.trim();

  try {
    await resend.emails.send({
      from: 'StrataLink Labs <alerts@stratalink.ai>',
      to: rule.emailRecipients,
      subject: `[${context.divergenceReport.regime}] ${context.symbol} Stress Alert: ${rule.name}`,
      text: emailBody,
    });
    return true;
  } catch (error) {
    console.error('[AlertService] Email send failed:', error);
    return false;
  }
}

async function sendWebhookNotification(
  rule: SelectAlertRule,
  context: AlertEvaluationContext,
  matchingSignals: DivergenceSignal[]
): Promise<boolean> {
  if (!rule.webhookUrl) return false;

  const payload = {
    alert: {
      ruleId: rule.id,
      ruleName: rule.name,
      triggerType: rule.triggerType,
      severityThreshold: rule.severityThreshold,
    },
    symbol: context.symbol,
    regime: context.divergenceReport.regime,
    summary: context.divergenceReport.summary,
    signals: matchingSignals,
    timestamp: new Date().toISOString(),
  };

  try {
    const response = await fetch(rule.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return response.ok;
  } catch (error) {
    console.error('[AlertService] Webhook send failed:', error);
    return false;
  }
}

export async function evaluateAndNotify(context: AlertEvaluationContext): Promise<{
  rulesTriggered: number;
  notificationsSent: number;
  results: Array<{ ruleId: string; ruleName: string; result: NotificationResult }>;
}> {
  const rules = await db.select().from(alertRules).where(eq(alertRules.enabled, true));
  const results: Array<{ ruleId: string; ruleName: string; result: NotificationResult }> = [];
  let rulesTriggered = 0;
  let notificationsSent = 0;

  for (const rule of rules) {
    if (rule.symbol && rule.symbol !== context.symbol) continue;
    
    if (await isRuleOnCooldown(rule)) {
      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        result: { emailSent: false, webhookSent: false, status: "SKIPPED", error: "On cooldown" },
      });
      continue;
    }

    let shouldTrigger = false;
    let matchingSignals: DivergenceSignal[] = [];

    switch (rule.triggerType) {
      case "DIVERGENCE":
        matchingSignals = context.signals.filter(s => 
          severityMeetsThreshold(s.severity, rule.severityThreshold)
        );
        shouldTrigger = matchingSignals.length > 0;
        break;

      case "REGIME_CHANGE":
        if (rule.regimeThreshold) {
          shouldTrigger = regimeMeetsThreshold(context.divergenceReport.regime, rule.regimeThreshold);
          matchingSignals = context.signals;
        }
        break;

      case "POLI_DROP":
        matchingSignals = context.signals.filter(s => 
          s.type === "POLI" && severityMeetsThreshold(s.severity, rule.severityThreshold)
        );
        if (rule.poliThreshold !== null && rule.poliThreshold !== undefined) {
          matchingSignals = matchingSignals.filter(s => 
            typeof s.referenceValue === 'number' && s.referenceValue <= rule.poliThreshold!
          );
        }
        shouldTrigger = matchingSignals.length > 0;
        break;

      case "DEPTH_DROP":
        matchingSignals = context.signals.filter(s => 
          s.type === "DEPTH" && severityMeetsThreshold(s.severity, rule.severityThreshold)
        );
        if (rule.depthDivergenceThreshold !== null && rule.depthDivergenceThreshold !== undefined) {
          matchingSignals = matchingSignals.filter(s => 
            s.delta >= rule.depthDivergenceThreshold!
          );
        }
        shouldTrigger = matchingSignals.length > 0;
        break;
    }

    if (!shouldTrigger) continue;

    rulesTriggered++;
    let emailSent = false;
    let webhookSent = false;

    if (rule.notifyEmail) {
      emailSent = await sendEmailNotification(rule, context, matchingSignals);
    }

    if (rule.notifyWebhook) {
      webhookSent = await sendWebhookNotification(rule, context, matchingSignals);
    }

    const wantedEmail = rule.notifyEmail;
    const wantedWebhook = rule.notifyWebhook;
    let status: NotificationResult['status'];

    if (!wantedEmail && !wantedWebhook) {
      status = "SKIPPED";
    } else if ((wantedEmail === emailSent) && (wantedWebhook === webhookSent)) {
      status = "SENT";
      notificationsSent++;
    } else if (emailSent || webhookSent) {
      status = "PARTIAL";
      notificationsSent++;
    } else {
      status = "FAILED";
    }

    await db.update(alertRules)
      .set({ lastTriggered: new Date() })
      .where(eq(alertRules.id, rule.id));

    await db.insert(alertHistory).values({
      ruleId: rule.id,
      symbol: context.symbol,
      triggerType: rule.triggerType,
      severity: matchingSignals[0]?.severity || rule.severityThreshold,
      regime: context.divergenceReport.regime,
      signalData: { signals: matchingSignals, summary: context.divergenceReport.summary },
      emailSent,
      webhookSent,
      notificationStatus: status,
    });

    results.push({
      ruleId: rule.id,
      ruleName: rule.name,
      result: { emailSent, webhookSent, status },
    });
  }

  return { rulesTriggered, notificationsSent, results };
}
