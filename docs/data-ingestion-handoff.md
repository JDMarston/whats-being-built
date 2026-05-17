# Data Ingestion Handoff

This note exists so the next Hermes/Codex session can resume the data-ingestion work without Swamp having to re-explain it.

## Current project context

- Repo: `JDMarston/whats-being-built`
- Local path: `/home/jared/projects/whats-being-built`
- App: React + TypeScript + Vite + MapLibre map app for answering “what’s being built?”
- First target area: St. Petersburg, FL / Tampa Bay
- Data policy from `AGENTS.md`:
  - Prefer free/public data.
  - Do not add paid APIs unless Swamp explicitly asks.
  - Do not scrape private/protected data.
  - Do not copy full articles.
  - Use links and short summaries.
  - Stage scraped/public candidates for human review before publishing to the live map.

## Work completed so far

Latest relevant commit:

```text
ff00dc2 feat: add source ingestion staging
```

That commit added the first safe ingestion foundation:

- `data/source-registry.json`
  - Defines source metadata and scraping policy.
  - Currently has 3 starter sources:
    - `st-pete-rising-under-construction` — enabled public page adapter.
    - `st-pete-catalyst-development-news` — disabled RSS placeholder.
    - `st-pete-public-meetings-agendas` — disabled agenda placeholder.
- `scripts/ingest-sources.mjs`
  - Fetches enabled sources.
  - Currently parses the public St. Pete Rising under-construction listing.
  - Writes staged records only; does **not** publish to `projects.json`.
- `data/staged-project-candidates.json`
  - Generated candidate staging file.
  - Last run staged 43 candidate projects.
  - Every candidate is marked `review_status: "needs_review"`.
  - Candidates include source link, source id/name, optional image URL, status guess, confidence, and review metadata.
- `scripts/check-data-ingestion.mjs`
  - Validates source registry and staged candidate guardrails.
- `package.json`
  - Added:
    - `npm run check:data`
    - `npm run ingest:sources`

Verification already passed after the ingestion commit:

```bash
npm run check:ui
npm run check:data
npm run build
```

## Current mental model

Do **not** dump all staged candidates directly onto the map.

The desired pipeline is:

```text
source registry
  -> source adapter fetches public data
  -> staged candidates JSON
  -> dedupe/geocode/enrich suggestions
  -> human review/promote
  -> projects.json live map data
```

The purpose of staging is to prevent bad/duplicate/low-confidence data from polluting the public app.

## Best next task

Build a review/promote script.

Suggested command shape:

```bash
npm run review:candidates
# or
node scripts/review-candidates.mjs list
node scripts/review-candidates.mjs show <candidate-id>
node scripts/review-candidates.mjs promote <candidate-id>
node scripts/review-candidates.mjs reject <candidate-id>
node scripts/review-candidates.mjs duplicate <candidate-id> <existing-project-id>
```

Minimum useful behavior:

1. Read `data/staged-project-candidates.json`.
2. Read `projects.json`.
3. List `needs_review` candidates.
4. Detect likely duplicates against existing `projects.json` by slug/name/source URL.
5. Promote a candidate into `projects.json` only when required live-map fields are valid:
   - `id`
   - `name`
   - `address`
   - `lat`
   - `lng`
   - `status`
   - `completed_at`
   - `expected_open`
   - `last_verified`
   - `summary`
   - `sources`
6. Mark staged candidate review status after action:
   - `promoted`
   - `rejected`
   - `duplicate`
   - keep `needs_review` if incomplete.

Start with manual JSON editing if needed; do not add a database/auth/admin panel yet unless Swamp asks.

## Follow-up tasks after review/promote exists

1. Add geocoding suggestions for address-like candidates.
   - Keep it free/public first, likely OpenStreetMap/Nominatim if terms allow the usage pattern.
   - Cache results locally; do not hammer geocoding services.
   - Human review still required.
2. Add an RSS adapter for St. Pete Catalyst development news.
   - Store article link + short generated summary, not copied article text.
3. Add a city agenda/public meetings adapter.
   - Prefer official public pages/APIs/downloads.
   - Summarize agenda items; do not copy whole agenda packets into app data.
4. Add more source definitions only after each source has guardrails/tests.
5. Eventually add a lightweight review UI, but a CLI/script is enough for now.

## Commands to run when resuming

```bash
cd /home/jared/projects/whats-being-built
git status --short
npm run check:ui
npm run check:data
npm run build
```

To refresh staged candidates:

```bash
npm run ingest:sources
npm run check:data
```

## Guardrails

- Keep the live app cheap/free.
- Keep map provider/UI code clean for a future paid aerial/3D map upgrade.
- Use TDD/source checks for new ingestion/review behavior.
- Prefer small commits.
- Do not commit secrets or paid API assumptions.
- Do not represent staged candidates as verified facts until reviewed.
