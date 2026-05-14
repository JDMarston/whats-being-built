# Tech Stack

Languages, libraries, tooling, and hosting notes.

# Tech Stack

Current recommendation:
- React + Vite
- TypeScript
- MapLibre GL JS
- Public raster imagery sources through MapLibre GL JS
- Esri World Imagery as the default global satellite basemap
- OpenStreetMap-compatible tiles as a global street-map alternative
- Local public aerial imagery years as optional detail overlays where coverage exists
- Local GeoJSON/JSON data first
- Deploy later with Netlify or Vercel free tier

Avoid for now:
- paid map APIs
- backend database
- user accounts
- complex scraping
- paid domains
