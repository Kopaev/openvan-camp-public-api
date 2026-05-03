import { OpenVanClient } from "./client.js";
import type {
  OpenVanClientOptions,
  FuelPricesResponse,
  FuelCountry,
  VanBasketListResponse,
  VanBasketCountryResponse,
  VanBasketCompareResponse,
  EventsListOptions,
  StoriesListOptions,
  VanSkyTopOptions,
} from "./types.js";

/**
 * OpenVan.camp SDK — free vanlife/RV travel data.
 *
 * @example
 * ```ts
 * import { OpenVan } from "@openvancamp/sdk";
 *
 * const ov = new OpenVan();
 *
 * const de = await ov.fuel.country("DE");
 * const weather = await ov.weather.score("FR");
 * const basket = await ov.basket.compare("DE", "TR");
 * ```
 *
 * Docs: https://openvan.camp/docs
 * License: CC BY 4.0
 */
export class OpenVan {
  private readonly client: OpenVanClient;

  readonly fuel: FuelResource;
  readonly currency: CurrencyResource;
  readonly basket: BasketResource;
  readonly weather: WeatherResource;
  readonly events: EventsResource;
  readonly stories: StoriesResource;

  constructor(options: OpenVanClientOptions = {}) {
    this.client = new OpenVanClient(options);
    this.fuel = new FuelResource(this.client);
    this.currency = new CurrencyResource(this.client);
    this.basket = new BasketResource(this.client);
    this.weather = new WeatherResource(this.client);
    this.events = new EventsResource(this.client);
    this.stories = new StoriesResource(this.client);
  }
}

// ─── Fuel ────────────────────────────────────────────────────────────────────

class FuelResource {
  constructor(private readonly client: OpenVanClient) {}

  /** All countries fuel prices. Returns a map of ISO country code → FuelCountry. */
  async prices(): Promise<Record<string, FuelCountry>> {
    const res = await this.client.get<FuelPricesResponse>("/api/fuel/prices");
    return res.data;
  }

  /** Fuel prices for a single country. */
  async country(code: string): Promise<FuelCountry> {
    const all = await this.prices();
    const entry = all[code.toUpperCase()];
    if (!entry) throw new Error(`No fuel data for country code "${code}"`);
    return entry;
  }

  /** Cheapest countries by fuel type, sorted cheapest-first (EUR-normalized). */
  async cheapest(
    fuelType: "gasoline" | "diesel" | "lpg" | "cng" = "diesel",
    limit = 10
  ): Promise<FuelCountry[]> {
    const [prices, rates] = await Promise.all([
      this.prices(),
      this.client
        .get<{ rates: Record<string, number> }>("/api/currency/rates")
        .then((r) => r.rates)
        .catch(() => ({} as Record<string, number>)),
    ]);

    return Object.values(prices)
      .filter((c) => c.prices[fuelType] != null)
      .sort((a, b) => {
        const toEur = (c: FuelCountry) => {
          const p = c.prices[fuelType];
          if (p == null) return Infinity;
          if (c.currency.toUpperCase() === "EUR") return p;
          const rate = rates[c.currency.toUpperCase()];
          return rate ? p / rate : p;
        };
        return toEur(a) - toEur(b);
      })
      .slice(0, limit);
  }
}

// ─── Currency ────────────────────────────────────────────────────────────────

class CurrencyResource {
  constructor(private readonly client: OpenVanClient) {}

  /** EUR-based exchange rates for 150+ currencies.
   * API returns { success, rates, cached, updated_at } — rates are at root level.
   */
  async rates(): Promise<Record<string, number>> {
    const res = await this.client.get<{ rates: Record<string, number> }>("/api/currency/rates");
    return res.rates;
  }

  /** Convert amount from one currency to another via EUR. */
  async convert(amount: number, from: string, to: string): Promise<number> {
    const rates = await this.rates();
    const fromRate = from.toUpperCase() === "EUR" ? 1 : rates[from.toUpperCase()];
    const toRate = to.toUpperCase() === "EUR" ? 1 : rates[to.toUpperCase()];
    if (!fromRate) throw new Error(`Unknown currency: ${from}`);
    if (!toRate) throw new Error(`Unknown currency: ${to}`);
    return (amount / fromRate) * toRate;
  }
}

// ─── VanBasket ───────────────────────────────────────────────────────────────

class BasketResource {
  constructor(private readonly client: OpenVanClient) {}

  /** Food cost index for all 92 countries (world baseline = 100). */
  async list(): Promise<VanBasketListResponse["data"]> {
    const res = await this.client.get<VanBasketListResponse>("/api/vanbasket/countries");
    return res.data;
  }

  /** Food cost index for a single country with historical snapshots. */
  async country(code: string): Promise<VanBasketCountryResponse["data"]> {
    const res = await this.client.get<VanBasketCountryResponse>(
      `/api/vanbasket/countries/${code.toUpperCase()}`
    );
    return res.data;
  }

  /** Compare food cost between two countries. ratio = to.index / from.index */
  async compare(from: string, to: string): Promise<VanBasketCompareResponse["data"]> {
    const res = await this.client.get<VanBasketCompareResponse>("/api/vanbasket/compare", {
      from: from.toUpperCase(),
      to: to.toUpperCase(),
    });
    return res.data;
  }
}

// ─── VanSky Weather ──────────────────────────────────────────────────────────

class WeatherResource {
  constructor(private readonly client: OpenVanClient) {}

  /**
   * Vanlife weather data for a country.
   * API returns { data: [...], count, updated_at, source } — data is an array of locations.
   */
  async score(countryCode: string): Promise<unknown[]> {
    const res = await this.client.get<{ data: unknown[]; count: number; updated_at: string }>(
      "/api/vansky/weather",
      { country: countryCode.toUpperCase() }
    );
    return res.data;
  }

  /** Top N countries by vanlife weather suitability. */
  async top(options: VanSkyTopOptions = {}): Promise<unknown> {
    return this.client.get("/api/vansky/top", {
      limit: options.limit,
      locale: options.locale,
    });
  }
}

// ─── Events ──────────────────────────────────────────────────────────────────

class EventsResource {
  constructor(private readonly client: OpenVanClient) {}

  /**
   * List vanlife/RV events.
   * API returns { events: [...], pagination: {}, _attribution } — events at root level.
   */
  async list(options: EventsListOptions = {}): Promise<{
    events: Record<string, unknown>[];
    pagination: Record<string, unknown>;
  }> {
    const res = await this.client.get<{
      events: Record<string, unknown>[];
      pagination: Record<string, unknown>;
    }>("/api/events", {
      locale: options.locale,
      status: options.status,
      type: options.type,
      country: options.country,
      search: options.search,
      page: options.page,
      limit: options.limit,
    });
    return { events: res.events, pagination: res.pagination };
  }

  /** Get a single event by slug. */
  async get(slug: string): Promise<unknown> {
    return this.client.get(`/api/event/${slug}`);
  }
}

// ─── Stories ─────────────────────────────────────────────────────────────────

class StoriesResource {
  constructor(private readonly client: OpenVanClient) {}

  /**
   * List news stories.
   * API returns { stories: [...], pagination: {}, _attribution } — stories at root level.
   */
  async list(options: StoriesListOptions = {}): Promise<{
    stories: Record<string, unknown>[];
    pagination: Record<string, unknown>;
  }> {
    const res = await this.client.get<{
      stories: Record<string, unknown>[];
      pagination: Record<string, unknown>;
    }>("/api/stories", {
      locale: options.locale,
      category: options.category,
      country: options.country,
      search: options.search,
      page: options.page,
      limit: options.limit,
    });
    return { stories: res.stories, pagination: res.pagination };
  }

  /** Get a single story with all source articles. */
  async get(slug: string): Promise<unknown> {
    return this.client.get(`/api/story/${slug}`);
  }
}
