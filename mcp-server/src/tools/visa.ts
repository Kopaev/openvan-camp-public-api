import { z } from "zod";
import { apiGet } from "../client.js";

/**
 * Visa and border rules — /api/visa/*.
 *
 * Ответ отдаём вместе с confidence и слоем данных: правило въезда, поданное как
 * бесспорное, стоит человеку разворота на границе. Поэтому здесь ничего не
 * округляется и не «упрощается»: что пришло из API, то и в тексте.
 */

const StaySchema = z.object({
  visa_type: z.string().nullish(),
  max_continuous: z.number().nullish(),
  max_total: z.number().nullish(),
  duration: z.number().nullish(),
  window: z.string().nullish(),
  window_days: z.number().nullish(),
  visa_run: z.boolean().nullish(),
  confidence: z.string().nullish(),
  source_url: z.string().nullish(),
  note: z.string().nullish(),
  updated_at: z.string().nullish(),
  layer: z.string().nullish(),
});

const VehicleSchema = z.object({
  weight_class: z.string().nullish(),
  plate_group: z.string().nullish(),
  max_days: z.number().nullish(),
  basis: z.string().nullish(),
  window_days: z.number().nullish(),
  carnet_required: z.boolean().nullish(),
  green_card: z.string().nullish(),
  confidence: z.string().nullish(),
  source_url: z.string().nullish(),
  note: z.string().nullish(),
  curated: z.boolean().nullish(),
});

const CheckResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z.object({
    passport: z.object({ code: z.string(), name: z.string().nullish() }),
    destination: z.object({ code: z.string(), name: z.string().nullish() }),
    entry_mode: z.string().nullish(),
    counted_against: z.string().nullish(),
    stay: StaySchema.nullish(),
    vehicle: VehicleSchema.nullish(),
  }),
  meta: z.object({ disclaimer: z.string().nullish() }).nullish(),
});

const DISCLAIMER =
  "Reference data, not legal advice — rules change without notice; verify with the consulate or at the border.";

function stayLine(stay: z.infer<typeof StaySchema>): string {
  const parts: string[] = [];

  if (stay.max_continuous) {
    parts.push(`${stay.max_continuous} days per single entry`);
  }
  if (stay.max_total && stay.max_total !== stay.max_continuous) {
    parts.push(`${stay.max_total} days in total`);
  }
  if (stay.duration && parts.length === 0) {
    parts.push(`${stay.duration} days`);
  }
  if (stay.window === "rolling" && stay.window_days) {
    parts.push(`counted in a rolling ${stay.window_days}-day window`);
  } else if (stay.window === "per_entry") {
    parts.push("counted per entry");
  } else if (stay.window === "calendar_year") {
    parts.push("counted per calendar year");
  } else if (stay.window === "unlimited") {
    parts.push("no day limit");
  }
  if (stay.visa_run === true) {
    parts.push("a visa run resets the counter");
  } else if (stay.visa_run === false && stay.window === "rolling") {
    parts.push("a visa run does NOT reset the counter");
  }

  return parts.length > 0 ? parts.join(", ") : "length of stay unknown";
}

function vehicleLine(vehicle: z.infer<typeof VehicleSchema>): string {
  const parts: string[] = [];
  const weight =
    vehicle.weight_class === "le35"
      ? "up to 3.5 t"
      : vehicle.weight_class === "gt35"
        ? "over 3.5 t"
        : null;

  if (weight) parts.push(weight);
  if (vehicle.max_days) {
    parts.push(
      `${vehicle.max_days} days${vehicle.basis === "per_entry" ? " per entry" : ""}`
    );
  }
  if (vehicle.basis === "tied_to_person") {
    parts.push("the vehicle leaves with the driver (same term as the stay)");
  }
  if (vehicle.carnet_required) parts.push("Carnet de Passages required");
  if (vehicle.green_card) parts.push(`green card: ${vehicle.green_card}`);
  if (vehicle.confidence) parts.push(`confidence ${vehicle.confidence}`);

  return parts.length > 0 ? parts.join(", ") : "no verified rule";
}

export const checkVisaRulesInput = {
  passport: z
    .string()
    .length(2)
    .describe("ISO 3166-1 alpha-2 code of the passport, e.g. RU."),
  destination: z
    .string()
    .describe("Destination: ISO alpha-2 code, slug or zone code, e.g. TR."),
  weight: z
    .enum(["le35", "gt35"])
    .optional()
    .describe("Vehicle weight class for the vehicle rule: le35 (<=3.5 t) or gt35."),
  plate: z
    .enum(["eu", "non_eu", "eaeu", "third"])
    .optional()
    .describe("Plate origin for the green card rule."),
};

export async function checkVisaRules({
  passport,
  destination,
  weight,
  plate,
}: {
  passport: string;
  destination: string;
  weight?: string;
  plate?: string;
}) {
  const raw = await apiGet("/api/visa/check", {
    passport,
    destination,
    weight,
    plate,
    locale: "en",
  });
  const parsed = CheckResponseSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      content: [
        {
          type: "text" as const,
          text: `No visa data for ${passport} -> ${destination}.`,
        },
      ],
      isError: true,
    };
  }

  const d = parsed.data.data;
  const lines: string[] = [
    `${d.passport.name ?? d.passport.code} passport -> ${d.destination.name ?? d.destination.code}`,
    `Entry mode: ${d.entry_mode ?? "unknown"}`,
  ];

  if (d.stay) {
    lines.push(`Stay: ${stayLine(d.stay)}`);
    if (d.counted_against && d.counted_against !== d.destination.code) {
      lines.push(
        `Days are counted against the ${d.counted_against} zone, shared with its other members.`
      );
    }
    if (d.stay.note) lines.push(`Note: ${d.stay.note}`);
    lines.push(
      `Confidence: ${d.stay.confidence ?? "unknown"} (source layer: ${d.stay.layer ?? "base"}${d.stay.updated_at ? `, checked ${d.stay.updated_at}` : ""})`
    );
    if (d.stay.source_url) lines.push(`Source: ${d.stay.source_url}`);
  }

  if (d.vehicle) {
    lines.push(`Vehicle (temporary import): ${vehicleLine(d.vehicle)}`);
    if (d.vehicle.note) lines.push(`Vehicle note: ${d.vehicle.note}`);
    if (d.vehicle.source_url) lines.push(`Vehicle source: ${d.vehicle.source_url}`);
  }

  lines.push(parsed.data.meta?.disclaimer ?? DISCLAIMER);

  return { content: [{ type: "text" as const, text: lines.join("\n") }] };
}

const RouteResponseSchema = z.object({
  data: z.object({
    legs: z.array(
      z.object({
        code: z.string(),
        name: z.string().nullish(),
        home: z.boolean().nullish(),
        rows: z
          .array(
            z.object({
              mode_label: z.string().nullish(),
              days: z.number().nullish(),
              days_label: z.string().nullish(),
              window_label: z.string().nullish(),
              confidence: z.string().nullish(),
              note: z.string().nullish(),
              passports: z.array(z.string()).nullish(),
            })
          )
          .nullish(),
        warnings: z.array(z.string()).nullish(),
      })
    ),
    bottleneck: z
      .object({
        kind: z.string().nullish(),
        days: z.number().nullish(),
        code: z.string().nullish(),
        name: z.string().nullish(),
      })
      .nullish(),
  }),
});

export const getRouteVisaRulesInput = {
  countries: z
    .string()
    .describe(
      "Countries in travel order, comma separated ISO alpha-2 codes or slugs, up to 12, e.g. RU,GE,TR."
    ),
  passports: z
    .string()
    .optional()
    .describe("Passports to answer for, comma separated, up to 10, e.g. RU,BY."),
  weight: z
    .enum(["le35", "gt35"])
    .optional()
    .describe("Vehicle weight class for the vehicle rules."),
};

export async function getRouteVisaRules({
  countries,
  passports,
  weight,
}: {
  countries: string;
  passports?: string;
  weight?: string;
}) {
  const raw = await apiGet("/api/visa/route", {
    t: countries,
    p: passports,
    w: weight,
    locale: "en",
  });
  const parsed = RouteResponseSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      content: [
        { type: "text" as const, text: `No visa data for route ${countries}.` },
      ],
      isError: true,
    };
  }

  const lines: string[] = [];

  for (const leg of parsed.data.data.legs) {
    const head = `${leg.name ?? leg.code}${leg.home ? " (home country)" : ""}`;
    const rows = (leg.rows ?? []).map((row) => {
      const who = row.passports?.length ? `${row.passports.join("/")}: ` : "";
      const stay = row.days_label ?? (row.days ? `${row.days} days` : "no day limit");
      // window_label у безлимитных строк повторяет stay ("no day limit, no day limit").
      const win = row.window_label && row.window_label !== stay ? `, ${row.window_label}` : "";
      const conf = row.confidence ? ` [confidence ${row.confidence}]` : "";
      return `  - ${who}${row.mode_label ?? "unknown mode"} — ${stay}${win}${conf}`;
    });

    lines.push(head);
    lines.push(...(rows.length > 0 ? rows : ["  - no data"]));
    for (const warning of leg.warnings ?? []) {
      lines.push(`  ! ${warning}`);
    }
  }

  const bottleneck = parsed.data.data.bottleneck;
  if (bottleneck?.code) {
    lines.push(
      `Tightest leg: ${bottleneck.name ?? bottleneck.code}${bottleneck.days ? ` — ${bottleneck.days} days` : ""}.`
    );
  }

  lines.push(DISCLAIMER);

  return { content: [{ type: "text" as const, text: lines.join("\n") }] };
}

const VehicleResponseSchema = z.object({
  data: z.array(VehicleSchema),
  meta: z.object({
    name: z.string().nullish(),
    place: z.string().nullish(),
    disclaimer: z.string().nullish(),
  }),
});

export const getVehicleImportRulesInput = {
  country: z
    .string()
    .describe("Country: ISO alpha-2 code, slug or zone code, e.g. georgia or GE."),
};

export async function getVehicleImportRules({ country }: { country: string }) {
  const raw = await apiGet(`/api/visa/vehicle/${encodeURIComponent(country)}`, {
    locale: "en",
  });
  const parsed = VehicleResponseSchema.safeParse(raw);

  if (!parsed.success || parsed.data.data.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: `No verified temporary vehicle import rule for ${country}. A rule we cannot stand behind is not returned — check with the customs authority.`,
        },
      ],
    };
  }

  const name = parsed.data.meta.name ?? parsed.data.meta.place ?? country;
  const lines = [`Temporary vehicle import — ${name}`];

  for (const rule of parsed.data.data) {
    lines.push(`- ${vehicleLine(rule)}${rule.curated ? "" : " (unverified secondary source)"}`);
    if (rule.note) lines.push(`  ${rule.note}`);
    if (rule.source_url) lines.push(`  Source: ${rule.source_url}`);
  }

  lines.push(parsed.data.meta.disclaimer ?? DISCLAIMER);

  return { content: [{ type: "text" as const, text: lines.join("\n") }] };
}
