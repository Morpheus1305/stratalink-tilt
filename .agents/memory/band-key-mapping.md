---
name: Band Key Mapping DepthEngine to LISSnapshot
description: The depthEngine and tsleBuffer use different band key formats and field names that must be translated when bridging the two systems.
---

## Rule
When converting `TokenDepth` (from depthEngine) to `LISSnapshot` (for tsleBuffer), apply these mappings:

**Band keys:**
- `"10bps"` → `"pct_0.1"`
- `"25bps"` → `"pct_0.25"`
- `"50bps"` → `"pct_0.5"`
- `"100bps"` → `"pct_1.0"`
- `"200bps"` → `"pct_2.0"`

**Field names:**
- `bidUSD` → `bid_notional`
- `askUSD` → `ask_notional`
- `totalUSD` → `total_notional`

**Other fields:**
- `depth.mid` → `mid_price`
- `depth.spread` / `depth.spreadBps` → `spread.absolute` / `spread.bps`
- `depth.source` → `venue`
- `depth.ts` → `timestamp`

**Why:** The analytics-layer uses `getBand(snap, 'pct_0.1')` and `snap.spread?.bps`, while depthEngine stores data in a different schema. These conventions must be preserved — any mismatch silently produces zero values in L5F scores.
