# Decisions

A short record of choices that affect the code or data.

## Data

- `projects.json` is the public map data.
- Imports go through a staging file and manual review.
- City and county open data takes priority over scraping articles.
- Articles and developer pages are supporting sources.
- Completed projects stay visible for two years.

## Map

- MapLibre handles the map.
- The base map works worldwide; St. Pete is only the first populated area.
- Satellite is the default. Local county aerials can replace it where newer imagery is available.
- The location marker is blue so it cannot be confused with a project pin.
- MapLibre-specific setup stays in `src/lib/mapProvider.ts` and `src/components/MapView.tsx`.

## Cost

- Use free public data and imagery while the project is still proving itself.
- Do not add accounts, a database, or a paid map provider until the app actually needs one.
