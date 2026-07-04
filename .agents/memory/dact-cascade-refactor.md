---
name: DACT Cascade Refactor
description: Architecture of the DACT → STRATA AI cleanse → tsleBuffer cascade; how the pre-existing ingest error was eliminated; relay routes still write tsleBuffer directly as a parallel path.
---

## Rule
DACT (dact-tape.ts) is the sole write target from ingestionManager. All downstream attestation layers (tsleBuffer → analytics-layer → PoMI → PoLi) receive data only via cleanseAndFeedBuffer() in dact-cleanse.ts.

## Architecture (post-refactor)
1. `feedDepthToDact()` — writes core-venue (Binance/Coinbase/Kraken/OKX) depth events to DACT tape only. No tsleBuffer call.
2. `cleanseAndFeedBuffer()` — called synchronously after feedDepthToDact(). Reads DACT events since lastCleanseSeq, applies two-category filter, feeds clean events to tsleBuffer.
3. `ingestRelayVenues()` — fire-and-forget. Polls relay HTTP endpoints; each endpoint appends to DACT tape. Their events are picked up by cleanseAndFeedBuffer() on the NEXT cycle.

## Parallel write paths (NOT changed — by design)
- `depthEngine.ts` still calls `tsleBuffer.record()` directly at line 281 (for core venue depth used in L5F).
- All relay routes (bybit-relay.ts, dydx-relay.ts, etc.) still call `tsleBuffer.record()` directly as a side effect of being polled.
- These parallel writes are the reason L5F analytics still work even before the cleansing stage warms up.

## The pre-existing "tsleBuffer is not defined" error
- Caused by a previous session partially removing the tsleBuffer import from ingestionManager.ts but leaving a code reference (exact location never confirmed — it was not in comments).
- Fixed by: completely replacing the import with `cleanseAndFeedBuffer` and rewriting `feedDepthToTsleBuffer` → `feedDepthToDact` with zero tsleBuffer references.
- Confirmed fixed: 0 occurrences of "Ingest error" in the log after the refactor.

## Cleansing statistics (live)
- Synthetic exclusions dominate (~98%): Uniswap, GMX, Curve, L2 DEX pools using DeFiLlama TVL fallback.
- Manipulation exclusions (~2%): BOOK_IMBALANCE (93% one-sided depth threshold) triggers on some synthetic venues.
- ~57% pass rate in warm operation (1,835 passed / 3,237 events processed).

## DACT payload enrichment
- ingestionManager v1.1 writes 15 band fields per DEPTH_UPDATE: depth_{10,25,50,100,200}bps + depth_bid/ask_* for all 5 bands.
- dact-cleanse.ts toSnapshot() reads these fields to build LISSnapshot for tsleBuffer.record().

## Why
The cascade guarantees no event reaches attestation layers (PoMI, PoLi) without first passing through the DACT hash chain and STRATA AI cleansing. Regulatory path: raw tape + exclusion log constitute the complete record.
