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

**Design System**:
-   **Colors**: Bloomberg-inspired dark theme (`#0a0a0a` background) with primary yellow (`#F5C211`), accent cyan (`#00D9FF`), success green (`#4ade80`), and destructive red (`#ef4444`).
-   **Typography**: Inter (sans-serif) for general text, and a monospace font (Roboto Mono / IBM Plex Mono) for numerical data.
-   **Layout**: Emphasizes information density, uses a grid-first approach, is fully responsive (mobile-first), and features edge-to-edge full-width panels.

### Backend
The backend uses Express.js with in-memory storage (MemStorage). It provides API endpoints for all dashboard data, historical trends, portfolio risk, alerts, token scorecard metrics, and a dedicated endpoint for Top 20 tokens. All data endpoints support an `asset` query parameter for token-specific data, defaulting to BTC.

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