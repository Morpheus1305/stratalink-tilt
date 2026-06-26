---
name: Multi-Venue TSLE Fix
description: How all 14 venues were wired into the TSLE buffer — two distinct bugs fixed.
---

## The Two Bugs

### Bug 1 — depthEngine dead loop (CEX venues: Binance, Coinbase, Kraken, OKX)
`ingestDepth()` had a `for (const vd of venueDepth)` loop that computed bands for each venue but **did nothing with them** — no tsleBuffer write, loop body ended at `canonSymbol` assignment. Fixed by completing the loop body: remap keys and call `tsleBuffer.record()` for each venue.

**Band key remap:**
- "10bps" → "pct_0.1", "25bps" → "pct_0.25", "50bps" → "pct_0.5", "100bps" → "pct_1.0", "200bps" → "pct_2.0"
- bidUSD/askUSD/totalUSD → bid_notional/ask_notional/total_notional

### Bug 2 — relay venue paths missing /api/ prefix
`ingestionManager.ingestRelayVenues()` was polling `/bybit/spot/depth` (no prefix). All relay routes are mounted under `/api/` (e.g., `app.use("/api/bybit", bybitRoutes)`). Calls without `/api/` hit Vite's SPA fallback (returned HTML 200, silently discarded). Fixed by adding `/api/` prefix to all relay venue paths.

## Result
- venue_count: 1 → 11
- l5f_fragmentation: 0.0 → ~68 (HHI now computed across 11 venues)
- Cross-Venue Depth Map: was Binance-only, now shows all active venues

## Side Note on DQ Score
After the fix, l5f_depth_quality dropped (from ~48 to ~10). GMX and Uniswap report large synthetic/pool-based depth (~72M and ~48M at 10bps) which dominates the DQ calculation. This is accurate — DEX AMM depth is lower quality — but the DQ factor weights may need tuning if the composite score seems too low.

**Why:**
- The `KNOWN_VENUES` array in analytics-layer.ts already listed all 14 venues; it just couldn't find data for relay venues because they weren't feeding tsleBuffer.
- `authCheck` in relay routes returns `true` when `RELAY_SECRET` env var is unset, so internal polls don't need special handling in dev.
