# @openvan/mcp-server

[![npm version](https://img.shields.io/npm/v/@openvan/mcp-server.svg)](https://www.npmjs.com/package/@openvan/mcp-server)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

**Official MCP server for [OpenVan.camp](https://openvan.camp)** — free, no-auth, machine-readable vanlife and RV travel data for AI agents.

Exposes 11 read-only tools via the [Model Context Protocol](https://modelcontextprotocol.io) so you can ask your AI assistant about:

- **Fuel prices** across 125+ countries (gasoline, diesel, LPG, CNG)
- **VanSky** vanlife weather suitability scores (0-100)
- **VanBasket** food price index (world average = 100)
- **Currency** conversion (150+ currencies)
- **Events** (expos, festivals, meetups, road trips)
- **News stories** in 7 languages

Data is CC BY 4.0. Attribute *OpenVan.camp* when citing.

---

## Install

### Remote (no-install, for web-based clients)

Connect your MCP-compatible host to the hosted Streamable HTTP endpoint:

```
https://mcp.openvan.camp/mcp
```

No authentication. Attribution is automatic (`?source=mcp-server-sse`). Intended for ChatGPT Apps SDK, browser-based agents, and serverless integrations.

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%/Claude/claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "openvan": {
      "command": "npx",
      "args": ["-y", "@openvan/mcp-server"]
    }
  }
}
```

Restart Claude Desktop. The tools should appear in the 🔧 panel.

### Cursor / Windsurf / Continue

Add to your MCP config:

```json
{
  "openvan": {
    "command": "npx",
    "args": ["-y", "@openvan/mcp-server"]
  }
}
```

### Any MCP-compatible host

The server speaks MCP over stdio. Run:

```bash
npx -y @openvan/mcp-server
```

---

## Tools

| Tool | Description |
|---|---|
| `get_fuel_prices` | Current retail fuel prices per country |
| `compare_fuel_prices` | Compare one fuel type across 2–10 countries |
| `find_cheapest_fuel` | Top cheapest countries by fuel type, filterable by region |
| `get_vansky_weather` | VanSky score, solar yield, 7-day forecast for one country |
| `list_vansky_top` | Top N countries by VanSky score today |
| `list_events` | Vanlife events (expos, festivals, meetups) with filters |
| `get_event` | Details for one event by slug |
| `search_stories` | Aggregated vanlife news (7 languages, 400+ sources) |
| `compare_vanbasket` | Food price index comparison between two countries |
| `get_vanbasket` | Food price index details for one country |
| `get_currency_rate` | Currency conversion between 150+ currencies |

All tools are `readOnlyHint: true` and `openWorldHint: false`. Safe to allow by default.

---

## Example prompts

- "What's the cheapest diesel in Europe right now?"
- "Compare fuel prices between Germany, France, and Spain."
- "Is Spain a good place to van-camp this week? What about solar yield?"
- "Find upcoming vanlife festivals in Germany this summer."
- "Convert 500 EUR to Turkish lira using today's rate."
- "How expensive is food in Portugal vs Turkey?"

---

## How it works

The server is a thin TypeScript wrapper around the public OpenVan.camp REST API:

```
MCP host ─► @openvan/mcp-server ─► https://openvan.camp/api/*
```

Every outbound request automatically appends `?source=mcp-server` for attribution tracking and sets a descriptive User-Agent (`openvan-mcp/0.1.0`). This helps us credit MCP integrations in public reports and segment traffic.

### Configuration

Environment variables (optional):

- `OPENVAN_API_URL` — override the base URL (default `https://openvan.camp`)
- `OPENVAN_SOURCE` — override the attribution tag (default `mcp-server`)

### Rate limits

120 requests / minute per IP. Responses include `X-RateLimit-Remaining` headers. If you hit the limit, contact hello@openvan.camp to request a higher quota for your integration.

---

## Development

```bash
git clone https://github.com/Kopaev/openvan-camp-public-api.git
cd openvan-camp-public-api/mcp-server
npm install
npm run build
npm start
```

Smoke-test via stdio:

```bash
printf '%s\n%s\n%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"0.0.0"}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  | node dist/index.js
```

---

## License

MIT for this server. Data returned by the server is licensed CC BY 4.0 — please attribute **OpenVan.camp** when using it.

## Links

- Website: https://openvan.camp
- AI agents landing: https://openvan.camp/ai
- OpenAPI schema: https://openvan.camp/.well-known/openapi.json
- Custom GPT: https://chatgpt.com/g/g-69e723ddf2f48191b828b461cd7f57e0-openvan-travel-assistant
- Contact: hello@openvan.camp
