# @openvancamp/sdk

Official JavaScript/TypeScript SDK for [OpenVan.camp](https://openvan.camp) — free vanlife/RV travel data API.

- **Fuel prices** — real-time retail prices for 121 countries (gasoline, diesel, LPG, E85) from 200+ government sources
- **Weather scores** — vanlife-specific suitability (0–100): van comfort, sleep conditions, solar yield, driving safety
- **Food cost index** — cost-of-living comparison across 92 countries vs. a world baseline
- **Currency rates** — 150+ currencies, EUR-based, updated daily
- **Events** — 695+ vanlife/RV events with geo-coordinates
- **News stories** — 8,200+ aggregated stories in 7 languages

**No API key. No registration. CC BY 4.0.**

## Install

```bash
npm install @openvancamp/sdk
# or
pnpm add @openvancamp/sdk
# or
yarn add @openvancamp/sdk
```

## Quick start

```ts
import { OpenVan } from "@openvancamp/sdk";

const ov = new OpenVan();

// Fuel prices for Germany
const de = await ov.fuel.country("DE");
console.log(de.prices.diesel); // e.g. 1.729 (EUR/liter)

// Cheapest diesel in Europe (top 5)
const cheap = await ov.fuel.cheapest("diesel", 5);
cheap.forEach(c => console.log(c.country_name, c.prices.diesel, c.currency));

// Vanlife weather scores — top 10 countries right now
const top = await ov.weather.top({ limit: 10 });
top.forEach(c => console.log(c.country_name, c.score));

// Is Portugal cheaper than Germany for van living?
const comp = await ov.basket.compare("DE", "PT");
console.log(`Portugal is ${Math.abs(comp.diff_percent)}% cheaper (€100 in DE ≈ €${comp.budget_100} in PT)`);

// Currency conversion
const usd = await ov.currency.convert(100, "EUR", "USD");

// Upcoming vanlife events
const { events } = await ov.events.list({ status: "upcoming", limit: 10 });

// Latest vanlife news in Spanish
const { stories } = await ov.stories.list({ locale: "es", limit: 20 });
```

## API reference

### `new OpenVan(options?)`

```ts
const ov = new OpenVan({
  baseUrl: "https://openvan.camp", // default
  source: "my-app",                // attribution tag (optional)
  fetch: customFetch,              // custom fetch implementation (optional)
});
```

---

### `ov.fuel`

| Method | Returns |
|---|---|
| `.prices()` | `Record<string, FuelCountry>` — all 121 countries |
| `.country(code)` | `FuelCountry` — single country by ISO code |
| `.cheapest(fuelType?, limit?)` | `FuelCountry[]` — sorted cheapest-first |

```ts
// All countries
const all = await ov.fuel.prices();

// Single country
const tr = await ov.fuel.country("TR");
console.log(tr.prices); // { gasoline: 41.5, diesel: 39.2, lpg: 16.8 }

// Top 5 cheapest diesel globally
const top5 = await ov.fuel.cheapest("diesel", 5);
```

---

### `ov.currency`

| Method | Returns |
|---|---|
| `.rates()` | `Record<string, number>` — units per EUR |
| `.convert(amount, from, to)` | `number` |

```ts
const rates = await ov.currency.rates();
const usd = await ov.currency.convert(50, "EUR", "USD");
```

---

### `ov.basket`

| Method | Returns |
|---|---|
| `.list()` | `VanBasketCountry[]` — all 92 countries |
| `.country(code)` | `VanBasketCountry` with historical snapshots |
| `.compare(from, to)` | `VanBasketCompareData` — ratio + both countries |

```ts
// Compare Spain vs Mexico
const comp = await ov.basket.compare("ES", "MX");
// comp.diff_percent = how much cheaper/expensive MX is vs ES
// comp.budget_100  = equivalent of €100 in ES when spending in MX
console.log(`diff: ${comp.diff_percent}%, €100 in Spain ≈ €${comp.budget_100} in Mexico`);
```

---

### `ov.weather`

| Method | Returns |
|---|---|
| `.score(countryCode, locale?)` | `VanSkyCountry` — 7-day forecast with scores |
| `.top(options?)` | `VanSkyTopEntry[]` — top N countries |

```ts
const fr = await ov.weather.score("FR");
console.log(fr.score);          // overall 7-day score 0-100
console.log(fr.forecast[0]);    // today's detailed scores
```

---

### `ov.events`

| Method | Returns |
|---|---|
| `.list(options?)` | `EventsListData` — paginated events |
| `.get(slug)` | `VanEvent` — single event |

```ts
const { events } = await ov.events.list({
  status: "upcoming",
  type: "expo",
  country: "DE",
  locale: "en",
});
```

---

### `ov.stories`

| Method | Returns |
|---|---|
| `.list(options?)` | `StoriesListData` — paginated stories |
| `.get(slug)` | `VanStory` with source articles |

```ts
const { stories } = await ov.stories.list({
  locale: "de",
  category: "gear",
  limit: 20,
});
```

---

## Error handling

```ts
import { OpenVan, OpenVanError } from "@openvancamp/sdk";

try {
  const data = await ov.fuel.country("XX");
} catch (err) {
  if (err instanceof OpenVanError) {
    console.log(err.status); // HTTP status code
    console.log(err.url);    // full request URL
  }
}
```

---

## Browser / Edge

The SDK is ESM-native and works in any environment with `fetch` (browser, Node.js ≥ 18, Deno, Cloudflare Workers, Bun).

```html
<script type="module">
  import { OpenVan } from "https://esm.sh/@openvancamp/sdk";
  const ov = new OpenVan();
  const de = await ov.fuel.country("DE");
  console.log(de.prices);
</script>
```

---

## MCP Server (for AI assistants)

Use the data directly in Claude, Cursor, Windsurf, or any MCP-compatible AI:

```bash
npx -y @openvancamp/mcp-server
```

Or add to your Claude Desktop config:
```json
{
  "mcpServers": {
    "openvan": {
      "command": "npx",
      "args": ["-y", "@openvancamp/mcp-server"]
    }
  }
}
```

---

## Attribution

Data is licensed under **CC BY 4.0** — please attribute **OpenVan.camp** when using publicly.  
SDK code is **MIT**.

[API Docs](https://openvan.camp/docs) · [GitHub](https://github.com/Kopaev/openvan-camp-public-api) · [hello@openvan.camp](mailto:hello@openvan.camp)
