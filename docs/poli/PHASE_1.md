# PoLi — Phase 1 (TSLE-Gated Liquidity Assessment)

**Status:** Active  
**Contract Version:** PoLi v1.0.x  
**Last Updated:** 2026-01-08  

---

## 1. Purpose of Phase 1

Phase 1 establishes **PoLi (Proof of Liquidity)** as a *contract-first, execution-aware liquidity assessment layer* gated exclusively by **live TSLE evidence**.

This phase answers one question only:

> **“Is there sufficient, live, executable liquidity evidence to make a judgement?”**

It deliberately **does not** attempt to measure:
- market history
- participant integrity
- fragmentation dynamics
- persistence over time

Those belong to later phases.

---

## 2. Core Principle

> **PoLi never guesses.**

If live execution evidence is **not present**, PoLi returns:

```json
status = "insufficient"