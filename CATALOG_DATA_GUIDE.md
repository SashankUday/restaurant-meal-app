# Updating Plate's restaurant and dish data

Plate treats a **dish** as a public menu item and a **meal** as one user's private visit and rating. Catalogue data belongs in Supabase and must not be hard-coded into React components.

Start a new record from [`templates/plate-dish-data-template.yaml`](templates/plate-dish-data-template.yaml). Use the Supabase Dashboard **Table Editor** for small edits or **SQL Editor** for reviewed bulk updates. Public browser roles can read the catalogue views but cannot write restaurant or dish data.

## Brand, branch and canonical dish model

| Table or view | Purpose |
| --- | --- |
| `brands` | Shared identity for a chain or independent restaurant |
| `restaurants` | One physical branch, linked to a brand, with branch name, area, coordinates, city/country and local description |
| `canonical_dishes` | A reviewed brand product and recipe/portion/variant identity within one market |
| `dishes` | One branch-specific menu offering linked to a canonical dish; owns local price, menu position, overrides and availability |
| `ratings` | A user's overall score, tags, comment, visit date, and optional repeat-order answer |
| `rating_photos` | Private photos attached to a user's meal log |
| `dish_rating_rollups` | Read-only, non-sensitive aggregate boundary maintained from private rating rows |
| `canonical_dish_match_suggestions` | Service-only manual review queue; suggestions never merge records automatically |
| `dish_catalog` | One row per branch dish, with branch/city/overall scores, grouped prices and branch-specific dish IDs |
| `restaurant_catalog` | One row per physical branch with rating-count-weighted statistics |

The retired speculative metadata and retired whole tables were copied to the restricted `archive` schema by `20260718220000_simplify_plate_schema`. Archive tables are recovery records, not live catalogue sources.

## Branch-offering fields on `dishes`

`id`, `restaurant_id`, `brand_id`, `canonical_dish_id`, `variant_key`, `name`, `price`, `description`, `short_description`, `course`, `menu_position`, `diets`, `allergens`, `allergen_details`, `nutrition`, `ingredients`, `meal_occasions`, `crowd_tags`, `official_image_url`, `availability`, `is_active`, `available_from`, `available_until`, `local_overrides`, `hidden_search_tokens`, `data_sources`, `sponsored`, `created_at`, and `updated_at`.

Supported `course` values are `starters`, `mains`, `sides`, `desserts`, and `drinks`.

`price` is nullable. Store `NULL` when a reliable price is not supplied—never use zero as a placeholder. Plate displays “Price unavailable” and excludes null prices from “under £X” queries and price sorting.

## Canonicalisation rules

A canonical dish means the same brand product, recipe, portion and variant. It does not merely mean a similar name.

- Keep kids' dishes, different sizes, different proteins, naked versions, gluten-free versions, meal deals and materially different recipes separate.
- Separate markets when recipes, allergens, nutrition or portions differ. `canonical_dishes` enforces a brand-and-market key.
- Prefer an official menu item ID. Store it in `official_menu_item_id` and `source_identifiers` with its provenance.
- Never merge from name, description or price alone. Price always remains branch-specific.
- An import without a reliable identifier starts with its own canonical row. It may create a `canonical_dish_match_suggestions` record, but a service-side reviewer must approve the evidence before `dishes.canonical_dish_id` is changed.
- A material recipe change creates a new canonical row and links it with `supersedes_id`; old branch dishes and their ratings remain intact.
- Removing an item from a menu means setting `dishes.is_active = false` (and optionally `available_until`). Never delete the dish.

The initial migration deliberately used `legacy:<dish_id>` canonical keys, producing one canonical row per existing branch dish. Consolidation happens only after product equivalence is confirmed.

Three score scopes are available in `dish_catalog`: `branch_score` for the exact `dishes.id`, `city_score` across the canonical dish's branches in that city, and `overall_score` across every branch. Ratings themselves continue to reference the exact branch-specific `dishes.id`.

## Recommended update workflow

1. Confirm the restaurant and dish IDs before writing anything.
2. Copy the dish template and resolve every required or verification marker.
3. Enter only sourced facts. Use `NULL` for an unknown scalar, `{}` for an unknown PostgreSQL array, and `{}` as JSON for unknown structured metadata.
4. Update `data_sources` in the same reviewed change as the facts it supports.
5. Check the dish in Plate's **Dish information** tab and test representative text, calorie, protein, and price searches.
6. Have allergen and nutrition changes independently rechecked before publishing.

Find existing records first:

```sql
select
  dish.id as dish_id,
  dish.canonical_dish_id,
  dish.name as dish_name,
  restaurant.id as restaurant_id,
  restaurant.name as restaurant_name,
  restaurant.branch_name,
  brand.id as brand_id,
  brand.name as brand_name
from public.dishes dish
join public.restaurants restaurant on restaurant.id = dish.restaurant_id
join public.brands brand on brand.id = restaurant.brand_id
order by restaurant.name, dish.menu_position;
```

## Update a restaurant

Resolve or create the brand first. Both chains and independent restaurants have a brand row; `chain_name` remains only as a temporary compatibility field.

```sql
update public.restaurants
set
  brand_id = (select id from public.brands where brand_key = 'example group'),
  branch_name = 'Oxford City Centre',
  area = 'City Centre',
  cuisine = '["Example cuisine"]'::jsonb,
  latitude = 51.7520,
  longitude = -1.2577,
  city = 'Oxford',
  country_code = 'GB',
  description = 'Restaurant-supplied description.'
where id = 42;
```

Replace the example ID and values with verified data. `updated_at` is maintained automatically.

## Update a dish

```sql
update public.dishes
set
  canonical_dish_id = 501,
  variant_key = 'default',
  price = 16.50,
  description = 'Slow-braised chicken in a rich aromatic broth.',
  short_description = 'Tender chicken with a rich, warming broth.',
  course = 'mains',
  menu_position = 4,
  meal_occasions = array['lunch', 'dinner'],
  ingredients = array['chicken', 'stock', 'ginger', 'spring onion'],
  diets = array['High-protein'],
  allergens = array['Soybeans'],
  allergen_details = '{
    "official_allergens": ["Soybeans"],
    "may_contain": ["Sesame"],
    "cross_contamination_risk": true,
    "separate_preparation_available": false,
    "notes": "Confirm the latest matrix with staff."
  }'::jsonb,
  nutrition = '{
    "calories_kcal": 640,
    "protein_g": 42,
    "carbohydrates_g": 58,
    "sugars_g": 8,
    "fibre_g": 6,
    "total_fat_g": 24,
    "saturated_fat_g": 7,
    "sodium_mg": 920,
    "salt_g": 2.3,
    "micronutrients": {"iron_mg": 4.1, "vitamin_c_mg": 18}
  }'::jsonb,
  availability = '{
    "currently_available": true,
    "seasonal": false,
    "service_windows": ["lunch", "dinner"]
  }'::jsonb,
  is_active = true,
  available_from = null,
  available_until = null,
  hidden_search_tokens = array['warm', 'comfort food', 'winter', 'rich broth'],
  official_image_url = 'https://example.com/dish.jpg',
  data_sources = '{
    "menu": {"source": "restaurant menu", "verified_on": "2026-07-19"},
    "nutrition": {"source": "restaurant nutrition sheet", "verified_on": "2026-07-19"},
    "allergens": {"source": "restaurant allergen matrix", "verified_on": "2026-07-19"},
    "availability": {"source": "restaurant menu", "verified_on": "2026-07-19"},
    "media": {"source": "restaurant media library", "rights_confirmed": true, "verified_on": "2026-07-19"}
  }'::jsonb
where id = 101;
```

The example nutrition and allergen values are illustrative only. Never reuse them for a real dish.

To mark a dish as unpriced without discarding the rest of its catalogue record:

```sql
update public.dishes
set
  price = null,
  data_sources = jsonb_set(
    data_sources,
    '{pricing}',
    '{"status":"not_supplied","verified_on":"2026-07-19"}'::jsonb,
    true
  )
where id = 101;
```

## Add a restaurant and dish

Create or resolve the brand and canonical product first, then create the physical branch and its branch-specific offering. Supabase generates IDs automatically.

```sql
insert into public.brands (name, brand_key, is_chain)
values ('Example Group', 'example group', true)
on conflict (brand_key) do update set name = excluded.name
returning id;

insert into public.canonical_dishes (
  brand_id, name, canonical_key, official_menu_item_id, description,
  course, market_code, canonicalisation_method, review_status
)
values (
  50, 'Example Dish', 'official:example-dish-123', 'example-dish-123',
  'Restaurant-supplied product description.', 'mains', 'GB',
  'official_id', 'confirmed'
)
returning id;

insert into public.restaurants
  (brand_id, name, branch_name, area, cuisine, latitude, longitude, city, country_code, description)
values
  (50, 'Example Restaurant', 'Oxford', 'City Centre', '["Example cuisine"]'::jsonb, 51.7520, -1.2577, 'Oxford', 'GB', 'Restaurant-supplied description.')
returning id;

insert into public.dishes
  (restaurant_id, brand_id, canonical_dish_id, variant_key, name, price,
   description, short_description, course, menu_position, is_active)
values
  (42, 50, 501, 'default', 'Example Dish', null,
   'Full local menu description.', 'Concise card description.', 'mains', 1, true)
returning id;
```

Add nutrition, allergens, availability, image rights, and provenance only after verifying their sources. Catalogue views update immediately; no React redeployment is required for data-only changes.

## Search and data-quality rules

- Nutrition is per serving and uses stable numeric keys such as `calories_kcal` and `protein_g`.
- `hidden_search_tokens` contains concise human-reviewed synonyms or moods. It is searchable but intentionally not displayed as public copy.
- `crowd_tags` contains catalogue-level tag counts; current user rating tags are rolled into `tag_counts` and `search_tags` by `dish_catalog`.
- `allergen_details` can contain `official_allergens`, `may_contain`, cross-contamination information, preparation availability, and notes.
- `availability` can contain current availability, stock, seasonality, service windows, dates, regions, and branch-specific notes.
- `data_sources` records provenance and verification status for menu, price, nutrition, allergen, availability, and media facts.
- Never place private review text, personal data, secrets, or service-role credentials in public catalogue fields.
- Treat dietary, allergen, pregnancy, diabetic, and cross-contamination claims as sourced labels, not Plate guarantees.
