# Chain dish restructuring handoff

Last audited: 2026-07-21 (Europe/London)

Audit scope: local-only comparison against the original restructuring request. No Supabase query, deployment check, or test run was performed in this audit. The uncommitted migrations, frontend changes, generated types, and tests referenced below are present in the worktree; live-database results remain the recorded results from the prior handoff audit.

## Status at a glance

Current local state: the restructuring work is committed locally, but not pushed; no frontend deployment has been created.

The chain/canonical-dish restructuring is implemented in the database and frontend. Both new schema migrations are already applied to the linked Supabase project `fjhesqsuazqakgdfcpri` (`restaurant-meal-app`). The matching repository changes are **not committed or pushed** and the frontend has **not been deployed**.

Local Git state:

- Branch: `database-refactor`
- Starting commit: `44ff9ce`
- Worktree: modified and untracked implementation files, including this handoff
- Remote database: migrations through `20260721092439_canonical_chain_dishes_hardening` applied

Do not reapply or rename the live migrations. Preserve their filenames and migration versions when committing.

## What was completed

### 1. Additive Supabase data model

Implemented in:

- `supabase/migrations/20260720170223_canonical_chain_dishes.sql`
- `supabase/migrations/20260721092439_canonical_chain_dishes_hardening.sql`
- `supabase/migrations/20260719172211_add_allergens_verified_status.sql` restores a migration that was already present remotely but missing from the local checkout.

The migration:

- Creates `brands`, with a brand row for chains and independent restaurants.
- Adds `restaurants.brand_id`; `restaurants` remains one row per physical branch.
- Creates `canonical_dishes` with brand/market-scoped stable keys, official/source identifiers, review status, versioning, and `supersedes_id`.
- Keeps `dishes` as the branch offering and adds `brand_id`, `canonical_dish_id`, `variant_key`, `is_active`, `available_from`, `available_until`, and `local_overrides`.
- Enforces restaurant/offering/canonical brand consistency with composite foreign keys.
- Enforces one offering per `(restaurant_id, canonical_dish_id, variant_key)`.
- Creates the service-only `canonical_dish_match_suggestions` review queue. Unreliable imports are not automatically merged.
- Creates `dish_rating_rollups`, maintained by private trigger functions, to expose safe aggregates without exposing raw rating rows.
- Rebuilds `dish_catalog` and `restaurant_catalog` as `security_invoker` views.
- Supports exact branch, city-wide canonical, and overall canonical rating scopes.
- Adds the required restaurant, city, canonical-dish, restaurant-dish, rating-dish, composite-FK, review-queue, and supersession indexes.
- Changes the historical-data relationships from cascading deletes to `ON DELETE RESTRICT` for restaurant → dish, dish → rating, and rating → photo.
- Retains and deprecates `restaurants.chain_name`; it is intentionally not dropped in this additive phase.

### 2. Conservative data migration and Bella Italia cleanup

- Backfilled all restaurants to brands.
- Created exactly one canonical row per existing dish using `legacy:<dish_id>` keys. No dishes were merged based on name or price.
- Preserved every existing dish ID and every `ratings.dish_id` relationship.
- Archived and removed the empty duplicate Bella Italia George Street restaurant row `18`.
- Kept populated Bella Italia row `19`; no dish IDs had to move. The recovery record is in `archive.restaurant_merges_20260720170223`.
- Added a persistent integrity audit in `archive.migration_integrity_checks`.

Live post-migration state:

| Check | Result |
| --- | ---: |
| Brands | 16 |
| Physical restaurants | 16 |
| Canonical dishes | 701 |
| Branch dishes | 701 |
| Ratings / meal-history rows | 1,789 |
| Rating photo rows | 0 |
| `meal-photos` storage objects | 0 |
| Rating rollup rows | 701 |
| `dish_catalog` rows | 701 |
| `restaurant_catalog` rows | 16 |
| Archived Bella duplicate rows | 1 |
| Migration integrity result | Passed |

The migration recorded unchanged fingerprints for dish IDs and rating-to-dish relationships. The protected rating/dish fingerprint is `bf73465bc8aa4d53ef8a13a58e44e796`.

### 3. Security and concurrency hardening

- Enabled RLS on the new public tables and added explicit grants/policies for the intended Data API access model.
- Kept match suggestions service-only and archive data outside the public API.
- Revoked public execution of privileged helper functions; private `SECURITY DEFINER` rollup functions are not callable by browser roles.
- Replaced security-definer catalogue views with `security_invoker` views.
- Added a per-dish transaction advisory lock to serialize concurrent rollup refreshes.
- Ran a real two-connection concurrency test against the linked project. Both concurrent inserts appeared exactly once in the rollup, and all test rows were removed afterward.
- Ran Supabase security and performance advisors again after hardening. No new error-level finding remains from this migration.

Current advisor notices are recorded under **Remaining operational decisions** below.

### 4. Frontend behavior

Key implementation files:

- `lib/catalog.js`
- `lib/api.js`
- `lib/search.js`
- `components/DishCard.jsx`
- `components/DishModal.jsx`
- `components/MealForm.jsx`
- `components/DishInformation.jsx`
- `components/MapPanel.jsx`
- `pages/HomePage.jsx`
- `pages/RestaurantPage.jsx`
- `pages/GroupPage.jsx`
- `pages/MePage.jsx`

Completed behavior:

- Maps catalogue rows into `canonicalDishId`, `brandId`, `brandName`, all three rating scopes, price bounds, and a branch array containing exact branch-specific dish IDs.
- Groups homepage dishes by canonical dish within Oxford.
- Shows combined city score/count, one price when equal, and a range/“From” treatment when prices differ.
- Shows brand and location count on grouped cards.
- Keeps restaurant pages and group search branch-specific.
- Requires a current branch offering before logging a grouped dish.
- Preselects the exact branch dish when opened from a restaurant page.
- Passes only the selected branch `dishes.id` to `createMeal`; it never substitutes a canonical ID.
- Shows all current branches serving a grouped dish on the map.
- Excludes inactive, future, or expired offerings from current grouped discovery while retaining their historical ratings in aggregate scores.
- Keeps meal-history links attached to the exact restaurant and branch dish.
- Fixes failed-photo-upload cleanup order so photo metadata is deleted before the restricted rating relationship.

### 5. Tests, generated types, and documentation

- Added `supabase/tests/database/001_canonical_chain_dishes_test.sql` with 48 pgTAP assertions covering schema, constraints, indexes, RLS, view security, integrity, rating scopes, branch availability, exact dish IDs, delete restrictions, and anon/public boundaries.
- Added `tests/catalog.test.js` and expanded `tests/search.test.js` for grouping, prices, maps, branch preselection, availability, and physical-branch group matching.
- Generated `supabase/database.types.ts` from the linked schema; it contains the new tables, columns, relationships, and catalogue views. Its contents exactly matched a fresh linked-schema generation during the handoff audit.
- Added `supabase/config.toml` and `supabase/.gitignore` for reproducible local Supabase work.
- Updated `README.md`, `CATALOG_DATA_GUIDE.md`, and package scripts.

Latest local verification on 2026-07-21:

| Command/check | Result |
| --- | --- |
| `npm test` | 17/17 passed |
| `npm run build` | Passed; Vite transformed 91 modules |
| `git diff --check` | Passed |
| Linked pgTAP suite | 48/48 passed inside a rolled-back transaction |
| Linked migration ledger | All three local migration versions present through `20260721092439` |
| Linked integrity query | Passed; protected counts/fingerprints unchanged |
| Two-session rollup test | Passed; cleanup verified |
| Generated types comparison | Exact match to fresh linked generation |

The Supabase CLI `test db` wrapper was not used against a local stack because Docker was not running. The exact pgTAP file was instead executed transactionally against the linked database and passed all 48 assertions.

Continuation verification on 2026-07-21: `npm test` passed (17/17) and `npm run build` passed. The interactive browser smoke test could not run because no browser surface was available in this environment. No configured Vercel or Netlify CLI was available, so no deployment was created.

## What remains to be done

### Required before merging or releasing

0. **Push the local restructuring commit to `origin/database-refactor` only after explicitly approving publication to GitHub.**
1. **Run a browser smoke test with the linked project.** At minimum verify:
   - homepage catalogue loads;
   - a grouped card opens and lists its current branches;
   - restaurant-page opening preselects the exact branch;
   - logging a meal writes the selected branch dish ID and the meal appears in history;
   - grouped map markers and branch navigation work;
   - a failed photo upload leaves no orphan rating, metadata row, or storage object.
   The live catalogue currently has no canonical ID shared by more than one branch offering, so use a controlled local/staging fixture to exercise the real “2 locations” selector and multi-marker path. Do not create an unverified production merge just to make this test possible.
2. **Deploy the frontend only after the smoke test.** No hosting deployment has been performed in this work; this repository has no configured Vercel/Netlify CLI deployment target.
3. **Optionally start Docker and run `npm run test:db` locally** to prove the local stack reproduces the linked pgTAP result. This is an environment-verification gap, not an untested SQL gap.

### Data work that is intentionally not automated

- No cross-branch production dish records were consolidated. The migration intentionally begins 1:1 because no duplicate product identity was confirmed from a reliable official ID/manual review. The live database currently has zero canonical IDs shared by multiple branch offerings and zero pending match suggestions.
- To make real multi-location grouped cards appear, import additional physical branches and their branch offerings, then merge only confirmed same-brand/same-market/same-recipe/same-portion/same-variant products. Use official menu IDs where possible; otherwise create review-queue suggestions and approve them manually.
- Do not merge by normalized name, description, or price. Keep kids, sizes, proteins, naked/gluten-free variants, meal deals, and materially different recipes separate.
- Match review is currently a service-side database workflow; there is no reviewer UI or automatic approval process. Build one only if catalogue operations need it—automatic merging should remain out of scope.

### Intentionally deferred compatibility cleanup

- Do not drop `restaurants.chain_name` yet. It remains a compatibility field while the new structure soaks. Remove it only in a later migration after all readers/importers are confirmed to use `brand_id`/`brands` and after a rollback window is agreed.
- Do not delete inactive dishes. Set `is_active = false` and optionally `available_until`; old ratings must remain attached to the original branch dish.

### Remaining operational decisions from Supabase advisors

These are not regressions introduced by the restructuring, but they should be consciously accepted or resolved before a broad public launch:

- Archive tables have RLS enabled with no policies. This is intentional because the `archive` schema is unexposed and browser roles have no access. Keep it that way unless a service-side recovery workflow is introduced. [Advisor reference](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
- `profiles`, `ratings`, `rating_photos`, and private storage policies trigger anonymous-access warnings because the app deliberately uses anonymous Supabase Auth users plus `auth.uid()` ownership. Revisit anonymous sign-ins, CAPTCHA/Turnstile, rate limits, and account recovery before wider launch. [Anonymous-sign-in advisor reference](https://supabase.com/docs/guides/database/database-advisors?queryGroups=lint&lint=0012_auth_allow_anonymous_sign_ins)
- Leaked-password protection is disabled. It is not exercised by the current anonymous-only sign-in model, but enable it before adding password authentication. [Password protection reference](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
- Several new/required indexes are reported unused immediately after creation. Do not remove required FK/query indexes based on this early signal; monitor production query statistics first. [Unused-index reference](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)

### Optional product and test follow-ups

- Automate the controlled two-branch browser flow with a browser test suite such as Playwright.
- Show branch/city information more explicitly in meal history if multiple same-name branches are introduced.
- If one branch can offer multiple variants of a canonical dish, include variant labels in the branch selector so options remain unambiguous.

## Rollback posture

The main migration ran atomically with pre/post integrity checks, so any failure during application would have rolled back. It is now live and there is no destructive down-migration checked in. If rollback becomes necessary, take a fresh backup and write a reviewed forward repair migration; do not edit, rename, or delete the applied migration files. The removed empty Bella row is recoverable from `archive.restaurant_merges_20260720170223`, but restoring it should be a deliberate forward migration rather than ad hoc SQL.

## Safe continuation commands

```sh
# Inspect the uncommitted implementation
git status --short
git diff --check
git diff

# Re-run local app verification
npm test
npm run build

# Requires a running local Supabase/Docker stack
npm run test:db
npm run types:generate

# If types must be regenerated from the already-linked remote project
npx --yes supabase@2.109.1 gen types --linked --lang typescript > supabase/database.types.ts
```

Before using any Supabase CLI command whose flags are not shown above, inspect its current syntax with `--help`. Never expose a secret/service-role key through a `VITE_` environment variable.

## Release guardrails

- The database is ahead of the repository until these files are committed and pushed.
- Do not edit or squash the already-applied migration versions.
- Do not rewrite `ratings.dish_id` to canonical IDs.
- Do not delete restaurant/dish/rating/photo history to simplify consolidation.
- Re-run database advisors after any further DDL, RLS, view, function, or storage-policy change.
- If a migration or import changes protected counts, stop and investigate rather than updating the expected fingerprint blindly.
