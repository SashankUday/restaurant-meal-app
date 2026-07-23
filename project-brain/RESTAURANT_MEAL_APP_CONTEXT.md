# Restaurant Meal App — Comprehensive Project Context

**Project name in the repository:** Plate  
**Repository:** `SashankUday/restaurant-meal-app`  
**Primary market:** Oxford, United Kingdom  
**Current stack:** React, Vite, Supabase, React Router and Leaflet  
**Document status:** Consolidated project handoff  
**Last verified:** 23 July 2026

---

## 1. Executive summary

Plate is a dish-first restaurant discovery, rating and meal-memory application for Oxford.

Most restaurant products organise discovery around restaurants as a whole. Plate instead treats the individual menu item as the main unit. Users can:

- Find dishes using natural, multi-descriptor searches.
- Compare the same chain product across physical branches.
- Filter for dietary requirements, allergens, ingredients, nutrition and price.
- Find restaurants that can satisfy several people's different meal requests.
- Rate a specific branch's version of a dish.
- Log restaurant visits involving one or several dishes.
- Save private notes and photographs associated with their meals.
- Build a personal meal history.
- Suggest corrections to restaurant and dish information.
- Save dietary requirements and ingredients they want excluded.

The central architectural decision is to distinguish:

1. **A canonical dish:** the shared product identity, such as a particular Nando's menu item.
2. **A branch-specific dish:** the actual offering at a physical branch, with its local price and availability.
3. **A rating:** a user's opinion of the exact branch-specific dish.
4. **A visit:** a private record of eating at one restaurant, potentially involving several rated dishes.

This model allows Plate to combine data usefully across a chain without pretending that a meal at one branch happened at another.

---

## 2. Product vision

### 2.1 Core problem

Restaurant reviews are often too broad. A restaurant can serve one excellent dish and several mediocre dishes, or the same chain item can vary between branches. Users often want answers to questions such as:

- Where can I get a highly rated chicken dish under £15?
- Which nearby restaurant has something suitable for a vegan and something high-protein?
- Which Nando's branch serves the same dish, and how is it rated at each branch?
- What was the dish I ate and liked several months ago?
- Does this dish contain a blocked ingredient?
- Which dishes fit my nutritional and dietary requirements?

Plate is intended to answer these questions at dish level rather than relying only on whole-restaurant ratings.

### 2.2 Product principles

The following principles have guided the project:

- **Dish-first discovery:** The menu item is the primary discovery object.
- **Physical-branch truth:** Ratings and visits must retain the exact restaurant branch.
- **Useful aggregation without false merging:** Scores may be aggregated across verified equivalent chain products, but raw ratings remain attached to the branch offering.
- **Structured data with provenance:** Menu, price, nutrition, allergen, availability and media facts should record where they came from.
- **Safety over confidence:** Dietary and allergen information is sourced information, not a Plate guarantee.
- **Private personal history:** Ratings may contribute public aggregates, while private notes, photographs and meal history remain protected.
- **Search should feel conversational:** Users should be able to search using several descriptors rather than only exact dish names.
- **Catalogue changes should not require a frontend deployment:** Restaurant and dish data belong in Supabase, not hard-coded React arrays.
- **Additive, reproducible database changes:** The migration history is the authoritative record of schema evolution.
- **Human review for identity decisions:** Similar names or prices alone must never automatically merge canonical dishes.

---

## 3. Current verified state

The following was verified against the GitHub repository and the live Supabase project on 23 July 2026.

### 3.1 Live data totals

| Entity | Current total |
|---|---:|
| Brands | 16 |
| Physical restaurants | 18 |
| Canonical dishes | 701 |
| Branch-specific dishes | 971 |
| Public `dish_catalog` rows | 971 |
| Ratings | 19 |
| Visits | 13 |
| Profiles | 3 |

### 3.2 Current restaurant catalogue

| Brand | Physical branch or location | Active branch-dish rows |
|---|---|---:|
| Bella Italia | Oxford George Street | 110 |
| Branca | Walton Street | 1 |
| Donburi Inn | Oxford Covered Market | 93 |
| G&D's Cafe | St Aldate's | 2 |
| Gourmet Burger Kitchen | Oxford, George Street | 117 |
| Mowgli Street Food | Oxford, Westgate Centre | 51 |
| Najar's Place | St Giles' | 2 |
| Nando's | Oxford – Cowley Road | 135 |
| Nando's | Oxford – George Street | 135 |
| Nando's | Oxford – Westgate | 135 |
| Oli's Thai | Iffley Road | 2 |
| Pierre Victoire | Little Clarendon Street | 2 |
| Rozana's | Oxford, North Parade | 39 |
| Sasi's Thai | Gloucester Green | 1 |
| Spiced Roots | Cowley Road | 2 |
| Taberu | Cowley Road | 1 |
| The Coconut Tree | George Street | 2 |
| Wagamama | Oxford, Market Street | 141 |

The catalogue is unevenly complete. Several brands have full or substantial menu imports, while some early seed restaurants still contain only one or two dishes.

### 3.3 Current major menu imports

Substantial imported datasets include:

- Wagamama Oxford.
- Nando's Oxford – George Street.
- Nando's Oxford – Cowley Road.
- Nando's Oxford – Westgate.
- Bella Italia Oxford.
- Donburi Inn.
- Gourmet Burger Kitchen.
- Mowgli Street Food.
- Rozana's.

The three Nando's branches share 135 canonical dish identities and contain 405 branch-specific dish rows. This is the clearest live demonstration of the chain architecture.

---

## 4. Historical development

### 4.1 Original prototype

The project began as a root-level Vite React prototype centred on `Plate.jsx`.

The earliest version:

- Contained a small hard-coded seed list in JavaScript.
- Stored dish scores and rating counts in React state.
- Updated ratings synchronously in the browser.
- Included a sponsored dish in the same seed array.
- Did not yet have persistent users, ratings, meal history or a database-driven catalogue.

This prototype established the core visual and dish-rating concept but was not suitable for reliable multi-user use.

### 4.2 Initial deployment problem

An early Vercel deployment returned a `404: NOT_FOUND`. The app subsequently gained deployment configuration and single-page-application route fallbacks for Vercel and Netlify.

### 4.3 Supabase migration

The app was then converted into a database-backed application with:

- Restaurant, dish and rating tables.
- Supabase authentication identities.
- Row Level Security.
- Private photograph storage.
- Public aggregate views.
- Search and group-matching logic.
- Routed pages for Home, Restaurant, Group Search and My Meals.
- Persistent ratings and meal history.

### 4.4 Chain refactor

The next major architectural change introduced:

- `brands`
- `canonical_dishes`
- physical `restaurants`
- branch-specific `dishes`
- branch, city and overall rating scopes

This solved the problem of the same chain dish appearing at several branches.

### 4.5 Visit and account refactor

The app was later reworked so that a rating and a dated restaurant visit are not the same thing.

The current distinction is:

- A user may rate a dish without claiming they ate it on a particular date.
- A visit holds the date and restaurant context.
- Several dish ratings can share one `visit_id`.
- A user may add a visit after rating a dish.
- My Meals can show a rating as having no logged visit.
- Users can delete their own ratings.
- Users can log a visit by selecting a restaurant first or by searching for a dish and then choosing a branch.

### 4.6 Fifth Update

The Fifth Update added or completed:

- Approved editor access.
- Admin approval and rejection of edit-access requests.
- Restaurant editing.
- Saved blocked ingredients.
- Diet preferences that automatically affect search.
- A temporary “Adjust diet for today” override without changing the saved profile.
- A map on the restaurant-search mode.
- Dateless ratings.
- A dedicated `badges` field for dish badges.
- A Chef's special badge.
- Shared tag selection UI.
- Title-casing of custom tags.
- Edit gating for dish and restaurant changes.

---

## 5. Domain model

### 5.1 Brand

A `brand` represents the shared identity of either:

- A restaurant chain; or
- An independent restaurant.

Even independent restaurants have a brand row. This gives the data model one consistent path from brand to restaurant to dish.

Typical fields include:

- `id`
- `name`
- `brand_key`
- `is_chain`

### 5.2 Restaurant

A `restaurant` represents one physical location.

It stores branch-level facts such as:

- Brand relationship.
- Public restaurant name.
- Branch name.
- Area.
- City and country.
- Cuisine.
- Latitude and longitude.
- Local description.

For chains, the restaurant is the branch. For an independent venue, the brand and restaurant may effectively describe the same business at different modelling levels.

### 5.3 Canonical dish

A `canonical_dish` represents one reviewed product identity for a brand and market.

A canonical dish should mean the same:

- Product.
- Recipe.
- Portion.
- Protein or substantive variant.
- Market.

A canonical dish is not simply a dish with a similar name.

Separate canonical records should be retained for:

- Different sizes.
- Different proteins.
- Kids' items.
- “Naked” versions.
- Gluten-free variants where the product materially differs.
- Meal deals.
- Material recipe changes.
- Market-specific versions with different ingredients, allergens, portions or nutrition.

Useful canonical fields include:

- Brand.
- Canonical key.
- Official menu item identifier.
- Market code.
- Canonicalisation method.
- Review status.
- Superseded product relationship.

### 5.4 Branch-specific dish

A `dish` is one menu offering at one restaurant branch.

It owns local facts such as:

- Price.
- Availability.
- Menu position.
- Local description.
- Local overrides.
- Branch-specific allergen or nutrition data.
- Branch-specific active dates.
- Sponsorship state.
- Badges.

Every branch dish links to a canonical dish, but its rating target remains its own `dishes.id`.

### 5.5 Rating

A `rating` is the user's evaluation of one exact branch-specific dish.

The design intent includes:

- One current rating per user per branch-specific dish.
- An overall score.
- “Would order again”.
- Tags.
- Optional comment.
- Optional relationship to a visit.
- Optional private photographs.
- The ability for the user to delete their rating.

The public app should expose aggregate scores, not another user's private rating history or private comments.

### 5.6 Visit

A `visit` represents one user going to one restaurant.

It can hold:

- Restaurant.
- Date.
- User.
- Notes.
- Several linked dish ratings.

The visit is the appropriate place for the date. A rating can exist without a visit.

### 5.7 Offer

A price offer or bundle should not normally be represented as a separate dish.

For example, a base menu item and “with two regular sides” are the same rateable product with more than one purchasing configuration.

The agreed modelling principle is:

- Keep the base dish as the dish.
- Keep its rating, route, card and search identity unchanged.
- Store offers separately and link them to the dish.
- Display base and offer prices together.
- Do not create duplicate rating targets for pricing bundles.

A discussed implementation was a `dish_offers` table, although this table was not present in the verified live schema on 23 July 2026. This remains a proposed extension rather than a confirmed current feature.

---

## 6. Rating aggregation

### 6.1 Required scopes

The public catalogue supports three score scopes:

- **Branch score:** ratings for the exact branch-specific `dishes.id`.
- **City score:** ratings for the same canonical dish across branches in the city.
- **Overall score:** ratings for the same canonical dish across all branches.

### 6.2 Raw-rating rule

Every raw rating remains attached to the exact branch dish.

This preserves the truth that:

- The user ate at a particular restaurant.
- Branch quality may differ.
- Local preparation and service matter.
- A branch-specific rating must not be silently reassigned to another branch.

### 6.3 Public aggregate boundary

`dish_rating_rollups` is the non-sensitive aggregate boundary between private rating rows and public catalogue views.

The app should obtain public scores from aggregates rather than exposing raw rating rows broadly.

### 6.4 Unrated dishes

A dish with no ratings should display **“Not yet rated”**, not a misleading score of `0.0`.

### 6.5 Historical seeded ratings

Early prototypes and seed migrations included synthetic aggregate data. This was useful for interface development but creates a trust problem if presented as genuine user activity.

Before a broader public launch, the database and UI should make a clear distinction between:

- Real user ratings.
- Demonstration or seed ratings.
- Imported third-party scores, should they ever be used.

Ideally, synthetic ratings should not influence public trust signals.

---

## 7. Main user journeys

## 7.1 Browse and search for dishes

A user can browse dish cards or enter a search involving several concepts, such as:

- “Spicy chicken under £15”
- “High-protein meal”
- “Vegan noodles”
- “Low-calorie lunch”
- “No peanuts”
- “Comfort food”
- A restaurant, chain, branch, area or cuisine name

Search operates over structured and textual fields rather than only exact dish names.

### 7.1.1 Searchable information

The current search design includes:

- Dish name.
- Restaurant name.
- Brand or chain name.
- Branch name.
- Area.
- Cuisine.
- Description.
- Course.
- Tags.
- Diet labels.
- Allergens.
- Ingredients.
- Meal occasions.
- Hidden search tokens.
- Community rating tags.
- Price.
- Calories.
- Protein.
- Exclusions.

### 7.1.2 Natural-language handling

The search layer:

- Tokenises a query.
- Removes conversational filler.
- Matches meaningful descriptors.
- Parses simple price, calorie and protein constraints.
- Applies exclusions against the same searchable fields.
- Uses human-reviewed hidden tokens for synonyms, moods or colloquial concepts.

A vector or embedding search system has been discussed but is not required for the current implementation. The present system uses structured and token-based matching.

### 7.1.3 Explicit filters

The app includes explicit inputs for:

- Minimum price.
- Maximum price.
- Maximum calories.

These are processed through the same structured-constraint logic used for free-text search.

### 7.1.4 Ranking

Top result sets use score-weighted randomisation rather than always returning a rigid identical order.

The purpose is to:

- Prefer stronger results.
- Avoid making discovery feel static.
- Give more than one appropriate option exposure.

Ranking quality should continue to balance:

- Search relevance.
- Rating confidence.
- Rating count.
- Dietary eligibility.
- Price or nutritional constraints.
- Variety.

## 7.2 Search for restaurants

The home page can switch between dish and restaurant search modes.

Restaurant results use a reusable restaurant card and link to the physical restaurant page.

The restaurant-search mode also includes a map using the existing Leaflet map component.

## 7.3 View a dish

A dish card opens a detailed view.

The detail surface can show:

- Name and image.
- PlateScore or “Not yet rated”.
- Brand and branch.
- Price.
- Description.
- Nutrition.
- Ingredients.
- Diet labels.
- Allergens and warnings.
- Availability.
- Tags.
- Badges.
- Branches serving the same canonical product.
- A link back to the canonical product or other branch context.
- Actions to rate or log.
- Editing or correction controls when permitted.

Backend-only identifiers and operational fields were deliberately removed from the normal public-facing information display.

## 7.4 Rate a dish

The rating flow is distinct from logging a visit.

A user can:

- Choose an overall score.
- Answer whether they would order it again.
- Select tags.
- Add a custom tag.
- Add an optional comment.
- Add photographs.
- Submit without selecting a visit date.

After rating, the app may offer to log the associated visit.

## 7.5 Log a visit

The visit flow allows a user to:

- Select a restaurant branch.
- Select a date.
- Add notes.
- Select one or more dishes eaten during that visit.
- Complete a rating step for each dish.
- Share one `visit_id` across all those ratings.

Where only one physical branch is possible, the branch selector can be skipped.

## 7.6 My Meals

My Meals is the user's private history surface.

It supports:

- Viewing previous ratings.
- Viewing visit-linked meals.
- Showing “No visit logged” where appropriate.
- Adding a visit to an existing rating.
- Deleting a rating with confirmation.
- Viewing the user's notes and photographs.

## 7.7 Group search

Group search tries to find a physical restaurant that can satisfy several meal requests at once.

Key rules:

- Each query must have at least one eligible dish at the same restaurant.
- Dietary and allergen filters are applied before group matching.
- Results remain branch-specific.
- If no restaurant satisfies all requests, the closest partial matches are shown.
- Partial results must explicitly label which requests cannot be met.

This feature should not falsely imply that dishes from two branches of the same chain are available together at one restaurant.

## 7.8 Account and preferences

The account surface includes:

- Dietary requirements.
- Blocked ingredients.
- Edit-access status.
- A request-edit-access flow.
- Admin approval controls for pending editor requests.

Saved dietary requirements automatically apply to search.

A user can temporarily adjust their diet for the current session without changing their saved profile.

Blocked ingredients are excluded by default. The interface can provide a “show anyway” option that visibly flags the conflict.

---

## 8. Current frontend architecture

### 8.1 Repository structure

```text
.
├── Plate.jsx
├── main.jsx
├── components/
├── context/
├── lib/
├── pages/
├── supabase/
│   ├── migrations/
│   ├── tests/
│   └── database.types.ts
├── tests/
├── styles.css
├── netlify.toml
├── vercel.json
├── CATALOG_DATA_GUIDE.md
├── DEPLOYMENT.md
└── README.md
```

### 8.2 Important files and responsibilities

#### `main.jsx`

Browser entry point that mounts the React application.

#### `Plate.jsx`

The central application shell.

Its responsibilities include:

- Router setup.
- Provider composition.
- Lazy-loaded routes.
- Application-level navigation and layout.

It should not become the location for hard-coded catalogue data or complex domain logic.

#### `components/`

Shared presentation and interaction components, including:

- Dish cards.
- Dish modal.
- Rating forms.
- Visit forms.
- Meal logging controls.
- Restaurant cards.
- Search and filter controls.
- Map panel.
- Shared tag picker.
- Restaurant edit form.

#### `context/`

Application state and provider logic, including:

- Auth/account context.
- Supabase-backed catalogue context.
- User profile information.
- Derived editor/admin permissions.

#### `lib/api.js`

Supabase data-access layer.

Responsibilities have included:

- Fetching catalogue data.
- Creating and deleting ratings.
- Creating and updating visits.
- Uploading photographs.
- Fetching meal and visit history.
- Updating restaurant information.
- Submitting correction flags.
- Requesting, approving and rejecting edit access.

#### `lib/search.js`

Search and group-ranking logic.

Responsibilities include:

- Query tokenisation.
- Synonym and field matching.
- Structured price, calorie and protein constraints.
- Exclusions.
- Allergen equivalence.
- Group matching.
- Partial-result scoring.
- Result ordering.

#### `lib/supabase.js`

Creates the browser Supabase client from public environment variables.

#### `pages/`

Routed surfaces, including:

- Home.
- Restaurant page.
- Group search.
- My Meals.
- Account.

#### `styles.css`

Shared responsive visual system.

---

## 9. Technology

### 9.1 Current dependencies

- React 18.
- React DOM 18.
- React Router DOM 7.
- Supabase JavaScript client 2.
- Leaflet 1.9.
- Vite 8.

### 9.2 Current runtime requirements

- Node.js `20.19+` on Node 20, or `22.12+`.
- npm 9 or newer.

An LTS Node release should be used. Experimental Node versions are unnecessary and may introduce avoidable incompatibilities.

### 9.3 Environment variables

The frontend requires:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Only public browser configuration may use a `VITE_` prefix.

Never expose:

- A Supabase secret key.
- A service-role key.
- A database password.
- Any privileged credential.

Vite embeds `VITE_` values into browser assets.

---

## 10. Supabase schema

### 10.1 Live public objects

The live public schema currently contains:

#### Base tables

- `brands`
- `canonical_dish_match_suggestions`
- `canonical_dishes`
- `dish_attribute_flags`
- `dish_rating_rollups`
- `dishes`
- `edit_access_requests`
- `profiles`
- `rating_photos`
- `ratings`
- `restaurant_attribute_flags`
- `restaurants`
- `visits`

#### Views

- `dish_attribute_flag_counts`
- `dish_catalog`
- `dish_photos`
- `restaurant_catalog`

### 10.2 Archive schema

Earlier speculative or retired data structures were moved to a restricted `archive` schema rather than being discarded.

Archived material includes:

- Dish embeddings.
- Dish media.
- Dish price history.
- Dish relationships.
- Dish user signals.
- Dropped dish metadata.
- Dropped rating subscores.
- Dropped restaurant metadata.
- Deduplicated rating records.
- Restaurant-merge records.
- Migration-integrity records.

The archive is for recovery and audit, not for normal browser reads.

### 10.3 `dishes` fields

The documented branch-offering fields include:

- `id`
- `restaurant_id`
- `brand_id`
- `canonical_dish_id`
- `variant_key`
- `name`
- `price`
- `description`
- `short_description`
- `course`
- `menu_position`
- `diets`
- `allergens`
- `allergen_details`
- `nutrition`
- `ingredients`
- `meal_occasions`
- `crowd_tags`
- `official_image_url`
- `availability`
- `is_active`
- `available_from`
- `available_until`
- `local_overrides`
- `hidden_search_tokens`
- `data_sources`
- `sponsored`
- `badges`
- `created_at`
- `updated_at`

### 10.4 Course values

Supported course values are:

- `starters`
- `mains`
- `sides`
- `desserts`
- `drinks`

### 10.5 Price rules

`price` is nullable.

Use:

- A verified numeric price when available.
- `NULL` when price is unavailable or unreliable.
- Never `0` as a placeholder.

An unpriced dish should:

- Display “Price unavailable”.
- Be excluded from “under £X” searches.
- Be excluded from price ordering where a numeric value is required.

### 10.6 Array and JSON import rules

A repeated source of import errors was the difference between blank values, PostgreSQL arrays and JSONB.

Use:

- `NULL` for an unknown scalar where the column allows it.
- `{}` for an empty PostgreSQL array.
- `{}` as JSON for unknown structured JSONB metadata.

Common PostgreSQL array fields include:

- `diets`
- `allergens`
- `meal_occasions`
- `ingredients`
- `hidden_search_tokens`
- `badges`

Common JSONB fields include:

- `nutrition`
- `allergen_details`
- `availability`
- `local_overrides`
- `data_sources`

IDs should normally be generated automatically. Blank strings must not be inserted into integer or bigint ID columns.

---

## 11. Database views

### 11.1 `dish_catalog`

`dish_catalog` is the main safe public read boundary for dishes.

It provides one row per branch offering while also exposing grouped canonical context, including:

- Branch dish ID.
- Canonical dish ID.
- Restaurant and brand information.
- Local price.
- Price ranges across locations.
- Branch, city and overall scores.
- Rating counts.
- Searchable metadata.
- Images.
- Availability.
- Dietary and allergen information.
- Tags and badges.
- Branches serving the canonical product.

The frontend should read this view rather than reconstructing sensitive aggregates from raw rating rows.

### 11.2 `restaurant_catalog`

Provides one row per physical branch with aggregate restaurant-level statistics.

Statistics should be weighted appropriately by rating counts rather than averaging already-averaged dish scores without weighting.

### 11.3 `dish_photos`

Provides the safe photo boundary required by the application while keeping private storage rules intact.

---

## 12. Migration history

The live database contained the following migrations on 23 July 2026:

1. `plate_foundation`
2. `comprehensive_dish_metadata`
3. `import_wagamama_june_2026`
4. `update_wagamama_nutrition_allergens`
5. `allow_unpriced_dishes`
6. `create_private_nandos_batch_importer`
7. `fix_nandos_batch_importer_id_type`
8. `fix_nandos_batch_importer_coalesce_syntax`
9. `preserve_source_name_in_nandos_import`
10. `remove_private_nandos_batch_importer`
11. `make_dishes_id_auto_generated`
12. `simplify_plate_schema`
13. `add_allergens_verified_status`
14. `canonical_chain_dishes`
15. `canonical_chain_dishes_hardening`
16. `menu_windows_photo_privacy_one_rating`
17. `feature_roadmap_foundation`
18. `editor_approvals`
19. A follow-up `editor_approvals` migration
20. `ratings_dateless`
21. `restaurant_editing_and_blocked_ingredients`
22. `dish_badges_column`

Earlier there was a mismatch between repository migrations and the live database. That mismatch has since been resolved for the migrations listed above.

### 12.1 Migration rules for future work

- Treat repository migrations as the reproducible schema history.
- Do not make unexplained live-only changes.
- Prefer additive migrations.
- Preserve historical ratings and visits.
- Do not hard-code generated IDs into reusable migrations unless the migration explicitly resolves them safely.
- Run database tests after schema changes.
- Regenerate `database.types.ts`.
- Confirm the live migration history after deployment.
- Do not edit public catalogue views directly as a data-entry method.
- Keep retired data in a restricted archive when reversibility matters.

---

## 13. Authentication and profiles

### 13.1 Current interim model

The app currently uses an anonymous Supabase Auth identity behind an email entered into the interface.

This allows:

- `auth.uid()` ownership checks.
- Private ratings and histories.
- Private photo paths.
- A low-friction interim sign-in experience.

The email is retained locally for the interface.

### 13.2 Limitations

The current model does not provide:

- Email verification.
- Password authentication.
- Magic-link authentication.
- Cross-device recovery.
- Safe account recovery after browser storage is cleared.
- Robust account switching.

Because anonymous Supabase identities cannot be recovered after local storage is lost, this is an interim system only.

### 13.3 Required future authentication work

Before broad public launch:

- Move to verified magic-link or another recoverable authentication flow.
- Add CAPTCHA or Turnstile.
- Add abuse controls.
- Remove any hard-coded administrator identity.
- Store authorisation roles in a proper server-controlled structure.
- Confirm sign-out calls `supabase.auth.signOut()`.
- Test account switching.
- Test session expiry and recovery.
- Audit all RLS policies under the final authentication model.

---

## 14. Privacy and security

### 14.1 Row Level Security

RLS is intended to ensure that users can access only their own:

- Profile.
- Raw ratings.
- Visits and history.
- Rating photographs.
- Private metadata.

Public catalogue information should be read through safe views and aggregates.

### 14.2 Photographs

Meal photographs are stored in a private `meal-photos` bucket under a user-specific path.

Current client rules include:

- JPEG, PNG or WebP only.
- Up to six photographs per meal.
- Maximum 15 MB at selection.
- Browser resizing and compression.
- Maximum 5 MB upload after processing.

Storage ownership and path policies remain an area that should receive deliberate security testing.

### 14.3 Public versus private information

Public:

- Restaurant and dish catalogue facts.
- Aggregate rating scores.
- Aggregate tags.
- Safe image metadata.
- Non-identifying correction provenance counts.

Private:

- Raw personal rating history.
- Personal comments.
- Personal visit notes.
- User identity details.
- Private photographs.
- Editor-request data not intended for public display.

### 14.4 Important security concerns

Known areas requiring continued attention include:

- Anonymous identity abuse.
- Rating spam.
- Manipulation of aggregate scores.
- Custom tag abuse.
- Storage path ownership.
- Security-definer database functions.
- Public views and RLS behaviour.
- Editor and admin authorisation.
- Rate limits on correction submissions.
- Secret leakage in frontend environment variables.

---

## 15. Catalogue data standards

### 15.1 Source of truth

Restaurant and dish catalogue data belong in Supabase.

A data-only change should appear in the app without:

- Rebuilding React.
- Redeploying the frontend.
- Editing hard-coded arrays.

### 15.2 Provenance

`data_sources` should record evidence for:

- Menu item.
- Price.
- Nutrition.
- Allergens.
- Availability.
- Media.

Useful provenance data include:

- Source type.
- Verification date.
- Official identifier.
- Rights confirmation for media.
- Whether a field is not supplied.
- Notes about uncertainty.

### 15.3 Nutrition

Nutrition should be:

- Per serving.
- Numeric where possible.
- Stored using stable keys.

Examples include:

- `calories_kcal`
- `protein_g`
- `carbohydrates_g`
- `sugars_g`
- `fibre_g`
- `total_fat_g`
- `saturated_fat_g`
- `sodium_mg`
- `salt_g`

Do not invent nutrition values merely to fill fields.

### 15.4 Allergens

`allergen_details` may include:

- Official allergens.
- “May contain” allergens.
- Cross-contamination risk.
- Separate-preparation availability.
- Notes.
- Verification status.

Every allergen surface should remind users to confirm current information with restaurant staff.

### 15.5 Availability

`availability` may include:

- Current availability.
- Seasonal status.
- Service windows.
- Date limits.
- Region.
- Branch-specific notes.
- Eat-in, takeaway or delivery status where used.

### 15.6 Hidden search tokens

`hidden_search_tokens` should contain concise, human-reviewed terms that improve search but are not intended as public marketing copy.

Examples of suitable concepts:

- Common synonyms.
- Mood or use-case terms.
- Colloquial names.
- Broad flavour or texture descriptors.
- Search terms not naturally present in the official menu description.

They should not contain unsupported health or safety claims.

### 15.7 Community tags

`crowd_tags` represents catalogue-level tag counts.

User rating tags can be rolled into public tag and search indexes without exposing private comments or histories.

Custom tags are title-cased on save, but moderation remains necessary.

---

## 16. Canonicalisation rules

### 16.1 Evidence required

A canonical merge should be based on reliable evidence, preferably an official menu identifier.

Do not merge dishes merely because they have:

- The same name.
- Similar descriptions.
- The same price.
- Similar ingredients.
- Similar photographs.

### 16.2 Review queue

Uncertain matches should create a `canonical_dish_match_suggestions` record.

The system must not merge records automatically.

A service-side reviewer should examine:

- Official product IDs.
- Recipe and portion.
- Market.
- Nutrition.
- Allergens.
- Variant.
- Source provenance.

### 16.3 Product changes

A material recipe change should:

- Create a new canonical dish.
- Link it with `supersedes_id`.
- Leave old branch dishes and historical ratings intact.

### 16.4 Menu removal

Removing a dish from a menu should set:

- `is_active = false`
- Optionally `available_until`

Do not delete the dish and its history.

---

## 17. Menu import workflow

Recommended sequence:

1. Resolve the brand.
2. Resolve or create the physical restaurant.
3. Find existing canonical and branch records.
4. Start from the complete dish template.
5. Resolve all required and verification markers.
6. Add only sourced facts.
7. Use automatic IDs.
8. Use correct empty-array and JSON syntax.
9. Store provenance in the same reviewed change.
10. Review canonical identity carefully.
11. Test the dish in the Dish Information surface.
12. Test representative text searches.
13. Test price, calorie and protein searches.
14. Independently review allergen and nutrition changes.
15. Run database integrity and RLS tests.
16. Confirm row counts and duplicate constraints.
17. Confirm the frontend retrieves the new data without a redeployment.

### 17.1 Common import failure modes

- Empty string inserted into bigint or integer IDs.
- Array columns supplied as blank strings.
- JSONB fields supplied in invalid syntax.
- Duplicate `(restaurant_id, canonical_dish_id, variant_key)` combinations.
- Accidental duplicate canonical dishes.
- Price stored as zero when unknown.
- Offers imported as duplicate dishes.
- Unsupported dietary or allergen claims.
- Branch-specific facts placed on the canonical record.
- Menu variants merged because names looked similar.
- Public data edited without provenance.
- Images used without verified rights.

---

## 18. Search and dietary safety

### 18.1 Diet preferences

Saved dietary requirements can automatically filter search results.

The user can temporarily override them for a session without changing the stored profile.

### 18.2 Blocked ingredients

Blocked ingredients are excluded by default.

A “show anyway” mode may reveal results while clearly marking the conflict.

### 18.3 Allergen equivalence

Search logic accounts for equivalent allergen terminology where appropriate.

This helps a user searching for one term match the restaurant's different but equivalent wording.

### 18.4 Safety wording

Plate must not imply that its filters guarantee safety.

Appropriate product wording should communicate that:

- Information may change.
- Cross-contamination can occur.
- Restaurant data may contain errors or become outdated.
- Users should confirm severe allergies with staff.

---

## 19. Editing and community corrections

### 19.1 Dish corrections

Users have been able to suggest changes to branch-level dish fields such as:

- Name.
- Price.
- Diet labels.
- Allergens.

The correction system uses an append-only `dish_attribute_flags` history.

A database function can apply the correction and refresh the catalogue.

A field with correction history may display:

- “Edited by the community”
- The number of applied corrections

The database rate limit has been designed around one correction per user, field and 24-hour period.

### 19.2 Restaurant corrections

The current schema also includes `restaurant_attribute_flags` and an approved restaurant-editing flow.

Approved editors can change:

- Restaurant name.
- Cuisine.
- Area.
- Description.

### 19.3 Editor access

Profiles can have edit permission.

Users without permission can request access.

An administrator can:

- Review pending requests.
- Approve requests.
- Reject requests.

### 19.4 Governance concern

The current system should be treated as an early governance model.

Before scaling, define:

- Who may approve editors.
- What evidence an editor must provide.
- Which fields can auto-apply.
- Which fields require moderation.
- Rollback rules.
- Audit-log retention.
- Suspension and abuse processes.
- Conflict handling between official data and community corrections.

High-risk fields such as allergens should not rely on casual unreviewed edits.

---

## 20. Maps and location

The app uses Leaflet with OpenStreetMap tiles.

Current behaviour:

- Restaurant coordinates are stored in the database.
- The app does not geocode at runtime.
- The app does not request the user's live location.
- Restaurant results can be displayed on a map.
- The same map component is reused across relevant surfaces.

Runtime-loaded map tiles and fonts require network access. The app should continue to function with sensible fallbacks where possible.

---

## 21. Deployment and operations

### 21.1 Local development

```bash
npm install
npm run dev
```

The Vite development server normally runs on `http://localhost:5173`.

### 21.2 Production build

```bash
npm run build
npm run preview
```

The deployable static output is created in `dist/`.

Do not deploy the development server.

### 21.3 Supabase deployment

Typical workflow:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Before relying on the app, anonymous sign-ins must be enabled for the current interim auth model.

### 21.4 SPA routing

Both Vercel and Netlify configuration files are present to support:

- Build configuration.
- Single-page route fallback.
- Response headers.

### 21.5 Data-only changes

A menu-data update should not require a frontend rebuild.

Schema or frontend behaviour changes do require the appropriate migration, test and deployment process.

---

## 22. Tests and verification

### 22.1 Current commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create the production build |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run search and group-matching unit tests |
| `npm run test:db` | Run pgTAP database tests |
| `npm run types:generate` | Regenerate Supabase TypeScript types |

### 22.2 Test coverage areas

Repository test structure covers or is intended to cover:

- Search tokenisation.
- Structured constraints.
- Group matching.
- Schema integrity.
- Aggregate correctness.
- RLS.
- Catalogue invariants.

### 22.3 Missing or important future tests

Priority additions include:

- Authentication lifecycle.
- Account recovery.
- Rating deletion and rollup correctness.
- Concurrent rating updates.
- Abuse and rate limits.
- Editor escalation.
- Storage ownership.
- Branch and canonical aggregation.
- Offer display once implemented.
- Null-price search behaviour.
- Diet overrides.
- Blocked ingredient matching.
- Accessibility.
- End-to-end logging of a multi-dish visit.
- Deployment smoke tests.
- Migration replay from an empty database.
- Database-versus-repository migration alignment.

---

## 23. Known technical concerns

### 23.1 Authentication is temporary

The anonymous-email mapping is not a final account system.

### 23.2 Rating integrity

One rating per user and branch dish reduces duplication but does not by itself prevent:

- Multiple anonymous identities.
- Coordinated manipulation.
- Automated spam.
- Low-quality tags.
- Malicious comments.

### 23.3 Public trust

Synthetic seeded ratings, unclear correction provenance or stale menu data can reduce trust.

### 23.4 Large catalogue loading

As the catalogue grows, fetching the entire rich `dish_catalog` for every screen may become inefficient.

A discussed optimisation is to separate:

- `dish_catalog_summary` for cards and search.
- `dish_catalog_detail` for the modal or detail page.

Other likely improvements:

- Pagination or infinite scrolling.
- Precomputed search documents.
- Incremental updates after a rating instead of a full catalogue reload.
- Lazy loading of Leaflet.
- Cache invalidation strategy.

### 23.5 JavaScript and types

The project now has generated Supabase TypeScript types, but parts of the frontend remain JavaScript.

Gradual migration to TypeScript would reduce mismatches between:

- View fields.
- JSON structures.
- API functions.
- UI assumptions.

### 23.6 Error handling and observability

The app needs mature:

- Error boundaries.
- User-facing error states.
- Monitoring.
- Structured logging.
- Deployment health checks.
- Database-advisor review.
- Alerting for failed uploads or migrations.

### 23.7 Date handling

Local-date behaviour was previously identified as a potential bug area. Dates should be treated consistently as local calendar dates rather than accidentally shifted by UTC conversion.

### 23.8 Accessibility

Accessibility needs continued work across:

- Modals.
- Keyboard navigation.
- Tag controls.
- Maps.
- Search suggestions.
- Form errors.
- Colour contrast.
- Screen-reader announcements.

---

## 24. Decisions already made

These should be treated as project constraints unless explicitly reconsidered.

1. Plate is dish-first, not only restaurant-first.
2. Catalogue data lives in Supabase, not hard-coded React data.
3. A physical restaurant branch is a distinct record.
4. A canonical dish groups a verified equivalent product.
5. Every raw rating remains tied to a branch-specific dish.
6. Branch, city and overall aggregates may be displayed.
7. Ratings and visits are separate.
8. Only visits carry the eating date.
9. A visit can contain several dishes.
10. One user should have one current rating per branch-specific dish.
11. Offers and side bundles should not create separate rating targets.
12. Unknown prices are `NULL`, not zero.
13. Canonical dishes are never automatically merged from name or price alone.
14. Removed dishes are deactivated, not deleted.
15. Public reads should use safe catalogue and aggregate views.
16. Personal history, comments and photographs remain private.
17. Dietary and allergen data are not safety guarantees.
18. Group search must match dishes at the same physical restaurant.
19. Partial group results must name the missing requests.
20. Saved diet preferences apply automatically but can be overridden temporarily.
21. Blocked ingredients are hidden by default with an explicit show-anyway option.
22. Changes to the database must remain reproducible through migrations.
23. Data-only catalogue edits should not require frontend redeployment.

---

## 25. Discussed but not confirmed as implemented

The following ideas have been discussed but should not be assumed to exist in the current live system:

### 25.1 `dish_offers`

A separate table for pricing configurations and bundles linked to the base dish.

### 25.2 Vector search

Embeddings and semantic search were considered. Archived embedding structures exist, but the live app currently relies mainly on token and structured matching.

### 25.3 Public API and token sales

The possibility of exposing dish and rating data through an API and charging for access was discussed. No current production API business model should be assumed.

### 25.4 Chain loyalty-app integrations

Integrations with branch or chain apps, such as loyalty platforms, were explored conceptually. No stable public integration should be assumed without current documentation and permission.

### 25.5 External review integration

Google Maps review ownership and external review use were discussed. Plate should not scrape, copy or republish third-party review content without a lawful and contractually permitted basis.

### 25.6 Advanced recommendation system

Personalised recommendations, vector features and richer behavioural signals were considered. Some speculative structures were archived during schema simplification.

---

## 26. Product and data roadmap

### Priority 0 — protect correctness and trust

- Replace interim anonymous email auth with recoverable verified auth.
- Remove hard-coded admin logic.
- Audit RLS, views, storage policies and privileged functions.
- Separate or remove synthetic ratings.
- Establish moderation for custom tags and corrections.
- Require stronger review for allergen changes.
- Confirm every deployed migration is represented in the repository.
- Run security and performance advisors.

### Priority 1 — complete the Oxford catalogue

- Fill restaurants that still have only one or two seed dishes.
- Maintain current prices and availability.
- Improve provenance coverage.
- Add official identifiers where available.
- Review canonical identities.
- Track menu removals and seasonal availability.
- Confirm media rights.

### Priority 2 — improve scalability

- Create smaller catalogue summary and detail boundaries.
- Add pagination or infinite scrolling.
- Precompute search material.
- Avoid full catalogue refetch after small writes.
- Improve caching.
- Add end-to-end and CI testing.
- Increase TypeScript coverage.
- Add monitoring.

### Priority 3 — improve product quality

- Better search explanations.
- Better partial group-match explanations.
- More transparent score confidence and rating counts.
- Refined personal history.
- Improved map accessibility.
- Better correction and editor governance.
- Clearer canonical-versus-branch display.
- Strong empty, loading and error states.

### Priority 4 — extend the commercial or platform layer

Only after trust, safety and data quality are mature:

- Dish offers.
- Official restaurant data partnerships.
- Loyalty integrations.
- A documented API.
- Recommendation features.
- Expansion beyond Oxford.
- Restaurant-owner dashboards.
- Verified official-editor accounts.

---

## 27. Guidance for future AI agents and engineers

### 27.1 Read order

To understand the project efficiently:

1. Read this file.
2. Read `README.md`.
3. Read `CATALOG_DATA_GUIDE.md`.
4. Read `DEPLOYMENT.md`.
5. Inspect `Plate.jsx`.
6. Inspect the relevant page or component only.
7. Inspect `lib/api.js` and `lib/search.js` when the task touches data or search.
8. Read the latest relevant migration files.
9. Check live Supabase only when live state matters.

Do not read the entire repository indiscriminately.

### 27.2 Before changing the database

- Check the existing migration history.
- Inspect the current table or view definition.
- Determine whether the change belongs at canonical, branch, rating or visit level.
- Preserve branch-specific ratings.
- Preserve historical rows.
- Use an additive migration.
- Add or update tests.
- Regenerate types.
- Verify the live database after deployment.

### 27.3 Before importing data

- Confirm the exact branch.
- Confirm whether the product already has a canonical identity.
- Use official IDs where possible.
- Preserve source provenance.
- Never invent allergens, nutrition, price or availability.
- Never use zero for an unknown price.
- Never create a separate dish merely for an offer.
- Review all variants deliberately.

### 27.4 Before changing search

- Preserve structured price, calorie and protein parsing.
- Preserve exclusions.
- Preserve diet, allergen and blocked-ingredient logic.
- Test group matching.
- Avoid using private fields in public search.
- Avoid unsupported health or dietary inferences.
- Explain partial group failures honestly.

### 27.5 Before changing ratings

- Keep the exact branch dish as the rating target.
- Keep dates on visits rather than bare ratings.
- Preserve one-rating-per-user rules.
- Recalculate aggregates safely.
- Test deletion and update behaviour.
- Never expose private comments through public views.

---

## 28. Glossary

| Term | Meaning |
|---|---|
| Plate | Product and repository application name |
| Brand | Shared chain or independent restaurant identity |
| Restaurant | One physical location or branch |
| Canonical dish | Verified shared product identity within a brand and market |
| Branch dish | The product as offered by one physical restaurant |
| Rating | User evaluation of one branch dish |
| Visit | A private dated restaurant event that may include several ratings |
| PlateScore | Public aggregate score shown for a dish or restaurant context |
| Branch score | Score for one exact branch dish |
| City score | Score for a canonical dish across branches in one city |
| Overall score | Score for a canonical dish across all branches |
| Group search | Search for one physical restaurant satisfying several people's dish requests |
| Hidden search token | Human-reviewed searchable term not displayed as public copy |
| Crowd tag | Aggregate catalogue tag derived from user activity |
| Attribute flag | Append-only correction record for a dish or restaurant field |
| Editor | User approved to change selected catalogue information |
| Offer | Price configuration or bundle linked to a base dish, not a new rating target |

---

## 29. Concise current-state handoff

Plate is a React and Supabase Oxford restaurant app built around individual dishes. The live system has 16 brands, 18 restaurant locations, 701 canonical dishes and 971 branch offerings. It supports dish and restaurant search, structured filters, group matching, maps, branch/city/overall ratings, private visits and meal photographs, saved diets, blocked ingredients, correction history and approved editor access.

The most important invariant is that a canonical dish may aggregate equivalent products across a chain, but every rating and visit remains attached to the exact branch-specific dish. Ratings are now independent of dates; visits own dates and can contain several dishes. Catalogue facts live in Supabase and are maintained through migrations and sourced data updates. Unknown prices are null. Allergens and dietary labels are informational and require confirmation with restaurant staff.

The greatest remaining risks are temporary anonymous authentication, rating abuse, moderation, catalogue incompleteness, allergen governance, performance as the catalogue grows and the need for stronger end-to-end testing and operational monitoring.
