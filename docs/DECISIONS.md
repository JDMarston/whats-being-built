# Decisions

Architecture and product decisions made over time.

## Data freshness

- Keep manually curated JSON as the app's first data store.
- Prefer public structured city data over brittle page scraping when available.
- Treat local articles and developer pages as enrichment and verification sources.
- Hide completed projects once they are more than two years past completion.

## Map experience

- Use MapLibre GL JS instead of Leaflet so the app can support pitch, bearing, richer styling, and future 3D layers.
- The app should behave like a world map first. Users can pan and zoom anywhere, even when no local project data has been populated yet.
- Default to global satellite imagery so the map works outside the first scraped city.
- Treat local high-resolution imagery, such as Pinellas 2025 or 2024 aerials, as optional detail layers over the global basemap rather than as the whole map.
- When a local imagery year is selected, show it only near its coverage area and at useful zoom levels; otherwise keep the global basemap visible.
- Keep a global street map available as an alternate overview layer.
- On mobile, use a custom location puck with device heading enabled so the user can orient toward a construction site.
- On desktop, do not request or display device heading.
- Show the user's location as a blue location puck/dot, not as a project marker.
- Keep map provider choices and local aerial imagery layers in a small registry inside the map UI. This keeps project markers, project JSON, and popup behavior separate from the current MapLibre/free-public basemap implementation so a later Google 3D Tiles, Cesium, Mapbox, or other provider upgrade is less invasive.
- Route app behavior through a small `mapView` provider boundary in `index.html`. Project markers, user location, imagery toggles, view movement, and 3D toggling should call that boundary instead of directly calling MapLibre APIs from feature code.
- Keep direct MapLibre calls limited to the current provider setup until there is a reason to split the app into modules or add a premium 3D provider.
- The "newest imagery" behavior means newest known public local aerial layer for the current viewport first, then Esri World Imagery with Esri's metadata as fallback. Esri World Imagery metadata can lag local county services.
