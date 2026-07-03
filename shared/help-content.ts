/**
 * Central help content configuration for the TILT platform.
 * All content sourced from official TILT documentation.
 * Editing this file updates help text across the entire platform.
 */

// ─── Quick Start ──────────────────────────────────────────────────────────────

export interface QuickStartStep {
  num: number;
  title: string;
  body: string;
  bullets?: string[];
}

export const QUICK_START_STEPS: QuickStartStep[] = [
  {
    num: 1,
    title: "Sign In",
    body: "Navigate to the TILT platform URL provided by Stratalink. Enter your credentials. You will land directly on the Liquidity page, which is the main terminal view.",
  },
  {
    num: 2,
    title: "Understand the Five Tabs",
    body: "The tab bar gives you access to five operational views:",
    bullets: [
      "LIQUIDITY — Real-time liquidity health across venues. L5F composite score, venue depth map, spread analysis, regime classification. Your primary daily view.",
      "STRATA AI — Market intelligence and manipulation detection. Six detection categories monitored in real time. Intelligence signal feed showing anomalies as they are detected.",
      "PoLi / PoMI — Verification and stability protocols. PoLi (Proof of Liquidity) scores with venue attribution. PoMI (Proof of Market Integrity) coordination framework status.",
      "RCL — Regulatory Consumption Layer. Supervisory-specific view with Coverage, Truth, and Provenance panels. Tier 3 full venue attribution. Evidence levels and data lineage.",
      "ALERTS — Alert configuration and history. View triggered alerts, configure thresholds, and review historical alert data.",
    ],
  },
  {
    num: 3,
    title: "Select a Token",
    body: "The ILU-20 token selector is in the header bar. Click it to see all 20 tokens in the Institutional Liquidity Universe, grouped by systemic category (Reserve, Stablecoin, Exchange, Infrastructure, Liquidity). Select any token — all pages update to reflect that token's data. Tokens marked LIVE have active venue data; tokens marked — are in the universe but awaiting venue feed activation.",
  },
  {
    num: 4,
    title: "Your Morning Review (Mode 1)",
    body: "This is the daily workflow you will use most:",
    bullets: [
      "Open TILT. You land on the Liquidity page.",
      "Check the L5F composite score in the top-left circle. Green (75+) means healthy. Amber (50–74) means monitor. Red (below 50) means investigate.",
      "Scan the EWDS indicators (Fund Rate, Perp Basis, Insurance Fund, Cross-Margin Utilisation, Altcoin Liquidity, ADL Count). Green across the board means no stress.",
      "Check the Cross-Venue Depth Map for venue-level detail. Look for any venue showing red status.",
      "Click to the STRATA AI tab. Check the six detection categories. All NORMAL means no anomalies.",
      "Click to ALERTS. Check for any new alerts since yesterday.",
      "If everything is green, your morning check is complete. If anything is amber or red, drill into the detail.",
    ],
  },
  {
    num: 5,
    title: "When Something Is Flagged (Mode 2)",
    body: "If a detection category shows ELEVATED or CRITICAL on the STRATA AI page, click into the intelligence feed for detail. Each signal includes the affected token, the anomaly type, and a description of what was detected. Cross-reference with the Liquidity page to see the venue-level data.",
  },
  {
    num: 6,
    title: "Investigating a Past Event (Mode 3)",
    body: "For post-event investigation, use the RCL tab. Select the token and time period. The Coverage, Truth, and Provenance panels show the verified state of the market at that point. All data carries a full audit trail from source venue to displayed value.",
  },
  {
    num: 7,
    title: "Getting Help",
    body: "Click the help icon in the header bar for contextual guidance on the current page. Refer to this User Guide for comprehensive documentation. Click the ? icons next to any metric for instant in-app definitions. Contact Stratalink support using the details in the Pilot Operations Handbook.",
  },
];

// ─── User Guide ───────────────────────────────────────────────────────────────

export interface GuideSubsection {
  id: string;
  title: string;
  body: string;
}

export interface GuideSection {
  id: string;
  title: string;
  subsections: GuideSubsection[];
}

export const USER_GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "overview",
    title: "Platform Overview",
    subsections: [
      {
        id: "intro",
        title: "What is TILT?",
        body: "TILT (The Institutional Liquidity Truth) is Stratalink's institutional liquidity intelligence platform. It provides independent, real-time, cross-venue liquidity verification and market integrity intelligence for the Institutional Liquidity Universe (ILU-20): 20 digital assets selected by systemic importance. The platform is organised across five pages, each accessible via the tab bar.",
      },
      {
        id: "header",
        title: "Header Bar",
        body: "The header bar appears on every page. It contains the Stratalink logo and platform title, the ILU-20 token selector, the LIVE status indicator, notification bell, settings, and sign-out button. The ILU-20 token selector is the single mechanism for choosing which token's data is displayed across all pages.",
      },
      {
        id: "token-selector",
        title: "ILU-25 Token Selector",
        body: "The token selector dropdown shows all 25 ILU tokens grouped by six systemic categories: Reserve Assets, Stablecoin Infrastructure, Exchange and Trading Infrastructure, Financial Infrastructure, High-Volume Liquidity Assets, and Digital Securities & RWA. Each token shows its LIVE status (actively receiving venue data) or — (in universe but awaiting feed activation). Selecting a token updates every page in the platform.",
      },
      {
        id: "ticker",
        title: "ILU-25 Ticker",
        body: "The persistent ticker bar at the bottom of every page scrolls all 25 ILU assets with their current PoLi scores. The ticker provides constant market context regardless of which page you are viewing. Hover over the ticker to pause scrolling.",
      },
    ],
  },
  {
    id: "liquidity",
    title: "Liquidity Page",
    subsections: [
      {
        id: "metrics-strip",
        title: "Metrics Strip",
        body: "The horizontal strip below the token selector shows six summary metrics: Total Depth (aggregate orderbook depth across all venues at a defined basis point threshold), Venues Live (number of venues actively returning data), Spread Dispersion (cross-venue spread variation in basis points), Volume Regime (NORMAL, ELEVATED, or STRESSED), Regulated (percentage of liquidity from regulated venues), and Offshore (percentage from offshore venues).",
      },
      {
        id: "l5f",
        title: "L5F Composite Score",
        body: "The L5F (Liquidity 5-Factor Score) composite is displayed as a circular score ring (0–100) with a status label (ROBUST, STABLE, DETERIORATING, STRESSED, or CRITICAL). The five factors are shown with individual scores and weighted progress bars: Depth Quality (×0.30), Resilience (×0.20), Fragmentation (×0.15), Execution Integrity (×0.20), and Regime Stability (×0.15). Formula: 0.30×DQ + 0.20×R + 0.15×(100–F) + 0.20×EI + 0.15×RS.",
      },
      {
        id: "venue-attribution",
        title: "Venue Liquidity Attribution",
        body: "Below the L5F factors, the venue attribution strip shows each active venue's individual contribution: venue name, depth, percentage of global depth, per-venue PoLi score, spread, and RAG status. Venues are sorted by depth contribution (largest first). This immediately shows whether liquidity is genuine and diversified or thin and concentrated.",
      },
      {
        id: "depth-map",
        title: "Cross-Venue Depth Map",
        body: "A table showing all active venues with depth at the configured basis point threshold, percentage of global depth, regulated status, stability score, and a depth share bar. This panel provides the granular venue-level detail that supports supervisory analysis.",
      },
      {
        id: "stress-regime",
        title: "Stress and Regime",
        body: "The right sidebar shows real-time stress indicators: Liquidity Withdrawal Velocity, Depth Decay Rate, Spread Elasticity, Funding Skew (Perps vs Spot), and Derivatives Dominance. The Regime Classification panel shows the current market regime (NORMAL – STABLE, ELEVATED, or STRESSED) with a coloured background.",
      },
      {
        id: "structural",
        title: "Structural Integrity",
        body: "Shows the Fragmentation Index (HHI-based, measuring liquidity concentration), Cross-Venue Spread Dispersion, Basis Dispersion (Spot vs Perp), and Price Leadership Index (which venue is leading price discovery).",
      },
    ],
  },
  {
    id: "strata-ai",
    title: "STRATA AI Page",
    subsections: [
      {
        id: "detection-grid",
        title: "Detection Status Grid",
        body: "Six detection categories displayed as a horizontal grid with RAG status indicators: Cross-Venue Divergence (abnormal spread or depth differences between venues), Depth Manipulation (unusual depth patterns), Liquidity Concentration (single-venue dominance), Spread Anomaly (unusual spread widening), Regime Instability (market regime transitions), and Execution Integrity (execution quality deterioration).",
      },
      {
        id: "intel-feed",
        title: "Intelligence Feed",
        body: "A real-time feed of analytical signals generated when detection categories change status. Each signal includes the timestamp, severity, category, affected token, and a detailed description of what was detected with supporting data values. Signals are not the same as alerts — they are the raw detection output.",
      },
      {
        id: "ewds",
        title: "EWDS Early Warning Indicators",
        body: "Six stress indicators that historically provided 6–8 hours of advance warning before systemic events: Fund Rate, Perp Basis, Insurance Fund, Cross-Margin Utilisation, Altcoin Liquidity, and ADL Count. Each shows a RAG-coloured value updated in real time.",
      },
      {
        id: "composite-integrity",
        title: "Composite Market Integrity Score",
        body: "An aggregate score computed from the six detection categories, displayed as a score ring with a letter rating and status label. When all categories are NORMAL, the composite is high. Elevated or critical categories reduce the composite. This provides a single-number summary of overall market integrity.",
      },
    ],
  },
  {
    id: "poli-pomi",
    title: "PoLi / PoMI Page",
    subsections: [
      {
        id: "poli-card",
        title: "PoLi Card",
        body: "Shows the live Proof of Liquidity score for the selected token: numeric score, letter rating (AAA through D), and market status. PoLi answers the question: is the reported liquidity for this token genuine, or is it manipulated, thin, or artificial? The threshold for 'liquidity is real' is a score of 40.",
      },
      {
        id: "pomi-card",
        title: "PoMI Card",
        body: "Shows the Proof of Market Integrity coordination framework status. PoMI's three pillars (Threshold Definition, Throttle Activation, Venue Synchronisation) are displayed with individual status indicators. PoMI is a patent-protected protocol in active development. Values shown are derived from live market data.",
      },
      {
        id: "efi",
        title: "Execution Feasibility Index",
        body: "A chart showing whether the market is executable for institutional-size orders, plotted over time. Values range from 0 (market failure) to 1 (nominal). Above 0.80 is nominal. Between 0.50 and 0.79 is degraded. Below 0.50 is non-executable.",
      },
      {
        id: "venue-depth-spread",
        title: "Venue Depth and Spread Monitor",
        body: "Per-venue depth and spread data with RAG status, supporting the PoLi attribution analysis. This panel shows the raw venue data behind the PoLi score computation.",
      },
      {
        id: "pomi-framework",
        title: "PoMI Coordination Framework",
        body: "The three PoMI pillars with individual scores: Threshold Definition (based on EWDS stress levels), Throttle Activation (based on regime classification and systemic stress), and Venue Synchronisation (based on cross-venue divergence and ability to coordinate a stability response).",
      },
    ],
  },
  {
    id: "rcl",
    title: "RCL Page",
    subsections: [
      {
        id: "coverage",
        title: "Coverage Panel",
        body: "Shows the selected instrument, venue count, liquidity types covered, coverage completeness, and last ingestion timestamp. This panel answers: how much of the market for this token are we actually seeing? Higher coverage percentages indicate more complete market observation.",
      },
      {
        id: "truth",
        title: "Truth Panel",
        body: "Shows the PoLi verification status (VERIFIED or PENDING), evidence level (L1 through L5), integrity assessment, data gap count, ingestion latency, and normalisation status. This panel answers: can we trust the data we are seeing?",
      },
      {
        id: "provenance",
        title: "Provenance Panel",
        body: "Shows each venue's connection details: venue name, connection method, active data modules, normalisation status, last event timestamp, and LIS reference ID. Reference IDs and authoritative records provide the full audit trail from source venue to displayed value.",
      },
      {
        id: "export",
        title: "Export",
        body: "The RCL view supports JSON and PDF export of the current snapshot, including all coverage, truth, and provenance data with timestamps and reference identifiers. Automated daily, weekly, and monthly reports are also available.",
      },
    ],
  },
  {
    id: "alerts",
    title: "Alerts Page",
    subsections: [
      {
        id: "alert-types",
        title: "Alert Types",
        body: "Four trigger types: DIVERGENCE (cross-venue spread or depth divergence), REGIME_CHANGE (market regime transition), POLI_DROP (PoLi score decline below threshold), and DEPTH_DROP (venue depth decline below threshold). Each alert records the timestamp, affected token, severity, and a description of the triggering condition.",
      },
      {
        id: "alert-config",
        title: "Alert Configuration",
        body: "Threshold levels can be configured per supervised token. Alert delivery is via the dashboard notification bell and, when configured, via email. Use the Settings panel to configure notification severity filters and email delivery preferences.",
      },
    ],
  },
];

// ─── PoLi Rating Table ────────────────────────────────────────────────────────

export const POLI_RATING_BANDS = [
  { range: "90 – 100", rating: "AAA", interpretation: "Exceptional liquidity. Deep, balanced, institutional-grade." },
  { range: "80 – 89",  rating: "AA",  interpretation: "Strong liquidity. Reliable execution at size." },
  { range: "70 – 79",  rating: "A",   interpretation: "Good liquidity. Adequate for most institutional needs." },
  { range: "60 – 69",  rating: "BBB", interpretation: "Fair liquidity. Serviceable with some execution risk." },
  { range: "50 – 59",  rating: "BB",  interpretation: "Marginal liquidity. Elevated execution risk." },
  { range: "40 – 49",  rating: "B",   interpretation: "Thin liquidity. Significant execution risk." },
  { range: "25 – 39",  rating: "CCC", interpretation: "Distressed liquidity. Extreme caution required." },
  { range: "0 – 24",   rating: "D",   interpretation: "Dislocated. Liquidity effectively absent." },
];

// ─── Glossary ─────────────────────────────────────────────────────────────────

export interface GlossaryTerm {
  term: string;
  definition: string;
}

export interface GlossarySection {
  id: string;
  title: string;
  terms: GlossaryTerm[];
}

export const GLOSSARY_SECTIONS: GlossarySection[] = [
  {
    id: "metrics",
    title: "Metrics and Scores",
    terms: [
      { term: "L5F Composite", definition: "The Liquidity 5-Factor Score. A weighted composite (0–100) of five factors: Depth Quality (30%), Resilience (20%), Fragmentation (15%), Execution Integrity (20%), and Regime Stability (15%). Represents the overall liquidity health of a token across all monitored venues." },
      { term: "Depth Quality", definition: "L5F factor measuring orderbook depth at defined basis point thresholds. Higher scores indicate deeper, more robust orderbooks across venues." },
      { term: "Resilience", definition: "L5F factor measuring the speed and completeness of orderbook recovery after a liquidity shock. Higher scores indicate faster recovery." },
      { term: "Fragmentation", definition: "L5F factor measuring the distribution of liquidity across venues. Low fragmentation (high score) means liquidity is well-distributed. High fragmentation (low score) means liquidity is concentrated, creating systemic risk." },
      { term: "Execution Integrity", definition: "L5F factor measuring the reliability and quality of trade execution across venues. Higher scores indicate consistent, predictable execution." },
      { term: "Regime Stability", definition: "L5F factor measuring the stability of the current market regime. Higher scores indicate a stable regime with no signs of transition." },
      { term: "PoLi Score", definition: "Proof of Liquidity score (0–100). Measures whether the reported liquidity for a token is genuine, based on verified depth, spread quality, and bid-ask balance across venues." },
      { term: "PoLi Rating", definition: "Letter grade (AAA through D) derived from the PoLi score. AAA (90–100) represents exceptional institutional-grade liquidity. D (0–24) represents dislocated, effectively absent liquidity. The threshold for 'liquidity is real' is 40 (B rating)." },
      { term: "PoMI Score", definition: "Proof of Market Integrity score (0–100). Derived from the three PoMI pillars (Threshold, Throttle, Venue Sync). Represents the coordination readiness of the market stability framework. Patent-protected protocol." },
      { term: "Execution Feasibility Index", definition: "A 0–1 score indicating whether the market is executable for institutional-size orders. 0.80+ is nominal, 0.50–0.79 is degraded, below 0.50 is non-executable." },
      { term: "Fragmentation Index (HHI)", definition: "Herfindahl-Hirschman Index applied to venue depth distribution. Low values (near 0) indicate diversified liquidity. High values (near 1) indicate concentrated liquidity." },
      { term: "Liquidation Pressure Index", definition: "A 0–1 score indicating systemic liquidation stress. Low values indicate normal conditions. High values indicate cascading liquidation risk." },
    ],
  },
  {
    id: "ewds",
    title: "EWDS Indicators",
    terms: [
      { term: "Fund Rate", definition: "The funding rate on perpetual futures contracts. Elevated funding rates indicate leveraged positioning that can unwind rapidly." },
      { term: "Perp Basis", definition: "The spread between perpetual futures price and spot price. Widening basis indicates market dislocation between derivatives and spot." },
      { term: "Ins Fund", definition: "Insurance fund level at derivatives venues. Declining insurance funds indicate increasing auto-deleverage risk." },
      { term: "XMrg Util", definition: "Cross-margin utilisation. High utilisation indicates traders are near their margin limits, increasing forced liquidation risk." },
      { term: "Alt Liq", definition: "Altcoin liquidity ratio. Measures the liquidity of the selected token relative to BTC liquidity. Declining ratio indicates fragility." },
      { term: "ADL Count", definition: "Auto-deleverage trigger count. The number of auto-deleveraging events on derivatives venues. Non-zero values indicate active liquidation cascades." },
    ],
  },
  {
    id: "detection",
    title: "STRATA AI Detection Categories",
    terms: [
      { term: "Cross-Venue Divergence", definition: "Abnormal differences in spread or depth between venues for the same token. Can indicate arbitrage breakdown or venue-specific manipulation. ELEVATED: >3 bps dispersion. CRITICAL: >8 bps." },
      { term: "Depth Manipulation", definition: "Unusual depth patterns suggesting artificial orderbook padding: depth that appears and disappears rapidly, or depth that is not executable. ELEVATED: DQ < 40. CRITICAL: DQ < 20." },
      { term: "Liquidity Concentration", definition: "Single-venue dominance where one venue holds a disproportionate share of total depth. Creates systemic fragility. ELEVATED: >60% single-venue share. CRITICAL: >80%." },
      { term: "Spread Anomaly", definition: "Unusual spread widening or cross-venue spread dislocation beyond normal arbitrage bounds. ELEVATED: >3 bps dispersion. CRITICAL: >8 bps." },
      { term: "Regime Instability", definition: "Market regime transitioning from stable to stressed conditions, indicated by deteriorating L5F factors. ELEVATED: non-NORMAL regime. CRITICAL: STRESSED regime." },
      { term: "Execution Integrity", definition: "Deterioration in execution quality suggesting market dysfunction: increased slippage, failed fills, or inconsistent execution. ELEVATED: EI < 60. CRITICAL: EI < 30." },
    ],
  },
  {
    id: "status",
    title: "Status Labels and RAG Indicators",
    terms: [
      { term: "NORMAL / STABLE (Green)", definition: "All metrics within acceptable parameters. No anomalies detected. No action required." },
      { term: "ELEVATED / MONITORING (Amber)", definition: "One or more metrics approaching threshold levels, or an anomaly detected that warrants monitoring. Review the detail and assess whether escalation is needed." },
      { term: "CRITICAL / STRESSED (Red)", definition: "Significant threshold breach or anomaly. Immediate attention required. Review venue-level detail and consider escalation." },
      { term: "LIVE", definition: "The system is actively receiving and processing real-time data from venue feeds." },
      { term: "VERIFIED", definition: "The RCL data pipeline has verified that the data meets integrity, completeness, and normalisation requirements." },
      { term: "AWAITING DATA", definition: "The token is in the ILU universe but venue feeds are not yet active. No data is available." },
    ],
  },
  {
    id: "architecture",
    title: "Architectural Terms",
    terms: [
      { term: "ILU-20", definition: "Institutional Liquidity Universe. The 20 digital assets selected by systemic importance that TILT continuously monitors across all pages." },
      { term: "Liquidity Truth Stack", definition: "Stratalink's seven-layer architecture (L0–L6) from governance (LTF) through data aggregation (DACT), intelligence (STRATA AI), integrity (PoMI), liquidity verification (PoLi), on-chain attestation (Oracle), to regulatory consumption (RCL)." },
      { term: "DACT", definition: "Digital Assets Consolidated Tape. The real-time multi-venue data aggregation layer (L1) that normalises venue data into a single canonical schema." },
      { term: "TSLE Buffer", definition: "Time-Series Liquidity Engine buffer. An in-memory ring buffer storing 360 data points (approximately one hour of history at 10-second intervals) for real-time analytics." },
      { term: "Canton Network", definition: "The institutional-grade distributed ledger on which Stratalink publishes cryptographically signed attestations via the Stratalink Oracle. Provides sub-transaction privacy and immutable audit trails." },
      { term: "Tier 3 Access", definition: "Regulatory-level access that shows full venue attribution. Institutional consumers (Tier 1/2) see anonymised aggregate data." },
      { term: "LIS Reference", definition: "Liquidity Information Snapshot reference identifier. A unique ID linking a displayed value back to its source data for audit trail purposes." },
    ],
  },
];

// ─── FAQ ──────────────────────────────────────────────────────────────────────

export interface FaqItem {
  q: string;
  a: string;
}

export interface FaqSection {
  id: string;
  title: string;
  items: FaqItem[];
}

export const FAQ_SECTIONS: FaqSection[] = [
  {
    id: "general",
    title: "General",
    items: [
      { q: "What is TILT?", a: "TILT stands for The Institutional Liquidity Truth. It is Stratalink's platform for independent, real-time, cross-venue liquidity verification and market integrity intelligence. It monitors the Institutional Liquidity Universe (ILU-25): 25 digital assets selected by systemic importance across six categories, including a new Digital Securities & RWA category covering tokenized gold, tokenized Treasuries, and RWA infrastructure tokens." },
      { q: "Where does the data come from?", a: "TILT aggregates real-time orderbook, trade, and volume data from 14+ venues including Binance, Coinbase, Kraken, OKX, Bybit, Hyperliquid, Uniswap, and others. All data is normalised into a single canonical schema by the DACT layer. The data comes from venues directly, not from any third-party data aggregator." },
      { q: "Why are some tokens showing — instead of data?", a: "The ILU-25 defines 25 systemically important assets. Active venue data feeds may not yet be enabled for all 25. Tokens showing — are in the universe and will display data once their venue feeds are activated. The system does not show invented or placeholder data." },
      { q: "How often does the data update?", a: "The TSLE buffer receives venue data continuously. The TILT interface polls for updated snapshots every 5 seconds. PoLi scores, STRATA AI detection evaluations, and EWDS indicators update on each polling cycle." },
    ],
  },
  {
    id: "scores",
    title: "Scores and Ratings",
    items: [
      { q: "What does a PoLi score of 47 mean?", a: "A PoLi score of 47 falls in the B rating band (40–49), which means 'thin liquidity with significant execution risk.' The liquidity is technically real (the threshold is 40), but it is thin enough that institutional-size orders would face meaningful execution challenges. This would be classified as an amber/warning state." },
      { q: "What is the difference between the L5F score and the PoLi score?", a: "The L5F (Liquidity 5-Factor Score) measures overall liquidity health including resilience, fragmentation, and regime stability. The PoLi (Proof of Liquidity) score specifically answers whether the reported liquidity is genuine, based on depth, spread, and balance verification. Both use a 0–100 scale but measure different things: L5F tells you how healthy the liquidity is; PoLi tells you whether it is real." },
      { q: "What is the STRATA AI Composite Integrity Score?", a: "An aggregate score computed from the six STRATA AI detection categories (Cross-Venue Divergence, Depth Manipulation, Liquidity Concentration, Spread Anomaly, Regime Instability, Execution Integrity). When all categories are NORMAL, the composite is high. When categories are ELEVATED or CRITICAL, the composite drops." },
    ],
  },
  {
    id: "regulatory",
    title: "Regulatory Use",
    items: [
      { q: "What is the RCL?", a: "The Regulatory Consumption Layer is the supervisory-specific view within TILT. It provides Tier 3 access (full venue attribution), evidence levels, data provenance, and export capabilities designed for regulatory supervision. It is read-only by design." },
      { q: "Can I export data for supervisory reports?", a: "Yes. The RCL page supports JSON and PDF export of the current snapshot. Automated daily, weekly, and monthly reports are also available. Frequency and format are confirmed during onboarding." },
      { q: "What is the evidence level?", a: "The evidence level (L1 through L5) indicates the depth of venue coverage supporting the verification. L1 means single-venue data. L3 (Supervisory Sufficiency) means three or more venues providing corroborating data. L5 means full cross-venue verification across all monitored venues." },
      { q: "What does 'read-only by design' mean?", a: "TILT and RCL are architecturally constrained to display and analyse data. They cannot write back to any data source, cannot generate trading signals, cannot execute trades, and cannot provide financial advice. This constraint is an architectural principle embedded in the system design, ensuring Stratalink sits outside the regulatory perimeter." },
    ],
  },
  {
    id: "alerts",
    title: "Alerts and Detection",
    items: [
      { q: "How far in advance can STRATA AI detect problems?", a: "Based on validation against the October 2025 Great Perps Unwind event data, the STRATA AI detection framework identified stress signals 6–8 hours before the systemic collapse. The actual advance warning window depends on current EWDS stress levels: all green gives the full 6–8 hour window; elevated stress reduces it to 4–6 hours; active stress reduces it further." },
      { q: "What should I do when I see a red alert?", a: "A red (CRITICAL) alert means a significant threshold breach or anomaly has been detected. Review the alert detail to understand what triggered it. Cross-reference with the Liquidity page and STRATA AI page for context. Determine whether the situation warrants internal escalation within your supervisory team. The alert data, including timestamps and venue attribution, is available for inclusion in supervisory records." },
    ],
  },
  {
    id: "technical",
    title: "Technical",
    items: [
      { q: "What is the Institutional Liquidity Universe (ILU-20)?", a: "The ILU-20 is Stratalink's proprietary asset classification framework. It identifies the 20 digital assets that are systemically important to institutional digital asset markets, selected using weighted criteria including cross-venue liquidity, trading volume, derivatives open interest, stablecoin settlement usage, collateral usage, custodian support, institutional ownership, and interconnectedness." },
      { q: "What is Canton Network?", a: "Canton Network is the institutional-grade distributed ledger on which Stratalink publishes cryptographically signed attestations. Canton provides sub-transaction privacy (ensuring venue-attributed data is only visible to authorised regulatory parties) and immutable audit trails. Stratalink operates a validator node on Canton MainNet." },
    ],
  },
];

// ─── Data Dictionary ──────────────────────────────────────────────────────────

export interface DataDictRow {
  metric: string;
  source: string;
  computation: string;
  frequency?: string;
  thresholds?: string;
}

export interface DataDictSection {
  id: string;
  title: string;
  intro?: string;
  rows: DataDictRow[];
}

export const DATA_DICTIONARY: DataDictSection[] = [
  {
    id: "flow",
    title: "Data Flow Overview",
    intro: "All data displayed in TILT follows a strict upward flow through the Liquidity Truth Stack. Data originates at venue relays (L1), is normalised by the DACT aggregation layer, processed by STRATA AI analytics (L2), scored by PoLi (L4), and rendered by the TILT interface. No downstream layer writes back to an upstream layer. Venue relays poll source APIs at 5–10 second intervals. The TSLE buffer stores 360 data points (~1 hour of history at 10-second intervals).",
    rows: [],
  },
  {
    id: "liquidity",
    title: "Liquidity Page Data",
    rows: [
      { metric: "Total Depth",       source: "TSLE buffer",  computation: "Sum of all venue depths at configured bps threshold",               frequency: "Every 5 seconds" },
      { metric: "Venues Live",       source: "Venue relays", computation: "Count of venues returning non-null data in current cycle",           frequency: "Every 5 seconds" },
      { metric: "Spread Dispersion", source: "TSLE buffer",  computation: "Standard deviation of per-venue spreads in bps",                    frequency: "Every 5 seconds" },
      { metric: "L5F Composite",     source: "L5F engine",   computation: "0.30×DQ + 0.20×R + 0.15×(100–F) + 0.20×EI + 0.15×RS",             frequency: "Every 5 seconds" },
      { metric: "Depth Quality",     source: "L5F engine",   computation: "Normalised aggregate depth score based on depth at 10bps threshold", frequency: "Every 5 seconds" },
      { metric: "Resilience",        source: "L5F engine",   computation: "Orderbook recovery speed after shocks, from depth change velocity",  frequency: "Every 5 seconds" },
      { metric: "Fragmentation",     source: "L5F engine",   computation: "HHI-based concentration index inverted to 0–100 scale",             frequency: "Every 5 seconds" },
      { metric: "Execution Integrity", source: "L5F engine", computation: "Based on fill probability and execution quality metrics",            frequency: "Every 5 seconds" },
      { metric: "Regime Stability",  source: "L5F engine",   computation: "PoLi trend, depth trend, imbalance, and consecutive declines",      frequency: "Every 5 seconds" },
      { metric: "Per-venue depth",   source: "TSLE buffer",  computation: "Direct from venue relay API, normalised to USD",                    frequency: "Per relay poll" },
      { metric: "Per-venue spread",  source: "TSLE buffer",  computation: "Best bid/ask spread from venue orderbook, converted to bps",        frequency: "Per relay poll" },
    ],
  },
  {
    id: "strata",
    title: "STRATA AI Page Data",
    rows: [
      { metric: "Cross-Venue Divergence",  source: "TSLE buffer",  computation: "Compare per-venue spreads against divergence thresholds",           thresholds: "ELEVATED: >3 bps. CRITICAL: >8 bps" },
      { metric: "Depth Manipulation",      source: "L5F engine",   computation: "Depth Quality factor score",                                         thresholds: "ELEVATED: DQ<40. CRITICAL: DQ<20" },
      { metric: "Liquidity Concentration", source: "TSLE buffer",  computation: "Max single-venue share of total depth",                              thresholds: "ELEVATED: >60%. CRITICAL: >80%" },
      { metric: "Spread Anomaly",          source: "Structural",   computation: "Cross-venue spread dispersion",                                      thresholds: "ELEVATED: >3 bps. CRITICAL: >8 bps" },
      { metric: "Regime Instability",      source: "L5F engine",   computation: "Regime classification from L5F",                                     thresholds: "ELEVATED: non-NORMAL. CRITICAL: STRESSED" },
      { metric: "Execution Integrity",     source: "L5F engine",   computation: "Execution Integrity factor score",                                    thresholds: "ELEVATED: EI<60. CRITICAL: EI<30" },
    ],
  },
  {
    id: "poli",
    title: "PoLi Score Computation",
    intro: "The PoLi score (0–100) is computed from three components: Depth Score (0–40 points) measuring orderbook depth quality, Balance Score (0–35 points) measuring bid-ask symmetry, and Spread Score (0–25 points) measuring spread integrity. All three components are derived from normalised, cross-venue data that has passed STRATA AI surveillance checks.",
    rows: [
      { metric: "Depth Score",   source: "TSLE buffer", computation: "Orderbook depth quality across all venues (0–40 pts)",            frequency: "Per relay poll" },
      { metric: "Balance Score", source: "TSLE buffer", computation: "Bid-ask symmetry verification (0–35 pts)",                        frequency: "Per relay poll" },
      { metric: "Spread Score",  source: "TSLE buffer", computation: "Spread integrity verification (0–25 pts)",                        frequency: "Per relay poll" },
    ],
  },
  {
    id: "rcl",
    title: "RCL Page Data",
    rows: [
      { metric: "Venue Count",          source: "TSLE buffer",       computation: "Count of venues returning data for the selected token" },
      { metric: "Coverage %",           source: "TSLE / venue-config", computation: "(Active venues / Total configured venues) × 100" },
      { metric: "Evidence Level",       source: "Computed",          computation: "L1: 1 venue. L3: 3+ venues. L5: All configured venues active" },
      { metric: "Ingestion Latency p95",source: "Venue relays",      computation: "95th percentile of relay response times in milliseconds" },
      { metric: "Data Gaps",            source: "TSLE buffer",       computation: "Count of missing data points in the buffer's time window" },
      { metric: "LIS Reference",        source: "System-generated",  computation: "Unique ID linking the displayed snapshot to source data" },
    ],
  },
  {
    id: "venues",
    title: "Venue Data Sources",
    rows: [
      { metric: "Binance",       source: "TSLE/DACT",        computation: "Depth, trades, funding",           frequency: "Via DACT aggregation" },
      { metric: "Coinbase",      source: "REST API",          computation: "Depth, trades",                    frequency: "lis-coinbase.ts" },
      { metric: "Kraken",        source: "REST API",          computation: "Depth, trades",                    frequency: "Via DACT aggregation" },
      { metric: "OKX",           source: "WebSocket relay",   computation: "Depth, trades, funding",           frequency: "okx-relay.ts" },
      { metric: "Bybit",         source: "WebSocket relay",   computation: "Depth, trades",                    frequency: "bybit-relay.ts" },
      { metric: "Hyperliquid",   source: "WebSocket relay",   computation: "Depth, trades",                    frequency: "hyperliquid-relay.ts" },
      { metric: "Deribit",       source: "WebSocket relay",   computation: "Depth, trades, options",           frequency: "deribit-relay.ts" },
      { metric: "Uniswap",       source: "AMM adapter",       computation: "Pool depth, swap data",            frequency: "uniswap-relay.ts" },
      { metric: "dYdX",          source: "WebSocket relay",   computation: "Depth, trades",                    frequency: "dydx-relay.ts" },
      { metric: "GMX",           source: "AMM adapter",       computation: "Pool depth",                       frequency: "gmx-relay.ts" },
      { metric: "Curve",         source: "AMM adapter",       computation: "Pool depth",                       frequency: "curve-relay.ts" },
      { metric: "Bitget",        source: "WebSocket relay",   computation: "Depth, trades",                    frequency: "bitget-relay.ts" },
      { metric: "OTC",           source: "REST API",          computation: "RFQ depth",                        frequency: "otc-relay.ts" },
    ],
  },
];

// ─── In-App Help Tooltips ─────────────────────────────────────────────────────
// Keyed by help-key. Used by <HelpTooltip helpKey="..." /> components.

export interface HelpTooltipContent {
  title: string;
  text: string;
  thresholds?: string;
  evidenceLevel?: string;
}

export const HELP_TOOLTIPS: Record<string, HelpTooltipContent> = {
  // Liquidity page
  "l5f-composite": {
    title: "L5F Composite Score",
    text: "The Liquidity 5-Factor Score measures overall liquidity health across all monitored venues. It combines Depth Quality, Resilience, Fragmentation, Execution Integrity, and Regime Stability into a single 0–100 score.",
    thresholds: "Green (75+): healthy. Amber (50–74): monitor. Red (<50): investigate.",
  },
  "depth-quality": {
    title: "Depth Quality",
    text: "Measures orderbook depth at the configured basis point threshold across all venues. Higher scores indicate deeper, more robust orderbooks that can absorb institutional-size orders.",
  },
  "resilience": {
    title: "Resilience",
    text: "Measures how quickly and completely orderbooks recover after a liquidity shock. Higher scores indicate faster recovery and more resilient market microstructure.",
  },
  "fragmentation": {
    title: "Fragmentation",
    text: "Measures the distribution of liquidity across venues. Low fragmentation (high score) means liquidity is well-distributed. High fragmentation (low score) means liquidity is concentrated in fewer venues, increasing systemic risk.",
  },
  "execution-integrity": {
    title: "Execution Integrity",
    text: "Measures the reliability and consistency of trade execution across venues. Lower scores indicate deteriorating execution quality.",
    thresholds: "ELEVATED: EI < 60. CRITICAL: EI < 30.",
  },
  "regime-stability": {
    title: "Regime Stability",
    text: "Measures the stability of the current market regime. A declining score indicates the market may be transitioning from stable to stressed conditions.",
  },
  "depth-map": {
    title: "Cross-Venue Depth Map",
    text: "Shows each venue's orderbook depth, share of global depth, regulated status, stability score, and depth share bar. Venues are sorted by depth contribution. This table shows where liquidity actually is across the market.",
  },
  "regime-classification": {
    title: "Regime Classification",
    text: "The current market regime for the selected token.",
    thresholds: "NORMAL – STABLE: no pre-stress indicators. ELEVATED: some stress present. STRESSED: significant stress detected.",
  },
  // STRATA AI page
  "detection-grid": {
    title: "Detection Status Grid",
    text: "Six market integrity detection categories evaluated in real time. Each category shows NORMAL (green), ELEVATED (amber), or CRITICAL (red). All derive from live venue data through the L5F analytics engine.",
  },
  "intel-feed": {
    title: "Intelligence Feed",
    text: "Real-time signals generated when a detection category changes status. Each signal includes the specific data that triggered the change. Signals are not the same as alerts — they are the raw detection output.",
  },
  "ewds": {
    title: "EWDS Early Warning Indicators",
    text: "Early Warning Detection System. Six stress indicators (Fund Rate, Perp Basis, Insurance Fund, Cross-Margin Utilisation, Altcoin Liquidity, ADL Count) that historically provided 6–8 hours of advance warning before systemic events.",
  },
  "composite-integrity": {
    title: "Composite Market Integrity Score",
    text: "An aggregate score computed from all six detection categories. When all categories are NORMAL, the composite is high. Elevated or critical categories reduce the composite.",
  },
  // PoLi/PoMI page
  "poli-score": {
    title: "PoLi Score",
    text: "Proof of Liquidity. Independently verifies whether reported liquidity is genuine. Scored 0–100 from three components: Depth Score (orderbook quality), Balance Score (bid-ask symmetry), and Spread Score (spread integrity).",
    thresholds: "AAA (90+) through D (<25). Threshold for 'liquidity is real': score ≥ 40.",
  },
  "pomi-score": {
    title: "PoMI Score",
    text: "Proof of Market Integrity. Assesses the coordination readiness of the market stability framework across three pillars. PoMI is patent-protected and in active development. Values shown are derived from live data.",
  },
  "pomi-threshold": {
    title: "Threshold Definition",
    text: "PoMI Pillar 1. Evaluates whether market stress indicators have reached levels that would trigger the stability protocol. Derived from EWDS indicator levels.",
  },
  "pomi-throttle": {
    title: "Throttle Activation",
    text: "PoMI Pillar 2. Evaluates whether coordinated throttling measures are warranted based on regime classification and systemic stress levels.",
  },
  "pomi-venue-sync": {
    title: "Venue Synchronisation",
    text: "PoMI Pillar 3. Evaluates whether venues are behaving consistently or diverging, which affects the ability to coordinate a stability response.",
  },
  "execution-feasibility": {
    title: "Execution Feasibility Index",
    text: "A 0–1 index showing whether the market can execute institutional-size orders.",
    thresholds: "≥0.80: nominal. 0.50–0.79: degraded. <0.50: non-executable.",
  },
  // RCL page
  "rcl-coverage": {
    title: "Coverage Panel",
    text: "Shows how much of the market for this token we are actually observing: venue count, coverage percentage, and last ingestion timestamp.",
  },
  "rcl-truth": {
    title: "Truth Panel",
    text: "Shows whether we can trust the data we are seeing: PoLi verification status, evidence level, data integrity metrics, and normalisation status.",
  },
  "rcl-provenance": {
    title: "Provenance Panel",
    text: "Full audit trail showing each venue's connection details, data modules, timestamps, and reference identifiers. This is the data lineage from source to display.",
  },
  "evidence-level": {
    title: "Evidence Level",
    text: "Indicates the depth of venue coverage supporting the verification.",
    thresholds: "L1: single venue. L3 (Supervisory Sufficiency): 3+ venues. L5: full cross-venue verification.",
  },
};
