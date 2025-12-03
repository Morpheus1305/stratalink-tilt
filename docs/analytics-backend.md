# STRATA Analytics Backend — Module 1

## Overview

This backend module provides real-time market structure analytics for the STRATA Institutional Liquidity Terminal. It includes multi-exchange price aggregation, orderbook depth analysis, funding rate monitoring, liquidation tracking, and a composite stress scoring engine.

## Architecture

```
analytics/
├── aggregator/
│   ├── config/
│   │   └── symbols.ts          # Token registry (Top 10 depth universe)
│   ├── exchanges/
│   │   ├── binance.ts          # Binance connector
│   │   ├── coinbase.ts         # Coinbase connector
│   │   ├── kraken.ts           # Kraken connector
│   │   ├── bybit.ts            # Bybit connector
│   │   └── okx.ts              # OKX connector
│   └── aggregator.ts           # Multi-exchange price aggregator
├── engines/
│   ├── depthEngine.ts          # Orderbook depth (10/25/50/100/200bps)
│   ├── fundingEngine.ts        # Perp funding rates
│   ├── liquidationEngine.ts    # Forced liquidations
│   ├── stressEngine.ts         # Composite stress scoring
│   └── ingestionManager.ts     # Background ingest loop
└── routes.ts                   # Express API endpoints
```

## Symbol Registry

**Depth Universe (Top 10):**
- BTC, ETH, SOL, XRP, ADA, AVAX, LINK, MATIC, DOT, NEAR

**Perp Symbols (Funding & Liquidations):**
- BTCUSDT, ETHUSDT, SOLUSDT

## Exchange Connectors

Each exchange connector provides:
- Price fetching with timeout handling
- Orderbook depth (where available)
- Funding rate data (for perps)
- Multi-source fallback

**Priority Order:** Coinbase → Kraken → OKX → Bybit → Binance

## Engines

### Depth Engine
Analyzes orderbook depth at multiple price bands:
- **10bps** - Tight spread liquidity
- **25bps** - Near-market depth
- **50bps** - Standard depth
- **100bps** - Extended depth
- **200bps** - Full market depth

Computes bid/ask USD totals and imbalance ratios.

### Funding Engine
Tracks perpetual funding rates:
- Current funding rate
- Annualized rate
- Open interest (where available)
- Funding regime classification

### Liquidation Engine
Monitors forced liquidations:
- Long/short liquidation totals
- Imbalance ratio
- Liquidation regime detection

### Stress Engine
Composite scoring based on:
- Funding inversions (15-20 pts)
- Liquidation cascades (10-20 pts)
- Thin depth (8-25 pts)
- Wide spreads (8-15 pts)

**Regimes:**
- LOW: 0-19
- MODERATE: 20-39
- HIGH: 40-59
- EXTREME: 60+

## API Endpoints

### Price APIs
- `GET /api/analytics/price?symbol=BTC` - Single aggregated price
- `GET /api/analytics/prices?symbols=BTC,ETH,SOL` - Multiple prices

### Depth APIs
- `GET /api/analytics/depth` - All depth data with summary
- `GET /api/analytics/depth?symbol=BTC` - Single token depth

### Funding APIs
- `GET /api/analytics/funding` - All funding data
- `GET /api/analytics/funding?symbol=BTC` - Single token funding

### Liquidation APIs
- `GET /api/analytics/liquidations` - All liquidation data
- `GET /api/analytics/liquidations?symbol=BTC` - Single token

### Stress APIs
- `GET /api/analytics/stress` - Stress score with drivers
- `GET /api/analytics/stress/full` - Full stress report with all data

### Summary API
- `GET /api/analytics/summary` - Market structure summary

### Status API
- `GET /api/analytics/status` - Ingestion status
- `POST /api/analytics/ingest` - Force immediate ingest

## Ingestion Loop

The backend runs a 5-second background ingestion loop that:
1. Fetches orderbook depth for Top 10 tokens
2. Updates funding rates for BTC, ETH, SOL perps
3. Tracks liquidation data
4. Recomputes stress scores

## Usage

All data consumers (UI, PoLi scoring, internal tools) should call the API endpoints rather than accessing engines directly. The ingestion loop ensures data freshness.

```typescript
// Example: Get full stress report
const response = await fetch('/api/analytics/stress/full');
const stress = await response.json();

console.log(`Stress Score: ${stress.stressScore}/100`);
console.log(`Regime: ${stress.regime}`);
console.log(`Commentary: ${stress.commentary}`);
```
