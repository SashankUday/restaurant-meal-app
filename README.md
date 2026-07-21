# Plate

Plate is a responsive React and Supabase app for discovering, rating, and remembering individual restaurant dishes in Oxford. Chain products are grouped across physical branches for browsing, while every meal remains attached to the exact branch offering the user ate.

## Run locally

Requirements:

- Node.js 20.19+ on the Node 20 line, or Node.js 22.12+ (use an LTS release)
- npm 9 or newer

Install and start the development server:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.

Copy `.env.example` to `.env.local` and add the public URL and publishable key for the Supabase project before starting the app.

## Supabase setup

The database definition and Oxford seed catalogue live in `supabase/migrations`. To apply them to a linked project:

```sh
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

In **Authentication → Providers → Anonymous Sign-Ins**, enable **Allow anonymous sign-ins**. Plate uses an anonymous Supabase Auth identity behind the entered email so ratings, logs, and private photos can be protected by `auth.uid()` without introducing a password, OTP, or magic link. Email verification and cross-device account recovery remain deliberately out of scope for this release.

## Production build

```sh
npm run build
npm run preview
```

`npm run build` creates the deployable static site in `dist/`. `npm run preview` serves that build locally for a final smoke test. Do not deploy the development server.

For provider-specific steps, rollback guidance, and a release checklist, see [DEPLOYMENT.md](DEPLOYMENT.md).

## Updating restaurant and dish data

Catalogue data lives in Supabase, so a data-only update appears on the website without rebuilding or redeploying the React app. Maintain shared identities in `brands` and `canonical_dishes`, physical branches in `restaurants`, and branch-specific offerings in `dishes`; do not edit the public catalogue views. Dish prices are nullable: use `NULL` when no reliable price is supplied.

Begin with the complete [dish data template](templates/plate-dish-data-template.yaml). For the field map, safe update sequence, provenance rules, and ready-to-adapt SQL examples, see [CATALOG_DATA_GUIDE.md](CATALOG_DATA_GUIDE.md).

## Project layout

```text
.
├── Plate.jsx              # Router and application providers
├── components/            # Shared cards, filters, modal, map, and meal form
├── context/               # Account and Supabase catalogue state
├── lib/                   # Data access, search/group ranking, and image handling
├── pages/                 # Home, restaurant, group search, and My Meals routes
├── supabase/migrations/   # Schema, RLS, storage policies, views, and seed data
├── supabase/tests/        # pgTAP schema, integrity, aggregate, and RLS tests
├── supabase/database.types.ts # Generated Supabase schema types
├── tests/                 # Search and group-matching unit tests
├── styles.css             # Plate's shared responsive visual system
├── main.jsx               # React browser entrypoint
├── netlify.toml           # Netlify build, route fallback, and response headers
├── vercel.json            # Vercel build, route fallback, and response headers
├── CATALOG_DATA_GUIDE.md  # How to add and maintain restaurant/dish information
└── DEPLOYMENT.md          # Deployment and operations runbook
```

## Runtime behaviour and limitations

- Brands, physical branches, canonical dishes, branch offerings, ratings, meal history, and photo metadata are stored in Supabase. Public PlateScores come from a read-only aggregate boundary; raw rating comments and history remain private.
- Homepage cards group one canonical dish within Oxford and show city-wide scores, price bounds, and all current locations. Restaurant pages and group search remain physical-branch based.
- Logging a grouped dish requires selecting a branch. The saved `ratings.dish_id` is always the exact branch-specific `dishes.id`.
- Public browsing uses safe catalogue views. Row Level Security limits profiles, rating rows, history, and private photo metadata to `auth.uid()`. Meal photos are stored in a private `meal-photos` bucket under a per-user path.
- The interim account model creates an anonymous Supabase Auth identity and associates the entered email with its UUID. The email is held locally to keep the UI signed in. There is no email verification, password, cross-device recovery, or safe account switching until magic-link auth is added.
- Because anonymous identities cannot be recovered after browser storage is cleared, this account model is suitable for the requested interim phase, not a final authentication system. Add CAPTCHA/Turnstile and abuse controls before broad public launch.
- Search splits queries into meaningful tokens, ignores conversational filler, and searches dish/restaurant names, chain and branch names, areas, cuisines, descriptions, tags, diets, allergens, ingredients, meal occasions, and human-reviewed hidden search tokens. Calorie and protein constraints read the kept `nutrition` JSON, while price constraints use nullable `dishes.price`; simple exclusions are evaluated against the same searchable fields. User-added rating tags are included in the public search tag index without exposing private comments or history.
- The public catalogue keeps concise descriptions, nutrition, ingredients, dietary/allergen details, availability, provenance, images, and search tokens. Metadata removed by the simplification migration remains recoverable in the restricted `archive` schema and is not served to the browser.
- Group search requires at least one eligible dish per query at the same restaurant. Dietary and allergen filters are applied before matching. When there is no complete result, the closest partial restaurants explicitly label missing queries.
- Selected photos must be JPEG, PNG, or WebP, are limited to six per meal and 15 MB at selection, and are resized and compressed in the browser before a storage upload capped at 5 MB.
- The map uses Leaflet with OpenStreetMap tiles. Restaurant coordinates are stored in the database; the app does not geocode or request the user's location at runtime.
- Fonts and OpenStreetMap tiles are loaded at runtime. Browser fallback fonts are used if Google Fonts are blocked.
- Allergen data is restaurant-provided and must not be treated as a safety guarantee; every dish and restaurant surface repeats the instruction to confirm with staff.

## Common commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run build` | Create an optimized static build in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run tokenised search and group-matching tests |
| `npm run test:db` | Run the pgTAP suite against the local Supabase database |
| `npm run types:generate` | Regenerate TypeScript database types from local Supabase |

## Configuration

Plate requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Both values are public browser configuration and are documented in `.env.example`. Never place a secret key, service-role key, database password, or other privileged value in a `VITE_` variable: Vite embeds those values in browser assets.
