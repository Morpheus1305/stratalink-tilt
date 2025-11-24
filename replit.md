# StrataLink Labs - Institutional Liquidity Terminal

## Overview
StrataLink Labs' Institutional Liquidity Terminal is a Web3 liquidity risk intelligence dashboard, inspired by the Bloomberg Terminal. Its core purpose is to deliver real-time digital asset analytics to regulators, exchanges, protocols, and institutional risk managers. The project aims to provide a production-ready MVP with an institutional-grade UI, leveraging both live and mock data for comprehensive analysis.

## User Preferences
- **Dark Mode Default**: Application loads in dark mode
- **Auto-refresh**: Dashboard data refreshes every 10 seconds, charts every 30 seconds
- **Monospace for Data**: All numerical values use monospace fonts for alignment
- **Bloomberg Aesthetic**: Professional, information-dense financial interface

## System Architecture

### Frontend (`client/`)
The frontend is built with **React**, **TypeScript**, and **Vite**, utilizing **Wouter** for routing and **TanStack Query v5** for state management. UI components are styled with **Shadcn UI** and **Tailwind CSS**, and data visualization is handled by **Recharts**.

**Key Pages & Features**:
-   **Landing Page (`/`)**: Features a hero section displaying live market metrics.
-   **Main Dashboard (`/platform`)**: Offers an overview with PoLi Score, Market Depth, Bid-Ask Spread, Volatility, and CEX/DEX Ratio. It includes a sticky header, platform tabs, a fixed `DateTimeBar`, and an auto-scrolling `BottomTicker`.
-   **Historical Trends (`/platform/trends`)**: Displays trends for PoLi Score, Market Depth, and Volatility across various timeframes.
-   **Portfolio Risk Assessment (`/platform/portfolio`)**: Enables multi-token comparison, portfolio PoLi scoring, and multi-dimensional analysis.
-   **Alerts & Stress Signals (`/platform/alerts`)**: Provides real-time risk indicators, an alert timeline, and a detailed log.
-   **Token Scorecard (`/platform/scorecard`)**: A tabbed interface presenting Tokenomics (13 metrics) and Liquidity (42 metrics), along with industry benchmarks.

**Design System**:
-   **Colors**: A Bloomberg-inspired dark theme (`#0a0a0a` background) with primary yellow (`#F5C211`), accent cyan (`#00D9FF`), success green (`#4ade80`), and destructive red (`#ef4444`).
-   **Typography**: Inter (sans-serif) for general text, and a monospace font (Roboto Mono / IBM Plex Mono) for numerical data.
-   **Layout**: Emphasizes information density, uses a grid-first approach, is fully responsive (mobile-first), and features edge-to-edge full-width panels.

### Backend (`server/`)
The backend uses **Express.js** with in-memory storage (MemStorage). It provides API endpoints for all dashboard data, historical trends, portfolio risk, alerts, and token scorecard metrics.

### Authentication
The system incorporates a mandatory 2FA authentication flow with a fixed OTP code for demonstration purposes. Sessions automatically reset after 5 minutes of inactivity on platform pages.

### Shared (`shared/`)
**Zod schemas** are used for defining type-safe data structures across the application.

## External Dependencies
-   **CoinGecko API**: Live cryptocurrency pricing (BTC, ETH, SOL).
-   **Binance API**: Real-time order book depth.
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
## Development History

### Phase 13: PoLi Liquidity Rating Display (Completed - Nov 24, 2025)

**Objective**: Display liquidity quality ratings (AAA through D) alongside all PoLi scores throughout the platform.

#### Implementation

**Helper Function** (`client/src/lib/poli-rating.ts`):
- Created `getPoLiRating(score: number): string` function
- Input validation: Clamps scores to [0, 100] range for robustness
- Returns rating string based on score thresholds
- Fully documented with JSDoc comments

**Rating Scale**:
- AAA (95-100): Exceptional liquidity quality
- AA (90-94): High liquidity quality
- A (85-89): Strong liquidity quality
- BBB (75-84): Adequate liquidity
- BB (65-74): Vulnerable liquidity
- B (55-64): Weak liquidity
- CCC (40-54): Distressed liquidity
- CC (25-39): Severe liquidity stress
- C (10-24): Illiquid
- D (0-9): Non-functioning liquidity

#### Display Locations

1. **LiquidityScoreGauge Component**: 
   - Rating displayed inside gauge circle below score
   - Format: "Liquidity Rating: **BB**"
   - Used in: Dashboard, Alerts, Scorecard, Portfolio pages

2. **Landing Hero Page**: 
   - Rating displayed below PoLi score in LIVE MARKET DATA panel
   - Uses rounded score for consistency (Math.round applied to both score and rating)

3. **Portfolio Page**:
   - Portfolio overall PoLi score shows rating
   - Multi-token comparison table shows rating for each token
   - Bold styling for all ratings (font-weight: 700)

#### Visual Design

- **Typography**: Small size (text-xs), bold weight for rating values
- **Format**: "Liquidity Rating: **[RATING]**" 
- **Position**: Immediately beneath numerical PoLi score
- **Styling**: Muted label text, bold rating value

#### Testing

- ✅ All E2E tests passing
- ✅ Bold styling verified (font-weight >= 700)
- ✅ Rounding consistency confirmed (LandingHero fixed)
- ✅ Helper function edge cases handled (clamping)
- ✅ Visual design matches specifications across all pages

#### Files Modified

- `client/src/lib/poli-rating.ts` (new file)
- `client/src/components/liquidity-score-gauge.tsx`
- `client/src/components/landing-hero.tsx`
- `client/src/pages/portfolio.tsx`

#### Success Criteria

✅ Rating helper function created and tested
✅ Ratings display on all PoLi score components
✅ Bold styling consistent across all locations
✅ Input validation handles edge cases
✅ Score/rating consistency (no rounding mismatches)
✅ Production-ready implementation

### Phase 14: Hero Page Default Token = BTC (Completed - Nov 24, 2025)

**Objective**: Ensure the Hero Page always loads BTC market data by default, regardless of token selection in other dashboards, to display consistent populated real values.

#### Implementation

**1. API Endpoint Enhancement** (`server/routes.ts`):
- Added asset query parameter support to `/api/dashboard`
- Endpoint: `GET /api/dashboard?asset={ASSET}`
- Default: BTC when no asset parameter provided
- Code: `const asset = (req.query.asset as string) || 'BTC';`

**2. Hero Component Update** (`client/src/components/landing-hero.tsx`):
- Added constant: `const DEFAULT_HERO_TOKEN = "BTC";`
- Explicit query key: `queryKey: ['/api/dashboard', DEFAULT_HERO_TOKEN]`
- Custom queryFn with BTC parameter: `fetch(/api/dashboard?asset=${DEFAULT_HERO_TOKEN})`
- Auto-refresh interval: 10 seconds

**3. Data Flow**:
- Hero page → API request with `?asset=BTC`
- API → Storage `getDashboardData('BTC')`
- Storage → API clients fetch BTC data from CoinGecko/Binance
- Fallback to realistic mock BTC data if external APIs fail (rate limits, regional blocks)

#### Benefits

✅ **Consistent Data**: Hero page always displays populated BTC metrics (PoLi Score, Market Depth, Bid-Ask Spread, Volatility, CEX/DEX Ratio)
✅ **No Empty States**: Avoids empty/null values on the landing page
✅ **Extensible**: API now supports asset parameter for future token selection features
✅ **Backward Compatible**: Existing dashboard pages continue to work (default to BTC)
✅ **Live Data**: Fetches real-time BTC data from CoinGecko/Binance with graceful fallback

#### Testing

- ✅ Hero page loads BTC metrics consistently
- ✅ API endpoint accepts asset parameter correctly
- ✅ API defaults to BTC when no parameter provided
- ✅ Data persists across navigation (login/logout)
- ✅ Page reloads successfully without errors
- ✅ E2E tests passed (playwright verification)
- ✅ Architect review passed with no issues

#### Bug Fix: Label Mismatch (Nov 24, 2025)

**Issue**: Hero page showed "$0M", "0%", "0%", "0:0" for metrics despite backend returning data
**Root Cause**: Frontend searched for "Market Depth" but backend returned "MARKET DEPTH"
**Fix**: Updated frontend to match backend ALL CAPS labels:
- `"MARKET DEPTH"` (was "Market Depth")
- `"BID-ASK SPREAD"` (was "Bid-Ask Spread")
- `"VOLATILITY 24H"` (was "24H Volatility")
- `"CEX/DEX RATIO"` (was "CEX/DEX Ratio")

**Result**: Hero page now displays populated BTC values ($42.5M, 0.05%, 12.4%, 68:32)

#### Files Modified

- `server/routes.ts` (added asset query parameter)
- `client/src/components/landing-hero.tsx` (explicit BTC request + label fix)

#### Success Criteria

✅ Hero page always loads BTC data
✅ API extensible for future token selection
✅ No breaking changes to existing dashboards
✅ Clean, maintainable implementation
✅ Production-ready code quality
✅ All metrics display real values (no zeros)
