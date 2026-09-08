# What's Being Built?

I got tired of passing construction sites and having no idea what was going up. This is my map for answering that.

St. Petersburg is the first city because that is where I started collecting projects. The map is not meant to stop there.

Live site: https://whatsbeingbuilt.netlify.app/

## What works

- Search the map by project or address.
- Tap a pin to see the status, address, last check, and source links.
- Use your location to see what is nearby.
- Explore a labeled 3D street map, or switch to satellite imagery.
- Group nearby pins at overview zooms and tap a group to zoom in.
- Review imported projects before they become public pins.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173/.

For the phone-sized preview:

```bash
npm run mobile:open
```

That opens http://localhost:5173/mobile-preview.html. It has a few iPhone sizes, portrait and landscape, plus shortcuts for the map and review queue. I still test GPS, camera, and Safari behavior on a real iPhone against the HTTPS site.

## Site requests (paused)

The manual photo/name/notes form is disabled. Previously saved browser captures are left untouched in localStorage, but are not mixed into public project pins. Nothing is submitted or scraped automatically.

The next version should ask only for a location to investigate, not a complete project record. That needs a real request queue and later source lookup/review before publication; it is intentionally not simulated with local-only "submitted" messages.

## Map checks

`npm run check` includes map-style validation and compass regression tests (Node 22.6+). `scripts/serve-qa.py` serves `dist/` with the production security headers for browser QA. The optional Playwright Python test is `scripts/check-map-browser.py`; see its header for running it.

The map opens in vector street mode. Satellite imagery loads only on request. Buildings use OpenStreetMap footprints and available heights, not photorealistic or live construction models. GPS accuracy comes from the device; the map displays its accuracy circle rather than promising a precise fix. Physical iPhone GPS/compass/Safari testing still needs the HTTPS build.

## Project data

`projects.json` is the public map. Every project needs a source.

Imports go to `data/staged-project-candidates.json` first. They stay off the map until the address and coordinates are checked.

```bash
npm run ingest:sources
npm run geocode:candidates -- --limit 5
npm run review:candidates -- list
npm run review:candidates -- show <candidate-id>
```

Geocoding is a dry run unless `--apply` is passed.

The browser review queue is at `/review`.

## Checks

```bash
npm run check
npm run build
```

## Notes

- The app uses React, TypeScript, Vite, and MapLibre.
- Netlify serves the production build from `dist/`.
- Public sources and data rules are in `docs/`.
