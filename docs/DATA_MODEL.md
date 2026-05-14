# Data Model

Public project data lives in `projects.json`.

## Project fields

- `id`: stable unique slug
- `name`: public project name
- `address`: street address or approximate location
- `lat`: latitude
- `lng`: longitude
- `status`: one of `proposed`, `approved`, `under_construction`, `recently_completed`
- `completed_at`: completion date, month, or year when known
- `expected_open`: expected opening/completion estimate
- `last_verified`: date this entry was last checked
- `summary`: short public description
- `sources`: public source links

## Private research

Private research notes should stay local and should not be committed.
