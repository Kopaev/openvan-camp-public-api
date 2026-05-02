import { OpenVanClient } from "./client.js";
import type {
  OpenVanClientOptions,
  FuelPricesResponse,
  FuelCountry,
  CurrencyRatesResponse,
  VanBasketListResponse,
  VanBasketCountryResponse,
  VanBasketCompareResponse,
  VanSkyResponse,
  VanSkyTopResponse,
  VanSkyTopOptions,
  EventsListResponse,
  EventResponse,
  StoriesListResponse,
  StoryResponse,
  EventsListOptions,
  StoriesListOptions,
} from "./types.js";

/**
 * OpenVan.camp SDK — free vanlife/RV travel data.
 *
 * @example
 * ```ts
 * import { OpenVan } from "@openvan/sdk";
 *
 * const ov = new OpenVan();
 *
 * const prices = await ov.fuel.prices();
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

  /**
   * Find the cheapest fuel type across countries, sorted by local price (EUR-normalized when possible).
   * Returns entries sorted cheapest-first.
   */
  async cheapest(
    fuelType: "gasoline" | "diesel" | "lpg" | "cng" = "diesel",
    limit = 10
  ): Promise<FuelCountry[]> {
    const [prices, rates] = await Promise.all([
      this.prices(),
      this.client
        .get<CurrencyRatesResponse>("/api/currency/rates")
        .then((r) => r.data.rates)
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

  /** EUR-based exchange rates for 150+ currencies. */
  async rates(): Promise<Record<string, number>> {
    const res = await this.client.get<CurrencyRatesResponse>("/api/currency/rates");
    return res.data.rates;
  }

  /**
   * Convert amount from one currency to another.
   * All conversions go via EUR as base.
   */
  async convert(amount: number, from: string, to: string): Promise<number> {
    const rates = await this.rates();
    const fromRate = from.toUpperCase() === "EUR" ? 1 : rates[from.toUpperCase()];
    const toRate = to.toUpperCase() === "EUR" ? 1 : rates[to.toUpperCase()];
    if (!fromRate) throw new Error(`Unknown currency: ${from}`);
    if (!toRate) throw new Error(`Unknown currency: ${to}`);
    const eur = amount / fromRate;
    return eur * toRate;
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

  /**
   * Compare food cost index between two countries.
   * Shows how much cheaper/expensive `to` is relative to `from`.
   */
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

  /** Vanlife-specific weather suitability score (0-100) for a country. */
  async score(countryCode: string, locale = "en"): Promise<VanSkyResponse["data"]> {
    const res = await this.client.get<VanSkyResponse>("/api/vansky/weather", {
      country: countryCode.toUpperCase(),
      locale,
    });
    return res.data;
  }

  /** Top N countries by vanlife weather suitability. */
  async top(options: VanSkyTopOptions = {}): Promise<VanSkyTopResponse["data"]> {
    const res = await this.client.get<VanSkyTopResponse>("/api/vansky/top", {
      limit: options.limit,
      locale: options.locale,
    });
    return res.data;
  }
}

// ─── Events ──────────────────────────────────────────────────────────────────

class EventsResource {
  constructor(private readonly client: OpenVanClient) {}

  /** List vanlife/RV events with optional filters. */
  async list(options: EventsListOptions = {}): Promise<EventsListResponse["data"]> {
    const res = await this.client.get<EventsListResponse>("/api/events", {
      locale: options.locale,
      status: options.status,
      type: options.type,
      country: options.country,
      search: options.search,
      page: options.page,
      limit: options.limit,
    });
    return res.data;
  }

  /** Get a single event by slug. */
  async get(slug: string): Promise<EventResponse["data"]> {
    const res = await this.client.get<EventResponse>(`/api/event/${slug}`);
    return res.data;
  }
}

// ─── Stories ─────────────────────────────────────────────────────────────────

class StoriesResource {
  constructor(private readonly client: OpenVanClient) {}

  /** List news stories with optional filters. */
  async list(options: StoriesListOptions = {}): Promise<StoriesListResponse["data"]> {
    const res = await this.client.get<StoriesListResponse>("/api/stories", {
      locale: options.locale,
      category: options.category,
      country: options.country,
      search: options.search,
      page: options.page,
      limit: options.limit,
    });
    return res.data;
  }

  /** Get a single story with all source articles. */
  async get(slug: string): Promise<StoryResponse["data"]> {
    const res = await this.client.get<StoryResponse>(`/api/story/${slug}`);
    return res.data;
  }
}
