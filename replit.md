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

### Phase 7: Header Layout Updates (Completed - Nov 21, 2025)
- ✅ **Updated Header Layout on All Pages**:
  - **LEFT side**: Logo + "STRATALINK LABS LIQUIDITY INTELLIGENCE TERMINAL" (expanded branding)
  - **RIGHT side**: Navigation links (landing) / LIVE indicator + action buttons (platform)
  - Consistent branding across landing page and all 5 platform pages
  - **Timestamps removed from headers** - only visible in bottom DateTimeBar
  
- ✅ **Header Navigation Updates**:
  - Dashboard header: Changed "LIQUIDITY INTELLIGENCE" nav button to "OVERVIEW"
  - Landing page: Navigation links on the right (PLATFORM, DOCS, DEMO MODE, ABOUT, HELP)
  - Platform pages: LIVE indicator + Bell + Settings icons on the right
  
- ✅ **E2E Testing**: All tests passed
  - Verified branding text on LEFT on all pages
  - Verified NO timestamp or clock icon in headers
  - Confirmed LIVE indicator visible on platform pages
  - Verified consistent clean layout across all pages

### Phase 8: Production-Ready 2FA Authentication (Completed - Nov 21, 2025)
- ✅ **Complete 2FA Authentication System**:
  - Email OTP authentication with 6-digit codes (10-minute expiry)
  - JWT-based session management with 7-day token expiration
  - Bcrypt password hashing (10 rounds)
  - Login attempt tracking with rate limiting (5 failed attempts)
  - PostgreSQL database for permanent user storage (users, otps, login_attempts tables)
  
- ✅ **Security Implementation**:
  - **PublicUser sanitization**: Sensitive fields (passwordHash, totpSecret, backupCodes) never sent to frontend
  - **Backend session validation**: /api/auth/session endpoint validates JWT signature, expiration, and user existence
  - **Client-side token validation**: AuthContext checks JWT expiration on startup
  - **Automatic cleanup**: Temp credentials cleared on login/logout
  - **Expired token handling**: Invalid/expired tokens trigger automatic logout
  
- ✅ **Route Protection & Redirects**:
  - Protected routes (/platform/*) redirect unauthenticated users to /login
  - Public routes (/, /login, /verify-otp) redirect authenticated users to /platform
  - Prevents browser back navigation to public pages after authentication
  - RequireAuth component guards all platform routes
  
- ✅ **Authentication Pages**:
  - LoginPage: Email/password form with Bloomberg-inspired design
  - VerifyOTPPage: 6-digit OTP input with countdown timer and resend functionality
  - Demo credentials: robert@stratalink.ai / SecurePass123!
  - OTP codes visible in server logs for development/testing
  
- ✅ **E2E Testing**: Comprehensive test coverage
  - Complete 2FA flow (login → OTP → dashboard)
  - Routing guard verification (authenticated/unauthenticated redirects)
  - Security validation (PublicUser sanitization, token validation)
  - Negative testing (invalid credentials, invalid OTP, expired tokens)
  - Session persistence and refresh handling
  - All tests passed successfully with backend validation

### Phase 9: Real Email Delivery with Resend (Completed - Nov 21, 2025)
- ✅ **Resend Email Service Integration**:
  - Installed Resend SDK for production email delivery
  - Configured RESEND_API_KEY environment variable
  - Updated demo user email to robert@stratalink.ai for real email receipt
  - Professional Bloomberg-style HTML email template with dark theme
  
- ✅ **Email Template Design**:
  - Dark background (#0a0a0a) with Bloomberg yellow accents (#F5C211)
  - Monospace font display for 6-digit OTP codes
  - 10-minute expiration notice
  - Security warnings and StrataLink Labs branding
  - Mobile-responsive table-based HTML layout
  
- ✅ **Production-Ready Error Handling**:
  - Environment detection (dev vs production)
  - Graceful fallback to console logging when Resend unavailable
  - No exceptions thrown on email failures (allows dev/testing without API key)
  - OTP codes only logged in development (security best practice)
  - Clear error messages for debugging
  
- ✅ **E2E Testing**: Real email delivery validated
  - Login flow with robert@stratalink.ai credentials
  - OTP email successfully sent via Resend API
  - Email code extraction from server logs confirmed
  - Complete authentication flow verified end-to-end
  - Session persistence and dashboard access confirmed