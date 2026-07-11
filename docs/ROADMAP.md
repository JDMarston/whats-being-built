# Roadmap

Planned milestones, priorities, and future ideas.

## Near term

- Keep the base map global so the app can work anywhere before a city has project data.
- Add city-specific project datasets as scraping/public-record workflows are built.
- Expand the imagery source registry so each city can declare its best available local aerial imagery years.
- Add a request flow for users to ask for buildings or cities that are not populated yet.

## Product direction notes
- Treat St. Petersburg as the first seeded area, not the product boundary.
- The default map should feel useful in the place the user is standing: location first, local imagery where available, then source-backed pins.
- Keep the main map calm: search + nearby context first, review/data controls second.
- Scraping should be adapter-based: source registry -> area registry -> staged candidates -> geocode/dedupe -> manual promotion.
