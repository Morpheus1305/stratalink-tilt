import json
from datetime import datetime

from api.arkham import get_arkham_data
from api.coingecko import get_prices, get_global
from api.cex import get_depth, get_spread
from api.derivatives import get_funding, get_open_interest, get_liquidations

from processors.liquidity import process_liquidity
from processors.flows import process_flows
from processors.onchain import process_onchain
from processors.tokenomics import process_tokenomics
from processors.sectors import process_sectors

from renderer.json_renderer import write_json
from renderer.md_renderer import render_markdown


def run_daily_engine():
    """
    Main entry point for the STRATA Daily Engine.
    
    Workflow:
    1. Pull data from all APIs
    2. Process into STRATA factors
    3. Build the daily JSON summary
    4. Render Markdown summary
    5. Export to TILT dashboard
    """
    today = datetime.utcnow().strftime("%Y-%m-%d")

    print(f"Running STRATA Daily Engine for {today}...")

    # 1. Pull Data
    print("Fetching data from APIs...")
    prices = get_prices()
    global_mkt = get_global()
    arkham = get_arkham_data()
    funding = get_funding()
    oi = get_open_interest()
    liqs = get_liquidations()
    depth = get_depth()
    spreads = get_spread()

    # 2. Process into STRATA factors
    print("Processing STRATA factors...")
    liquidity = process_liquidity(depth, spreads, arkham)
    flows = process_flows(funding, oi, liqs, arkham)
    onchain = process_onchain(arkham)
    tokenomics = process_tokenomics()
    sectors = process_sectors()

    # 3. Build summary object
    summary = {
        "date": today,
        "summary": {
            "dominant_factor": flows["dominant_factor"],
            "regime_sentence": flows["regime_sentence"]
        },
        "snapshot": {
            "btc_price": prices["btc"],
            "eth_price": prices["eth"],
            "sol_price": prices["sol"],
            "total_market_cap": global_mkt["total_market_cap"],
            "liquidations_24h": liqs["total_liquidations"],
            "breadth_positive": global_mkt["breadth_positive"],
            "breadth_negative": global_mkt["breadth_negative"],
            "stablecoin_flows": arkham["stablecoin_flows"]
        },
        "charts": {
            "liquidations_chart": "charts/liquidations.png",
            "depth_chart": "charts/depth.png",
            "funding_oi_chart": "charts/funding_oi.png"
        },
        "drivers": {
            "liquidity_micro": liquidity,
            "flows_positioning": flows,
            "onchain": onchain,
            "tokenomics_sector": tokenomics
        },
        "leaders": sectors["leaders"],
        "laggards": sectors["laggards"],
        "events": flows["events"],
        "closing_note": flows["closing_note"]
    }

    # 4. Write JSON
    print("Writing JSON output...")
    write_json(summary)

    # 5. Write Markdown
    print("Rendering Markdown output...")
    render_markdown(summary)

    print(f"\nSTRATA Daily Summary generated successfully for {today}")
    print("Output files:")
    print("  - strata-daily/output/daily_summary.json")
    print("  - strata-daily/output/daily_summary.md")


if __name__ == "__main__":
    run_daily_engine()
