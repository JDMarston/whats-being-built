# Agent Notes

Guidance for AI agents working on this project.

# AGENTS.md

## Project
This project is called WHATS-BEING-BUILT.

It is a map-based web app for identifying construction projects, buildings, and developments around a city. The first target area is St. Petersburg, FL.

## Goal
Let a user open a map, click a building/project, and quickly see:
- what it is
- what is being built
- project status
- useful links
- source articles or public records

## Current stack
- VS Code
- Codex
- TypeScript
- React
- Vite
- MapLibre GL JS
- Free/public data first
- Avoid paid services until needed

## Rules for Codex
- Keep the app cheap/free to run.
- Prefer simple local JSON or GeoJSON first.
- Do not add paid APIs unless explicitly asked.
- Do not over-engineer.
- Keep code readable.
- Explain tradeoffs briefly before major changes.
- Ask before adding auth, databases, payments, or hosted services.

## Data approach
Start with manually curated public data:
- project name
- address
- coordinates
- status
- description
- source URL
- last verified date

Do not scrape private/protected data.
Do not copy full articles.
Use links and short summaries.

## UX direction
The app should feel like: "What's that building?"
A user sees something under construction and can immediately check the map.

## Development priority
1. Get a local map working.
2. Add sample project markers.
3. Add clickable project cards.
4. Add a simple data file.
5. Later: search, filters, public records, submission form.

# Local Model / Token-Saving Policy

This project can use a local Ollama model to reduce cloud token usage for low-complexity repetitive work.

Local Ollama endpoint:

`http://localhost:11434/api`

Helper script:

`.\scripts\local-llm.ps1`

Default local model:

`qwen2.5-coder:1.5b`

## Use the local model for

Use the local model before spending cloud reasoning on low-risk chores like:

- Cleaning scraped HTML or messy text into JSON.
- Generating simple CSS selectors.
- Writing small helper scripts.
- Creating regex patterns.
- Normalizing construction project names.
- Normalizing addresses.
- Generating search-query variations.
- Drafting commit messages.
- Summarizing small logs or errors.
- Reformatting CSV, JSON, or Markdown.
- Pre-filtering obvious duplicate project records.

## Do not use the local model for

Do not rely on the local model for:

- Architecture decisions.
- Security-sensitive decisions.
- Legal or scraping-policy decisions.
- Database schema decisions.
- Major refactors.
- Production deployment changes.
- API keys, secrets, credentials, auth tokens, or `.env` contents.
- Final decisions about whether two construction projects are definitely the same.
- Anything requiring current internet research.

## Rule

Before doing a low-complexity transformation, ask:

"Can this be safely handled by the local model?"

If yes, call:

`.\scripts\local-llm.ps1 -Prompt "<task>"`

Review the output before applying it.

The local model is an intern. It can do chores. It should not make final project decisions.
