#!/usr/bin/env bash
# OpenVan.camp Public API — Bash Examples
# https://openvan.camp/en/developers
# License: CC BY 4.0 — attribution required

API="https://openvan.camp"

# ─── FUEL PRICES ─────────────────────────────────────────────────────────────

# All fuel prices
curl -s "$API/api/fuel/prices" | python3 -m json.tool

# Cheapest diesel in Europe (requires jq)
curl -s "$API/api/fuel/prices" | jq '
  .data
  | to_entries
  | map(select(.value.region == "europe" and .value.prices.diesel != null))
  | sort_by(.value.prices.diesel)
  | .[0:5]
  | map({country: .value.country_name, diesel: .value.prices.diesel, currency: .value.currency})
'

# Diesel price in Germany
curl -s "$API/api/fuel/prices" | jq '.data.DE.prices.diesel'

# Countries with LPG
curl -s "$API/api/fuel/prices" | jq '
  [.data | to_entries[] | select(.value.prices.lpg != null) | {country: .value.country_name, lpg: .value.prices.lpg, currency: .value.currency}]
  | sort_by(.lpg)
'

# ─── CURRENCY RATES ──────────────────────────────────────────────────────────

# All rates (EUR base)
curl -s "$API/api/currency/rates"

# Get USD rate
curl -s "$API/api/currency/rates" | jq '.rates.USD'

# Convert 100 EUR to TRY
curl -s "$API/api/currency/rates" | jq '.rates.TRY * 100'

# ─── VANBASKET ───────────────────────────────────────────────────────────────

# All countries food price index
curl -s "$API/api/vanbasket/countries" | jq '.data | to_entries | sort_by(.value.vanbasket_index) | .[0:5]'

# Compare Germany vs Turkey
curl -s "$API/api/vanbasket/compare?from=DE&to=TR" | jq '.data | {diff: .diff_percent, budget_de_100eur: .budget_100}'

# Georgia food index with history
curl -s "$API/api/vanbasket/countries/GE" | jq '{index: .data.country.vanbasket_index, snapshots: .data.snapshots[-3:]}'

# ─── EVENTS ──────────────────────────────────────────────────────────────────

# Upcoming events (English)
curl -s "$API/api/events?status=upcoming&locale=en"

# Festivals in Germany
curl -s "$API/api/events?country=DE&type=festival&status=all&locale=en" | jq '.events[] | {name: .event_name, dates: "\(.start_date) - \(.end_date)", city}'

# Event details
curl -s "$API/api/event/fit-camper-2026?locale=en" | jq '{name: .event_name, city, dates: "\(.start_date) - \(.end_date)", url}'

# Source articles for an event
curl -s "$API/api/event/fit-camper-2026/articles?locale=en" | jq '[.[] | {title, source: .source_name, lang: .language, url: .original_url}]'

# ─── STORIES ─────────────────────────────────────────────────────────────────

# Latest vanlife news in English
curl -s "$API/api/stories?locale=en&limit=5" | jq '.stories[] | {title, category: .category.name, url}'

# German news about Germany
curl -s "$API/api/stories?locale=de&country=DE&limit=5" | jq '.stories[] | .title'

# Search for stories about solar
curl -s "$API/api/stories?locale=en&search=solar&limit=5" | jq '.stories[] | {title, url}'

# Full story with publisher sources
curl -s "$API/api/story/free-overnight-parking-netherlands?locale=en" | jq '{
  title,
  summary,
  sources_count: (.sources | length),
  sources: [.sources[] | {publisher: .source_name, lang: .language, url: .original_url}]
}'

# ─── COMBINED ────────────────────────────────────────────────────────────────

# Road trip cost overview: fuel + food for multiple countries
COUNTRIES=("DE" "CZ" "PL" "TR" "GE")

FUEL=$(curl -s "$API/api/fuel/prices")
RATES=$(curl -s "$API/api/currency/rates")
FOOD=$(curl -s "$API/api/vanbasket/countries")

for CODE in "${COUNTRIES[@]}"; do
  NAME=$(echo $FUEL | jq -r ".data.${CODE}.country_name // \"${CODE}\"")
  DIESEL=$(echo $FUEL | jq -r ".data.${CODE}.prices.diesel // \"N/A\"")
  CURRENCY=$(echo $FUEL | jq -r ".data.${CODE}.currency // \"EUR\"")
  FOOD_IDX=$(echo $FOOD | jq -r ".data.${CODE}.vanbasket_index // \"N/A\"")
  echo "$NAME: diesel=$DIESEL $CURRENCY/L | food index=$FOOD_IDX (world=100)"
done
