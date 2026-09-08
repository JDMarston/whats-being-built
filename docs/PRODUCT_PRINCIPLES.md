# What this app is for

Answer the question someone asks while walking past a construction site:

**What is going up here, and how do we know?**

## Main interaction

1. Open the map. No account or onboarding required.
2. Optionally locate yourself; the map follows and the list sorts nearest first.
3. Tap a site, or pick it from the nearest/search list.
4. Read a short sourced explanation, status and checked date. Open the original source only for more detail.

Useful means finding the relevant site with little effort, not displaying a large number of pins or adding dashboard features. GPS is optional, never requested automatically. The viewer's location stays in current page state, not a stored location history.

## What not to make the user do

- Research, name or describe an unknown project before requesting an answer.
- Upload photos, type addresses or complete a construction-project form.
- Understand import queues, geocoders, source registries or admin workflows.
- Interpret missing map data as evidence that nothing is being built.

Admin review remains at `/review`, separate from the public discovery UI.

## Honest coverage

The basemap can work worldwide while project coverage is limited. With a location fix, show nearby counts and straight-line distances. If no mapped projects exist within five miles, say so and identify the current coverage rather than calling distant projects nearby. Do not call straight-line distance a walking route or GPS accuracy a property-boundary guarantee.

A good 3D scene helps the user recognize streets and existing buildings. It is not proof of a project's exact footprint, current construction state or future appearance.

## Missing sites, later

The next submission flow should be **request a lookup for this location**. Let the user use their location or place a pin, then collect public evidence in a real queue. Optional context can help but should not be required. Publish an identified project only after source, deduplication and location checks. Until that delivery/review path exists, do not show a misleading local-only submit button.

## Data is the next product constraint

A polished map with vague or stale project summaries is still not enough. The next data pass should prioritize accurate site positions, useful plain-language descriptions, updated statuses, meaningful source links and visible checked dates before expanding coverage. Never invent project details to make sparse records look complete.

## Acceptance checklist

- Map controls, location and project selection work on small phones and desktop.
- Panning does not fight location follow mode; recenter is obvious.
- There is one expanded panel at a time and no overlapping controls.
- Location refusal leaves browsing usable.
- Source and checked-date information are easy to reach.
- Out-of-coverage locations receive an honest explanation.
- Keep performance and visual QA tied to real rendered interactions, not only successful builds.
