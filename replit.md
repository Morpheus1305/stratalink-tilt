# StrataLink Labs - Institutional Liquidity Terminal

## Overview
A Bloomberg Terminal-style Web3 liquidity risk intelligence dashboard providing real-time analytics for digital assets. Built for regulators, exchanges, protocols, and institutional risk managers.

## Current Status
**Production-Ready MVP** - Fully functional liquidity intelligence dashboard with live data updates, comprehensive analytics, and institutional-grade UI.

## Recent Changes (Nov 21, 2025)
- ✅ Implemented complete Bloomberg-inspired dark theme with yellow (#F5C211) and cyan (#00D9FF) accents
- ✅ Built landing page with hero section and live market data panel
- ✅ Created main dashboard with 10+ specialized components
- ✅ Added real-time data refresh (10s for dashboard, 30s for time-series)
- ✅ Implemented dynamic mock data generators with realistic variance
- ✅ Added comprehensive loading and error states
- ✅ Configured responsive layouts for mobile, tablet, and desktop
- ✅ Integrated Recharts for financial data visualization

## Project Architecture

### Frontend (`client/`)
**Framework**: React + TypeScript + Vite
**Routing**: Wouter
**State Management**: TanStack Query v5
**UI Components**: Shadcn UI + Tailwind CSS
**Charts**: Recharts

**Key Pages**:
- `/` - Landing page with hero and live metrics preview
- `/platform` - Main dashboard with full analytics

**Component Structure**:
```
components/
├── landing-hero.tsx          # Landing page with StrataLink branding
├── dashboard-header.tsx      # Top navigation with live status indicator
├── live-metrics-panel.tsx    # 6-metric grid (PoLi Score, Depth, Spread, etc.)
├── liquidity-score-gauge.tsx # Circular gauge (0-100) with risk level
├── stress-signals-panel.tsx  # Alert system with severity indicators
├── key-metrics-grid.tsx      # 6-card detailed metrics display
├── liquidity-distribution-charts.tsx # Bar chart (exchanges) + Pie chart (CEX/DEX)
├── time-series-chart.tsx     # Dual-line chart with timeframe selector
├── report-export-section.tsx # PDF report generation UI
└── bottom-ticker.tsx         # Auto-scrolling crypto prices ticker
```

### Backend (`server/`)
**Framework**: Express.js
**Storage**: In-memory (MemStorage)
**API Endpoints**:
- `GET /api/dashboard` - Complete dashboard snapshot (auto-refresh: 10s)
- `GET /api/time-series/:timeframe` - Historical data (1H, 4H, 1D, 1W, 1M)

### Shared (`shared/`)
**Type Definitions**: Zod schemas for all data structures
- `DashboardData` - Complete dashboard state
- `TimeSeriesData` - Historical liquidity trends
- `LiveMetric`, `LiquidityScore`, `StressSignal`, `KeyMetric`, etc.

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
