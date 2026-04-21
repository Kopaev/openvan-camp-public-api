import { BASE_URL, SOURCE_TAG, USER_AGENT } from "./config.js";

export class OpenVanApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly url: string
  ) {
    super(message);
    this.name = "OpenVanApiError";
  }
}

/**
 * Thin fetch wrapper for OpenVan.camp public API.
 * - Always appends ?source=<SOURCE_TAG> for attribution tracking.
 * - Sets a descriptive User-Agent so server logs can segment MCP traffic.
 * - Returns parsed JSON or throws OpenVanApiError on non-2xx.
 */
export async function apiGet<T = unknown>(
  path: string,
  query: Record<string, string | number | undefined | null> = {}
): Promise<T> {
  const url = new URL(path, BASE_URL);

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }

  if (!url.searchParams.has("source")) {
    url.searchParams.set("source", SOURCE_TAG);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new OpenVanApiError(
      `HTTP ${response.status} from ${url.pathname}`,
      response.status,
      url.toString()
    );
  }

  return (await response.json()) as T;
}
