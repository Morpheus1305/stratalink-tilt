# StrataLink Labs — Institutional Liquidity Terminal (TILT)

**TILT** is an institutional-grade digital asset liquidity intelligence platform built on the Digital Asset Consolidated Tape (DACT). It provides real-time multi-venue liquidity scoring, anomaly detection, and cryptographically attested Proof of Liquidity (PoLi) via the Canton Network.

> **Current state — 14 July 2026.** 26/26 venues live, 34 symbols tracked, DACT INTACT. The PoLi Oracle Adapter (standalone, at `~/poli-oracle/oracle-adapter`) is at Phase 3 CLOSED with 24/24 verification tests passing on sandbox. Phase 2 item 05 (STRATA scoring integration) is BLOCKED pending PoLi-CR-01 v2.3 (contract field change request to IntellectEU).

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Oracle Adapter Integration](#oracle-adapter-integration) ← **start here if you are building the adapter**
3. [L5F Scoring API Reference](#l5f-scoring-api-reference)
4. [DACT Coverage — Venues & Symbols](#dact-coverage)
5. [Scoring Methodology](#scoring-methodology)
6. [Running Locally](#running-locally)
7. [Environment Variables](#environment-variables)
8. [Known Gaps & Open Items](#known-gaps--open-items)

---

## Architecture Overview

```
Live Exchange APIs (26 venues)
        │
        ▼
┌───────────────────────────────┐
│   Relay Routes (per venue)    │  /api/bybit/*, /api/okx/*, /api/hyperliquid/*, …
│   AbortSignal.timeout(10s)    │
└───────────────┬───────────────┘
                │  LISSnapshot (normalised orderbook)
                ▼
┌───────────────────────────────┐
│   DACT — Digital Asset        │  SHA-256 hash chain, ring buffer (2048 events)
│   Consolidated Tape  v0.1     │  Cryptographic provenance on every event
│   /api/dact/tape              │  /api/dact/stats  /api/dact/verify
└───────────────┬───────────────┘
                │  writes LISSnapshots
                ▼
┌───────────────────────────────┐
│   TSLE Buffer                 │  360-entry ring per venue×symbol (~60 min)
│   In-memory, no persistence   │  tsleBuffer.getRawHistory(venue, symbol)
└───────────────┬───────────────┘
                │  reads history
                ▼
┌───────────────────────────────┐
│   Analytics Layer — L5F       │  Five-factor composite score, 0–100
│   /api/analytics/l5f/         │  4-second response cache
│   snapshot/:symbol            │  venue_slices with per-venue provenance
└───────────────┬───────────────┘
                │  scored attestation
                ▼
┌───────────────────────────────┐
│   PoLi Oracle Adapter         │  Standalone TypeScript service (Mac mini)
│   ~/poli-oracle/oracle-adapter│  Polls Canton ledger, signs, attests
└───────────────┬───────────────┘
                │  signed PoLiAttestation
                ▼
┌───────────────────────────────┐
│   Canton Network              │  DevNet (live) → MainNet (pending DEF-01)
│   Daml contracts (IEU)        │  Immutable on-ledger attestation record
└───────────────────────────────┘
```

### Key design principles

- **DACT is the sole write target from ingestion.** `cleanseAndFeedBuffer()` is the only path into the TSLE buffer. No component writes to the buffer directly.
- **Binance Authenticity Rule.** Accept Binance data only when `venue === "binance" AND payload.provenance.sourceVenue === "binance" AND payload.provenance.transport === "relay"`. Enforced in tape.ts, depth.ts, lis.ts, cexOrderbooks.ts.
- **Staleness policy.** A request outstanding for any duration is attested with a fresh score. STRATA has no historical scoring capability (60-minute rolling buffer). A staleness guard would substitute Oracle judgment for consumer judgment on a threshold the consumer owns.
- **Three Oracle outcomes only: ATTEST, REJECT, PARK.** See [Oracle Adapter Integration](#oracle-adapter-integration) for the doctrine.

---

## Oracle Adapter Integration

> **This section is the integration contract between the standalone PoLi Oracle Adapter and TILT/STRATA.** It answers the questions a builder needs before replacing the stub scorer with live data.

### The scoring endpoint

```
GET /api/analytics/l5f/snapshot/:symbol
```

**Base URL (deployed):** `https://stratalink-tilt.replit.app`  
**Base URL (dev, internal):** `http://localhost:5000`  
**Auth:** none  
**Response cache TTL:** 4 seconds  
**Cold computation latency:** 5–50ms (pure in-memory, no I/O)  
**Insufficient data:** HTTP 503 `{ "ok": false, "error": "No buffer data for SYMBOL. Feed may still be warming up." }`

**Accepted symbols (34):**
`BTC ETH USDT USDC DAI BNB CRO OKB UNI CAKE LINK AAVE MKR SNX COMP SOL XRP DOGE ADA AVAX USDE HYPE TON PAXG XAUT ONDO BUIDL OUSG BENJI VBILL USDY BCSPX BIB01 ACRED`

### Example response

```json
{
  "ok": true,
  "cached": true,
  "aggregate": {
    "symbol": "BTC",
    "computed_at_utc": 1783812241330,
    "venue_count": 19,
    "total_depth_10bps": 195736686,
    "total_depth_25bps": 414819959,
    "regulated_depth_share": 0.055,
    "offshore_depth_share": 0.945,
    "fragmentation_index": 0.19,
    "spread_dispersion_bps": 13.07,
    "vol_regime": "NORMAL",
    "depth_decay_rate": 18.9,
    "withdrawal_velocity": 0,
    "spread_elasticity": 1.27,
    "l5f_depth_quality": 8.8,
    "l5f_resilience": 89.4,
    "l5f_fragmentation": 81.0,
    "l5f_exec_integrity": 20.4,
    "l5f_regime_stability": 100.0,
    "l5f_composite": 42.4,
    "venue_slices": [
      {
        "venue_id": "binance",
        "depth_10bps": 45000000,
        "depth_share_pct": 23.0,
        "spread_bps": 0.5,
        "stability_score": 94.1,
        "is_regulated": false,
        "weight_class": "HIGH",
        "exec_integrity_score": 96.0,
        "price_leadership_score": 0.28,
        "poli_score": 95.2
      }
    ]
  }
}
```

### Five-factor → four-field mapping

The STRATA L5F model produces five factors. The Canton contract carries four fields. The canonical mapping is:

| Contract field | STRATA source | Notes |
|---|---|---|
| `poLiScore` | `l5f_composite` | Weighted composite: 30% DQ + 20% R + 20% EI + 15% F + 15% RS |
| `depthScore` | `l5f_resilience` | Depth decay rate and spread widening velocity |
| `spreadScore` | `l5f_exec_integrity` | Cross-venue spread dispersion and mean spread level |
| `balanceScore` | `l5f_fragmentation` | Inverted HHI — higher = less concentrated |

Data Quality (30%) and Regime Stability (15%), together 45% of the composite, are embedded in `poLiScore` but have no independent contract field. This is the subject of **PoLi-CR-01 v2.3** — do not build the scoring integration until that change request is accepted by IntellectEU.

### The `range` field

The `range` field on the Canton contract carries **`stability_score` scaled 0–10**, derived from the composite's own variance across the contributing venue_slices. This is not a confidence interval and not a precision indicator. The stub sends `range: "2"` on every attestation — this is wrong. The correct value is:

```typescript
// Compute range from venue_slices stability variance
const stabilities = aggregate.venue_slices.map(v => v.stability_score);
const mean = stabilities.reduce((a, b) => a + b, 0) / stabilities.length;
const variance = stabilities.reduce((a, b) => a + (b - mean) ** 2, 0) / stabilities.length;
const range = Math.round(Math.sqrt(variance) / 10).toString(); // 0–10 scale
```

Every attestation issued with the stub `range: "2"` carries an incorrect value in a signed, evidentiary field.

### Venue set (provenance)

The `venue_slices` array provides the venue set for the attestation. Extract it as:

```typescript
const venueSet = aggregate.venue_slices.map(v => v.venue_id);
// e.g. ["binance","coinbase","kraken","okx","bybit","hyperliquid","dydx","uniswap","gmx",...]
```

Observed (live API) and synthetic (TVL-anchored) venues are blended in a single score. The `is_regulated` field distinguishes regulated venues. There is currently no `is_synthetic` flag on individual slices — this is tracked under **PoLi-CR-01 v2.3**.

### "I cannot score this" — 503 handling

Map HTTP 503 to the `Insufficient_data` Canton status (produces a `None` rating). Conditions:
- Server cold start (first ~20 seconds after restart)
- Symbol not in any venue's ingest config
- All relay fetches for the symbol have failed and the buffer has aged out (~60 min)

If `venue_count` is 1–2 (rather than the normal 15–20), the score is technically valid but based on minimal data — consider whether to treat as low-confidence.

### Model version

The current scoring model is version `0.1.0`. It is **not included in the `/snapshot` response** — only available from `GET /api/analytics/l5f/health`. This is **Design Gap #3**: attestations do not record which model version produced them. Include it as an additional field in the signed payload pending PoLi-CR-01 resolution.

```
GET /api/analytics/l5f/health
→ { "version": "0.1.0", "supportedSymbols": [...], "cachedSymbols": [...] }
```

### Processing lag (staleness)

Include `request_created_at` and `processing_lag_ms` in the attestation payload if the Canton contract allows additional fields. This lets downstream consumers and regulators observe processing delay without the Oracle encoding a staleness policy. See the staleness policy decision in `docs/oracle-decisions.md`.

---

## L5F Scoring API Reference

### `GET /api/analytics/l5f/snapshot/:symbol`

Returns the full five-factor composite for a symbol. See [Oracle Adapter Integration](#oracle-adapter-integration) for the response shape.

### `GET /api/analytics/l5f/health`

```json
{
  "ok": true,
  "service": "Stratalink Analytics Layer — L5F",
  "version": "0.1.0",
  "timestamp": 1783812000000,
  "cachedSymbols": ["BTC", "ETH"],
  "supportedSymbols": ["BTC", "ETH", "USDT", ...]
}
```

### `GET /api/analytics/l5f/session-comparison/:symbol`

Compares current session metrics against oldest available window. Returns `{ hasData: false }` until 10 data points exist. Useful for "yesterday vs today" panel data.

---

## DACT Coverage

### Live status

```
GET /api/dact/stats
```

Returns: `venuesIngesting`, `totalVenues`, `tapeDepth`, `tapeIntegrity`, `chainVerified`, `eventsPerSec`, `symbolCoverageActive`.

Current nominal state: **26/26 venues, INTACT, ~42 events/sec**.

### Venues — 26 total

**CEX / Perps — Live API (10 observed venues)**

| Venue | Market | Notes |
|---|---|---|
| Binance | Spot | Authenticity rule enforced (transport: relay) |
| Coinbase | Spot | Regulated |
| Kraken | Spot | Regulated |
| Bybit | Spot | Falls back to synthetic on geo-block |
| Bitget | Spot | — |
| OKX | Spot | — |
| dYdX v4 | Perps | Cosmos CLOB indexer |
| Hyperliquid | Perps | L2 book |
| GMX v2 | Perps | Oracle-priced, synthetic depth, Arbitrum |
| Deribit | Spot | BTC, ETH only |

**DEX / L2 — TVL-anchored synthetic (10 venues)**

Uniswap v3 (Ethereum), Curve, OTC/RFQ, Aerodrome (Base), Velodrome (Optimism), PancakeSwap (BSC), Uniswap Worldchain, SyncSwap (zkSync), Linea DEX, Scroll DEX.

**RWA / Security Token Exchanges — Synthetic (6 venues)**

Securitize, Archax, ADDX, INX, tZERO, SDX — covering BUIDL, OUSG, BENJI, VBILL, BCSPX, BIB01, ACRED, USDY, ONDO.

### Symbols — 34 total

| Class | Symbols |
|---|---|
| L1 Majors | BTC ETH SOL XRP BNB ADA AVAX DOGE |
| DeFi | LINK UNI AAVE MKR SNX COMP CAKE |
| Exchange tokens | OKB CRO HYPE |
| Stablecoins | USDT USDC DAI USDE USDY |
| Precious metal tokens | PAXG XAUT |
| Alt L1 / misc | TON ONDO |
| Tokenized securities / RWA | BUIDL OUSG BENJI VBILL BCSPX BIB01 ACRED |

### Known coverage gaps

- **TON, CRO, USDe relay mappings** — tracked in TRACKED_SYMBOLS but some exchange instrument ID mappings are missing (OKX returns 500)
- **Canton Network** — relay wired but requires `CANTON_LEDGER_URL` (partner onboarding not complete), contributes zero tape events today
- **L2 DEX symbol breadth** — intentionally narrow (3–5 symbols) to limit DeFiLlama fetch load; can be widened since the shared cache was added
- **GMX** — synthetic oracle pricing, no observed depth

---

## Scoring Methodology

### L5F Five-Factor Composite

`l5f_composite = 0.30×DQ + 0.20×R + 0.15×F + 0.20×EI + 0.15×RS`

All factors are 0–100. Composite is 0–100, rounded to 1 decimal place.

#### DQ — Depth Quality (weight 0.30)

Weighted sum of `(d10bps × 0.65 + d25bps × 0.35) × regulated_premium × venue_weight` across all active venues, normalised against the session peak depth. Regulated venues receive a **1.25× depth multiplier**. Venue weights are hardcoded by venue (Binance 0.28, Coinbase 0.18, Kraken 0.14, …, L2s 0.01–0.02).

Point-in-time: reads the latest snapshot per venue only.

#### R — Resilience (weight 0.20)

`R = 0.60 × R_decay + 0.40 × R_velocity`

- `R_decay`: measures depth loss rate per minute. Full penalty (R_decay=0) at 25%/min decay rate.
- `R_velocity`: measures spread widening rate. Full penalty at 50bps/hr widening.

Requires ≥3 snapshots per venue with ≥15s time span. **Defaults to 80 (normalised) while warming up** — the first 30–60 seconds after restart show an inflated R score.

#### F — Fragmentation (weight 0.15)

HHI of depth shares: `F_score = (1 − HHI) × 100`. Input to composite is inverted: `l5f_f_input = 100 − F_score`. A +5 bonus applies when regulated venues hold >40% of depth. More fragmentation = better (less concentration risk).

#### EI — Execution Integrity (weight 0.20)

`EI = 0.60 × EI_dispersion + 0.40 × EI_level`

- `EI_dispersion`: penalises cross-venue spread standard deviation (full penalty at σ=5bps).
- `EI_level`: penalises mean spread above 1bps (full penalty at 20bps).

#### RS — Regime Stability (weight 0.15)

Per-venue state machine: `STABLE=100, THINNING=60, FRAGILE=20, DISLOCATED=0`. Adjusted by:
- +15 max duration bonus (sustained state)
- −15 max transition penalty (frequent state flips)
- −10 pending state penalty

The composite RS is the mean across all active venues. Worst-case venue drives the `vol_regime` label: `NORMAL / ELEVATED / STRESS`.

### PoLi Rating Bands

Derived from `l5f_composite`:

| Score | Rating |
|---|---|
| ≥ 90 | AAA |
| ≥ 80 | AA |
| ≥ 70 | A |
| ≥ 60 | BBB |
| ≥ 40 | BB |
| ≥ 25 | B |
| ≥ 10 | CCC |
| < 10 | D |

`isReal = score >= 50`

---

## Running Locally

```bash
npm install
npm run dev
```

The dev server starts at `http://localhost:5000`. Frontend and backend share the same port (Vite proxy). The ingestion loop starts automatically and reaches 26/26 venues within ~20 seconds.

### Warm-up behaviour

- **0–10s:** Buffer empty. `/api/analytics/l5f/snapshot/:symbol` returns HTTP 503.
- **10–30s:** First ingest cycle complete. Scores appear but R (Resilience) uses default 80 — real resilience needs ≥3 snapshots.
- **3–5 min:** R and RS reflect real observed values.

### DeFiLlama shared cache

All 7 L2 DEX relay routes share a single 60-second cache for DeFiLlama pool data (`server/services/defillama-cache.ts`). On cold start the first DeFiLlama call takes up to 8 seconds; subsequent calls within 60 seconds are instant.

---

## Environment Variables

| Variable | Required | Notes |
|---|---|---|
| `RELAY_SECRET` | Yes | Auth header for internal relay routes (`x-relay-secret`) |
| `GRAPH_API_KEY` | No | The Graph subgraph API key (Uniswap pool data). DeFiLlama is used when absent. |
| `OTC_RFQ_URL` | No | OTC/RFQ desk endpoint. Falls back to synthetic depth when unset. |
| `CANTON_LEDGER_URL` | No | Canton Network ledger URL. Canton venue inactive until set. |
| `DATABASE_URL` | No | PostgreSQL for alert rules persistence. Uses in-memory storage when absent. |
| `RESEND_API_KEY` | No | Email delivery for alert notifications. |

---

## Known Gaps & Open Items

### Blocking (PoLi Oracle)

| Item | Status | Notes |
|---|---|---|
| **PoLi-CR-01 v2.3** | Awaiting IEU | Four-field change request: add `observationType`, `modelVersion`, observed/synthetic split, and correct `range` semantics. Do not build Phase 2 item 05 until accepted. |
| **PoLi-DEF-01 Finding 1** | Open | Key rotation destroys attestation verifiability. MainNet blocked until resolved. |
| **DevNet Keycloak token lifecycle** | Not yet run | Adapter holds single token; no refresh logic. Will die at token TTL. Deliver DEV-17 before unattended DevNet run. |
| **`range` field** | Incorrect in all issued attestations | Stub sends `"2"` on every attestation. See `range` section above. |

### Architecture gaps

| Item | Notes |
|---|---|
| **TSLE buffer not persisted** | In-memory only. Score inputs are unrecoverable after ~60 min. Store the full `aggregate` response alongside each attestation for audit trail. |
| **Model version not in `/snapshot` response** | Version `0.1.0` is hardcoded but not surfaced per-response. Attestations do not record which model produced them. |
| **No monitoring** | Poller cycle health, parked backlog depth, attestation rate, signature failure rate — none are instrumented. |
| **`poliEngine.ts` event source stubbed** | `consumeDACTEvents()` always returns empty. Per-venue PoLi snapshots at `/api/poli/dact/*` produce all-zero scores. Use L5F endpoint instead. |

---

## Repository structure

```
analytics/engines/          Ingestion loop and L5F analytics
server/routes/              Express API routes (40 relay + scoring endpoints)
server/services/            DACT tape, TSLE buffer, analytics layer, PoLi engine
server/lib/scoring/         TSLE score computation (single-venue)
shared/                     Shared types: liquidity-truth, schema
client/src/                 React/Vite frontend — Bloomberg-style terminal
  pages/                    Dashboard, HistoricalTrends, PortfolioRisk, Alerts,
                            TokenScorecard, Identity, LiquidityTape, TILT, CCP
docs/                       Extended documentation
```

---

## Contacts & external dependencies

| System | Owner | Notes |
|---|---|---|
| Canton validator node | IntellectEU (Catalyst) | Catalyst Blockchain Manager. Do not modify Daml contracts. |
| PoLi Daml contracts | IntellectEU → Stratalink on full payment | IP assigns under SOW #USGTC 20260010 Amendment A1. |
| Oracle Adapter | Stratalink | TypeScript/Node.js, standalone at `~/poli-oracle/oracle-adapter` |
| DevNet credentials | Rob McDermott | Keycloak realm: catalyst-canton-nonprod, client_id: stratalink-devnet |

---

*TILT v0.1 — StrataLink Labs Ltd, 71-75 Shelton Street, London WC2H 9JQ*
