# PoLi Oracle — Design Decisions Record

This document records decisions made during the Oracle Adapter build that are non-obvious and need to survive handover. Each entry states the decision, the reasoning, and where the decision lives in code.

---

## Decision 1: Staleness policy — attest with fresh score, always

**Decision:** An `AttestationRequest` outstanding for any duration (including hours) is processed with a fresh score at the time of processing. There is no staleness guard.

**Reasoning:**
- STRATA has no historical scoring capability. The TSLE buffer is a 60-minute rolling in-memory window. The Oracle cannot answer "what was BTC liquidity like at 14:00 when the request was created" — it can only answer "what is BTC liquidity like right now."
- A staleness guard would be the Oracle refusing to answer a question it can answer, in service of one nobody can answer, and would substitute Oracle judgment for consumer judgment on a threshold the consumer owns.
- The `computed_at_utc` field in the attestation records exactly when the score was produced. The `attestation TTL` bounds forward validity. A downstream consumer or regulator can observe any processing lag from those two fields.
- The Canton contract has no `stale` status code and adding one was explicitly ruled out.

**Where it lives:** `server/services/analytics-layer.ts` — `computeAnalyticsSnapshot()` always computes against the current buffer state.

**Confirmed in:** PoLi Oracle Build Action Plan v13 July 2026, Phase 3 item 03 notes.

---

## Decision 2: Three outcomes only — ATTEST, REJECT, PARK

**Decision:** The adapter has exactly three outcomes. The distinction is doctrine, not implementation.

| Outcome | When | Canton effect |
|---|---|---|
| **ATTEST** | Oracle can form a view and can honestly record how. Includes `Insufficient_data` (None rating) — data sparsity is a fact about the market. | `PoLiAttestation` written and signed |
| **REJECT** | Oracle cannot form a view at all. Coverage failure is Stratalink's problem, not the market's. | `RejectedAttestationRequest` written with coded reason |
| **PARK** | Oracle can form a view but cannot honestly record how. Currently: the 8 RWA symbols covered only by synthetic venues. | Nothing written on-ledger. Recorded in `data/parked.json` |

**Critical:** A rejection is a statement about Stratalink, not about the market. A wrong rejection is not recoverable on-ledger. A parked request is recoverable once `observationType` is added to the contract (PoLi-CR-01).

**Where it lives:** Oracle Adapter `src/adapter.ts` (standalone, `~/poli-oracle/oracle-adapter`).

---

## Decision 3: Polling over streaming

**Decision:** Use active-contracts polling rather than transaction-tree streaming.

**Reasoning:** Polling mirrors the Bruno collection exactly, so any discrepancy is attributable to the adapter rather than to a difference in detection mechanism. The streaming upgrade replaces only the detection layer and can be made later without touching the processing path.

**Known issue:** The active-contracts endpoint paginates. `fetchActiveRequests` must drain every page. A partial drain is a correctness failure, not a performance one.

---

## Decision 4: No in-flight state, no dead-letter box

**Decision:** The in-flight set and failed set have been removed. The adapter reconstructs its state from the ledger on every cycle.

**Reasoning:** The ledger enforces single-processing. `ProcessRequest` archives the request contract. A second attempt returns `CONTRACT_NOT_FOUND` (errorCategory 11). This means:
- Duplicate attestation is not possible regardless of adapter memory state.
- `CONTRACT_NOT_FOUND` is always a **reconcile signal**, never a retry signal, never a shrug.

**The one exception:** `data/parked.json` is the only persisted state. It records requests the Oracle deliberately did not answer, and why. If this file is lost, the parked requests remain active on the ledger with no record of why they were not answered. Back it up.

---

## Decision 5: `range` field semantics

**Decision:** The `range` field carries `stability_score` scaled 0–10, derived from the variance of `stability_score` across contributing venue_slices. It is not a confidence interval.

**Background:** The stub sends `range: "2"` on every attestation. This was unknown at time of build. Every attestation issued with the stub value carries an incorrect value in a signed, evidentiary field.

**Correct computation:**
```typescript
const stabilities = aggregate.venue_slices.map(v => v.stability_score);
const mean = stabilities.reduce((a, b) => a + b, 0) / stabilities.length;
const variance = stabilities.reduce((a, b) => a + (b - mean) ** 2, 0) / stabilities.length;
const range = Math.round(Math.sqrt(variance) / 10).toString(); // 0–10
```

**Status:** BLOCKED on PoLi-CR-01 v2.3. Do not implement until contract change is accepted.

---

## Decision 6: No consumer registration in the adapter

**Decision:** Consumer registration (Auth-Consumer, RequestAttestation) is descoped from the Oracle Adapter.

**Reasoning:** The Oracle Adapter is the OPERATOR, not the consumer. Consumer registration is a test harness for producing `AttestationRequest` contracts to process. Bruno already does that job. If consumer onboarding is a product capability, it belongs in the RCL or TILT UI, not in the Oracle Adapter.

---

## Decision 7: L5F endpoint, not PoLi engine

**Decision:** The Oracle Adapter must call `GET /api/analytics/l5f/snapshot/:symbol`, not `/api/poli/dact/snapshot`.

**Reasoning:** `poliEngine.ts`'s event source (`consumeDACTEvents()`) was stripped in a codebase cleanup. It always returns an empty event list and therefore always produces zero scores. The L5F endpoint is the live, data-fed scoring system. The PoLi routes at `/api/poli/dact/*` are structurally intact but effectively dead.

**Where it lives:** `server/routes/analytics-l5f.ts`, `server/services/analytics-layer.ts`.

---

## Open design questions (as of 14 July 2026)

| Question | Status |
|---|---|
| What happens when `venue_count` is 1 or 2? Treat as ATTEST with Insufficient_data, or PARK? | Unresolved — current code attests anything with a non-503 response |
| Should processing lag be included in the signed payload? | Unresolved — needs PoLi-CR-01 resolution first |
| What is the minimum `venue_count` for a credible attestation? | Not yet defined. Recommend ≥3 as a threshold for ATTEST vs PARK. |
| Should synthetic-only venue sets force PARK rather than ATTEST? | Partially resolved — the 8 RWA symbols are currently PARKED. The rule is not yet generalised. |
