def process_flows(funding, oi, liquidations, arkham):
    """
    Process flows and positioning factors.
    Determines dominant market factor and regime classification.
    """
    if liquidations["long_liq"] > 100000000:
        dominant = "Long-liquidation cascade"
        regime = "Leverage-driven deleveraging day"
        events = ["Long liquidation cascade"]
    else:
        dominant = "Neutral flows"
        regime = "Sideways regime"
        events = []

    return {
        "funding": funding,
        "basis": "neutral",
        "open_interest": oi,
        "liquidations": liquidations,
        "exchange_flows": arkham["exchange_flows"],
        "dominant_factor": dominant,
        "regime_sentence": regime,
        "events": events,
        "closing_note": f"Flows show regime: {regime}"
    }
