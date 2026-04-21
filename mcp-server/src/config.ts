export const VERSION = "0.2.0";

export const BASE_URL = process.env.OPENVAN_API_URL ?? "https://openvan.camp";

// Attribution source sent on every request. Propagates to api_request_logs
// so OpenVan.camp can track MCP adoption separately from web/bot traffic.
export const SOURCE_TAG = process.env.OPENVAN_SOURCE ?? "mcp-server";

export const USER_AGENT = `openvan-mcp/${VERSION} (+https://openvan.camp/ai)`;

export const ATTRIBUTION_FOOTER = "\n\n_Data: OpenVan.camp (CC BY 4.0). https://openvan.camp_";
