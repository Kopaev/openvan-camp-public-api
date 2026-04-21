import { z } from "zod";
import { apiGet } from "../client.js";

const StorySummarySchema = z.object({
  slug: z.string(),
  title: z.string(),
  summary: z.string().nullable().optional(),
  category: z.object({ slug: z.string(), name: z.string() }).optional(),
  countries: z.array(z.object({ code: z.string(), name: z.string() })).optional(),
  first_published_at: z.string().nullable().optional(),
  articles_count: z.number().optional(),
  url: z.string().optional(),
});

const StoriesResponseSchema = z.object({
  stories: z.array(StorySummarySchema),
  pagination: z
    .object({ total: z.number(), page: z.number(), limit: z.number() })
    .optional(),
});

export const searchStoriesInput = {
  search: z.string().optional().describe("Full-text search in story title."),
  category: z
    .string()
    .optional()
    .describe("Category slug, e.g. camping, travel, gear, festival, industry."),
  country: z.string().length(2).optional().describe("ISO 3166-1 alpha-2 country code."),
  locale: z
    .enum(["en", "ru", "de", "fr", "es", "pt", "tr"])
    .default("en"),
  limit: z.number().int().min(1).max(50).default(10),
};

export async function searchStories(args: {
  search?: string;
  category?: string;
  country?: string;
  locale: string;
  limit: number;
}) {
  const raw = await apiGet("/api/stories", {
    search: args.search,
    category: args.category,
    country: args.country,
    locale: args.locale,
    limit: args.limit,
  });

  const parsed = StoriesResponseSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      content: [{ type: "text" as const, text: "Stories endpoint returned unexpected data." }],
      isError: true,
    };
  }

  const { stories, pagination } = parsed.data;
  if (stories.length === 0) {
    return { content: [{ type: "text" as const, text: "No stories match the filter." }] };
  }

  const lines = stories.map(
    (s) =>
      `• ${s.title}\n    ${s.category?.name ?? ""} · ${(s.countries ?? []).map((c) => c.code).join(", ")} · ${s.first_published_at ?? ""}\n    ${s.summary ?? ""}\n    ${s.url ?? ""}`
  );

  const header = pagination
    ? `${stories.length} of ${pagination.total} stories:`
    : `${stories.length} stories:`;

  return { content: [{ type: "text" as const, text: `${header}\n\n${lines.join("\n\n")}` }] };
}
