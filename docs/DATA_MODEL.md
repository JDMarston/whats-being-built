# Project data

Public map pins live in `projects.json`.

## Fields

- `id`: stable slug such as `400-central`
- `name`: public project name
- `address`: street address or a clearly labeled approximate location
- `lat`, `lng`: coordinates, or `null` until checked
- `status`: `proposed`, `approved`, `under_construction`, or `recently_completed`
- `completed_at`: completion date when known
- `expected_open`: expected opening or completion date when known
- `last_verified`: date the entry was last checked (`YYYY-MM-DD`)
- `summary`: short description in our own words
- `sources`: public links used to verify the pin

Each source has a short `label` and a public `url`.

Imported records live in `data/staged-project-candidates.json`. A staged record does not become a map pin until its address and coordinates have been checked.
