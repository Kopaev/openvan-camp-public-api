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
import {
  checkVisaRules,
  checkVisaRulesInput,
  getRouteVisaRules,
  getRouteVisaRulesInput,
  getVehicleImportRules,
  getVehicleImportRulesInput,
} from "./tools/visa.js";
import {
  checkLicensePlate,
  checkLicensePlateInput,
  getLicensePlateCountry,
  getLicensePlateCountryInput,
  getLicensePlateImage,
  getLicensePlateImageInput,
  listLicensePlateCountries,
  listLicensePlateCountriesInput,
} from "./tools/plates.js";

// Все 18 tools — read-only HTTP GET к openvan.camp. Ни один не меняет состояние,
// не пишет данные, не удаляет записи. Annotations транслируются в UI хостов
// (ChatGPT: DEV > Приложения, Claude Desktop, Cursor) — без них SDK проставляет
// MCP defaults (destructiveHint=true), и хосты помечают нас как "разрушительные".
const READ_ONLY: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true, // вызываем удалённый API openvan.camp
};

const readOnlyAnnotations = (title: string): ToolAnnotations => ({
  ...READ_ONLY,
  title,
});

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
        "Current retail fuel prices for all API-supported countries. Supports the same price keys as /api/fuel/prices, including gasoline, diesel, LPG, CNG, E85, kerosene and grade variants. Pass country_code to get one country in detail; omit it for a summary list.",
      inputSchema: getFuelPricesInput,
      annotations: readOnlyAnnotations("Get Fuel Prices"),
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
      annotations: readOnlyAnnotations("Compare Fuel Prices"),
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
      annotations: readOnlyAnnotations("Find Cheapest Fuel"),
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
      annotations: readOnlyAnnotations("Get VanSky Weather Score"),
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
      annotations: readOnlyAnnotations("List Top VanSky Countries"),
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
      annotations: readOnlyAnnotations("List Vanlife Events"),
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
      annotations: readOnlyAnnotations("Get Event Details"),
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
      annotations: readOnlyAnnotations("Search Vanlife News"),
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
      annotations: readOnlyAnnotations("Compare Food Prices"),
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
      annotations: readOnlyAnnotations("Get Food Price Index"),
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
      annotations: readOnlyAnnotations("Convert Currency"),
    },
    getCurrencyRate
  );

  // Visa & border rules
  server.registerTool(
    "check_visa_rules",
    {
      title: "Check Visa Rules",
      description:
        "Entry rules for one passport and destination: entry mode, allowed length of stay, how the days are counted (per entry or in a rolling window), whether a visa run resets the counter, and temporary vehicle import. Answers carry a confidence level and source — pass those on instead of stating a rule as certain.",
      inputSchema: checkVisaRulesInput,
      annotations: readOnlyAnnotations("Check Visa Rules"),
    },
    checkVisaRules
  );
  server.registerTool(
    "get_route_visa_rules",
    {
      title: "Visa Rules For A Route",
      description:
        "Visa rules for every country of a route in one call, for up to 10 passports at once, plus the tightest leg of the route.",
      inputSchema: getRouteVisaRulesInput,
      annotations: readOnlyAnnotations("Visa Rules For A Route"),
    },
    getRouteVisaRules
  );
  server.registerTool(
    "get_vehicle_import_rules",
    {
      title: "Temporary Vehicle Import Rules",
      description:
        "Temporary admission rules for a foreign-plated vehicle in one country: allowed days, per entry or per window, carnet requirement, green card. A country without a rule we can stand behind returns nothing rather than a guess.",
      inputSchema: getVehicleImportRulesInput,
      annotations: readOnlyAnnotations("Temporary Vehicle Import Rules"),
    },
    getVehicleImportRules
  );

  // License plates of the world
  server.registerTool(
    "list_license_plate_countries",
    {
      title: "License Plate Countries",
      description: "Countries whose license plates are available: international code, number of regions and an example plate.",
      inputSchema: listLicensePlateCountriesInput,
      annotations: readOnlyAnnotations("License Plate Countries"),
    },
    listLicensePlateCountries
  );
  server.registerTool(
    "get_license_plate_country",
    {
      title: "License Plate Format And Region Codes",
      description:
        "How a country's license plate looks and reads (standard, size, format) and every region code on its plates, grouped by region — e.g. which region is 77 or 199 on Russian plates.",
      inputSchema: getLicensePlateCountryInput,
      annotations: readOnlyAnnotations("License Plate Format And Region Codes"),
    },
    getLicensePlateCountry
  );
  server.registerTool(
    "check_license_plate",
    {
      title: "Check A License Plate",
      description:
        "Validate a plate number against the country's format (look-alike letters are normalized) and say which region its code belongs to. Never identifies the owner or the vehicle's location.",
      inputSchema: checkLicensePlateInput,
      annotations: readOnlyAnnotations("Check A License Plate"),
    },
    checkLicensePlate
  );
  server.registerTool(
    "get_license_plate_image",
    {
      title: "License Plate Image",
      description:
        "Draw a license plate as an image (PNG shown inline, plus SVG/PNG links) exactly as openvan.camp renders it. custom=true draws any text, e.g. a name, in the plate layout.",
      inputSchema: getLicensePlateImageInput,
      annotations: readOnlyAnnotations("License Plate Image"),
    },
    getLicensePlateImage
  );

  return server;
}
