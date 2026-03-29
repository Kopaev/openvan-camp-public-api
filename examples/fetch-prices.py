"""
OpenVan.camp Fuel Prices API — Python examples
Docs: https://github.com/openvan-camp/openvan-camp-public-api
API:  https://openvan.camp/api/fuel/prices

Requirements: pip install requests
"""

import requests

API_BASE = "https://openvan.camp"


def get_prices():
    """Fetch current fuel prices for all countries."""
    r = requests.get(f"{API_BASE}/api/fuel/prices", timeout=10)
    r.raise_for_status()
    return r.json()


def get_rates():
    """Fetch current currency exchange rates (EUR base)."""
    r = requests.get(f"{API_BASE}/api/currency/rates", timeout=10)
    r.raise_for_status()
    return r.json()["rates"]


# -------------------------------------------------------------------
# Example 1: Print all European diesel prices
# -------------------------------------------------------------------
def example_europe_diesel():
    response = get_prices()
    data = response["data"]

    europe = [
        (info["country_name"], info["prices"]["diesel"], info["currency"])
        for code, info in data.items()
        if info["region"] == "europe" and info["prices"]["diesel"] is not None
    ]
    europe.sort(key=lambda x: x[1])

    print(f"\n=== Diesel prices in Europe ({response['meta']['total_countries']} countries total) ===")
    for name, price, currency in europe:
        print(f"  {name:<25} {price:.3f} {currency}/liter")


# -------------------------------------------------------------------
# Example 2: Convert to a target currency using rates API
# -------------------------------------------------------------------
def convert_to_currency(price, from_currency, to_currency, rates, from_unit="liter"):
    """Convert price from local currency to target currency, normalized to liter."""
    if price is None:
        return None
    price_eur = price / rates[from_currency]
    if from_unit == "gallon":
        price_eur /= 3.78541
    return price_eur * rates[to_currency]


def example_prices_in_usd():
    data = get_prices()["data"]
    rates = get_rates()

    country_codes = ["US", "DE", "GB", "TR", "AU", "BR", "JP", "ZA"]

    print("\n=== Gasoline prices in USD/liter ===")
    for code in country_codes:
        c = data.get(code)
        if not c or c["prices"]["gasoline"] is None:
            continue
        usd = convert_to_currency(
            c["prices"]["gasoline"],
            c["currency"],
            "USD",
            rates,
            from_unit=c["unit"],
        )
        print(f"  {c['country_name']:<25} ${usd:.3f}/L")


# -------------------------------------------------------------------
# Example 3: Build a Pandas DataFrame
# -------------------------------------------------------------------
def example_dataframe():
    try:
        import pandas as pd
    except ImportError:
        print("\n(pandas not installed — skipping dataframe example)")
        return

    data = get_prices()["data"]
    rates = get_rates()

    rows = []
    for code, c in data.items():
        for fuel in ("gasoline", "diesel", "lpg"):
            price = c["prices"].get(fuel)
            if price is None:
                continue
            eur = price / rates[c["currency"]]
            if c["unit"] == "gallon":
                eur /= 3.78541
            rows.append({
                "country_code": code,
                "country": c["country_name"],
                "region": c["region"],
                "fuel": fuel,
                "price_local": price,
                "currency": c["currency"],
                "price_eur_per_liter": round(eur, 4),
                "updated": c["fetched_at"],
            })

    df = pd.DataFrame(rows)
    print("\n=== DataFrame (first 10 rows, diesel in Europe) ===")
    print(
        df[(df["region"] == "europe") & (df["fuel"] == "diesel")]
        .sort_values("price_eur_per_liter")
        .head(10)
        .to_string(index=False)
    )
    return df


# -------------------------------------------------------------------
# Run all examples
# -------------------------------------------------------------------
if __name__ == "__main__":
    example_europe_diesel()
    example_prices_in_usd()
    example_dataframe()
