# TSLE v1.1 — Production Baseline (FROZEN)

Date: 2025-12-21  
Status: FROZEN

---

## Scope

- Venue: Binance (Spot)
- Ingestion: Canonical LIS v1.1
- Engine: TSLE v1.1
- Output: Proof-of-Liquidity (PoLi)

---

## Guarantees

TSLE v1.1 provides:

- Liquidity-native analysis (no price, no returns, no volatility)
- Deterministic PoLi scoring
- Stateful rolling buffer
- Venue-agnostic ingestion via LIS
- Auditable, log-based observability

---

## Explicit Non-Goals

TSLE v1.1 does **not**:

- Consume price signals
- Use volatility or OHLC data
- Perform forecasting
- Optimise trading strategies

---

## Change Policy

The following MUST NOT change without a version bump:

- PoLi scoring logic
- Depth band semantics
- Imbalance calculation
- TSLE buffer behaviour
- LIS schema v1.1

Any behavioural changes require a new version (v1.2+).

---

## Canonical Statement

> TSLE v1.1 is a liquidity-native, venue-agnostic, stateful engine that ingests canonical LIS snapshots and produces deterministic Proof-of-Liquidity (PoLi) scores over time.
