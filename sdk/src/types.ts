// ─── Shared ────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
  _attribution?: { source: string; license: string };
}

// ─── Fuel Prices ────────────────────────────────────────────────────────────

export interface FuelPrices {
  /** Prices per liter (or gallon for US/Ecuador) in local currency */
  gasoline?: number | null;
  diesel?: number | null;
  lpg?: number | null;
  e85?: number | null;
  premium?: number | null;
  cng?: number | null;
}

export interface FuelCountry {
  country_code: string;
  country_name: string;
  region?: string | null;
  currency: string;
  /** "liter" or "gallon" */
  unit: string;
  prices: FuelPrices;
  fetched_at?: string | null;
  sources?: string[];
}

export type FuelPricesResponse = ApiResponse<Record<string, FuelCountry>>;

// ─── Currency Rates ──────────────────────────────────────────────────────────

export interface CurrencyRatesData {
  /** Units of currency per 1 EUR */
  rates: Record<string, number>;
  base: string;
  updated_at: string;
}

export type CurrencyRatesResponse = ApiResponse<CurrencyRatesData>;

// ─── VanBasket ───────────────────────────────────────────────────────────────

export interface VanBasketSnapshot {
  year: number;
  index: number;
}

export interface VanBasketCountry {
  country_code: string;
  country_name: string;
  /** Cost-of-living index vs world baseline (100 = world average) */
  index: number;
  currency: string;
  data_quality?: string;
  snapshots?: VanBasketSnapshot[];
}

export type VanBasketListResponse = ApiResponse<VanBasketCountry[]>;
export type VanBasketCountryResponse = ApiResponse<VanBasketCountry>;

export interface VanBasketCompareData {
  from: VanBasketCountry;
  to: VanBasketCountry;
  /** to.index / from.index */
  ratio: number;
}

export type VanBasketCompareResponse = ApiResponse<VanBasketCompareData>;

// ─── VanSky Weather ──────────────────────────────────────────────────────────

export interface VanSkyDay {
  date: string;
  /** Overall vanlife suitability 0-100 */
  score: number;
  van_comfort?: number;
  sleep_score?: number;
  solar_yield?: number;
  driving_safety?: number;
  awning_safety?: number;
  condensation_risk?: number;
  summary?: string;
}

export interface VanSkyCountry {
  country_code: string;
  country_name: string;
  /** Overall 7-day suitability score 0-100 */
  score: number;
  forecast: VanSkyDay[];
}

export type VanSkyResponse = ApiResponse<VanSkyCountry>;

export interface VanSkyTopEntry {
  country_code: string;
  country_name: string;
  score: number;
}

export type VanSkyTopResponse = ApiResponse<VanSkyTopEntry[]>;

// ─── Events ──────────────────────────────────────────────────────────────────

export type EventStatus = "upcoming" | "ongoing" | "past";
export type EventType = "expo" | "festival" | "forum" | "meetup" | "roadtrip";

export interface VanEvent {
  slug: string;
  title: string;
  description?: string;
  type: EventType;
  status: EventStatus;
  country_code?: string;
  country_name?: string;
  city?: string;
  venue?: string;
  lat?: number;
  lng?: number;
  starts_at?: string;
  ends_at?: string;
  url?: string;
  article_count?: number;
}

export interface EventsListData {
  events: VanEvent[];
  pagination: PaginationMeta;
}

export type EventsListResponse = ApiResponse<EventsListData>;
export type EventResponse = ApiResponse<VanEvent>;

// ─── Stories ─────────────────────────────────────────────────────────────────

export type StoryCategory =
  | "camping"
  | "travel"
  | "gear"
  | "incident"
  | "lifestyle"
  | "opening"
  | "other";

export interface SourceArticle {
  url: string;
  title: string;
  published_at?: string;
  source_name?: string;
}

export interface VanStory {
  slug: string;
  title: string;
  summary?: string;
  category?: StoryCategory;
  country_code?: string;
  country_name?: string;
  image_url?: string;
  published_at?: string;
  article_count?: number;
  articles?: SourceArticle[];
}

export interface StoriesListData {
  stories: VanStory[];
  pagination: PaginationMeta;
}

export type StoriesListResponse = ApiResponse<StoriesListData>;
export type StoryResponse = ApiResponse<VanStory>;

// ─── Shared pagination ───────────────────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  limit: number;
  total?: number;
  has_more?: boolean;
}

// ─── Options ─────────────────────────────────────────────────────────────────

export interface OpenVanClientOptions {
  /** Default: "https://openvan.camp" */
  baseUrl?: string;
  /** Appended as ?source= for attribution tracking */
  source?: string;
  /** Custom fetch implementation */
  fetch?: typeof fetch;
}

export interface EventsListOptions {
  locale?: string;
  status?: EventStatus | "all";
  type?: EventType;
  country?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface StoriesListOptions {
  locale?: string;
  category?: StoryCategory;
  country?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface VanSkyTopOptions {
  limit?: number;
  locale?: string;
}
