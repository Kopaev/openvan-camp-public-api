/**
 * OpenVan.camp Fuel Prices API — Node.js examples
 * Docs: https://github.com/openvan-camp/openvan-camp-public-api
 * API:  https://openvan.camp/api/fuel/prices
 */

const API_BASE = 'https://openvan.camp';

// -------------------------------------------------------------------
// Example 1: Fetch all prices and print a summary
// -------------------------------------------------------------------
async function printPriceSummary() {
  const res = await fetch(`${API_BASE}/api/fuel/prices`);
  const { data, meta } = await res.json();

  console.log(`\n=== Fuel Prices — ${meta.total_countries} countries ===`);
  console.log(`Updated: ${meta.updated_at}\n`);

  // Print Europe diesel prices, sorted cheapest first
  const europeDiesel = Object.values(data)
    .filter(c => c.region === 'europe' && c.prices.diesel !== null)
    .sort((a, b) => a.prices.diesel - b.prices.diesel);

  console.log('Cheapest diesel in Europe (local currency/liter):');
  europeDiesel.slice(0, 10).forEach(c => {
    const change = c.price_changes.diesel;
    const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '→';
    console.log(`  ${c.country_name.padEnd(20)} ${c.prices.diesel.toFixed(3)} ${c.currency} ${arrow}`);
  });
}

// -------------------------------------------------------------------
// Example 2: Fetch prices + currency rates, convert to USD
// -------------------------------------------------------------------
async function pricesInUSD(countryCodes) {
  const [priceRes, rateRes] = await Promise.all([
    fetch(`${API_BASE}/api/fuel/prices`),
    fetch(`${API_BASE}/api/currency/rates`),
  ]);
  const { data } = await priceRes.json();
  const { rates } = await rateRes.json();

  console.log('\n=== Gasoline prices in USD/liter ===');

  for (const code of countryCodes) {
    const c = data[code];
    if (!c || c.prices.gasoline === null) continue;

    // Convert to EUR, then to USD
    const eurPrice = c.prices.gasoline / rates[c.currency];
    let usdPrice = eurPrice * rates['USD'];

    // If country uses gallons, convert to liters
    if (c.unit === 'gallon') usdPrice /= 3.78541;

    console.log(`  ${c.country_name.padEnd(20)} $${usdPrice.toFixed(3)}/L`);
  }
}

// -------------------------------------------------------------------
// Example 3: Find countries where LPG is available and cheap
// -------------------------------------------------------------------
async function cheapLPG() {
  const [priceRes, rateRes] = await Promise.all([
    fetch(`${API_BASE}/api/fuel/prices`),
    fetch(`${API_BASE}/api/currency/rates`),
  ]);
  const { data } = await priceRes.json();
  const { rates } = await rateRes.json();

  const countries = Object.values(data)
    .filter(c => c.prices.lpg !== null && !c.is_excluded)
    .map(c => ({
      name: c.country_name,
      lpgEur: c.prices.lpg / rates[c.currency],
      currency: c.currency,
      unit: c.unit,
    }))
    .sort((a, b) => a.lpgEur - b.lpgEur);

  console.log('\n=== Cheapest LPG (EUR/liter equivalent) ===');
  countries.slice(0, 10).forEach(c => {
    console.log(`  ${c.name.padEnd(25)} €${c.lpgEur.toFixed(3)}/L`);
  });
}

// -------------------------------------------------------------------
// Run all examples
// -------------------------------------------------------------------
(async () => {
  await printPriceSummary();
  await pricesInUSD(['US', 'DE', 'GB', 'TR', 'AU', 'JP']);
  await cheapLPG();
})().catch(console.error);
