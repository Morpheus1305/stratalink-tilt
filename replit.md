# StrataLink Labs - Institutional Liquidity Terminal

## Overview
StrataLink Labs' Institutional Liquidity Terminal is a Web3 liquidity risk intelligence dashboard, inspired by the Bloomberg Terminal. Its core purpose is to deliver real-time digital asset analytics to regulators, exchanges, protocols, and institutional risk managers. The project aims to provide a production-ready MVP with an institutional-grade UI, leveraging both live and mock data for comprehensive analysis. Key capabilities include real-time market metrics, historical trend analysis, portfolio risk assessment, real-time alerts, and a detailed token scorecard.

## User Preferences
- **Dark Mode Default**: Application loads in dark mode
- **Auto-refresh**: Dashboard data refreshes every 10 seconds, charts every 30 seconds
- **Monospace for Data**: All numerical values use monospace fonts for alignment
- **Bloomberg Aesthetic**: Professional, information-dense financial interface

## System Architecture

### Frontend
The frontend is built with React, TypeScript, and Vite, using Wouter for routing and TanStack Query v5 for state management. UI components are styled with Shadcn UI and Tailwind CSS, and data visualization is handled by Recharts.

**Key Pages & Features**:
-   **Landing Page (`/`)**: Displays live market metrics.
-   **Main Dashboard (`/platform`)**: Offers an overview with PoLi Score, Market Depth, Bid-Ask Spread, Volatility, and CEX/DEX Ratio. Includes a sticky header, platform tabs, a fixed `DateTimeBar`, and an auto-scrolling `BottomTicker`.
-   **Historical Trends (`/platform/trends`)**: Displays trends for PoLi Score, Market Depth, and Volatility across various timeframes.
-   **Portfolio Risk Assessment (`/platform/portfolio`)**: Enables multi-token comparison, portfolio PoLi scoring, and multi-dimensional analysis.
-   **Alerts & Stress Signals (`/platform/alerts`)**: Provides real-time risk indicators, an alert timeline, and a detailed log.
-   **Token Scorecard (`/platform/scorecard`)**: A tabbed interface presenting Tokenomics (13 metrics) and Liquidity (42 metrics), along with industry benchmarks.
-   **Dynamic Token Selection**: Implemented across Overview and Trends pages using CoinMarketCap's Top 20 tokens, with shared state persistence across navigation. The Hero page consistently displays BTC data independently. PoLi liquidity quality ratings (AAA through D) are displayed alongside all PoLi scores throughout the platform.

### Identity Module (Arkham Integration)
The Identity module provides on-chain identity intelligence powered by Arkham API integration. All Identity routes are protected by authentication (RequireAuth wrapper).

**Identity Pages** (accessible via IDENTITY navigation button in header):
-   **Identity Landing (`/identity`)**: Overview with key metrics (Entities Monitored, High Risk Entities, Sanctioned Addresses, Compliance Score), module navigation cards, entity table, and recent alerts section.
-   **Liquidity Fragmentation (`/identity/liquidity-fragmentation`)**: CEX/DEX distribution analysis with token selector, fragmentation metrics, and venue distribution charts.
-   **MM Integrity (`/identity/mm-integrity`)**: Market maker integrity scoring with risk assessments for wash trading, spoofing, and layering.
-   **PoLi+ (`/identity/poli-plus`)**: Enhanced PoLi metrics combining Arkham intelligence with liquidity analysis (Entity-Weighted Depth, MM Coverage, Wash Trade Adjusted Volume, Counterparty Risk Score).
-   **Identity Alerts (`/identity/identity-alerts`)**: Real-time identity-based alerts with severity filtering (CRITICAL, HIGH, MEDIUM, LOW) and detailed transaction data.
-   **Reg Surveillance (`/identity/reg-surveillance`)**: Regulatory compliance monitoring with jurisdiction coverage, compliance violations tracking, and investigation status.

**Identity Components**:
-   `IdentityMetricCard`: Reusable metric display component with icon, value, label, and optional trend indicator.
-   `IdentityEntityTable`: Entity attribution table with risk scores and labels.
-   `IdentityChart`: Wrapper for Recharts with consistent Identity module styling.
-   `IdentityTabs`: Navigation tabs for switching between Identity pages.

**Identity API Endpoints** (all return mock data with Arkham API fallback):
-   `GET /api/identity/entity/:entity` - Entity attribution data
-   `GET /api/identity/fragmentation/:token` - Liquidity fragmentation analysis
-   `GET /api/identity/mm-integrity` - Market maker integrity scores
-   `GET /api/identity/poli-plus` - Enhanced PoLi metrics
-   `GET /api/identity/alerts` - Identity-based alerts
-   `GET /api/identity/surveillance` - Regulatory surveillance snapshot

**Design System**:
-   **Colors**: Bloomberg-inspired dark theme (`#0a0a0a` background) with primary yellow (`#F5C211`), accent cyan (`#00D9FF`), success green (`#4ade80`), and destructive red (`#ef4444`).
-   **Typography**: Inter (sans-serif) for general text, and a monospace font (Roboto Mono / IBM Plex Mono) for numerical data.
-   **Layout**: Emphasizes information density, uses a grid-first approach, is fully responsive (mobile-first), and features edge-to-edge full-width panels.

### Backend
The backend uses Express.js with in-memory storage (MemStorage). It provides API endpoints for all dashboard data, historical trends, portfolio risk, alerts, token scorecard metrics, and a dedicated endpoint for Top 20 tokens. All data endpoints support an `asset` query parameter for token-specific data, defaulting to BTC.

**Asset-Specific Data Generation**:
All Overview page metrics are dynamically generated based on the selected token using asset-specific multipliers:
- **BTC**: 1.0x baseline (depth ~$42M, PoLi ~72/100)
- **ETH**: 0.65x (depth ~$27M, PoLi ~67/100)
- **SOL**: 0.35x (depth ~$15M, PoLi ~62/100)

Six storage methods generate asset-specific data: `generateLiquidityScore()`, `generateStressSignals()`, `generateKeyMetrics()`, `generateExchangeData()`, `generateCexDexDistribution()`, and `generateLiveMetrics()`. Live API data fetching is disabled (`useLiveData = false`) to ensure consistent, deterministic mock data generation across all tokens.

### Authentication
The system incorporates a mandatory 2FA authentication flow with a fixed OTP code for demonstration purposes. Sessions automatically reset after 5 minutes of inactivity on platform pages.

### Shared
Zod schemas are used for defining type-safe data structures across the application.

## External Dependencies
-   **CoinGecko API**: Live cryptocurrency pricing (BTC, ETH, SOL).
-   **Binance API**: Real-time order book depth.
-   **CoinMarketCap API**: Fetching top 20 cryptocurrency rankings.
-   **Resend**: Email delivery service for OTPs.
-   **Recharts**: Frontend financial data visualization.
-   **Lucide React**: Icon system.
-   **Shadcn UI**: Accessible UI component library.
-   **Tailwind CSS**: Utility-first CSS framework.
-   **Node.js 20**: Runtime environment.
-   **TypeScript**: Programming language.
-   **Vite**: Frontend tooling.
-   **Wouter**: Frontend routing.
-   **TanStack Query v5**: Frontend state management.
-   **Express.js**: Backend web framework.

## STRATA Analytics Backend

The STRATA Analytics Backend provides real-time market structure analytics for the Institutional Liquidity Terminal.

**Location**: `analytics/`

**Architecture**:
```
analytics/
├── aggregator/
│   ├── config/symbols.ts      # Token registry (Top 10 depth universe)
│   ├── exchanges/             # Exchange connectors (Binance, Coinbase, Kraken, Bybit, OKX)
│   └── aggregator.ts          # Multi-exchange price aggregator
├── engines/
│   ├── depthEngine.ts         # Orderbook depth (10/25/50/100/200bps bands)
│   ├── fundingEngine.ts       # Perp funding rates
│   ├── liquidationEngine.ts   # Forced liquidations
│   ├── stressEngine.ts        # Composite stress scoring
│   └── ingestionManager.ts    # 5-second background ingest loop
└── routes.ts                  # Express API endpoints
```

**Depth Universe (Top 10)**: BTC, ETH, SOL, XRP, ADA, AVAX, LINK, MATIC, DOT, NEAR

**Exchange Connectors** (priority order): Coinbase → Kraken → OKX → Bybit → Binance

**API Endpoints**:
- `GET /api/analytics/price?symbol=BTC` - Aggregated price from multiple exchanges
- `GET /api/analytics/prices?symbols=BTC,ETH,SOL` - Multiple prices
- `GET /api/analytics/depth?symbol=BTC` - Orderbook depth at 10/25/50/100/200bps
- `GET /api/analytics/funding` - Perp funding rates
- `GET /api/analytics/liquidations` - Forced liquidation data
- `GET /api/analytics/stress` - Stress score with drivers and commentary
- `GET /api/analytics/stress/full` - Full stress report with all data
- `GET /api/analytics/summary` - Market structure summary
- `GET /api/analytics/status` - Ingestion status

**Stress Regimes**: LOW (0-19), MODERATE (20-39), HIGH (40-59), EXTREME (60+)

## STRATA Daily Engine

The STRATA Daily Engine is a Python-based automation system for generating daily crypto market structure summaries.

**Location**: `strata-daily/`

**Folder Structure**:
- `api/` - API integration modules (arkham, coingecko, cex, derivatives)
- `processors/` - Data processing modules (liquidity, flows, onchain, tokenomics, sectors)
- `renderer/` - Output rendering (json_renderer, md_renderer)
- `output/` - Generated output files (daily_summary.json, daily_summary.md)
- `output/charts/` - Generated visualization charts
- `docs/` - Documentation

**API Sources**:
- Arkham Intelligence: Stablecoin flows, exchange flows, whale activity
- CoinGecko: Prices, global market data (LIVE)
- Binance/OKX: Orderbook depth, bid-ask spreads
- Coinglass/Laevitas: Funding rates, open interest, liquidations

**Usage**:
```bash
cd strata-daily
python daily_engine.py
```

**Output**:
- `output/daily_summary.json` - Structured JSON data
- `output/daily_summary.md` - Human-readable Markdown report

## STRATA Liquidity 5-Factor Model

The 5-Factor Model provides a weighted composite scoring system for institutional liquidity assessment.

**Factor Weights**:
- Depth Quality: 30% (orderbook depth at 25bps and 50bps)
- Execution Efficiency: 25% (slippage proxy based on 10bps depth)
- Liquidity Stability: 20% (volatility of depth over 24h)
- Market Fragmentation: 15% (venue count, more = better)
- Risk Concentration: 10% (inverse of top venue share)

**Rating Bands**: AAA (90+), AA (80-89), A (70-79), BBB (60-69), BB (50-59), B (<50)

**Factor Classification**: strong (80+), constructive (65-79), neutral (50-64), fragile (35-49), stressed (<35)

**API Endpoints** (in `server/routes/liquidity.ts`):
- `GET /api/liquidity/factors/:symbol` - Single token 5-Factor scores
- `GET /api/liquidity/factors/batch?symbols=BTC,ETH,SOL` - Batch 5-Factor for multiple tokens

**Frontend Hooks**:
- `useLiquidityFactors(symbol)` - Single token factors
- `useLiquidityFactorsBatch(symbols[])` - Batch factors for multiple tokens

**Frontend Components** (in `client/src/components/analytics/`):
- `LiquidityFiveFactorPanel` - Full visual panel with factor progress bars
- `MiniFactorPill` - Compact pill showing "5F BBB · 65/100"
- `TokenLiquiditySnapshot` - Token grid cards with 5-Factor pills
- `DailyMarketCommentaryPanel` - Includes 5-Factor summary and cross-token comparison

**Multi-Token Note**: The Daily Commentary panel includes a cross-token comparison: "Across BTC / ETH / SOL, BTC currently leads liquidity at 65/100 (BBB), with ETH 57, while SOL screens weakest at 42/100 (B)."

## Yesterday vs Today Comparison Panel

The "Yesterday vs Today" panel provides synthetic comparative analysis between current session metrics and simulated prior-session values.

**Location**: `client/src/components/analytics/YesterdayVsTodayPanel.tsx`

**Synthetic History Generator**: `client/src/utils/syntheticHistory.ts`
- Generates controlled deltas (-8% to +8% for depth, ±5% for factor scores)
- Provides realistic day-over-day comparison without historical data storage

**Metrics Displayed** (6 metrics in 2 rows):
- Row 1: 10bps Depth, 25bps Depth, 50bps Depth
- Row 2: 5-Factor Score, Market Fragmentation, Venue Count

**Visual Elements**:
- Delta arrows: ▲ (emerald) for positive, ▼ (red) for negative
- Percentage change with "vs" yesterday value
- Trend commentary sentence at bottom

**Integration**: Displayed below Daily Commentary on Analytics page (`/platform/analytics`) when depth data and liquidity factors are loaded.

## Token Liquidity League Table

The League Table provides a sortable, clickable summary of all tracked tokens with execution regime classification and risk assessment.

**Location**: `client/src/components/analytics/TokenLiquidityTable.tsx`

**Data Source**: `client/src/lib/liquiditySummaryClient.ts` - Fetches from `/api/liquidity/summary` with synthetic fallback

**Types**: `client/src/types/liquidity.ts` - TokenLiquiditySummary, ExecutionRegime, RiskFlag

**Columns Displayed**:
- Token (symbol + name)
- 5-Factor Score
- Max trade size at <25bps impact
- Max trade size at <50bps impact
- Best Venue
- 10bps Depth
- 24h Δ Depth (with ▲/▼ arrows)
- Exec Regime pill (Ultra-Tight / Tight / Constructive / Stressed / Block-Only)
- Risk flag pill (Low / Moderate / High)

**Execution Regime Colors**:
- Ultra-Tight: emerald
- Tight: sky
- Constructive: slate
- Stressed: amber
- Block-Only: red

**Integration**: Displayed above Daily Commentary on Analytics page. Clicking a row updates the selected token across all panels.