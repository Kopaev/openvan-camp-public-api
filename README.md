# OpenVan.camp Public API

Free, no-auth API for vanlife data: fuel prices, currency rates, food cost index, vanlife events, and news stories — all in one place, no registration required.

**Base URL:** `https://openvan.camp`  
**Auth:** None required  
**CORS:** Enabled  
**License:** [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

**JavaScript/TypeScript SDK:** [`@openvancamp/sdk`](https://www.npmjs.com/package/@openvancamp/sdk) — `npm install @openvancamp/sdk`. Zero-config, typed, Node.js / browser / edge. [SDK docs →](./sdk/README.md)

**MCP Server (for AI agents):** [`mcp-server/`](./mcp-server) — hosted at `https://mcp.openvan.camp/mcp`, also `npx -y mcp-remote https://mcp.openvan.camp/mcp` for Claude Desktop / Cursor / Windsurf. [Install docs →](./mcp-server/README.md)

**Custom GPT:** [OpenVan Travel Assistant](https://chatgpt.com/g/g-69e723ddf2f48191b828b461cd7f57e0-openvan-travel-assistant) — live in ChatGPT GPT Store.

---

## What is authoritative

| Resource | Purpose |
|----------|---------|
| This README | Quick overview and code examples |
| [`/docs`](https://openvan.camp/docs) | Interactive documentation with "Try it out" |
| [`/docs.openapi`](https://openvan.camp/docs.openapi) | Full OpenAPI 3.0 contract (always up to date) |
| [`/docs.postman`](https://openvan.camp/docs.postman) | Postman collection |

The OpenAPI spec at `/docs.openapi` is generated from the live codebase and is the authoritative contract. Numbers in this README (country counts, story totals) are approximate and updated periodically — check `/api/fuel/prices` meta or `/api/stories` pagination for current totals.

---

## Endpoints

| Endpoint | Description | Coverage |
|----------|-------------|----------|
| `GET /api/fuel/prices` | Retail fuel prices (gasoline, diesel, LPG, E85) | 120+ countries |
| `GET /api/currency/rates` | Exchange rates relative to EUR | 150+ currencies |
| `GET /api/vanbasket/countries` | Food price index relative to world average (100 = world avg) | 90+ countries |
| `GET /api/vanbasket/compare?from=DE&to=TR` | Compare food costs between two countries | — |
| `GET /api/vanbasket/countries/{code}` | Single country + historical snapshots | — |
| `GET /api/events` | Vanlife events: expos, festivals, meetups, road trips | 695 events |
| `GET /api/event/{slug}` | Full event details with geo coordinates | — |
| `GET /api/event/{slug}/articles` | Source articles linked to an event | — |
| `GET /api/stories` | News stories aggregated from 200+ publishers | 8200+ stories |
| `GET /api/story/{slug}` | Full story with all source articles and direct links | — |

---

## Quick Start

```bash
# Fuel prices
curl https://openvan.camp/api/fuel/prices

# Currency rates (EUR-based)
curl https://openvan.camp/api/currency/rates

# Food price index
curl https://openvan.camp/api/vanbasket/countries

# Upcoming vanlife events in Germany
curl "https://openvan.camp/api/events?country=DE&status=upcoming&locale=en"

# Latest vanlife news stories in English
curl "https://openvan.camp/api/stories?locale=en"
```

---

## Fuel Prices — `/api/fuel/prices`

Weekly retail prices from 45+ official government sources.  
**Cache TTL:** 6 hours. Please poll no faster than every 10 minutes.

```bash
curl https://openvan.camp/api/fuel/prices
```

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
        "gasoline": 1.79,
        "diesel": 1.69,
        "lpg": 0.89,
        "e85": null,
        "premium": null
      },
      "price_changes": { "gasoline": -0.02, "diesel": 0.01, "lpg": 0.0 },
      "fetched_at": "2026-04-05T10:00:00+00:00",
      "sources": ["EU Weekly Oil Bulletin", "Fuelo.net"],
      "sources_count": 2,
      "is_excluded": false
    }
  },
  "meta": {
    "total_countries": 121,
    "updated_at": "2026-04-05 10:00:00",
    "cache_ttl_hours": 6
  }
}
```

**Notes:**
- `unit` is `"liter"` for most countries, `"gallon"` for US and Ecuador
- `is_excluded: true` means the country has heavy fuel subsidies (prices don't reflect market rates)
- `price_changes` = delta vs last week's prices

---

## Currency Rates — `/api/currency/rates`

EUR-based exchange rates from multiple open-source providers with automatic fallback.  
**Cache TTL:** 25 hours. Refreshed daily at 07:00 UTC.

```bash
curl https://openvan.camp/api/currency/rates
```

```json
{
  "success": true,
  "rates": {
    "EUR": 1,
    "USD": 1.08,
    "GBP": 0.85,
    "TRY": 38.5,
    "GEL": 2.95,
    "KZT": 510,
    "RUB": 98.5
  },
  "cached": true,
  "updated_at": "2026-04-08T07:00:00+00:00"
}
```

**Convert to any currency:**
```js
const priceInUSD = (priceEUR / rates.EUR) * rates.USD;
const priceInTRY = (priceEUR / rates.EUR) * rates.TRY;
```

---

## VanBasket Food Price Index — `/api/vanbasket/*`

Relative cost of a food basket compared to world average (World = 100).  
Based on World Bank ICP 2021 data, adjusted with IMF CPI.  
**Data source:** CC BY 4.0

```bash
# All countries
curl https://openvan.camp/api/vanbasket/countries

# Compare two countries
curl "https://openvan.camp/api/vanbasket/compare?from=DE&to=TR"

# Single country with historical snapshots
curl https://openvan.camp/api/vanbasket/countries/DE
```

```json
{
  "success": true,
  "data": {
    "CH": { "country_code": "CH", "country_name": "Switzerland", "vanbasket_index": 162.3, "pct_vs_world": 62.3 },
    "DE": { "country_code": "DE", "country_name": "Germany",     "vanbasket_index": 118.7, "pct_vs_world": 18.7 },
    "TR": { "country_code": "TR", "country_name": "Turkey",      "vanbasket_index":  82.4, "pct_vs_world": -17.6 },
    "GE": { "country_code": "GE", "country_name": "Georgia",     "vanbasket_index":  64.1, "pct_vs_world": -35.9 }
  },
  "meta": {
    "total_countries": 92,
    "world_avg": 100,
    "base_year": 2021,
    "source": "World Bank ICP 2021",
    "license": "CC BY 4.0"
  }
}
```

**Compare response:**
```json
{
  "success": true,
  "data": {
    "from": { "country_code": "DE", "country_name": "Germany", "vanbasket_index": 118.7 },
    "to":   { "country_code": "TR", "country_name": "Turkey",  "vanbasket_index":  82.4 },
    "diff_percent": -30.6,
    "budget_100": 69,
    "cheaper": true
  }
}
```

`budget_100`: if you spend €100 on food in the `from` country, you'd spend €69 in the `to` country.

---

## Events — `/api/events`

Vanlife events: exhibitions, festivals, meetups, road trips. Updated in real time.

**Query params:**

| Param | Values | Default |
|-------|--------|---------|
| `locale` | `en` `ru` `de` `fr` `es` `pt` `tr` | `en` |
| `status` | `upcoming` `ongoing` `past` `all` | `upcoming` |
| `type` | `expo` `festival` `forum` `meetup` `roadtrip` | — |
| `country` | ISO 3166-1 alpha-2 | — |
| `search` | text | — |
| `page` | integer | `1` |
| `limit` | integer (max 100) | `30` |

```bash
# Upcoming events in Germany
curl "https://openvan.camp/api/events?country=DE&status=upcoming&locale=en"

# Event details
curl "https://openvan.camp/api/event/fit-camper-2026?locale=en"

# Source articles linked to an event
curl "https://openvan.camp/api/event/fit-camper-2026/articles?locale=en"
```

```json
{
  "events": [
    {
      "id": 493,
      "slug": "fit-camper-2026",
      "event_name": "Fit Your Camper",
      "event_type": "expo",
      "event_type_label": "Exhibition",
      "start_date": "2026-04-09",
      "end_date": "2026-04-12",
      "city": "Bologna",
      "country_code": "IT",
      "country": { "code": "it", "name": "Italy", "flag_emoji": "🇮🇹" },
      "venue_name": "BolognaFiere",
      "status": "upcoming",
      "articles_count": 7,
      "url": "https://openvan.camp/en/event/fit-camper-2026"
    }
  ],
  "pagination": { "total": 48, "page": 1, "limit": 30, "pages": 2 }
}
```

**Notes:**
- Unknown or missing `locale` silently falls back to `en`
- `/api/event/{slug}/articles` returns source articles filtered by `locale`; if none match, all articles are returned (may be in the original publisher language)

---

## Stories / News — `/api/stories`

Vanlife news stories aggregated from 200+ publishers and translated into 7 languages. Each story clusters multiple source articles covering the same topic.

**Query params:**

| Param | Values | Default |
|-------|--------|---------|
| `locale` | `en` `ru` `de` `fr` `es` `pt` `tr` | `en` |
| `category` | category slug (e.g. `camping`, `travel`, `gear`, `incident`) | — |
| `country` | ISO 3166-1 alpha-2 | — |
| `search` | text | — |
| `page` | integer | `1` |
| `limit` | integer (max 50) | `20` |

```bash
# Latest stories in English
curl "https://openvan.camp/api/stories?locale=en"

# German vanlife news in Germany
curl "https://openvan.camp/api/stories?locale=de&country=DE"

# Full story with all source links
curl "https://openvan.camp/api/story/free-overnight-parking-netherlands?locale=en"
```

```json
{
  "slug": "free-overnight-parking-netherlands",
  "title": "Free Overnight Parking for Motorhomes in the Netherlands",
  "summary": "The Dutch motorhome community is pushing for more designated free overnight spots...",
  "image_url": "https://...",
  "category": { "slug": "travel", "name": "Travel" },
  "countries": [{ "code": "nl", "name": "Netherlands", "flag_emoji": "🇳🇱" }],
  "first_published_at": "2026-04-01T10:00:00+00:00",
  "last_updated_at": "2026-04-03T08:00:00+00:00",
  "articles_count": 5,
  "url": "https://openvan.camp/en/news/travel/free-overnight-parking-netherlands",
  "sources": [
    {
      "title": "Gratis overnachten in je camper: de beste plekken",
      "original_url": "https://www.campermagazine.nl/overnachten/gratis-plaatsen",
      "source_name": "CamperMagazine.nl",
      "published_at": "2026-04-01T10:00:00+00:00",
      "language": "nl",
      "image_url": "https://..."
    }
  ]
}
```

**Notes:**
- `title` and `summary` are translated to the requested `locale`
- `sources[].language` is always the **original publisher language**, regardless of `locale`
- `sources[].original_url` is the direct link to the publisher article

---

## Response Format

All JSON endpoints follow a consistent envelope:

```json
{ "success": true, "data": { ... }, "meta": { ... }, "_attribution": { ... } }
```

Every response includes an `_attribution` object:

```json
"_attribution": {
  "data_source": "openvan.camp",
  "license": "CC BY 4.0",
  "attribution_url": "https://openvan.camp/",
  "attribution_html": "Data: <a href=\"https://openvan.camp/\">OpenVan.camp</a> (CC BY 4.0)"
}
```

Errors:
```json
{ "success": false, "error": "Description of the error." }
```

If you call without `Accept: application/json`, some error responses may return HTML. Always send the header:
```
Accept: application/json
```

---

## Rate Limiting

120 requests per minute per IP. Please be responsible:
- Cache fuel prices for at least 6 hours
- Cache currency rates for at least 1 hour
- Cache stories/events for at least 15 minutes

---

## Attribution

Required by CC BY 4.0. Suggested format:

```html
Data: <a href="https://openvan.camp/">OpenVan.camp</a> — CC BY 4.0
```

### Identify your integration

Pass `?source=yoursite.com` with any request — no registration needed. Your value is echoed back as `_attribution.your_source` so you can verify it's working:

```bash
curl "https://openvan.camp/api/fuel/prices?source=myapp.com"
```

```json
{
  "success": true,
  "data": { "..." },
  "meta": { "..." },
  "_attribution": {
    "data_source": "openvan.camp",
    "license": "CC BY 4.0",
    "attribution_url": "https://openvan.camp/",
    "attribution_html": "Data: <a href=\"https://openvan.camp/\">OpenVan.camp</a> (CC BY 4.0)",
    "your_source": "myapp.com"
  }
}
```

This helps us understand how the data is being used and acknowledge active projects.

---

## JavaScript / TypeScript SDK

```bash
npm install @openvancamp/sdk
# or: pnpm add @openvancamp/sdk
```

```ts
import { OpenVan } from "@openvancamp/sdk";

const ov = new OpenVan();

// Cheapest diesel in Europe (top 5, EUR-normalized)
const top5 = await ov.fuel.cheapest("diesel", 5);
top5.forEach(c => console.log(c.country_name, c.prices.diesel, c.currency));

// Is Portugal cheaper than Germany for van living?
const comp = await ov.basket.compare("DE", "PT");
console.log(`Portugal is ${Math.abs(comp.diff_percent)}% cheaper`);

// Vanlife weather suitability — top 10 countries right now
const weather = await ov.weather.top({ limit: 10 });
```

ESM-native, fully typed (TypeScript included), works in Node.js ≥ 18, browser, Cloudflare Workers, Deno, Bun. No API key.

npm: [`@openvancamp/sdk`](https://www.npmjs.com/package/@openvancamp/sdk) · [Full SDK docs →](./sdk/README.md)

---

## Resources

- **Interactive docs:** https://openvan.camp/docs
- **OpenAPI 3.0 spec:** https://openvan.camp/docs.openapi
- **Postman collection:** https://openvan.camp/docs.postman
- **JavaScript SDK:** https://www.npmjs.com/package/@openvancamp/sdk
- **Developer page:** https://openvan.camp/en/developers
