---
name: TSLE Buffer Pipeline Gap
description: The background ingestion loop only populates DEPTH_CACHE; tsleBuffer needs explicit bridging for L5F analytics to work.
---

## Rule
`startIngestionLoop()` calls `ingestDepth()` which populates `DEPTH_CACHE` only. The L5F analytics endpoint (`/api/analytics/l5f/snapshot/:symbol`) reads from `tsleBuffer.getRawHistory()` — a completely separate store. Without bridging, L5F always returns "No buffer data".

**Why:** The LIS HTTP routes (`/api/lis/:venue/depth`) call `tsleBuffer.record()` on-demand, but no background process does this. The ingestion loop and the HTTP demand paths are decoupled.

**Fix applied:** Added `feedDepthToTsleBuffer()` in `analytics/engines/ingestionManager.ts`, called after each `ingestDepth()`. Reads `DEPTH_CACHE`, converts to LISSnapshot format, pushes to `tsleBuffer.record()`.

**How to apply:** If L5F endpoint returns "No buffer data for X. Feed may still be warming up." and the ingestion loop is running, check whether `feedDepthToTsleBuffer()` is being called in `runFullIngest()`.
