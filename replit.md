# StrataLink Labs - Institutional Liquidity Terminal

## Version Milestone: Venue Role Doctrine v1.0
**Date**: December 22, 2025

This milestone implements the foundational Venue Role Encoding system:
- **Reference Venues**: Anchor liquidity truth (Coinbase - USD-native, spot-only, institutional)
- **Stress Venues**: Reveal fragility and tail risk (Binance - deepest liquidity, full leverage stack)
- **Reference-Adjacent**: Reinforces reference truth (Kraken - conservative spot books)
- **Venue Config**: Shared configuration in `shared/venue-config.ts`
- **Role-based Confidence**: TSLE uses venue roles for confidence multipliers
- **Frontend Integration**: Market Context shows venue role badge, confidence mode, scope
- **Non-Negotiable Principle**: "Liquidity truth is multi-venue by necessity"

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