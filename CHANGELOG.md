# Changelog

## 2026-04-08

### Added
- **Stories API** — new endpoints for vanlife news stories:
  - `GET /api/stories` — paginated list with `locale`, `category`, `country`, `search` filters
  - `GET /api/story/{slug}` — full story with `sources[]` array containing direct publisher links, source names, publication dates, and language codes
  - 8200+ stories in 7 languages (en, ru, de, fr, es, pt, tr)

### Fixed
- `GET /api/vanbasket/countries` was returning `500 Internal Server Error` — fixed
- `GET /api/events` without `?locale=` was returning Russian content (inherited from web middleware) — now correctly defaults to `en`
- Invalid `?locale=xx` silently falls back to `en` instead of returning Russian (documented)

### Changed
- Fuel prices coverage expanded: 87 → 121 countries
- VanBasket coverage: 92 countries (stable)
- Total events in database: 695

---

## 2026-03-28

### Added
- `sources` array per country in `/api/fuel/prices` — lists the data sources used for weighted averages
- Coverage expanded to 87 countries (added Pakistan, Nepal, Ghana)

### Changed
- Replaced single `source` field with `sources` array (array of strings)
- `country_name` now always returns English regardless of client locale

---

## 2026-03-20

### Removed
- Redundant fields `prices_eur` and `local_prices` from fuel prices response
  — use `prices` combined with `/api/currency/rates` to convert

---

## 2026-01-15

### Added
- `price_changes` — weekly delta for each fuel type
- `is_excluded` — flag for heavily subsidized countries (Venezuela, Libya, etc.)
- `sources_count` — number of sources used for this country's weighted average
- `total_countries` in metadata is now dynamic

---

## 2025-12-01

### Initial release
- `GET /api/fuel/prices` — 40 countries
- `GET /api/currency/rates` — 150+ currencies
- CC BY 4.0 license
