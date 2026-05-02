import type { OpenVanClientOptions } from "./types.js";

const DEFAULT_BASE_URL = "https://openvan.camp";
const SDK_VERSION = "1.0.0";

export class OpenVanError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly url: string
  ) {
    super(message);
    this.name = "OpenVanError";
  }
}

export class OpenVanClient {
  readonly baseUrl: string;
  private readonly source: string;
  private readonly _fetch: typeof fetch;

  constructor(options: OpenVanClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.source = options.source ?? "openvan-sdk";
    this._fetch = options.fetch ?? globalThis.fetch;
  }

  async get<T>(
    path: string,
    query: Record<string, string | number | boolean | undefined | null> = {}
  ): Promise<T> {
    const url = new URL(path, this.baseUrl);

    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }

    url.searchParams.set("source", this.source);

    const response = await this._fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": `@openvan/sdk/${SDK_VERSION}`,
      },
    });

    if (!response.ok) {
      throw new OpenVanError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        url.toString()
      );
    }

    return response.json() as Promise<T>;
  }
}
