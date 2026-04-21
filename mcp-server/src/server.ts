import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";

import { VERSION } from "./config.js";
import {
  getFuelPrices,
  getFuelPricesInput,
  compareFuelPrices,
  compareFuelPricesInput,
  findCheapestFuel,
  findCheapestFuelInput,
} from "./tools/fuel.js";
import {
  getVanSkyWeather,
  getVanSkyWeatherInput,
  listVanSkyTop,
  listVanSkyTopInput,
} from "./tools/vansky.js";
import {
  listEvents,
  listEventsInput,
  getEvent,
  getEventInput,
} from "./tools/events.js";
import { searchStories, searchStoriesInput } from "./tools/stories.js";
import {
  compareVanBasket,
  compareVanBasketInput,
  getVanBasket,
  getVanBasketInput,
} from "./tools/vanbasket.js";
import { getCurrencyRate, getCurrencyRateInput } from "./tools/currency.js";

// Все 11 tools — read-only HTTP GET к openvan.camp. Ни один не меняет состояние,
// не пишет данные, не удаляет записи. Annotations транслируются в UI хостов
// (ChatGPT: DEV > Приложения, Claude Desktop, Cursor) — без них SDK проставляет
// MCP defaults (destructiveHint=true), и хосты помечают нас как "разрушительные".
const READ_ONLY: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true, // вызываем удалённый API openvan.camp
};

/**
 * Factory shared between stdio (dist/index.js) and HTTP (dist/sse.js) entry points.
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: "openvan-mcp",
    version: VERSION,
  });

  // Fuel prices
  server.registerTool(
    "get_fuel_prices",
    {
      title: "Get Fuel Prices",
      description:
        "Current retail fuel prices (gasoline, diesel, LPG, CNG) for 125+ countries. Pass country_code to get one country in detail; omit it for a summary list.",
      inputSchema: getFuelPricesInput,
      annotations: READ_ONLY,
    },
    getFuelPrices
  );
  server.registerTool(
    "compare_fuel_prices",
    {
      title: "Compare Fuel Prices",
      description:
        "Compare current prices for one fuel type across 2-10 countries. Returns sorted table cheapest-first.",
      inputSchema: compareFuelPricesInput,
      annotations: READ_ONLY,
    },
    compareFuelPrices
  );
  server.registerTool(
    "find_cheapest_fuel",
    {
      title: "Find Cheapest Fuel",
      description:
        "Find the cheapest countries for a given fuel type in a region (or worldwide). Useful for route planning.",
      inputSchema: findCheapestFuelInput,
      annotations: READ_ONLY,
    },
    findCheapestFuel
  );

  // VanSky weather
  server.registerTool(
    "get_vansky_weather",
    {
      title: "Get VanSky Weather Score",
      description:
        "Get VanSky vanlife weather suitability score (0-100) for a country: van_score, sleep_score, solar yield, driving conditions, awning safety, condensation risk, 7-day forecast.",
      inputSchema: getVanSkyWeatherInput,
      annotations: READ_ONLY,
    },
    getVanSkyWeather
  );
  server.registerTool(
    "list_vansky_top",
    {
      title: "List Top VanSky Countries",
      description:
        "List the top N countries with the highest VanSky van-travel suitability score today.",
      inputSchema: listVanSkyTopInput,
      annotations: READ_ONLY,
    },
    listVanSkyTop
  );

  // Events
  server.registerTool(
    "list_events",
    {
      title: "List Vanlife Events",
      description:
        "List vanlife events: expos (Caravan Salon), festivals, meetups, forums, road trips. Filter by status, type, country, or free-text search.",
      inputSchema: listEventsInput,
      annotations: READ_ONLY,
    },
    listEvents
  );
  server.registerTool(
    "get_event",
    {
      title: "Get Event Details",
      description:
        "Get full details for a single vanlife event by its slug.",
      inputSchema: getEventInput,
      annotations: READ_ONLY,
    },
    getEvent
  );

  // Stories (news)
  server.registerTool(
    "search_stories",
    {
      title: "Search Vanlife News",
      description:
        "Search aggregated vanlife news stories (7 languages, 400+ sources). Filter by search query, category, country, locale.",
      inputSchema: searchStoriesInput,
      annotations: READ_ONLY,
    },
    searchStories
  );

  // VanBasket (food price index)
  server.registerTool(
    "compare_vanbasket",
    {
      title: "Compare Food Prices",
      description:
        "Compare food price index between two countries (world average = 100). Higher number = more expensive food.",
      inputSchema: compareVanBasketInput,
      annotations: READ_ONLY,
    },
    compareVanBasket
  );
  server.registerTool(
    "get_vanbasket",
    {
      title: "Get Food Price Index",
      description:
        "Get VanBasket food price index details for one country.",
      inputSchema: getVanBasketInput,
      annotations: READ_ONLY,
    },
    getVanBasket
  );

  // Currency
  server.registerTool(
    "get_currency_rate",
    {
      title: "Convert Currency",
      description:
        "Convert an amount between two currencies using live rates (150+ currencies, daily updates).",
      inputSchema: getCurrencyRateInput,
      annotations: READ_ONLY,
    },
    getCurrencyRate
  );

  return server;
}
