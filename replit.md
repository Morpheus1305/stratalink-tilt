# StrataLink Labs - Institutional Liquidity Terminal

## Overview
StrataLink Labs' Institutional Liquidity Terminal is a Web3 liquidity risk intelligence dashboard, inspired by the Bloomberg Terminal. Its core purpose is to deliver real-time digital asset analytics to regulators, exchanges, protocols, and institutional risk managers. The project aims to provide a production-ready MVP with an institutional-grade UI, leveraging both live and mock data for comprehensive analysis. Key capabilities include real-time market metrics, historical trend analysis, portfolio risk assessment, real-time alerts, and a detailed token scorecard. It integrates a Liquidity Ingestion Service (LIS) and a Terminal Information & Liquidity Terminal (TILT) for multi-venue liquidity data. The Digital Asset Consolidated Tape (DACT) v0.1 provides a cryptographically anchored, provenance-complete, venue-authentic consolidated tape, serving as the immutable ground truth for all downstream consumers.

## User Preferences
- **Dark Mode Default**: Application loads in dark mode
- **Auto-refresh**: Dashboard data refreshes every 10 seconds, charts every 30 seconds
- **Monospace for Data**: All numerical values use monospace fonts for alignment
- **Bloomberg Aesthetic**: Professional, information-dense financial interface

## System Architecture

### Core Design Principles
- **Digital Asset Consolidated Tape (DACT)**: A read-only, formally verified, and cryptographically anchored source of raw venue truth for market events. It guarantees provenance and immutability.
- **Binance Authenticity Rule**: Accept Binance data only if `venue === "binance" AND payload.provenance.sourceVenue === "binance" AND payload.provenance.transport === "relay"`. This single rule prevents fallback mislabeling forever. Enforced in: tape.ts, depth.ts, lis.ts, cexOrderbooks.ts.
- **Liquidity Truth System (LTS)**: Formalizes liquidity state with unified objects and price-independent invariants (TSLE - "intensity, resilience, and continuity of executable liquidity across venues, independent of price").
- **PoLi Formalization**: A numeric score (0-100) with rating bands (AAA-D) to quantify liquidity quality, including component breakdown and a `isReal` boolean.
- **Liquidity Horizons**: Context-aware timeframes (NOW, SESSION, BASELINE) for liquidity analysis.
- **Regime Classification**: Dynamic detection of market liquidity states (NORMAL, THIN, STRESSED, EARLY_WARNING, STRESS_BUILDING, CONFIRMED_STRESS).
- **Venue Role Doctrine**: Classifies exchanges (e.g., REFERENCE_VENUE, STRESS_VENUE) to enable cross-venue divergence detection.

### Frontend
Built with React, TypeScript, and Vite, using Wouter for routing and TanStack Query v5 for state management. UI components are styled with Shadcn UI and Tailwind CSS, and data visualization is handled by Recharts.
-   **Main Dashboard**: Overview with PoLi Score, Market Depth, Bid-Ask Spread, Volatility, CEX/DEX Ratio, DateTimeBar, and BottomTicker.
-   **Historical Trends**: PoLi Score, Market Depth, and Volatility across various timeframes.
-   **Portfolio Risk Assessment**: Multi-token comparison and PoLi scoring.
-   **Alerts & Stress Signals**: Real-time risk indicators and alert logs with a configuration UI.
-   **Token Scorecard**: Tabbed interface for Tokenomics (13 metrics) and Liquidity (42 metrics) with industry benchmarks.
-   **Dynamic Token Selection**: Uses CoinMarketCap's Top 20 tokens, with PoLi liquidity quality ratings displayed.
-   **Identity Module**: Provides on-chain identity intelligence via Arkham API integration for Liquidity Fragmentation, MM Integrity, PoLi+, Identity Alerts, and Regulatory Surveillance.
-   **Liquidity Tape**: Real-time event stream (DEPTH_UPDATE, TRADE, LIQUIDATION, FUNDING, SPREAD_CHANGE) with in-memory ring buffer and query API.
-   **Yesterday vs Today Comparison Panel**: Synthetic comparative analysis against simulated prior-session values.
-   **Token Liquidity League Table**: Sortable summary of tracked tokens.
-   **CCP Margin Verification Console**: Unified dashboard for Clearing House and CCP risk officers to verify collateral liquidity using STRATA, PoLi, TSLE, and DACT infrastructure. Features:
    - Standard app navigation (DashboardHeader + PlatformTabs) for seamless navigation across the platform
    - Five unified value propositions in one view: Pre-Trade Verification, Margin Accuracy, Manipulation Detection, Member Risk Assessment, PoLi Attestations (Canton Network anchored)
    - Responsive three-column layout with fluid sidebars (clamp-based widths 240px-380px) and adaptive metric grids
    - Left sidebar with clearing members list (search, selection, status badges) shared across all views
    - Stress scenario toggles (Normal, 12h, 4h, 1h liquidation windows)
    - Four key metrics cards (STRATA Score, Traditional Haircut, STRATA-Adjusted Value, Margin Gap)
    - Collateral table with expandable rows showing PoLi verification, TSLE analysis, DACT venue distribution
    - Right panel with TSLE Alerts feed and STRATA Trends (30-day margin gap analysis)
    - Data Provenance panel with simulation mode indicators and disclaimers
    - DateTimeBar and BottomTicker at the bottom for consistent app-wide UX
    - Synthetic data based on proxy instruments for tokenized securities (Russell 1000, US Treasuries, ETFs)
    - Demo route available at /demo/ccp-margin for testing

### Backend
Uses Express.js with in-memory storage (MemStorage) to provide API endpoints for dashboard data, historical trends, portfolio risk, alerts, and token scorecard metrics. It dynamically generates asset-specific data for BTC, ETH, and SOL.
-   **STRATA Analytics Backend**: Node.js service for real-time market structure analytics, including multi-exchange pricing aggregator and engines for orderbook depth, funding rates, liquidations, and stress scoring.
-   **STRATA Daily Engine**: Python-based system for daily crypto market structure summaries from various API sources, generating structured JSON and Markdown reports.
-   **STRATA Liquidity 5-Factor Model**: Weighted composite scoring system for institutional liquidity assessment (Depth Quality, Execution Efficiency, Liquidity Stability, Market Fragmentation, Risk Concentration).
-   **Alert System**: Manages alert trigger types (DIVERGENCE, REGIME_CHANGE, POLI_DROP, DEPTH_DROP) with configurable notification channels (Email, Webhooks) and PostgreSQL persistence.

### Design System
-   **Colors**: Bloomberg-inspired dark theme with primary yellow, accent cyan, success green, and destructive red.
-   **Typography**: Inter for general text, monospace for numerical data.
-   **Layout**: Information-dense, grid-first, fully responsive with full-width panels.

## External Dependencies
-   **CoinGecko API**: Live cryptocurrency pricing.
-   **Binance API**: Real-time order book depth.
-   **CoinMarketCap API**: Top 20 cryptocurrency rankings.
-   **Resend**: Email delivery service.
-   **Recharts**: Frontend financial data visualization.
-   **Lucide React**: Icon system.
-   **Shadcn UI**: Accessible UI component library.
-   **Tailwind CSS**: Utility-first CSS framework.
-   **PostgreSQL**: Database for alert rules and history.
-   **Arkham API**: On-chain identity intelligence.
-   **Coinbase API**: Exchange connector.
-   **Kraken API**: Exchange connector.
-   **OKX API**: Exchange relay (`/okx/spot/depth`, `/okx/perps/depth`, `/okx/funding`) — live orderbook and funding rate data normalized to LISSnapshot.
-   **Bybit API**: Exchange relay (`/bybit/spot/depth`, `/bybit/perps/depth`, `/bybit/perps/funding`, `/bybit/perps/oi`) — live orderbook and funding data normalized to LISSnapshot. Falls back to CoinGecko-anchored synthetic depth when API is geo-blocked (403).
-   **dYdX v4 Indexer**: Perpetuals DEX relay (`/dydx/perps/depth`, `/dydx/perps/funding`, `/dydx/perps/oi`) — live CLOB orderbook data from Cosmos appchain indexer, normalized to LISSnapshot.
-   **Bitget API**: Exchange relay (`/bitget/spot/depth`, `/bitget/perps/depth`, `/bitget/perps/funding`, `/bitget/perps/oi`) — live orderbook depth (spot via v2 orderbook, perps via v2 merge-depth) normalized to LISSnapshot with TSLE recording.
-   **GMX v2 (Arbitrum)**: DEX relay (`/gmx/perps/depth`, `/gmx/perps/funding`, `/gmx/perps/oi`) — pool-based perpetuals with oracle pricing from `arbitrum-api.gmxinfra.io`. Depth synthesized from pool TVL + oracle mid price, marked `transport: "synthetic"` in provenance.
-   **Deribit API**: Derivatives exchange relay (`/deribit/perps/depth`, `/deribit/spot/depth`) — live orderbook data normalized to LISSnapshot.
-   **Hyperliquid API**: Perpetuals DEX relay (`/hyperliquid/perps/depth`, `/hyperliquid/perps/meta`, `/hyperliquid/perps/funding`) — live L2 book data.
-   **Uniswap V3 (The Graph + DeFiLlama)**: DEX spot relay (`/uniswap/spot/depth`, `/uniswap/pools`) — pool TVL-based depth bands with CoinGecko pricing fallback.
-   **DeFiLlama API**: DEX TVL data fallback for Uniswap pool depth.
-   **Curve Finance**: DEX spot relay (`/curve/spot/depth`) — pool-based AMM with deep stablecoin and pegged-asset liquidity on Ethereum. Depth synthesized from pool TVL with CoinGecko pricing, marked `transport: "synthetic"` when live API unavailable.
-   **OTC (RFQ)**: Bilateral dark liquidity relay (`/otc/spot/depth`, `/otc/perps/depth`) — institutional RFQ desk quotes at large notional sizes. Requires onboarding (OTC_RFQ_URL). Falls back to synthetic depth when unconfigured.
-   **Canton Network (Digital Asset)**: On-chain attestation relay (`/canton/attestation/depth`, `/canton/attestation/liquidity`) — cryptographically attested liquidity data from Daml contracts. Requires partner onboarding (CANTON_LEDGER_URL). PoLi L5 trust tier.
-   **Coinglass/Laevitas**: Funding rates, open interest, liquidations data.