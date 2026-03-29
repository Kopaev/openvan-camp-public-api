# Changelog

All notable changes to the OpenVan.camp Public API are documented here.

---

## 2026-03-28

### Added
- `sources` field per country — array of data source names used in weighted average (sorted by trust weight)

### Changed
- `source` field (single string) → replaced by `sources` array
- Country names in API response are now always in English regardless of Accept-Language header

### Countries
- **87 countries** total (up from 72 in January 2026)
- New: Pakistan (PK), Nepal (NP), Ghana (GH) and others

---

## 2026-03-20

### Changed
- `prices_eur` and `local_prices` removed from API response (redundant fields — use `prices` + `/api/currency/rates` for conversion)

---

## 2026-01-15

### Added
- `price_changes` field — weekly delta in local currency per fuel type
- `is_excluded` field — marks heavily subsidized countries (Algeria, Turkmenistan, etc.)
- `sources_count` field — number of sources used in price calculation

### Changed
- `total_countries` in `meta` is now dynamic (reflects actual data)

---

## 2025-12-01

### Launch
- Initial public API release
- `GET /api/fuel/prices` — 40 countries, gasoline/diesel/lpg
- `GET /api/currency/rates` — 150+ currencies, EUR base
- License: CC BY 4.0
