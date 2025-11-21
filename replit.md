# StrataLink Labs - Institutional Liquidity Terminal

## Overview
A Bloomberg Terminal-style Web3 liquidity risk intelligence dashboard providing real-time analytics for digital assets. Built for regulators, exchanges, protocols, and institutional risk managers.

## Current Status
**Production-Ready MVP with Partial Live Data** - Fully functional liquidity intelligence dashboard with hybrid live/mock data, comprehensive analytics, and institutional-grade UI.

## Recent Changes (Nov 21, 2025)
### Phase 1: Initial MVP (Completed)
- ✅ Implemented complete Bloomberg-inspired dark theme with yellow (#F5C211) and cyan (#00D9FF) accents
- ✅ Built landing page with hero section and live market data panel
- ✅ Created main dashboard with 10+ specialized components
- ✅ Added real-time data refresh (10s for dashboard, 30s for time-series)
- ✅ Added comprehensive loading and error states
- ✅ Configured responsive layouts for mobile, tablet, and desktop
- ✅ Integrated Recharts for financial data visualization

### Phase 2: Live API Integration (Completed)
- ✅ Created Web3DataService with CoinGecko & Binance API integration
- ✅ Implemented live cryptocurrency pricing (BTC, ETH, SOL) via CoinGecko
- ✅ Added real-time order book depth with correct USD conversion (price × quantity)
- ✅ Live ticker with real market data and 30s caching
- ✅ Dynamic PoLi score calculation based on real metrics
- ✅ Graceful fallback to mock data on API errors
- ⚠️ Note: Binance API blocked in some regions (451 error) - fallback depth data used
- ⚠️ Remaining mock data: Exchange distribution, CEX/DEX ratio, stress signals, time-series

### Phase 3: Historical Trends Page (Completed - Nov 21, 2025)
- ✅ Implemented tabbed navigation system (Overview, Trends, Portfolio, Alerts, Scorecard)
- ✅ Created dedicated Historical Trends page at `/platform/trends`
- ✅ Built three specialized time-series charts:
  - PoLi Score Evolution: Yellow area chart with gradient fill (0-100 scale)
  - Market Depth Trend: Cyan line chart showing depth in millions ($M)
  - Volatility Trend: Red line chart showing percentage fluctuation
- ✅ Added multi-timeframe selector (1D, 7D, 1M, 3M, 1Y) with smart data aggregation
- ✅ Integrated live data from dashboard (liquidity score, stress signals, key metrics)
- ✅ Implemented responsive layout with proper Bloomberg Terminal styling
- ✅ Added comprehensive data-testid coverage for e2e testing
- ✅ Backend API endpoint `/api/trends/:timeframe` with realistic mock data generation

### Phase 4: Portfolio, Alerts, and Scorecard Pages (Completed - Nov 21, 2025)
- ✅ **Portfolio Risk Assessment Page** (`/platform/portfolio`):
  - Multi-token comparison table with 6 tokens (SOL, USDC, USDT, JTO, JUP, BONK)
  - Portfolio PoLi Score display with summary cards (Healthy/Warning/Critical assets)
  - PoLi Score Comparison bar chart (yellow bars showing scores 0-100)
  - Multi-dimensional Analysis radar chart (3 tokens across 5 dimensions)
  - Action buttons per token (MONITOR, REVIEW, CRITICAL)
  
- ✅ **Alerts & Stress Signals Page** (`/platform/alerts`):
  - Real-time Risk Indicators table with 6 indicators and color-coded RAS dots (high/medium/low)
  - Active Warning Capacity and Critical Assets summary cards
  - Alert Timeline stacked area chart (critical/warning/info over time)
  - Alert Log table with Time (UTC), Alert Type, Severity badges, Description, Status
  - Filter controls (CRITICAL) and Export functionality (CSV/PDF)
  
- ✅ **Token Scorecard Page** (`/platform/scorecard`):
  - Tabbed interface: Tokenomics Metrics (13) vs Liquidity Metrics (42)
  - Dynamic data fetching with React Query cache invalidation on tab switch
  - Comprehensive metrics tables with Metric, Value, Industry Benchmark, Status columns
  - 42 liquidity metrics across 6 categories: Core Depth (10), Spread (8), Volume (8), Order Book Quality (6), Slippage & Execution (5), Risk & Resilience (5)
  - Summary cards showing GOOD/CAUTION/RISK distribution with percentages
  - CSV and PDF export buttons
  
- ✅ Backend API endpoints:
  - `GET /api/portfolio` - Portfolio risk data with tokens, charts, summary
  - `GET /api/alerts` - Real-time indicators, timeline, alert log
  - `GET /api/scorecard?type=tokenomics|liquidity` - Metrics tables and summaries
  
- ✅ E2E testing: All 25 navigation/interaction tests passed, tab switching verified
- 📋 Next: WebSocket streaming for live updates, multi-asset comparison

## Project Architecture

### Frontend (`client/`)
**Framework**: React + TypeScript + Vite
**Routing**: Wouter
**State Management**: TanStack Query v5
**UI Components**: Shadcn UI + Tailwind CSS
**Charts**: Recharts

**Key Pages**:
- `/` - Landing page with hero and live metrics preview
- `/platform` - Main dashboard (Overview tab) with full analytics
- `/platform/trends` - Historical Trends page with time-series charts
- `/platform/portfolio` - Portfolio Risk Assessment with multi-token comparison
- `/platform/alerts` - Alerts & Stress Signals with timeline and log
- `/platform/scorecard` - Token Scorecard with tokenomics and liquidity metrics

**Component Structure**:
```
components/
├── landing-hero.tsx          # Landing page with StrataLink branding
├── platform-tabs.tsx         # Tab navigation for platform pages
├── dashboard-header.tsx      # Top navigation with live status indicator
├── live-metrics-panel.tsx    # 6-metric grid (PoLi Score, Depth, Spread, etc.)
├── liquidity-score-gauge.tsx # Circular gauge (0-100) with risk level
├── stress-signals-panel.tsx  # Alert system with severity indicators
├── key-metrics-grid.tsx      # 6-card detailed metrics display
├── liquidity-distribution-charts.tsx # Bar chart (exchanges) + Pie chart (CEX/DEX)
├── time-series-chart.tsx     # Dual-line chart with timeframe selector
├── report-export-section.tsx # PDF report generation UI
└── bottom-ticker.tsx         # Auto-scrolling crypto prices ticker

pages/
├── landing.tsx               # Landing page
├── dashboard.tsx             # Main overview dashboard
├── trends.tsx                # Historical trends with time-series charts
├── portfolio.tsx             # Portfolio risk assessment
├── alerts.tsx                # Alerts and stress signals
├── scorecard.tsx             # Token scorecard with metrics
└── not-found.tsx             # 404 page
```

### Backend (`server/`)
**Framework**: Express.js
**Storage**: In-memory (MemStorage)
**API Endpoints**:
- `GET /api/dashboard` - Complete dashboard snapshot (auto-refresh: 10s)
- `GET /api/time-series/:timeframe` - Historical data (1H, 4H, 1D, 1W, 1M) for dual-line chart
- `GET /api/trends/:timeframe` - Historical trends data (1D, 7D, 1M, 3M, 1Y) for three separate charts
- `GET /api/portfolio` - Portfolio risk data with 6 tokens, comparison charts, summary cards
- `GET /api/alerts` - Real-time risk indicators, alert timeline, alert log with severity
- `GET /api/scorecard?type=tokenomics|liquidity` - Tokenomics (13) or Liquidity (42) metrics

### Shared (`shared/`)
**Type Definitions**: Zod schemas for all data structures
- `DashboardData` - Complete dashboard state
- `TimeSeriesData` - Historical liquidity trends (dual-metric)
- `TrendsData` - Multi-chart historical trends (PoLi score, depth, volatility)
- `PortfolioData` - Multi-token risk assessment with charts and summaries
- `AlertsData` - Real-time indicators, timeline, alert log
- `ScorecardData` - Tokenomics and liquidity metrics with status tracking
- `LiveMetric`, `LiquidityScore`, `StressSignal`, `KeyMetric`, `TickerItem`, etc.

## Design System

### Colors (Bloomberg Theme)
- **Background**: `#0a0a0a` (dark mode default)
- **Primary/Yellow**: `#F5C211` - PoLi scores, warnings, CTA buttons
- **Accent/Cyan**: `#00D9FF` - Market depth, positive indicators
- **Success/Green**: `#4ade80` - Positive trends, upward movement
- **Destructive/Red**: `#ef4444` - Negative trends, critical alerts

### Typography
- **Sans-serif**: Inter - Headers, labels, UI text
- **Monospace**: Roboto Mono / IBM Plex Mono - All numbers, metrics, data values
- **Font Sizes**: 
  - Metric values: `text-2xl` to `text-4xl`
  - Labels: `text-xs` to `text-sm`
  - Headers: `text-lg` to `text-xl`

### Layout Principles
- **Information Density**: Minimal whitespace, compact padding (p-3 to p-4)
- **Grid-First**: Multi-column layouts (2, 3, 6-column grids)
- **Responsive**: Mobile-first with `md:` and `lg:` breakpoints
- **Edge-to-Edge**: No centered containers, full-width panels

## Key Features

### 1. Live Market Data (Auto-refresh: 10s)
- PoLi Score (0-100 scale)
- Market Depth ($M)
- Bid-Ask Spread (%)
- 24H Volatility (%)
- CEX/DEX Ratio
- Total Volume

### 2. Liquidity Intelligence Gauge
- Circular progress indicator (0-100)
- Risk level classification (Low/Medium/High/Critical)
- 24H change tracking
- Historical average comparison

### 3. Stress Signal Detection
- Real-time alerts with severity levels
- Categories: Spread Analysis, Concentration Risk, Depth Monitoring
- Timestamped notifications
- Color-coded by severity (Critical/Warning/Info/Success)

### 4. Distribution Analytics
- **Exchange Distribution**: Bar chart showing top 5 exchanges by liquidity
- **CEX vs DEX**: Pie chart with percentage breakdown
- Dynamic data updates

### 5. Time-Series Analysis
- Dual-line chart (Liquidity Depth + Spread)
- Timeframe selector: 1H, 4H, 1D, 1W, 1M
- Auto-refresh every 30 seconds
- Proper axis scaling and grid lines

### 6. Bottom Ticker
- Auto-scrolling crypto prices (BTC/USD, ETH/USD, SOL/USD)
- Live change indicators with icons
- Depth, spread, and volume metrics
- Continuous loop animation

## User Preferences

### Development Workflow
- **Dark Mode Default**: Application loads in dark mode
- **Auto-refresh**: Dashboard data refreshes every 10 seconds, charts every 30 seconds
- **Monospace for Data**: All numerical values use monospace fonts for alignment
- **Bloomberg Aesthetic**: Professional, information-dense financial interface

## Technical Stack
- **Node.js 20** - Runtime environment
- **TypeScript** - Type safety across frontend and backend
- **Recharts** - Financial data visualization
- **Lucide React** - Icon system
- **Tailwind CSS** - Utility-first styling
- **Shadcn UI** - Accessible component library

## Running the Project
```bash
npm run dev
```
Starts Express server (backend) + Vite dev server (frontend) on port 5000.

## Next Phase Enhancements (Not in MVP)
- WebSocket connections for true real-time streaming
- Integration with live DeFi APIs (Uniswap, Binance, Coinbase)
- Multi-asset comparison views
- Customizable alert thresholds
- Email/webhook notifications
- Advanced filtering and search
- Custom watchlists
- Historical data export (CSV, JSON)
- PDF report generation (currently UI-only)

## Notes
- All data is currently mock/simulated with realistic variance
- Auto-refresh simulates live market conditions
- Built following design_guidelines.md Bloomberg Terminal specifications
- Fully responsive design tested on mobile, tablet, desktop
