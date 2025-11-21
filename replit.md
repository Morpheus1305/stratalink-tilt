# StrataLink Labs - Institutional Liquidity Terminal

## Overview
StrataLink Labs presents an Institutional Liquidity Terminal, a Web3 liquidity risk intelligence dashboard inspired by the Bloomberg Terminal. Its primary purpose is to provide real-time analytics for digital assets to regulators, exchanges, protocols, and institutional risk managers. The project aims to deliver a production-ready MVP with a comprehensive, institutional-grade UI, offering both live and mock data for robust analysis.

## User Preferences
### Development Workflow
- **Dark Mode Default**: Application loads in dark mode
- **Auto-refresh**: Dashboard data refreshes every 10 seconds, charts every 30 seconds
- **Monospace for Data**: All numerical values use monospace fonts for alignment
- **Bloomberg Aesthetic**: Professional, information-dense financial interface

## System Architecture

### Frontend (`client/`)
The frontend is built with **React**, **TypeScript**, and **Vite** for a fast development experience. **Wouter** handles routing, and **TanStack Query v5** manages state. UI components are styled using **Shadcn UI** and **Tailwind CSS**, with **Recharts** for data visualization.

**Key Pages & Features**:
-   **Landing Page (`/`)**: Hero section with live market metrics preview.
-   **Main Dashboard (`/platform`)**: Overview with comprehensive analytics, including PoLi Score, Market Depth, Bid-Ask Spread, Volatility, and CEX/DEX Ratio. It features a sticky header with a "HOME" link, sticky platform tabs, a fixed bottom `DateTimeBar` for live timestamps, and a fixed auto-scrolling `BottomTicker`.
-   **Historical Trends (`/platform/trends`)**: Displays PoLi Score Evolution, Market Depth Trend, and Volatility Trend over multiple timeframes (1D, 7D, 1M, 3M, 1Y).
-   **Portfolio Risk Assessment (`/platform/portfolio`)**: Multi-token comparison, portfolio PoLi score, and multi-dimensional analysis.
-   **Alerts & Stress Signals (`/platform/alerts`)**: Real-time risk indicators, alert timeline, and a detailed alert log.
-   **Token Scorecard (`/platform/scorecard`)**: Tabbed interface for Tokenomics (13 metrics) and Liquidity (42 metrics), with industry benchmarks and status tracking.

**Design System**:
-   **Colors**: Bloomberg-inspired dark theme with `#0a0a0a` background, primary yellow (`#F5C211`), accent cyan (`#00D9FF`), success green (`#4ade80`), and destructive red (`#ef4444`).
-   **Typography**: Inter (sans-serif) for general text and a monospace font (Roboto Mono / IBM Plex Mono) for all numerical data.
-   **Layout**: Emphasizes information density, uses a grid-first approach, is fully responsive (mobile-first), and features edge-to-edge full-width panels.

### Backend (`server/`)
The backend uses **Express.js** with in-memory storage (**MemStorage**). It provides API endpoints for dashboard data, historical time-series, trends, portfolio risk, alerts, and token scorecard metrics.

### Shared (`shared/`)
**Zod schemas** define type definitions for all data structures, ensuring type safety across the frontend and backend.

## External Dependencies
-   **CoinGecko API**: For live cryptocurrency pricing (BTC, ETH, SOL).
-   **Binance API**: For real-time order book depth (with graceful fallback due to regional blocking).
-   **Recharts**: For financial data visualization on the frontend.
-   **Lucide React**: Icon system.
-   **Shadcn UI**: Accessible component library.
-   **Tailwind CSS**: Utility-first CSS framework.
-   **Node.js 20**: Runtime environment.
-   **TypeScript**: Programming language for type safety.
-   **Vite**: Frontend tooling.
-   **Wouter**: Frontend routing library.
-   **TanStack Query v5**: Frontend state management.
-   **Express.js**: Backend web framework.

## Recent Changes

### Phase 7: Header Layout Swap - Branding & Timestamp (Completed - Nov 21, 2025)
- ✅ **Swapped Header Layout on All Pages**:
  - **LEFT side**: Logo + "STRATALINK LABS LIQUIDITY INTELLIGENCE TERMINAL" (expanded branding)
  - **RIGHT side**: Live timestamp with Clock icon + LIVE indicator + action buttons
  - Consistent layout across landing page and all 5 platform pages
  
- ✅ **Added Live Timestamp to Headers**:
  - Timestamp displays in header (RIGHT side) with Clock icon
  - Format: "Nov 21, 2025, 01:45:30 PM UTC"
  - Updates every second via setInterval hook
  - Monospace font for consistent number spacing
  - Separate timestamps on landing page and platform pages
  
- ✅ **Header Navigation Updates**:
  - Dashboard header: Changed "LIQUIDITY INTELLIGENCE" nav button to "OVERVIEW"
  - Landing page: Timestamp positioned before navigation links on the right
  - Platform pages: Timestamp positioned before LIVE indicator on the right
  
- ✅ **E2E Testing**: All tests passed
  - Verified branding text on LEFT on all pages
  - Verified timestamp on RIGHT with Clock icon on all pages
  - Confirmed timestamp updates every second
  - Verified consistent layout across all pages