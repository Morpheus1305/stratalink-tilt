---
name: Live Data Architecture — Alerts + RCL
description: How mock fixtures were replaced with live L5F + TSLE buffer data for the Alerts and RCL pages, and how alert triggers are wired.
---

## Alerts Page

**Old**: `storage.getAlertsData()` returned a static fixture in `server/storage.ts`.

**New**: `/api/alerts` route calls `getLiveAlertsData(asset)` from `server/services/liveAlertsService.ts` (dynamic import). This service:
- Computes 6 Risk Indicators from `computeAnalyticsSnapshot()` L5F factors (DQ, R, F, EI, RS, Composite)
- RAS levels: score ≥ 65 = low, ≥ 40 = medium, < 40 = high (thresholds vary per indicator)
- Alert log: queries `getAlertHistory()` from DB; if <3 entries, supplements with computed live entries derived from current L5F thresholds breaches
- Warning capacity: NORMAL → "6–8 hours", ELEVATED → "2–4 hours", STRESS → "0–1 hour"
- Critical assets: counts TRACKED_ASSETS (BTC/ETH/SOL) with l5f_composite < 50
- Alert timeline: aggregates TSLE buffer poli history across all 14 venues into 5-min buckets; maps avg poli → critical/warning/info severity counts

## RCL Page

**Old**: `server/services/rclMock.ts` with random fixture data.

**New**: `server/services/rclLive.ts` with same exported API (`getAdgmScreenPayload`, `getInstruments`, `cacheSnapshot`, `getSnapshot`). `server/routes/rcl.ts` import updated from `rclMock` → `rclLive`.

Live derivations:
- Active venues: `tsleBuffer.getBufferKeys()` filtered by "venue:SYMBOL" for each declared supervisory venue (binance, coinbase, kraken)
- Coverage pct: activeVenues.length / DECLARED_SUPERVISORY_VENUES.length
- PoLi status: "verified" if ≥3 venues AND l5f_composite ≥ 60; "degraded" if partial; "insufficient" if 0 or <50% coverage
- Evidence level: L3 if ≥3 venues active, L2 otherwise, L1 if none
- Last ingest: actual timestamp from tsleBuffer.getRawHistory()
- Latency p95: derived from (now - newestTs) / 10, capped at 500ms
- Data gaps: count of declared venues with no data or stale >60s
- Provenance: active venues with real timestamps + inactive venues shown as "no_data"

## Alert Trigger Wiring

`analytics/engines/ingestionManager.ts`: after `feedDepthToTsleBuffer()`, calls `detectAndWriteAlerts()` (fire-and-forget, error is caught and logged).

`detectAndWriteAlerts()`:
- Loops over BTC, ETH, SOL
- Calls `computeAnalyticsSnapshot(sym)` for live L5F
- Builds `DivergenceSignal[]` from: POLI signal (l5f_composite < 65), DEPTH signal (l5f_depth_quality < 50), SPREAD signal (spread_dispersion_bps > 5)
- Maps vol_regime → DivergenceReport.regime (NORMAL/EARLY_WARNING/CONFIRMED_STRESS)
- Calls `evaluateAndNotify()` which evaluates all enabled DB rules and writes to alertHistory if thresholds match

**Why**: evaluateAndNotify requires existing alert rules in DB. If no rules configured, nothing is written — the live computed entries in liveAlertsService.ts handle the display instead.

## AlertsData type constraints
- `severity` in alertLog: must be 'HIGH' | 'WARNING' | 'CRITICAL' (no 'INFO')
- `status` in alertLog: must be 'New' | 'Acknowledged' | 'Dismissed'
