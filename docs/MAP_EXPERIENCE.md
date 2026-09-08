# Map experience

## Current choice

Keep MapLibre as the renderer and use OpenFreeMap vector tiles for the default street map. Roads, labels, land and building extrusions share one vector source. Satellite imagery is optional; it no longer has a translucent raster street map placed over it. The hybrid view uses vector labels instead.

3D buildings are mapped footprints with available/estimated heights, not photorealistic meshes or models of proposed construction. Do not imply building geometry or GPS accuracy is verified by the construction project sources.

- No terrain elevation mesh in the default urban view.
- Cap canvas pixel ratio at 1.5 on coarse-pointer/small screens and 2 on desktop.
- Use clustered GeoJSON layers rather than one DOM marker/button per project. Individual points have larger invisible touch targets; the project list provides the keyboard-accessible path.
- Keep the map mounted while filtering, opening panels, and selecting projects.
- Only update imagery mode when it changes. Cache imagery metadata by rounded location/zoom and abort stale requests.
- Load the map module separately from the app shell and load the review dashboard only on its route. The map engine is still a large dependency; splitting does not make its download disappear.

## Orientation

Use MapLibre's GeolocateControl for a location dot, device-reported accuracy circle, follow mode, and recentering after manual pan. No automatic location request on startup. Compass permission must be requested from the user's locate-button gesture. Use only absolute/north-referenced device readings or a moving GPS course, smooth wraparound at north, and stop displaying stale direction readings. Never turn relative device alpha into a supposedly true heading.

Changing 2D/3D preserves bearing. A linked map position is not replaced with a city-wide fit on load. The overview button explicitly fits filtered projects instead.

## Nearby usefulness

After an optional location fix, sort the project list by straight-line distance, show distances, and make missing nearby coverage explicit. Keep administrative review off the normal discovery path. See [PRODUCT_PRINCIPLES.md](PRODUCT_PRINCIPLES.md).

## Cleaner UI

One expanded panel at a time: about, search, or map options. No competing flyout legend; it lives inside options. Project sheets show the address, short summary, checked date and source without duplicating source cards. Responsive overlay tests cover small phones, larger phones, landscape and desktop.

## Site requests are paused

The old manual field-entry form is not mounted or included in the production JavaScript. Existing browser localStorage captures are untouched, not silently erased and not presented as verified projects. No replacement submission feature is claimed.

The intended later flow is **mark a location → request investigation → collect public sources → deduplicate/geocode/review → publish**. Require as little manual input as possible. A real queue/delivery path is necessary before a button can honestly say a request was submitted; do not fake that with browser-only storage.

## Provider upgrade path

Renderer choice and data-provider choice are separate. Consider another dataset if building coverage or recognizable geometry is the limitation; swapping the renderer alone will not supply missing buildings.

- [OpenFreeMap](https://openfreemap.org/): public instance has no map/request limits or key requirement; commercial use allowed. No SLA. Data is from OpenStreetMap.
- [MapTiler](https://www.maptiler.com/cloud/pricing/): compare ready-made styles and hosted services. Free plan has limits and is intended for personal/testing/noncommercial use; do not treat it as an unlimited commercial replacement.
- [Mapbox](https://www.mapbox.com/pricing): commercial alternative with metered products/free tiers; check the specific product and current terms before integrating.
- [Google Photorealistic 3D Tiles](https://developers.google.com/maps/documentation/tile/usage-and-billing): investigate when textured, recognizable real-world buildings are the requirement. Different data/rendering integration, coverage, billing and terms. Not an unlimited free basemap.

Do not add paid services, API keys or billing without approval.

## Verification

- `npm run check`: TypeScript, existing data checks, map-style validation and compass unit regressions.
- `npm run build`: production assets.
- `python scripts/serve-qa.py`: loopback preview with Netlify's actual security headers.
- `python scripts/check-map-browser.py --output qa-artifacts`: Playwright browser flows, screenshots, overlay collision/overflow checks, source links, modes, clusters, lazy review route, preserved local storage and linked camera state. Supply `--cdp` for an explicit automation browser or `--headless` for installed Playwright Chromium.
- Browser geolocation/compass checks use simulated readings and permissions. They do not prove real iPhone compass calibration, GPS performance or Safari behavior; those still need a physical phone on HTTPS.
- Network-dependent tests may fail when a public tile service is unavailable. Keep errors visible rather than substituting fake tile/provider responses.
