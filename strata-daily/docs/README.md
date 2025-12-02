# STRATA Daily Crypto Market Structure Attribution – Build Specification

This document defines the automation blueprint for generating the STRATA Daily Crypto Market Structure Summary inside the Institutional Liquidity Terminal.

## Overview

The STRATA Daily Engine automatically generates comprehensive market structure summaries by:
1. Pulling data from multiple API sources
2. Processing into STRATA attribution factors
3. Building structured JSON summaries
4. Rendering human-readable Markdown reports
5. Exporting to the TILT dashboard

## Folder Structure

```
strata-daily/
├── api/                    # API integration modules
│   ├── __init__.py
│   ├── arkham.py          # Arkham Intelligence API
│   ├── coingecko.py       # CoinGecko market data
│   ├── cex.py             # Binance/OKX orderbook data
│   └── derivatives.py     # Coinglass/Laevitas derivatives
├── processors/            # Data processing modules
│   ├── __init__.py
│   ├── liquidity.py       # Liquidity microstructure
│   ├── flows.py           # Flows & positioning
│   ├── onchain.py         # On-chain activity
│   ├── tokenomics.py      # Tokenomics & sectors
│   └── sectors.py         # Sector performance
├── renderer/              # Output rendering modules
│   ├── __init__.py
│   ├── json_renderer.py   # JSON output
│   └── md_renderer.py     # Markdown output
├── output/                # Generated output files
│   ├── charts/            # Generated chart images
│   ├── daily_summary.json
│   └── daily_summary.md
├── docs/                  # Documentation
│   └── README.md
└── daily_engine.py        # Main entry point
```

## API Sources

| Source | Data Type | Endpoint |
|--------|-----------|----------|
| Arkham | Stablecoin flows, exchange flows, whale activity | Arkham Intelligence API |
| CoinGecko | Prices, global market data | api.coingecko.com |
| Binance/OKX | Orderbook depth, bid-ask spreads | CEX APIs |
| Coinglass/Laevitas | Funding rates, open interest, liquidations | Derivatives APIs |

## JSON Schema

The daily summary JSON follows this structure:

```json
{
  "date": "YYYY-MM-DD",
  "summary": {
    "dominant_factor": "string",
    "regime_sentence": "string"
  },
  "snapshot": {
    "btc_price": number,
    "eth_price": number,
    "sol_price": number,
    "total_market_cap": number,
    "liquidations_24h": number,
    "breadth_positive": number,
    "breadth_negative": number,
    "stablecoin_flows": {
      "usdt_net": number,
      "usdc_net": number
    }
  },
  "charts": {
    "liquidations_chart": "path",
    "depth_chart": "path",
    "funding_oi_chart": "path"
  },
  "drivers": {
    "liquidity_micro": {...},
    "flows_positioning": {...},
    "onchain": {...},
    "tokenomics_sector": {...}
  },
  "leaders": ["array"],
  "laggards": ["array"],
  "events": ["array"],
  "closing_note": "string"
}
```

## Engine Workflow

1. **Pull Data** - Fetch from all API sources (Arkham, CoinGecko, CEX, Derivatives)
2. **Process Factors** - Transform raw data into STRATA attribution factors
3. **Build Summary** - Construct the daily JSON summary object
4. **Render Markdown** - Generate human-readable Markdown report
5. **Export to TILT** - Push to the Institutional Liquidity Terminal dashboard

## Usage

Run the daily engine:

```bash
cd strata-daily
python daily_engine.py
```

## Output Files

- `output/daily_summary.json` - Structured JSON data
- `output/daily_summary.md` - Human-readable Markdown report
- `output/charts/` - Generated visualization charts

## STRATA Attribution Factors

### Liquidity Microstructure
- Depth change
- Orderbook imbalance
- Bid-ask spreads
- CEX vs DEX distribution
- Stablecoin rotation

### Flows & Positioning
- Funding rates
- Basis (spot vs perp)
- Open interest changes
- Liquidation cascades
- Exchange flows

### On-Chain Activity
- Transaction activity
- Whale behavior
- Velocity/NVT metrics

### Tokenomics & Sector
- High FDV tokens
- Token unlocks
- Staking dynamics
- Sector beta (AI, L2, DeFi, RWA, Memecoins)

## Integration with TILT Dashboard

The generated JSON summary is consumed by the Institutional Liquidity Terminal to:
- Display daily market structure attribution
- Power real-time dashboard widgets
- Generate compliance reports
- Trigger alert conditions

---

*STRATA Daily Engine - Institutional Liquidity Intelligence*
