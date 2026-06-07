# What’s Being Built?

A hobby project for the exact moment when you walk past a crane, fence, or empty lot and hate not knowing what is being built around you.

Live site: https://whatsbeingbuilt.netlify.app/

GitHub: https://github.com/JDMarston/whats-being-built

## What it does now

- Shows a map of St. Petersburg development projects.
- Lets you search by project, address, status, or neighborhood-ish text.
- Keeps source links and last-verified dates visible so the map does not pretend to know more than it does.
- Has early iPhone field mode: stand near a mystery construction site, capture GPS/photo/notes, and save a local review pin.
- Stages scraped candidates before promotion so bad pins do not pollute the live map.

## Project goal

The long-term goal is a construction-site “what is this?” app: open it on an iPhone, stand on the sidewalk, point toward construction, and get the likely project, status, developer, and source links.

## Local commands

```bash
npm install
npm run dev
npm run check:data
npm run check:ui
npm run build
```

## Data workflow

```bash
npm run ingest:sources
npm run geocode:candidates -- --limit 5
npm run review:candidates -- list
```

Use `--apply` on geocoding only when you want to write audit fields back to staged data.

## Hosting

The app is currently hosted on Netlify. A production build is generated with:

```bash
npm run build
```

Netlify should serve the `dist/` directory.
