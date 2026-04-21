import { z } from "zod";
import { apiGet } from "../client.js";

const FuelCountrySchema = z.object({
  country_code: z.string(),
  country_name: z.string(),
  region: z.string().nullable().optional(),
  currency: z.string(),
  unit: z.string(),
  prices: z
    .record(z.string(), z.number().nullable())
    .optional(),
  fetched_at: z.string().nullable().optional(),
  sources: z.array(z.string()).optional(),
});

const FuelResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z.record(z.string(), FuelCountrySchema),
});

const RatesResponseSchema = z.object({
  rates: z.record(z.string(), z.number()),
  updated_at: z.string().optional(),
});

type FuelCountry = z.infer<typeof FuelCountrySchema>;

// ------------------------------------------------------------------
// Currency normalization (shared by compare_* and find_cheapest_*)
// ------------------------------------------------------------------

/**
 * Convert a price in local currency to EUR using openvan.camp currency rates.
 * Rates are quoted as "units of CCC per 1 EUR", so:
 *   price_eur = price_local / rate[CCC]
 *
 * Returns NaN if the currency isn't in the rates table — caller decides
 * whether to fall back to raw sort or drop the row.
 */
function toEur(
  priceLocal: number | null | undefined,
  currency: string,
  rates: Record<string, number>
): number {
  if (priceLocal == null) return NaN;
  const cc = currency.toUpperCase();
  if (cc === "EUR") return priceLocal;
  const rate = rates[cc];
  if (!rate || rate <= 0) return NaN;
  return priceLocal / rate;
}

async function fetchFuelAndRates() {
  const [fuelRaw, ratesRaw] = await Promise.all([
    apiGet("/api/fuel/prices"),
    apiGet("/api/currency/rates"),
  ]);
  const fuel = FuelResponseSchema.parse(fuelRaw);
  const rates = RatesResponseSchema.safeParse(ratesRaw);
  return {
    fuel,
    rates: rates.success ? rates.data.rates : {},
    ratesUpdatedAt: rates.success ? rates.data.updated_at : undefined,
  };
}

// ------------------------------------------------------------------
// get_fuel_prices
// ------------------------------------------------------------------

export const getFuelPricesInput = {
  country_code: z
    .string()
    .length(2)
    .optional()
    .describe("ISO 3166-1 alpha-2 country code, e.g. DE. If omitted, returns all countries."),
};

export async function getFuelPrices({
  country_code,
}: {
  country_code?: string;
}) {
  const { fuel, rates } = await fetchFuelAndRates();

  if (country_code) {
    const upper = country_code.toUpperCase();
    const entry = fuel.data[upper];
    if (!entry) {
      return {
        content: [
          {
            type: "text" as const,
            text: `No fuel price data for country code "${upper}". Try one of: ${Object.keys(fuel.data).slice(0, 10).join(", ")}...`,
          },
        ],
        isError: true,
      };
    }
    return {
      content: [
        {
          type: "text" as const,
          text: formatCountry(entry, rates),
        },
      ],
    };
  }

  const summary = Object.values(fuel.data)
    .slice(0, 20)
    .map((c) => formatCountryRow(c, rates))
    .join("\n");
  return {
    content: [
      {
        type: "text" as const,
        text: `Fuel prices (showing 20 of ${Object.keys(fuel.data).length} countries, per liter):\n\n${summary}\n\nPass country_code to get detailed data for one country.`,
      },
    ],
  };
}

function formatCountry(c: FuelCountry, rates: Record<string, number>): string {
  const prices = c.prices ?? {};
  const isEur = c.currency.toUpperCase() === "EUR";
  const lines = [
    `${c.country_name} (${c.country_code}) — prices per ${c.unit} in ${c.currency}${isEur ? "" : " (≈ EUR shown in brackets)"}`,
    `  Gasoline: ${fmtPair(prices.gasoline, c.currency, rates, isEur)}`,
    `  Diesel:   ${fmtPair(prices.diesel, c.currency, rates, isEur)}`,
    `  LPG:      ${fmtPair(prices.lpg, c.currency, rates, isEur)}`,
  ];
  if (prices.cng !== undefined) {
    lines.push(`  CNG:      ${fmtPair(prices.cng, c.currency, rates, isEur)}`);
  }
  if (c.fetched_at) lines.push(`  Updated:  ${c.fetched_at}`);
  if (c.sources?.length) lines.push(`  Sources:  ${c.sources.join(", ")}`);
  return lines.join("\n");
}

function formatCountryRow(c: FuelCountry, rates: Record<string, number>): string {
  const p = c.prices ?? {};
  const isEur = c.currency.toUpperCase() === "EUR";
  const diesel = fmtPair(p.diesel, c.currency, rates, isEur);
  const gasoline = fmtPair(p.gasoline, c.currency, rates, isEur);
  const lpg = fmtPair(p.lpg, c.currency, rates, isEur);
  return `${c.country_code}  ${c.country_name.padEnd(25)}  diesel=${diesel}  gas=${gasoline}  lpg=${lpg}`;
}

function fmtPair(
  v: number | null | undefined,
  currency: string,
  rates: Record<string, number>,
  isEur: boolean
): string {
  if (v == null) return "—";
  if (isEur) return `${v.toFixed(3)} EUR`;
  const eur = toEur(v, currency, rates);
  if (isNaN(eur)) return `${v.toFixed(3)} ${currency}`;
  return `${v.toFixed(3)} ${currency} (≈${eur.toFixed(3)} EUR)`;
}

function fmt(v: number | null | undefined): string {
  return v == null ? "—" : v.toFixed(3);
}

// ------------------------------------------------------------------
// compare_fuel_prices — sorts by EUR-normalized price
// ------------------------------------------------------------------

export const compareFuelPricesInput = {
  country_codes: z
    .array(z.string().length(2))
    .min(2)
    .max(10)
    .describe("Array of 2-10 ISO 3166-1 alpha-2 country codes to compare."),
  fuel_type: z
    .enum(["gasoline", "diesel", "lpg", "cng"])
    .default("diesel")
    .describe("Fuel type to compare."),
};

export async function compareFuelPrices({
  country_codes,
  fuel_type,
}: {
  country_codes: string[];
  fuel_type: "gasoline" | "diesel" | "lpg" | "cng";
}) {
  const { fuel, rates, ratesUpdatedAt } = await fetchFuelAndRates();

  type Row = {
    c: FuelCountry;
    priceLocal: number | null | undefined;
    priceEur: number; // NaN if conversion unavailable
  };

  const rows: Row[] = country_codes
    .map((cc) => fuel.data[cc.toUpperCase()])
    .filter((c): c is FuelCountry => Boolean(c))
    .map((c) => {
      const priceLocal = c.prices?.[fuel_type];
      return {
        c,
        priceLocal,
        priceEur: toEur(priceLocal, c.currency, rates),
      };
    })
    .filter((r) => r.priceLocal != null);

  if (rows.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: "None of the requested country codes have data for this fuel type.",
        },
      ],
      isError: true,
    };
  }

  // Sort by EUR price. Rows with NaN priceEur (currency not in rates table)
  // go to the bottom and are flagged so the user sees them but isn't misled.
  rows.sort((a, b) => {
    const aBad = isNaN(a.priceEur);
    const bBad = isNaN(b.priceEur);
    if (aBad && !bBad) return 1;
    if (!aBad && bBad) return -1;
    if (aBad && bBad) return 0;
    return a.priceEur - b.priceEur;
  });

  const table = rows
    .map((r) => {
      const isEur = r.c.currency.toUpperCase() === "EUR";
      const local = `${fmt(r.priceLocal)} ${r.c.currency}/${r.c.unit}`;
      if (isEur) {
        return `  ${r.c.country_code}  ${r.c.country_name.padEnd(25)}  ${local}`;
      }
      if (isNaN(r.priceEur)) {
        return `  ${r.c.country_code}  ${r.c.country_name.padEnd(25)}  ${local}  (⚠️ currency not in rates table)`;
      }
      return `  ${r.c.country_code}  ${r.c.country_name.padEnd(25)}  ${local}  ≈ ${r.priceEur.toFixed(3)} EUR/${r.c.unit}`;
    })
    .join("\n");

  const cheapest = rows[0];
  const cheapestLine = isNaN(cheapest.priceEur)
    ? `Cheapest (by local price only, EUR conversion unavailable): ${cheapest.c.country_name} at ${fmt(cheapest.priceLocal)} ${cheapest.c.currency}/${cheapest.c.unit}.`
    : `Cheapest: ${cheapest.c.country_name} at ≈ ${cheapest.priceEur.toFixed(3)} EUR/${cheapest.c.unit}${cheapest.c.currency.toUpperCase() !== "EUR" ? ` (${fmt(cheapest.priceLocal)} ${cheapest.c.currency})` : ""}.`;

  const footer = ratesUpdatedAt ? `\nCurrency rates: openvan.camp (updated ${ratesUpdatedAt}).` : "";

  return {
    content: [
      {
        type: "text" as const,
        text: `${fuel_type} price comparison (cheapest first, sorted by EUR-equivalent):\n\n${table}\n\n${cheapestLine}${footer}`,
      },
    ],
  };
}

// ------------------------------------------------------------------
// find_cheapest_fuel — sorts by EUR-normalized price across a region
// ------------------------------------------------------------------

export const findCheapestFuelInput = {
  region: z
    .enum(["europe", "asia", "africa", "north_america", "south_america", "oceania", "world"])
    .default("world")
    .describe("Region to search. Default: world (all countries)."),
  fuel_type: z
    .enum(["gasoline", "diesel", "lpg", "cng"])
    .default("diesel")
    .describe("Fuel type."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(20)
    .default(5)
    .describe("How many cheapest countries to return."),
};

export async function findCheapestFuel({
  region,
  fuel_type,
  limit,
}: {
  region: "europe" | "asia" | "africa" | "north_america" | "south_america" | "oceania" | "world";
  fuel_type: "gasoline" | "diesel" | "lpg" | "cng";
  limit: number;
}) {
  const { fuel, rates, ratesUpdatedAt } = await fetchFuelAndRates();

  const rows = Object.values(fuel.data)
    .filter((c) => region === "world" || c.region === region)
    .map((c) => {
      const priceLocal = c.prices?.[fuel_type];
      return {
        c,
        priceLocal,
        priceEur: toEur(priceLocal, c.currency, rates),
      };
    })
    .filter((r) => r.priceLocal != null && !isNaN(r.priceEur))
    .sort((a, b) => a.priceEur - b.priceEur)
    .slice(0, limit);

  if (rows.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: `No ${fuel_type} data available for region "${region}" (or all matching countries use currencies not in the rates table).`,
        },
      ],
      isError: true,
    };
  }

  const table = rows
    .map((r, i) => {
      const isEur = r.c.currency.toUpperCase() === "EUR";
      const local = `${fmt(r.priceLocal)} ${r.c.currency}/${r.c.unit}`;
      if (isEur) {
        return `  ${i + 1}. ${r.c.country_code}  ${r.c.country_name.padEnd(25)}  ${local}`;
      }
      return `  ${i + 1}. ${r.c.country_code}  ${r.c.country_name.padEnd(25)}  ≈ ${r.priceEur.toFixed(3)} EUR/${r.c.unit}  (${local})`;
    })
    .join("\n");

  const footer = ratesUpdatedAt ? `\n\nSorted by EUR-equivalent. Currency rates: openvan.camp (updated ${ratesUpdatedAt}).` : "";

  return {
    content: [
      {
        type: "text" as const,
        text: `Cheapest ${fuel_type} in ${region}:\n\n${table}${footer}`,
      },
    ],
  };
}
