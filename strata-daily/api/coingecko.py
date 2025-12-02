import requests


def get_prices():
    """
    Fetch current prices for BTC, ETH, SOL from CoinGecko API.
    """
    url = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd"
    try:
        r = requests.get(url).json()
        return {
            "btc": r.get("bitcoin", {}).get("usd", 0),
            "eth": r.get("ethereum", {}).get("usd", 0),
            "sol": r.get("solana", {}).get("usd", 0)
        }
    except Exception as e:
        print(f"Error fetching prices: {e}")
        return {"btc": 0, "eth": 0, "sol": 0}


def get_global():
    """
    Fetch global market data from CoinGecko API.
    """
    url = "https://api.coingecko.com/api/v3/global"
    try:
        r = requests.get(url).json()
        return {
            "total_market_cap": r.get("data", {}).get("total_market_cap", {}).get("usd", 0),
            "breadth_positive": 0,
            "breadth_negative": 0
        }
    except Exception as e:
        print(f"Error fetching global data: {e}")
        return {"total_market_cap": 0, "breadth_positive": 0, "breadth_negative": 0}
