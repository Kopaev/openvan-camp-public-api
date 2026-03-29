#!/usr/bin/env bash
# OpenVan.camp Fuel Prices API — cURL / bash examples
# Docs: https://github.com/openvan-camp/openvan-camp-public-api
# Requirements: curl, jq

set -euo pipefail

API="https://openvan.camp"

# -------------------------------------------------------------------
# Example 1: Get all prices (raw JSON)
# -------------------------------------------------------------------
echo "=== Raw API response (first 2 countries) ==="
curl -s "$API/api/fuel/prices" | jq '.data | to_entries[:2]'

# -------------------------------------------------------------------
# Example 2: Get diesel price for a specific country
# -------------------------------------------------------------------
COUNTRY="DE"
echo ""
echo "=== Diesel price in $COUNTRY ==="
curl -s "$API/api/fuel/prices" | jq --arg c "$COUNTRY" '
  .data[$c] | {
    country: .country_name,
    diesel: .prices.diesel,
    currency: .currency,
    unit: .unit,
    updated: .fetched_at,
    sources: .sources
  }
'

# -------------------------------------------------------------------
# Example 3: Top 5 cheapest diesel countries in Europe
# -------------------------------------------------------------------
echo ""
echo "=== Top 5 cheapest diesel in Europe ==="
curl -s "$API/api/fuel/prices" | jq '
  [
    .data[]
    | select(.region == "europe" and .prices.diesel != null)
    | { country: .country_name, diesel: .prices.diesel, currency: .currency }
  ]
  | sort_by(.diesel)
  | .[0:5]
'

# -------------------------------------------------------------------
# Example 4: Countries with LPG data
# -------------------------------------------------------------------
echo ""
echo "=== Countries with LPG prices ==="
curl -s "$API/api/fuel/prices" | jq '
  [ .data[] | select(.prices.lpg != null) | .country_name ]
  | sort
  | join(", ")
'

# -------------------------------------------------------------------
# Example 5: Currency rates
# -------------------------------------------------------------------
echo ""
echo "=== Currency rates (USD, GBP, RUB, TRY vs EUR) ==="
curl -s "$API/api/currency/rates" | jq '{
  USD: .rates.USD,
  GBP: .rates.GBP,
  RUB: .rates.RUB,
  TRY: .rates.TRY,
  updated: .updated_at
}'

# -------------------------------------------------------------------
# Example 6: Save prices to CSV
# -------------------------------------------------------------------
echo ""
echo "=== Saving gasoline prices to fuel_prices.csv ==="
curl -s "$API/api/fuel/prices" | jq -r '
  ["country_code","country","region","gasoline","diesel","lpg","currency","unit","updated"],
  (
    .data[]
    | [
        .country_code,
        .country_name,
        .region,
        (.prices.gasoline // ""),
        (.prices.diesel // ""),
        (.prices.lpg // ""),
        .currency,
        .unit,
        .fetched_at
      ]
  )
  | @csv
' > fuel_prices.csv

echo "Saved to fuel_prices.csv ($(wc -l < fuel_prices.csv) rows)"
