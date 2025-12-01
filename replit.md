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