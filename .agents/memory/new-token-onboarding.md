---
name: New Token Onboarding — 5-Layer Checklist
description: Every layer that must be updated to make a new token go LIVE in the ILU pipeline.
---

When adding a new token (e.g., Phase 1 RWA expansion), changes are required in ALL of the following layers, or the token stays "OFF" in the UI:

## Layer 1 — L5F Snapshot Route Allowlist
**File**: `server/routes/analytics-l5f.ts`
**Change**: Add the symbol to `VALID_SYMBOLS` Set.
**Symptom if missing**: GET /api/analytics/l5f/snapshot/:symbol → HTTP 400 "Invalid symbol".

## Layer 2 — Ingestion Manager Symbol Lists
**File**: `analytics/engines/ingestionManager.ts`
**Change**: Add to `TRACKED_SYMBOLS` + the per-venue arrays (ILU_BYBIT_SYMBOLS, ILU_OKX_SYMBOLS, ILU_BITGET_SYMBOLS, ILU_UNISWAP_SYMBOLS). Only add to venue lists where the token is actually traded.
**Symptom if missing**: Token never gets ingested; buffer stays empty.

## Layer 3 — Relay SYMBOL_MAPs (CEX relays)
**Files**: `server/routes/bybit-relay.ts`, `server/routes/bitget-relay.ts`, `server/routes/okx-relay.ts`
**Change**: Add `SYMBOL: "SYMBOLUSDT"` to the respective `SYMBOL_MAP` or `INSTRUMENT_MAP`.
- Bybit also requires the symbol in `COINGECKO_IDS` for the geo-block synthetic fallback.
**Symptom if missing**: Relay returns HTTP 400 "Symbol not in registry" — ingestionManager logs HTTP 400 for that venue.

## Layer 4 — Uniswap Relay TOKEN_MAP
**File**: `server/routes/uniswap-relay.ts`
**Change**: Add `SYMBOL: { address: "0x...", decimals: N, coingeckoId: "..." }` to TOKEN_MAP.
- For institutional/RWA tokens with no real CG ID, use `coingeckoId: "usd-coin"` as proxy.
- Also add to `BASELINE_PRICE` (price in USD) and `SYNTHETIC_TVL` (conservative TVL estimate) so the three-tier synthetic fallback succeeds even when all APIs are rate-limited.
**Symptom if missing**: Uniswap relay returns HTTP 400 "Token not mapped" or HTTP 404 "No pool data from any source".

## Layer 5 — Frontend/Storage Layer
**Files**: `shared/ilu-universe.ts`, `client/src/components/ilu-token-selector.tsx`, `client/src/components/bottom-ticker.tsx`, `server/storage.ts`
**Change**: Add token to ILU universe category, add logo URL, add to bottom ticker category map, add to storage mock and live data.

## **Why**: Missing any one layer causes "OFF" status. The L5F allowlist (Layer 1) is the most surprising — it's a separate file from routes.ts and easy to overlook.

## **How to apply**: When onboarding tokens, work top-down through this checklist. The most common failure mode during the RWA expansion was the relay SYMBOL_MAP registries (Layer 3) and the Uniswap BASELINE_PRICE (Layer 4).
