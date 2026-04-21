import { z } from "zod";
import { apiGet } from "../client.js";

export const compareVanBasketInput = {
  from: z.string().length(2).describe("Home country ISO alpha-2 code."),
  to: z.string().length(2).describe("Destination country ISO alpha-2 code."),
};

export async function compareVanBasket({ from, to }: { from: string; to: string }) {
  const raw = await apiGet("/api/vanbasket/compare", { from, to });
  // Shape is loose in the public API — we pass through with light formatting.
  const wrapper = raw as { data?: Record<string, unknown>; success?: boolean };
  const data = (wrapper.data ?? raw) as Record<string, unknown>;

  return {
    content: [
      {
        type: "text" as const,
        text: `VanBasket comparison ${from.toUpperCase()} → ${to.toUpperCase()}:\n\n${JSON.stringify(data, null, 2)}\n\nIndex is relative to world average = 100. Higher = more expensive food.`,
      },
    ],
  };
}

export const getVanBasketInput = {
  country_code: z.string().length(2).describe("ISO 3166-1 alpha-2 country code."),
};

export async function getVanBasket({ country_code }: { country_code: string }) {
  const cc = country_code.toLowerCase();
  const raw = await apiGet(`/api/vanbasket/countries/${cc}`);
  const wrapper = raw as { data?: Record<string, unknown> };
  const data = wrapper.data ?? raw;

  return {
    content: [
      {
        type: "text" as const,
        text: `VanBasket food index for ${country_code.toUpperCase()}:\n\n${JSON.stringify(data, null, 2)}\n\nIndex is relative to world average = 100.`,
      },
    ],
  };
}
