def get_depth():
    """
    Fetch order book depth from CEX APIs (Binance/OKX).
    Placeholder — replace with real API integration.
    """
    return {
        "btc": {"bids": [], "asks": []},
        "eth": {"bids": [], "asks": []},
        "sol": {"bids": [], "asks": []}
    }


def get_spread():
    """
    Calculate bid-ask spreads from CEX orderbook data.
    Placeholder — replace with real calculations.
    """
    return {
        "btc": 0.0,
        "eth": 0.0,
        "sol": 0.0
    }
