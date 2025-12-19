# StrataLink Labs - Institutional Liquidity Terminal

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