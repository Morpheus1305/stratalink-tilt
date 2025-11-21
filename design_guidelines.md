# Design Guidelines: Bloomberg Terminal-Style Web3 Liquidity Dashboard

## Design Approach

**Reference-Based Approach: Bloomberg Terminal Aesthetic**

This dashboard takes direct inspiration from Bloomberg Terminal's institutional-grade financial interface, optimized for information density, real-time data display, and professional trading environments. The interface prioritizes data comprehension, rapid scanning, and multi-metric monitoring over visual decoration.

## Typography System

**Font Families:**
- Primary: `'Roboto Mono'` or `'IBM Plex Mono'` (monospace for data, numbers, metrics)
- Headers: `'Inter'` or `'SF Pro Display'` (clean, professional sans-serif)
- Use via Google Fonts CDN

**Type Scale:**
- Metric Values: text-2xl to text-4xl (font-bold, monospace)
- Section Headers: text-lg to text-xl (font-semibold)
- Labels/Descriptions: text-sm (font-medium)
- Ticker Data: text-xs to text-sm (monospace, tracking-tight)
- Alert Text: text-sm (font-medium)

**Hierarchy Rules:**
- All numerical data uses monospace fonts for alignment
- Headers use sans-serif for readability
- Maintain tight line-height (leading-tight) for dense information layout

## Layout System

**Spacing Primitives:**
- Use Tailwind units: 2, 3, 4, 6, 8 for consistent spacing
- Card padding: p-4 to p-6
- Section gaps: gap-4 to gap-6
- Grid gaps: gap-3 to gap-4

**Grid Structure:**
- Dashboard uses dense grid layout: `grid-cols-12` for maximum flexibility
- Metrics panels: 3-4 column grids on desktop (grid-cols-3 lg:grid-cols-4)
- Charts occupy 6-8 column spans for prominence
- Sidebar/navigation: 2-3 column span (fixed width on large screens)

**Container Strategy:**
- Full-width dashboard (no centered max-width container)
- Edge-to-edge panels with minimal outer padding (p-2 to p-4)
- Dense layout: minimize whitespace between components

## Component Library

### 1. Header/Navigation Bar
- Fixed top bar spanning full width (h-14 to h-16)
- Left: StrataLink Labs branding + "LIQUIDITY TERMINAL" text
- Center: Navigation tabs (Overview, Analytics, Signals, Reports)
- Right: User account, settings icon, notification bell
- Include live timestamp/market status indicator

### 2. Live Metrics Ticker (Top Panel)
- Horizontal scrolling or grid of 5-6 key metrics
- Each metric card: Compact (p-3), displays Label + Large Value + % Change
- Include small trend arrow (up/down indicator)
- Layout: `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3`

### 3. Liquidity Intelligence Score (Hero Gauge)
- Large circular or semi-circular gauge (0-100 scale)
- Display: Current score (72), Risk level text, Trend indicator
- Component size: minimum 200px diameter
- Position: Left side of main content area
- Surrounding context: 24H change, Historical comparison

### 4. Stress Signal Detection Panel
- Card-based alert system
- Each alert includes: Icon (use Heroicons), Severity badge, Title, Description, Timestamp
- Layout: Vertical stack with dividers (divide-y)
- Severity levels: Critical, Warning, Info (differentiated through styling)
- Max height with scroll: `max-h-96 overflow-y-auto`

### 5. Key Metrics Grid
- 6-metric grid layout: `grid grid-cols-2 md:grid-cols-3 gap-4`
- Each card structure:
  - Label (text-sm, uppercase, tracking-wide)
  - Large value (text-3xl, monospace, font-bold)
  - Change percentage with arrow (text-sm)
  - Compact padding (p-4)

### 6. Liquidity Distribution Visualizations
- Side-by-side charts (50-50 split or 60-40)
- Bar Chart: Top 5-7 exchanges by liquidity depth
  - Horizontal bars with labels and values
  - Use library like Chart.js or Recharts
- Pie/Donut Chart: CEX vs DEX distribution
  - Large percentage labels
  - Legend with exact values

### 7. Time-Series Chart
- Full-width chart component (col-span-12 or col-span-8)
- Dual-line graph (e.g., liquidity depth + spread)
- Timeframe selector: 1H, 4H, 1D, 1W, 1M tabs (top-right)
- X-axis: Time labels, Y-axis: Value scales
- Height: `h-80 to h-96`
- Grid lines for reference (subtle)

### 8. Report Export Section
- Compact card in sidebar or bottom panel
- Title: "Proof-of-Liquidity Intelligence Report"
- Description of compliance standards (AQAP, FCX)
- Download button: "Export PDF Report" with download icon
- Include last generated timestamp

### 9. Bottom Ticker Bar
- Fixed bottom bar (h-10 to h-12)
- Auto-scrolling real-time crypto prices
- Format: SYMBOL | $PRICE | DEPTH | SPREAD | VOL
- Monospace font, compact spacing (gap-6 to gap-8)
- Seamless loop animation

### 10. Data Cards Pattern
- Consistent card structure across dashboard:
  - Border treatment (border or subtle shadow)
  - Rounded corners (rounded-lg)
  - Padding: p-4 to p-6
  - Header with title + action icon
  - Content area with organized data
  - Footer with metadata/timestamp

## Information Density Principles

**Bloomberg-Style Dense Layout:**
- Minimize vertical spacing between sections (gap-4 maximum)
- Use dividers instead of large gaps (border-b with subtle treatment)
- Stack components efficiently - no large empty spaces
- Multi-column layouts throughout (avoid single-column sections)
- Compact padding - prioritize content over breathing room
- Small font sizes acceptable for secondary information (text-xs)

**Visual Hierarchy:**
- Size contrast: Large metrics (text-3xl) vs labels (text-sm)
- Weight contrast: Bold values vs regular labels
- Spatial grouping: Related metrics clustered tightly
- Borders and dividers create structure without consuming space

## Responsive Behavior

**Desktop (lg:):** Full 12-column grid, multi-column metrics, side-by-side charts
**Tablet (md:):** 6-column grid, 2-column metric grids, stacked charts
**Mobile (base):** Single column stack, maintain data density, horizontal scrolling for wide tables/charts

## Icons & Assets

**Icon Library:** Heroicons (outline style for consistency)
- Alert icons: exclamation-triangle, exclamation-circle, information-circle
- Trend indicators: arrow-trending-up, arrow-trending-down
- Navigation: chart-bar, document-text, bell, cog
- Actions: download, refresh, expand

**No Custom SVGs:** Use Heroicons exclusively via CDN

## Accessibility & Interaction

- All numerical data must be screen-reader friendly (proper ARIA labels)
- Maintain consistent tab order for keyboard navigation
- Interactive elements (buttons, tabs) have clear focus states
- Real-time data updates include visual indicators (pulse, flash)
- Charts include text alternatives for data

## Animation & Motion

**Minimal, Purposeful Animation:**
- Data value transitions: Smooth number counting on updates (0.3s ease)
- Chart updates: Gentle line transitions, no dramatic effects
- Ticker scroll: Smooth auto-scroll (no pause/stutter)
- Alert arrivals: Subtle slide-in (0.2s)
- NO decorative animations, parallax, or scroll effects

## Critical Dashboard Constraints

- All data must be immediately visible - no content hidden behind tabs unless necessary
- Real-time update indicators on live metrics (pulsing dot, "LIVE" badge)
- Maintain consistent metric card structure throughout
- Terminal-style interface: Prioritize function over form, density over whitespace
- Professional institutional appearance - avoid consumer-facing design patterns