import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

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

/**
 * Factory shared between stdio (dist/index.js) and HTTP (dist/sse.js) entry points.
 * Every tool is read-only and safe to call without human confirmation.
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: "openvan-mcp",
    version: VERSION,
  });

  // Fuel prices
  server.tool(
    "get_fuel_prices",
    "Current retail fuel prices (gasoline, diesel, LPG, CNG) for 125+ countries. Pass country_code to get one country in detail; omit it for a summary list.",
    getFuelPricesInput,
    getFuelPrices
  );
  server.tool(
    "compare_fuel_prices",
    "Compare current prices for one fuel type across 2-10 countries. Returns sorted table cheapest-first.",
    compareFuelPricesInput,
    compareFuelPrices
  );
  server.tool(
    "find_cheapest_fuel",
    "Find the cheapest countries for a given fuel type in a region (or worldwide). Useful for route planning.",
    findCheapestFuelInput,
    findCheapestFuel
  );

  // VanSky weather
  server.tool(
    "get_vansky_weather",
    "Get VanSky vanlife weather suitability score (0-100) for a country: van_score, sleep_score, solar yield, driving conditions, awning safety, condensation risk, 7-day forecast.",
    getVanSkyWeatherInput,
    getVanSkyWeather
  );
  server.tool(
    "list_vansky_top",
    "List the top N countries with the highest VanSky van-travel suitability score today.",
    listVanSkyTopInput,
    listVanSkyTop
  );

  // Events
  server.tool(
    "list_events",
    "List vanlife events: expos (Caravan Salon), festivals, meetups, forums, road trips. Filter by status, type, country, or free-text search.",
    listEventsInput,
    listEvents
  );
  server.tool(
    "get_event",
    "Get full details for a single vanlife event by its slug.",
    getEventInput,
    getEvent
  );

  // Stories (news)
  server.tool(
    "search_stories",
    "Search aggregated vanlife news stories (7 languages, 400+ sources). Filter by search query, category, country, locale.",
    searchStoriesInput,
    searchStories
  );

  // VanBasket (food price index)
  server.tool(
    "compare_vanbasket",
    "Compare food price index between two countries (world average = 100). Higher number = more expensive food.",
    compareVanBasketInput,
    compareVanBasket
  );
  server.tool(
    "get_vanbasket",
    "Get VanBasket food price index details for one country.",
    getVanBasketInput,
    getVanBasket
  );

  // Currency
  server.tool(
    "get_currency_rate",
    "Convert an amount between two currencies using live rates (150+ currencies, daily updates).",
    getCurrencyRateInput,
    getCurrencyRate
  );

  return server;
}
