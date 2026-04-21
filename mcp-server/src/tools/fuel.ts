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

type FuelCountry = z.infer<typeof FuelCountrySchema>;

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
  const raw = await apiGet("/api/fuel/prices");
  const parsed = FuelResponseSchema.parse(raw);

  if (country_code) {
    const upper = country_code.toUpperCase();
    const entry = parsed.data[upper];
    if (!entry) {
      return {
        content: [
          {
            type: "text" as const,
            text: `No fuel price data for country code "${upper}". Try one of: ${Object.keys(parsed.data).slice(0, 10).join(", ")}...`,
          },
        ],
        isError: true,
      };
    }
    return {
      content: [
        {
          type: "text" as const,
          text: formatCountry(entry),
        },
      ],
    };
  }

  const summary = Object.values(parsed.data).slice(0, 20).map(formatCountryRow).join("\n");
  return {
    content: [
      {
        type: "text" as const,
        text: `Fuel prices (showing 20 of ${Object.keys(parsed.data).length} countries, per liter in local currency):\n\n${summary}\n\nPass country_code to get detailed data for one country.`,
      },
    ],
  };
}

function formatCountry(c: FuelCountry): string {
  const prices = c.prices ?? {};
  const lines = [
    `${c.country_name} (${c.country_code}) — prices per ${c.unit} in ${c.currency}`,
    `  Gasoline: ${fmt(prices.gasoline)}`,
    `  Diesel:   ${fmt(prices.diesel)}`,
    `  LPG:      ${fmt(prices.lpg)}`,
  ];
  if (prices.cng !== undefined) lines.push(`  CNG:      ${fmt(prices.cng)}`);
  if (c.fetched_at) lines.push(`  Updated:  ${c.fetched_at}`);
  if (c.sources?.length) lines.push(`  Sources:  ${c.sources.join(", ")}`);
  return lines.join("\n");
}

function formatCountryRow(c: FuelCountry): string {
  const p = c.prices ?? {};
  return `${c.country_code}  ${c.country_name.padEnd(25)}  diesel=${fmt(p.diesel)}  gasoline=${fmt(p.gasoline)}  lpg=${fmt(p.lpg)}  (${c.currency}/${c.unit})`;
}

function fmt(v: number | null | undefined): string {
  return v == null ? "—" : v.toFixed(3);
}

// ------------------------------------------------------------------
// compare_fuel_prices
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
  const raw = await apiGet("/api/fuel/prices");
  const parsed = FuelResponseSchema.parse(raw);

  const rows = country_codes
    .map((cc) => parsed.data[cc.toUpperCase()])
    .filter((c): c is FuelCountry => Boolean(c))
    .map((c) => ({ c, price: c.prices?.[fuel_type] }))
    .sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));

  if (rows.length === 0) {
    return {
      content: [{ type: "text" as const, text: "None of the requested country codes match OpenVan fuel data." }],
      isError: true,
    };
  }

  const cheapest = rows[0];
  const table = rows
    .map((r) => `  ${r.c.country_code}  ${r.c.country_name.padEnd(25)}  ${fmt(r.price)} ${r.c.currency}/${r.c.unit}`)
    .join("\n");

  return {
    content: [
      {
        type: "text" as const,
        text: `${fuel_type} price comparison (cheapest first):\n\n${table}\n\nCheapest: ${cheapest.c.country_name} at ${fmt(cheapest.price)} ${cheapest.c.currency}/${cheapest.c.unit}.`,
      },
    ],
  };
}

// ------------------------------------------------------------------
// find_cheapest_fuel
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
  const raw = await apiGet("/api/fuel/prices");
  const parsed = FuelResponseSchema.parse(raw);

  const rows = Object.values(parsed.data)
    .filter((c) => region === "world" || c.region === region)
    .map((c) => ({ c, price: c.prices?.[fuel_type] }))
    .filter((r) => r.price != null)
    .sort((a, b) => (a.price as number) - (b.price as number))
    .slice(0, limit);

  if (rows.length === 0) {
    return {
      content: [{ type: "text" as const, text: `No ${fuel_type} data available for region "${region}".` }],
      isError: true,
    };
  }

  const table = rows
    .map((r, i) => `  ${i + 1}. ${r.c.country_code}  ${r.c.country_name.padEnd(25)}  ${fmt(r.price)} ${r.c.currency}/${r.c.unit}`)
    .join("\n");

  return {
    content: [
      {
        type: "text" as const,
        text: `Cheapest ${fuel_type} (${region}):\n\n${table}`,
      },
    ],
  };
}
