# StrataLink Labs - Institutional Liquidity Terminal

## Version Milestone: Alert System v1.0 - Customizable Stress Notifications
**Date**: December 22, 2025

This milestone adds a full-featured alert system for monitoring stress conditions:

**Alert Trigger Types:**
- DIVERGENCE: Fires when cross-venue divergence signals exceed severity threshold
- REGIME_CHANGE: Fires when regime transitions to/past configured level
- POLI_DROP: Fires when PoLi drops below configured threshold
- DEPTH_DROP: Fires when depth divergence exceeds configured percentage

**Notification Channels:**
- Email via Resend API with HTML-formatted alerts
- Webhooks with full JSON payload for integration with external systems
- Configurable cooldown (1-1440 minutes) prevents notification spam

**Features:**
- PostgreSQL persistence for alert rules and history
- Enable/disable individual rules without deletion
- Optional symbol filtering (e.g., BTC-only alerts)
- Alert history tracking with status (TRIGGERED, EMAIL_SENT, WEBHOOK_SENT, FAILED)
- "Configure Alerts" button in divergence panel for quick access

**API Endpoints:**
- `GET /api/alerts/rules` - List all alert rules
- `POST /api/alerts/rules` - Create new alert rule
- `PATCH /api/alerts/rules/:id` - Update alert rule
- `DELETE /api/alerts/rules/:id` - Delete alert rule
- `GET /api/alerts/history` - View alert history with optional limit

**Files:**
- `shared/schema.ts` - alertRules, alertHistory tables
- `server/services/alert-service.ts` - Alert evaluation and notification engine
- `server/routes/alerts.ts` - API routes
- `client/src/pages/alert-config.tsx` - Configuration UI at `/alerts/config`

---

## Version Milestone: Venue Role Doctrine v1.2 - Cross-Venue Divergence
**Commit**: `b62ed5d7` | **Date**: December 22, 2025

This milestone adds cross-venue divergence detection to surface regime stress signals:

**Divergence Detection:**
- Compares Reference venues (Coinbase) vs Stress venues (Binance) in real-time
- Uses only liquidity-native inputs: PoLi, depth, imbalance, TSLE state (no price data)
- Thresholds: 15 PoLi points, 30% depth, 20% imbalance divergence

**Regime Classification Ladder:**
- NORMAL: No signals or only MODERATE-severity signals
- EARLY_WARNING: At least one HIGH-severity signal or STATE divergence
- STRESS_BUILDING: STATE divergence combined with HIGH-severity signals
- CONFIRMED_STRESS: CRITICAL signals or multiple HIGH-severity signals

**API Endpoint:**
- `GET /api/lis/divergence?symbol=BTC` returns divergence report with signals, regime, and snapshots
- Frontend displays divergence panel with regime badges and signal details
- Auto-refreshes every 10 seconds

---

## Version Milestone: Venue Role Doctrine v1.1
**Date**: December 22, 2025

This milestone expands the Venue Role Encoding system with formal classifications for 6 exchanges:

**Venue Classifications:**
| Venue | Role | Confidence | Scope |
|-------|------|------------|-------|
| Coinbase | REFERENCE_VENUE | HIGH | SPOT |
| Binance | STRESS_VENUE | VARIABLE | SPOT, PERP, FUNDING |
| Kraken | REFERENCE_ADJACENT | MODERATE | SPOT |
| OKX | STRESS_VENUE | VARIABLE | SPOT, PERP, FUNDING, LIQUIDATIONS |
| Bybit | STRESS_VENUE | VARIABLE | SPOT, PERP, FUNDING, LIQUIDATIONS |
| Deribit | DERIVATIVES_SPECIALIST | HIGH | PERP, FUNDING |

**Role Definitions:**
- **REFERENCE_VENUE**: USD-native pricing, institutional liquidity truth anchor
- **STRESS_VENUE**: Leverage-heavy, fragility/tail risk discovery
- **REFERENCE_ADJACENT**: Reinforces reference truth, cross-validation
- **DERIVATIVES_SPECIALIST**: Options/futures specialist, volatility surface calibration

**Implementation:**
- Shared configuration in `shared/venue-config.ts`
- Role-based confidence multipliers in TSLE (1.5x for domain-appropriate signals)
- Frontend shows venue role badge, confidence mode, and scope badges
- Non-Negotiable Principle: "Liquidity truth is multi-venue by necessity"

---

## Version Milestone: TSLE Phase 2 v1.1 - Liquidity Horizons
**Commit**: `6b542bcb` | **Date**: December 20, 2025

Updates from v1.01:
- **Liquidity Horizons**: Replaced traditional timeframes with context-aware horizons (Now/Session/Baseline)
- **Regime Labeling**: Dynamic regime detection (Stable, Strengthening, Fragile, Critical) with descriptions
- **Fragility Detection**: Triggers when PoLi drops while price stable and depth eroding
- **Baseline Comparison**: Shows current PoLi vs rolling average with delta messaging
- **Session Downsampling**: Smooth curves from aggregated data points for intraday drift
- **Core Principle**: TSLE measures execution quality, stability, and fragility — not price movement

---

## Version Milestone: LIS-TILT v1.01
**Commit**: `0d88e037` | **Date**: December 20, 2025

Updates from v1.0:
- **12-column grid layout**: Market Context (25%) | PoLi Score (25%) | Executable Depth (50%)
- **PoLi Sub-Label**: Dynamic one-line explanation based on 25-50 bps depth analysis
- **Liquidity Fragility Trigger**: Warning when PoLi drops ≥5 points while price/spread remain stable
- **PoLi Orbital Indicator**: Branded polling indicator with continuous rotation and pulse glow on data refresh
- **Async polling refactor**: Cleaner async/await pattern for LIS data fetching

---

## Version Milestone: LIS + TILT v1 (Frozen)
**Commit**: `51d93c20` | **Date**: December 19, 2025

This milestone marks the completion of LIS (Liquidity Ingestion Service) integration with the TILT platform:
- LIS backend proxy with secure relay key authentication
- Liquidity Truth Console (`/lis`) with token/venue selectors
- 5-second auto-refresh with live timestamp indicator
- Full TILT platform styling (Cards, Tailwind, Bloomberg aesthetic)
- Multi-venue support: Binance, Coinbase, OKX, Kraken
- Depth bands: 10bps, 25bps, 50bps, 100bps, 200bps from external relay

## Overview
StrataLink Labs' Institutional Liquidity Terminal is a Web3 liquidity risk intelligence dashboard, inspired by the Bloomberg Terminal. Its core purpose is to deliver real-time digital asset analytics to regulators, exchanges, protocols, and institutional risk managers. The project aims to provide a production-ready MVP with an institutional-grade UI, leveraging both live and mock data for comprehensive analysis. Key capabilities include real-time market metrics, historical trend analysis, portfolio risk assessment, real-time alerts, and a detailed token scorecard. The project also integrates a Liquidity Ingestion Service (LIS) and a Terminal Information & Liquidity Terminal (TILT) for multi-venue liquidity data.

## User Preferences
- **Dark Mode Default**: Application loads in dark mode
- **Auto-refresh**: Dashboard data refreshes every 10 seconds, charts every 30 seconds
- **Monospace for Data**: All numerical values use monospace fonts for alignment
- **Bloomberg Aesthetic**: Professional, information-dense financial interface

## System Architecture

### Frontend
The frontend is built with React, TypeScript, and Vite, using Wouter for routing and TanStack Query v5 for state management. UI components are styled with Shadcn UI and Tailwind CSS, and data visualization is handled by Recharts.
Key features include:
-   **Main Dashboard**: Overview with PoLi Score, Market Depth, Bid-Ask Spread, Volatility, CEX/DEX Ratio, sticky header, `DateTimeBar`, and `BottomTicker`.
-   **Historical Trends**: PoLi Score, Market Depth, and Volatility across various timeframes.
-   **Portfolio Risk Assessment**: Multi-token comparison and PoLi scoring.
-   **Alerts & Stress Signals**: Real-time risk indicators and alert logs.
-   **Token Scorecard**: Tabbed interface for Tokenomics (13 metrics) and Liquidity (42 metrics) with industry benchmarks.
-   **Dynamic Token Selection**: Uses CoinMarketCap's Top 20 tokens, with PoLi liquidity quality ratings (AAA through D) displayed throughout.

### Identity Module
Provides on-chain identity intelligence via Arkham API integration, accessible via authenticated routes. It includes pages for Liquidity Fragmentation, MM Integrity, PoLi+, Identity Alerts, and Regulatory Surveillance.

### Backend
The backend uses Express.js with in-memory storage (MemStorage) to provide API endpoints for all dashboard data, historical trends, portfolio risk, alerts, and token scorecard metrics. It dynamically generates asset-specific data for BTC, ETH, and SOL using multipliers.

### STRATA Analytics Backend
Located in the `analytics/` directory, this Node.js backend provides real-time market structure analytics. It features an aggregator for multi-exchange pricing and engines for orderbook depth, funding rates, liquidations, and stress scoring. It exposes various API endpoints for aggregated market data.

### STRATA Daily Engine
A Python-based automation system (`strata-daily/`) that generates daily crypto market structure summaries from various API sources (Arkham, CoinGecko, Binance, OKX, Coinglass/Laevitas). It produces structured JSON and human-readable Markdown reports.

### STRATA Liquidity 5-Factor Model
A weighted composite scoring system for institutional liquidity assessment, based on Depth Quality (30%), Execution Efficiency (25%), Liquidity Stability (20%), Market Fragmentation (15%), and Risk Concentration (10%). It provides API endpoints for single and batch token factor scores, with frontend components for visualization.

### Yesterday vs Today Comparison Panel
Provides synthetic comparative analysis of current metrics against simulated prior-session values, generating controlled deltas for metrics like depth and 5-Factor Score, with visual delta arrows and trend commentary.

### Token Liquidity League Table
A sortable, clickable summary of tracked tokens, including 5-Factor Score, max trade size at various impact levels, best venue, depth, 24h depth change, execution regime classification, and risk assessment.

### Design System
-   **Colors**: Bloomberg-inspired dark theme with primary yellow, accent cyan, success green, and destructive red.
-   **Typography**: Inter for general text, monospace for numerical data.
-   **Layout**: Information-dense, grid-first, fully responsive with full-width panels.

## External Dependencies
-   **CoinGecko API**: Live cryptocurrency pricing.
-   **Binance API**: Real-time order book depth.
-   **CoinMarketCap API**: Top 20 cryptocurrency rankings.
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
-   **Arkham API**: On-chain identity intelligence.
-   **Coinbase API**: Exchange connector (for STRATA Analytics).
-   **Kraken API**: Exchange connector (for STRATA Analytics).
-   **OKX API**: Exchange connector (for STRATA Analytics & Daily Engine).
-   **Bybit API**: Exchange connector (for STRATA Analytics).
-   **Coinglass/Laevitas**: Funding rates, open interest, liquidations (for STRATA Daily Engine).