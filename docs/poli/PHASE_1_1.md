# PoLi Phase 1.1 — Evidence-Gated Liquidity

## Status
**Normative**

## Purpose
Define the minimum conditions under which liquidity may be considered valid (`status = "ok"`).

## Evidence Ladder
(E0–E4 table)

## Acceptance Criteria
- Live executable depth required
- Fallback data is insufficient
- Status transitions are deterministic

## Pillar Scope
- DEPTH and RESILIENCE only
- No historical inference
- No smoothing or averaging

## Regulatory Rationale
This phase ensures that liquidity validity reflects *current execution reality*, not historical or inferred conditions.

## Contract Stability
No changes to PoLi v1.0.x schema.