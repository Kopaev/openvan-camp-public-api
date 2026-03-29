# OpenVan.camp Public API

> Free, open data API for **fuel prices** and **currency rates** worldwide — no auth, no registration, just use it.

[![OpenAPI 3.0](https://img.shields.io/badge/OpenAPI-3.0-85EA2D?logo=swagger)](./openapi.yaml)
[![Countries](https://img.shields.io/badge/countries-87-blue)](https://openvan.camp/en/tools/fuel-prices)
[![Currencies](https://img.shields.io/badge/currencies-150%2B-blue)](#currency-rates-api)
[![License: CC BY 4.0](https://img.shields.io/badge/license-CC%20BY%204.0-green)](https://creativecommons.org/licenses/by/4.0/)
[![No Auth](https://img.shields.io/badge/auth-none%20required-brightgreen)](#)
[![Fuel: Weekly](https://img.shields.io/badge/fuel%20prices-weekly-orange)](#fuel-prices-api)
[![Rates: Daily](https://img.shields.io/badge/currency%20rates-daily-orange)](#currency-rates-api)

**Base URL:** `https://openvan.camp`
**OpenAPI spec:** [`openapi.yaml`](./openapi.yaml) · **Interactive docs:** [openvan.camp/docs](https://openvan.camp/docs)

---

## Quick Start

```bash
# Fuel prices — 87 countries
curl https://openvan.camp/api/fuel/prices

# Currency exchange rates — 150+ currencies
curl https://openvan.camp/api/currency/rates
```

---

## Endpoints

| Method | Endpoint | Description | Update Frequency |
|--------|----------|-------------|-----------------|
| `GET` | [`/api/fuel/prices`](#fuel-prices-api) | Gasoline, diesel & LPG prices for 87 countries | Weekly |
| `GET` | [`/api/currency/rates`](#currency-rates-api) | EUR-based exchange rates for 150+ currencies | Daily |
| `GET` | [`/api/events`](#vanlife-events-api) | Vanlife & camping events worldwide | Real-time |

---

## For LLM Agents & AI Tools

This API is machine-readable and requires **no authentication**. Key facts:

- **Full OpenAPI 3.0 spec:** [`openapi.yaml`](./openapi.yaml)
- **No API key.** Call any endpoint directly.
- **Response format:** JSON, always `{ "success": true, "data": {...} }`
- **Caching:** fuel prices TTL 6h · currency rates TTL 25h
- **Rate limiting:** none enforced — please cache and poll no faster than every 10 min
- **CORS:** enabled — can be called from the browser directly

**Recommended prompting pattern:**
> "Get current fuel prices for [country] in [currency] using the OpenVan.camp API at https://openvan.camp/api/fuel/prices"

---

## Fuel Prices API

**`GET https://openvan.camp/api/fuel/prices`**

Returns retail fuel prices (gasoline, diesel, LPG) for 87 countries. Data is a weighted average from 45+ official government sources.

### Response Example

```json
{
  "success": true,
  "data": {
    "DE": {
      "country_code": "DE",
      "country_name": "Germany",
      "region": "europe",
      "currency": "EUR",
      "local_currency": "EUR",
      "unit": "liter",
      "prices": {
        "gasoline": 2.1313,
        "diesel": 2.2845,
        "lpg": 1.113,
        "e85": null,
        "premium": null
      },
      "price_changes": {
        "gasoline": -0.02,
        "diesel": 0.01,
        "lpg": 0.0,
        "e85": null,
        "premium": null
      },
      "fetched_at": "2026-03-28T13:59:57+03:00",
      "sources": ["Fuelo.net", "EU Weekly Oil Bulletin", "Cargopedia.net"],
      "sources_count": 3,
      "is_excluded": false
    },
    "US": {
      "country_code": "US",
      "country_name": "United States",
      "region": "north_america",
      "currency": "USD",
      "unit": "gallon",
      "prices": {
        "gasoline": 3.961,
        "diesel": 5.375,
        "lpg": null,
        "e85": null,
        "premium": 4.943
      },
      "price_changes": {
        "gasoline": -0.05,
        "diesel": 0.12,
        "lpg": null,
        "e85": null,
        "premium": -0.03
      },
      "fetched_at": "2026-03-28T13:59:57+03:00",
      "sources": ["EIA (US Energy Information Administration)"],
      "sources_count": 1,
      "is_excluded": false
    }
  },
  "meta": {
    "total_countries": 87,
    "updated_at": "2026-03-28 13:59:57",
    "cache_ttl_hours": 6
  }
}
```

### Field Reference

| Field | Type | Description |
|-------|------|-------------|
| `country_code` | `string` | ISO 3166-1 alpha-2 |
| `country_name` | `string` | English country name |
| `region` | `string` | See [regions](#regions) below |
| `currency` | `string` | ISO 4217 currency code |
| `unit` | `string` | `liter` or `gallon` (US, Ecuador) |
| `prices.*` | `number\|null` | Retail price in local currency. `null` = no data |
| `price_changes.*` | `number\|null` | Weekly change in local currency |
| `fetched_at` | `ISO 8601` | Timestamp of last data collection |
| `sources` | `string[]` | Data providers (sorted by trust weight) |
| `sources_count` | `integer` | Number of sources in weighted average |
| `is_excluded` | `boolean` | `true` for heavily subsidized countries |

### Fuel Types

| Key | Description |
|-----|-------------|
| `gasoline` | Regular unleaded (95 RON / E10) |
| `diesel` | Standard diesel (B7) |
| `lpg` | Liquefied petroleum gas (autogas) |
| `e85` | Ethanol blend (select countries) |
| `premium` | Premium / super unleaded (98+ RON) |

### Regions

| Value | Countries |
|-------|-----------|
| `europe` | 42 EU + EEA countries |
| `cis` | Russia, Kazakhstan, Georgia, Armenia, Azerbaijan, Belarus, Ukraine, Moldova, Uzbekistan, Kyrgyzstan, Tajikistan |
| `middle_east` | Turkey, Israel, Jordan, UAE, Lebanon, Qatar |
| `central_asia` | Turkmenistan and surrounding |
| `east_asia` | China, Hong Kong, Japan, South Korea, Thailand, Singapore |
| `africa` | Algeria, Egypt, Morocco, Tunisia, Ghana |
| `north_america` | USA, Canada, Mexico |
| `latam` | Argentina, Brazil, Chile, Colombia, Ecuador, Peru, Bolivia, Uruguay, Paraguay |
| `oceania` | Australia, New Zealand, Fiji, Papua New Guinea |

### Code Examples

**JavaScript — cheapest diesel in Europe:**
```javascript
const res = await fetch('https://openvan.camp/api/fuel/prices');
const { data } = await res.json();

const cheapest = Object.values(data)
  .filter(c => c.region === 'europe' && c.prices.diesel !== null)
  .sort((a, b) => a.prices.diesel - b.prices.diesel)
  .slice(0, 5);

cheapest.forEach(c =>
  console.log(`${c.country_name}: ${c.prices.diesel} ${c.currency}/${c.unit}`)
);
```

**Python — all countries with LPG:**
```python
import requests

data = requests.get('https://openvan.camp/api/fuel/prices').json()['data']

lpg = [
    (v['country_name'], v['prices']['lpg'], v['currency'])
    for v in data.values()
    if v['prices'].get('lpg') is not None
]

for name, price, currency in sorted(lpg, key=lambda x: x[1])[:10]:
    print(f"{name}: {price} {currency}/liter")
```

---

## Currency Rates API

**`GET https://openvan.camp/api/currency/rates`**

Returns exchange rates for 150+ currencies relative to EUR. Updated daily at 07:00 UTC.

### Response Example

```json
{
  "success": true,
  "rates": {
    "EUR": 1,
    "USD": 1.082,
    "GBP": 0.853,
    "RUB": 98.5,
    "TRY": 36.2,
    "GEL": 2.91,
    "KZT": 521.4,
    "UAH": 44.1,
    "PLN": 4.27,
    "CHF": 0.956
  },
  "cached": true,
  "updated_at": "2026-03-28T07:00:00+00:00"
}
```

All rates are **EUR-based** (EUR = 1). To convert between any two currencies:

```javascript
const { rates } = await fetch('https://openvan.camp/api/currency/rates').then(r => r.json());

function convert(price, from, to) {
  return (price / rates[from]) * rates[to];
}

// Example: Germany diesel (EUR) → USD
console.log(convert(2.28, 'EUR', 'USD').toFixed(3) + ' USD/liter');
```

---

## Vanlife Events API

**`GET https://openvan.camp/api/events`**

Returns upcoming vanlife, camping and overlanding events worldwide.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `locale` | `string` | `en` | Language: `en`, `ru`, `de`, `fr`, `es`, `pt`, `tr` |
| `status` | `string` | `upcoming` | `upcoming` · `ongoing` · `past` · `all` |
| `type` | `string` | — | `expo` · `festival` · `forum` · `meetup` · `roadtrip` |
| `country` | `string` | — | ISO country code, e.g. `DE` |
| `page` | `integer` | `1` | Page number |
| `limit` | `integer` | `30` | Results per page (max `100`) |

```bash
# Upcoming festivals in Germany
curl "https://openvan.camp/api/events?country=DE&type=festival&locale=en"

# All ongoing events, 100 per page
curl "https://openvan.camp/api/events?status=ongoing&limit=100"
```

---

## Embeddable Widget

Drop this into any HTML page — zero dependencies:

```html
<div id="fuel-widget" style="font-family:sans-serif;max-width:400px"></div>
<script>
(async () => {
  const COUNTRIES = ['DE', 'FR', 'ES', 'IT', 'PL'];
  const FLAGS = { DE:'🇩🇪', FR:'🇫🇷', ES:'🇪🇸', IT:'🇮🇹', PL:'🇵🇱' };

  const [priceRes, rateRes] = await Promise.all([
    fetch('https://openvan.camp/api/fuel/prices').then(r => r.json()),
    fetch('https://openvan.camp/api/currency/rates').then(r => r.json())
  ]);

  const { data } = priceRes;
  const { rates } = rateRes;
  const TARGET = 'EUR'; // change to 'USD', 'GBP', etc.

  let html = `<table style="width:100%;border-collapse:collapse">
    <tr style="border-bottom:2px solid #eee">
      <th style="text-align:left;padding:6px">Country</th>
      <th style="text-align:right;padding:6px">Gasoline</th>
      <th style="text-align:right;padding:6px">Diesel</th>
    </tr>`;

  for (const code of COUNTRIES) {
    const c = data[code];
    if (!c) continue;
    const toTarget = p => p == null ? '—' : ((p / rates[c.currency]) * rates[TARGET]).toFixed(3);
    const unit = c.unit === 'gallon' ? '/gal' : '/L';
    html += `<tr style="border-bottom:1px solid #f0f0f0">
      <td style="padding:6px">${FLAGS[code]} ${c.country_name}</td>
      <td style="text-align:right;padding:6px">${toTarget(c.prices.gasoline)} ${TARGET}${unit}</td>
      <td style="text-align:right;padding:6px">${toTarget(c.prices.diesel)} ${TARGET}${unit}</td>
    </tr>`;
  }

  html += `</table>
    <p style="font-size:11px;color:#999;margin-top:6px">
      Data: <a href="https://openvan.camp/en/tools/fuel-prices" target="_blank">OpenVan.camp</a>
      · CC BY 4.0 · Updated weekly
    </p>`;

  document.getElementById('fuel-widget').innerHTML = html;
})();
</script>
```

---

## Data Sources

Prices are weighted averages from **45+ official sources**:

| Region | Sources |
|--------|---------|
| 🇪🇺 Europe | EU Weekly Oil Bulletin (27 countries), Statistics Norway, UK BEIS |
| 🇺🇸 North America | EIA (US Energy Information Administration), Statistics Canada (NRCan) |
| 🇷🇺 CIS | Rosstat (Russia), GosKomStat (Kazakhstan) |
| 🇧🇷 Latin America | ANP (Brazil), GobEnergy (Argentina), CNE (Chile) |
| 🇯🇵 East Asia | METI (Japan), IOCL (India) |
| 🇦🇺 Oceania | FuelWatch WA (Australia), MBIE (New Zealand) |
| 🌍 Global | Fuelo.net, Cargopedia.net, OilPricez.com |

---

## Rate Limits & Caching

No strict rate limits. Please be a good citizen:

| Resource | Cache TTL | Recommended Poll Interval |
|----------|-----------|--------------------------|
| `/api/fuel/prices` | 6 hours | ≥ 10 minutes |
| `/api/currency/rates` | 25 hours | ≥ 1 hour |
| `/api/events` | real-time | ≥ 5 minutes |

For high-traffic applications, add your own caching layer.

---

## License & Attribution

Data is available under **[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)**.

Required attribution (choose one):

```
Data: OpenVan.camp (https://openvan.camp) — CC BY 4.0
```
```html
Data: <a href="https://openvan.camp/en/tools/fuel-prices">OpenVan.camp</a> (CC BY 4.0)
```

---

## Issues & Requests

Found a wrong price? Missing a country? → [Open an issue](../../issues/new)

We don't accept code contributions (the data pipeline is proprietary), but data quality issues and country requests are very welcome.

---

*Built by [OpenVan.camp](https://openvan.camp) — aggregator of vanlife news, events and tools.*
