# Project Brain

This folder is the context/handoff store for the Restaurant Meal App project (product name: **Plate**, working/earlier name: **DISHDEX**). It's meant to let a new session (human or AI agent) get oriented on the product vision, decisions, and current build state without re-deriving them from chat history or the codebase.

It is a snapshot store, not documentation. Code-level docs (`README.md` in the app root, `CATALOG_DATA_GUIDE.md`, `DEPLOYMENT.md`) live with the code and are the source of truth for how the app actually works today. Files here can go stale — check dates below against reality before trusting specifics.

## Read order

1. **[RESTAURANT_MEAL_APP_CONTEXT.md](RESTAURANT_MEAL_APP_CONTEXT.md)** — start here. The authoritative, current-state technical handoff, verified against the live GitHub repo and Supabase project on **23 July 2026**. Covers domain model, schema, migration history, search behaviour, security posture, roadmap, and a glossary. If a fact here conflicts with the codebase, the codebase wins — re-verify and update this file.
2. **[DISHDEX_Project_Context.md](DISHDEX_Project_Context.md)** — earlier product-vision and strategy document (compiled 23 July 2026), written under the project's older working name, DISHDEX. Captures the *why* behind the product — cold-start strategy, the lottery/receipt-verification ignition mechanic, sponsored-slot trust principles, and the even earlier "dining diary" framing the idea evolved from. Useful for understanding product reasoning and open strategic questions; **not** a reliable source for current schema or feature state — defer to file 1 for anything technical.
3. **[Restaurant Menu Data Extraction.pdf](Restaurant%20Menu%20Data%20Extraction.pdf)** — a reusable operating prompt/template for extracting a restaurant's menu from a source (website, PDF, spreadsheet, etc.) into a CSV importable straight into the live `public.dishes` Supabase table. Used when onboarding a new restaurant's menu data. Assumes the schema described in file 1; re-check the CSV header against the live schema before using, since dish columns have changed across migrations.

## How the two markdown docs relate

- **RESTAURANT_MEAL_APP_CONTEXT.md** = what exists and is verified live (schema, data totals, decisions already made).
- **DISHDEX_Project_Context.md** = why the product is shaped this way, plus ideas explored but not (or not yet) built — e.g. the lottery mechanic, flavour-attribute tagging, calendar-driven recommendations. Its final section explicitly preserves the earliest "dining diary" framing for continuity, even where superseded.

When the two disagree on anything concrete (naming, features, scope), trust the technical context doc and treat the DISHDEX doc as historical/strategic colour.
