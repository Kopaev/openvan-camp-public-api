"""
OpenVan.camp Public API — Python Examples
https://openvan.camp/en/developers
License: CC BY 4.0 — attribution required
"""

import requests

API = "https://openvan.camp"


# ─── FUEL PRICES ─────────────────────────────────────────────────────────────


def get_fuel_prices() -> dict:
    return requests.get(f"{API}/api/fuel/prices").json()["data"]


def cheapest_diesel_europe(top_n: int = 10) -> list[dict]:
    """Top N cheapest diesel countries in Europe."""
    data = get_fuel_prices()
    europe = [
        {"country": c["country_name"], "diesel": c["prices"]["diesel"], "currency": c["currency"]}
        for c in data.values()
        if c["region"] == "europe" and c["prices"]["diesel"] is not None
    ]
    return sorted(europe, key=lambda x: x["diesel"])[:top_n]


def countries_with_lpg_in_eur() -> list[dict]:
    """All countries with LPG, price normalized to EUR/liter."""
    data = get_fuel_prices()
    rates = requests.get(f"{API}/api/currency/rates").json()["rates"]

    result = []
    for c in data.values():
        if c["prices"]["lpg"] is None:
            continue
        price_eur = c["prices"]["lpg"] / rates.get(c["currency"], 1)
        if c["unit"] == "gallon":
            price_eur /= 3.78541
        result.append({
            "country": c["country_name"],
            "lpg_eur_per_liter": round(price_eur, 3),
            "region": c["region"],
        })

    return sorted(result, key=lambda x: x["lpg_eur_per_liter"])


def fuel_prices_usd(country_code: str) -> dict:
    """Fuel prices for a country, converted to USD/liter."""
    data = get_fuel_prices()
    rates = requests.get(f"{API}/api/currency/rates").json()["rates"]

    c = data.get(country_code.upper())
    if not c:
        raise ValueError(f"Country {country_code} not found")

    def to_usd(price):
        if price is None:
            return None
        usd = (price / rates[c["currency"]]) * rates["USD"]
        return round(usd / 3.78541 if c["unit"] == "gallon" else usd, 3)

    return {
        "country": c["country_name"],
        "gasoline_usd_per_liter": to_usd(c["prices"]["gasoline"]),
        "diesel_usd_per_liter": to_usd(c["prices"]["diesel"]),
        "lpg_usd_per_liter": to_usd(c["prices"]["lpg"]),
    }


# ─── VANBASKET ────────────────────────────────────────────────────────────────


def get_vanbasket() -> dict:
    return requests.get(f"{API}/api/vanbasket/countries").json()["data"]


def cheapest_countries_for_food(top_n: int = 10) -> list[dict]:
    """Countries where food is cheapest relative to world average."""
    data = get_vanbasket()
    countries = [
        {
            "country": c["country_name"],
            "index": c["vanbasket_index"],
            "vs_world": f"{c['pct_vs_world']:+.1f}%",
            "region": c.get("region", ""),
        }
        for c in data.values()
    ]
    return sorted(countries, key=lambda x: x["index"])[:top_n]


def compare_food_cost(from_code: str, to_code: str, budget: float = 100) -> dict:
    """How much does the same food basket cost in destination vs home country?"""
    r = requests.get(f"{API}/api/vanbasket/compare?from={from_code}&to={to_code}").json()
    if not r.get("success"):
        raise ValueError(r.get("error"))

    d = r["data"]
    return {
        "from": d["from"]["country_name"],
        "to": d["to"]["country_name"],
        f"budget_in_{from_code}": f"€{budget:.0f}",
        f"budget_in_{to_code}": f"€{budget * d['budget_100'] / 100:.0f}",
        "difference": f"{d['diff_percent']:+.1f}%",
        "cheaper_in_destination": d["cheaper"],
    }


# ─── EVENTS ──────────────────────────────────────────────────────────────────


def get_upcoming_events(country: str = None, event_type: str = None, locale: str = "en") -> list[dict]:
    """Upcoming vanlife events, optionally filtered by country and type."""
    params = {"status": "upcoming", "locale": locale, "limit": 50}
    if country:
        params["country"] = country
    if event_type:
        params["type"] = event_type

    r = requests.get(f"{API}/api/events", params=params).json()
    return [
        {
            "name": e["event_name"],
            "type": e["event_type_label"],
            "dates": f"{e['start_date']} → {e['end_date']}",
            "city": e["city"],
            "country": e["country"]["name"] if e.get("country") else "",
            "url": e["url"],
        }
        for e in r["events"]
    ]


def get_event_with_sources(slug: str, locale: str = "en") -> dict:
    """Full event details with source articles."""
    event = requests.get(f"{API}/api/event/{slug}", params={"locale": locale}).json()
    articles = requests.get(f"{API}/api/event/{slug}/articles", params={"locale": locale}).json()

    return {
        "name": event["event_name"],
        "dates": f"{event['start_date']} → {event['end_date']}",
        "location": f"{event.get('city', '')}, {event.get('country', {}).get('name', '')}",
        "official_url": event.get("official_url"),
        "sources": [
            {
                "title": a["title"],
                "publisher": a["source_name"],
                "language": a["language"],
                "url": a["original_url"],
            }
            for a in articles
        ],
    }


# ─── STORIES ─────────────────────────────────────────────────────────────────


def get_stories(locale: str = "en", category: str = None, country: str = None, limit: int = 20) -> dict:
    """Get latest vanlife news stories."""
    params = {"locale": locale, "limit": limit}
    if category:
        params["category"] = category
    if country:
        params["country"] = country

    return requests.get(f"{API}/api/stories", params=params).json()


def get_story_with_sources(slug: str, locale: str = "en") -> dict:
    """Full story with all original publisher links."""
    story = requests.get(f"{API}/api/story/{slug}", params={"locale": locale}).json()

    if "error" in story:
        raise ValueError(story["error"])

    return {
        "title": story["title"],
        "summary": story["summary"],
        "category": story["category"]["name"],
        "countries": [f"{c['flag_emoji']} {c['name']}" for c in story.get("countries", [])],
        "published": story["first_published_at"],
        "url": story["url"],
        "sources": [
            {
                "publisher": s["source_name"],
                "language": s["language"],
                "url": s["original_url"],
                "title": s["title"],
            }
            for s in story.get("sources", [])
        ],
    }


def stories_by_country(country_code: str, locale: str = "en", limit: int = 10) -> list[dict]:
    """News stories filtered by country."""
    r = get_stories(locale=locale, country=country_code, limit=limit)
    return [{"title": s["title"], "category": s["category"]["name"], "url": s["url"]} for s in r["stories"]]


# ─── COMBINED: Road trip planner ─────────────────────────────────────────────


def road_trip_cost_overview(country_codes: list[str]) -> list[dict]:
    """
    For each country: diesel price in EUR/L + food index.
    Useful for comparing living costs across a planned road trip route.
    """
    fuel_data = get_fuel_prices()
    rates = requests.get(f"{API}/api/currency/rates").json()["rates"]
    food_data = get_vanbasket()

    result = []
    for code in country_codes:
        f = fuel_data.get(code.upper())
        v = food_data.get(code.upper())
        if not f or not v:
            continue

        diesel = f["prices"].get("diesel")
        if diesel is not None:
            diesel_eur = diesel / rates.get(f["currency"], 1)
            if f["unit"] == "gallon":
                diesel_eur /= 3.78541
        else:
            diesel_eur = None

        result.append({
            "country": f["country_name"],
            "diesel_eur_per_liter": round(diesel_eur, 3) if diesel_eur else None,
            "food_index": v["vanbasket_index"],
            "food_vs_world": f"{v['pct_vs_world']:+.1f}%",
        })

    return sorted(result, key=lambda x: x["diesel_eur_per_liter"] or 999)


# ─── Usage ────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=== Top 5 cheapest diesel in Europe ===")
    for row in cheapest_diesel_europe(5):
        print(f"  {row['country']}: {row['diesel']} {row['currency']}/L")

    print("\n=== Food cost comparison: Germany → Turkey ===")
    print(compare_food_cost("DE", "TR"))

    print("\n=== Latest vanlife stories in English ===")
    r = get_stories(locale="en", limit=3)
    print(f"  Total stories in database: {r['pagination']['total']}")
    for s in r["stories"]:
        print(f"  • {s['title']} [{s['category']['name']}]")

    print("\n=== Road trip: DE → CZ → PL → TR → GE ===")
    for row in road_trip_cost_overview(["DE", "CZ", "PL", "TR", "GE"]):
        diesel = f"{row['diesel_eur_per_liter']} EUR/L" if row["diesel_eur_per_liter"] else "N/A"
        print(f"  {row['country']}: diesel={diesel}, food index={row['food_index']} ({row['food_vs_world']})")
