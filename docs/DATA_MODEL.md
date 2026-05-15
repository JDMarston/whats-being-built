# Data Model

Public project data lives in `projects.json`. This file is safe to commit and should contain only public, source-backed project information.

## Project fields

- `id`: stable unique slug, such as `400-central`
- `name`: public project name
- `address`: street address or approximate public location
- `lat`: latitude as a number, or `null` if unknown
- `lng`: longitude as a number, or `null` if unknown
- `status`: one of `proposed`, `approved`, `under_construction`, `recently_completed`
- `completed_at`: completion date, month, or year when known, otherwise `null`
- `expected_open`: expected opening or completion estimate, otherwise `null`
- `last_verified`: `YYYY-MM-DD` date this entry was last checked
- `summary`: short public description written in our own words
- `sources`: array of public source links

## Source fields

Each item in `sources` should include:

- `label`: short human-readable source name
- `url`: public URL for the source

## Private research

Private research notes should stay local and ignored. Do not commit `private_database.json`; use it only for local working notes and extra details that are not part of the public repo workflow.
