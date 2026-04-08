/**
 * OpenVan.camp Public API — JavaScript Examples
 * https://openvan.camp/en/developers
 * License: CC BY 4.0 — attribution required
 */

const API = "https://openvan.camp";

// ─── FUEL PRICES ─────────────────────────────────────────────────────────────

// Top 5 cheapest diesel in Europe
async function cheapestDieselEurope() {
  const { data } = await fetch(`${API}/api/fuel/prices`).then((r) => r.json());

  return Object.values(data)
    .filter((c) => c.region === "europe" && c.prices.diesel !== null)
    .sort((a, b) => a.prices.diesel - b.prices.diesel)
    .slice(0, 5)
    .map((c) => ({
      country: c.country_name,
      diesel: c.prices.diesel,
      currency: c.currency,
    }));
}

// Convert any fuel price to USD/liter
async function fuelPriceInUSD(countryCode) {
  const [{ data }, { rates }] = await Promise.all([
    fetch(`${API}/api/fuel/prices`).then((r) => r.json()),
    fetch(`${API}/api/currency/rates`).then((r) => r.json()),
  ]);

  const country = data[countryCode];
  if (!country) throw new Error(`Country ${countryCode} not found`);

  function toUSD(price, currency, unit) {
    if (price === null) return null;
    let usd = (price / rates[currency]) * rates["USD"];
    return unit === "gallon" ? usd / 3.78541 : usd; // normalize to per liter
  }

  return {
    country: country.country_name,
    gasoline_usd_per_liter: toUSD(country.prices.gasoline, country.currency, country.unit),
    diesel_usd_per_liter: toUSD(country.prices.diesel, country.currency, country.unit),
  };
}

// Countries with LPG, sorted cheapest first, converted to EUR/liter
async function countriesWithLPG() {
  const [{ data }, { rates }] = await Promise.all([
    fetch(`${API}/api/fuel/prices`).then((r) => r.json()),
    fetch(`${API}/api/currency/rates`).then((r) => r.json()),
  ]);

  return Object.values(data)
    .filter((c) => c.prices.lpg !== null)
    .map((c) => {
      const eurPerLiter =
        c.unit === "gallon"
          ? (c.prices.lpg / rates[c.currency]) / 3.78541
          : c.prices.lpg / rates[c.currency];
      return { country: c.country_name, eur_per_liter: +eurPerLiter.toFixed(3) };
    })
    .sort((a, b) => a.eur_per_liter - b.eur_per_liter);
}

// ─── VANBASKET ────────────────────────────────────────────────────────────────

// Top 10 cheapest countries for food
async function cheapestCountriesForFood() {
  const { data } = await fetch(`${API}/api/vanbasket/countries`).then((r) => r.json());

  return Object.values(data)
    .sort((a, b) => a.vanbasket_index - b.vanbasket_index)
    .slice(0, 10)
    .map((c) => ({
      country: c.country_name,
      index: c.vanbasket_index,
      vs_world: `${c.pct_vs_world > 0 ? "+" : ""}${c.pct_vs_world}%`,
    }));
}

// How much does the same food basket cost in two countries (in EUR)?
async function compareFoodCost(fromCode, toCode, budgetEUR = 100) {
  const { data: comparison } = await fetch(
    `${API}/api/vanbasket/compare?from=${fromCode}&to=${toCode}`
  ).then((r) => r.json());

  const { from, to, diff_percent, budget_100 } = comparison;
  return {
    from_country: from.country_name,
    to_country: to.country_name,
    budget_from: `€${budgetEUR}`,
    budget_to: `€${((budgetEUR * budget_100) / 100).toFixed(0)}`,
    saving_pct: diff_percent,
    cheaper: diff_percent < 0,
  };
}

// ─── EVENTS ──────────────────────────────────────────────────────────────────

// Upcoming festivals in Germany
async function upcomingFestivalsDE() {
  const { events } = await fetch(
    `${API}/api/events?country=DE&status=upcoming&type=festival&locale=en`
  ).then((r) => r.json());

  return events.map((e) => ({
    name: e.event_name,
    city: e.city,
    dates: `${e.start_date} → ${e.end_date}`,
    url: e.url,
  }));
}

// Get event with all source articles
async function eventWithSources(slug, locale = "en") {
  const [event, articles] = await Promise.all([
    fetch(`${API}/api/event/${slug}?locale=${locale}`).then((r) => r.json()),
    fetch(`${API}/api/event/${slug}/articles?locale=${locale}`).then((r) => r.json()),
  ]);

  return {
    name: event.event_name,
    dates: `${event.start_date} → ${event.end_date}`,
    location: `${event.city}, ${event.country?.name}`,
    official_url: event.official_url,
    sources: articles.map((a) => ({
      title: a.title,
      source: a.source_name,
      url: a.original_url,
      lang: a.language,
    })),
  };
}

// ─── STORIES ─────────────────────────────────────────────────────────────────

// Latest vanlife news in English
async function latestStories(locale = "en", limit = 10) {
  const { stories, pagination } = await fetch(
    `${API}/api/stories?locale=${locale}&limit=${limit}`
  ).then((r) => r.json());

  console.log(`Total stories: ${pagination.total}`);
  return stories.map((s) => ({
    title: s.title,
    category: s.category.name,
    countries: s.countries.map((c) => `${c.flag_emoji} ${c.name}`).join(", "),
    published: s.first_published_at,
    url: s.url,
  }));
}

// Get story with all original publisher links
async function storyWithSources(slug, locale = "en") {
  const story = await fetch(`${API}/api/story/${slug}?locale=${locale}`).then((r) => r.json());

  return {
    title: story.title,
    summary: story.summary,
    sources: story.sources.map((s) => ({
      publisher: s.source_name,
      language: s.language,
      url: s.original_url,
      published: s.published_at,
    })),
  };
}

// News about motorhomes in Germany, in German
async function germanVanlifeNews() {
  const { stories } = await fetch(
    `${API}/api/stories?locale=de&country=DE&limit=10`
  ).then((r) => r.json());

  return stories.map((s) => ({ title: s.title, url: s.url }));
}

// ─── COMBINED: Road trip planner ─────────────────────────────────────────────

// Given a list of countries, return fuel and food costs in EUR, sorted cheapest first
async function roadTripCostComparison(countryCodes) {
  const [{ data: fuel }, { rates }, { data: vanbasket }] = await Promise.all([
    fetch(`${API}/api/fuel/prices`).then((r) => r.json()),
    fetch(`${API}/api/currency/rates`).then((r) => r.json()),
    fetch(`${API}/api/vanbasket/countries`).then((r) => r.json()),
  ]);

  return countryCodes
    .map((code) => {
      const f = fuel[code];
      const v = vanbasket[code];
      if (!f || !v) return null;

      const dieselEUR =
        f.prices.diesel !== null
          ? (f.prices.diesel / rates[f.currency]) * (f.unit === "gallon" ? 1 / 3.78541 : 1)
          : null;

      return {
        country: f.country_name,
        diesel_eur_per_liter: dieselEUR ? +dieselEUR.toFixed(3) : null,
        food_index: v.vanbasket_index,
        food_vs_world: `${v.pct_vs_world > 0 ? "+" : ""}${v.pct_vs_world}%`,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a.diesel_eur_per_liter ?? 999) - (b.diesel_eur_per_liter ?? 999));
}

// ─── Usage examples ───────────────────────────────────────────────────────────

(async () => {
  console.log("=== Top 5 cheapest diesel in Europe ===");
  console.table(await cheapestDieselEurope());

  console.log("\n=== Fuel prices in Turkey (USD/liter) ===");
  console.log(await fuelPriceInUSD("TR"));

  console.log("\n=== Food cost comparison DE → TR ===");
  console.log(await compareFoodCost("DE", "TR", 100));

  console.log("\n=== Latest stories in English ===");
  const stories = await latestStories("en", 3);
  stories.forEach((s) => console.log(`• ${s.title} [${s.category}]`));

  console.log("\n=== Road trip: Germany, Turkey, Georgia ===");
  console.table(await roadTripCostComparison(["DE", "TR", "GE", "CZ", "PL"]));
})();
