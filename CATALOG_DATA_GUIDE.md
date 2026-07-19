# Updating Plate's restaurant and dish data

Plate treats a **dish** as a public menu item and a **meal** as one user's private visit and rating. Catalogue data belongs in Supabase and must not be hard-coded into React components.

Start a new record from [`templates/plate-dish-data-template.yaml`](templates/plate-dish-data-template.yaml). Use the Supabase Dashboard **Table Editor** for small edits or **SQL Editor** for reviewed bulk updates. Public browser roles can read the catalogue views but cannot write restaurant or dish data.

## Simplified data model

| Table or view | Purpose |
| --- | --- |
| `restaurants` | Restaurant identity, optional chain/branch, area, cuisine, coordinates, city/country, description, and timestamps |
| `dishes` | Dish identity, nullable price, descriptions, menu placement, diets, allergens, nutrition, ingredients, occasions, availability, image, provenance, and search tokens |
| `ratings` | A user's overall score, tags, comment, visit date, and optional repeat-order answer |
| `rating_photos` | Private photos attached to a user's meal log |
| `dish_catalog` | Safe public dish records plus restaurant context and aggregate rating, repeat-order, photo, and tag statistics |
| `restaurant_catalog` | Safe public restaurant records plus aggregate dish-rating statistics |

The retired speculative metadata and retired whole tables were copied to the restricted `archive` schema by `20260718220000_simplify_plate_schema`. Archive tables are recovery records, not live catalogue sources.

## Fields kept on `dishes`

`id`, `restaurant_id`, `name`, `price`, `description`, `short_description`, `course`, `menu_position`, `diets`, `allergens`, `allergen_details`, `nutrition`, `ingredients`, `meal_occasions`, `crowd_tags`, `official_image_url`, `availability`, `hidden_search_tokens`, `data_sources`, `sponsored`, `created_at`, and `updated_at`.

Supported `course` values are `starters`, `mains`, `sides`, `desserts`, and `drinks`.

`price` is nullable. Store `NULL` when a reliable price is not supplied—never use zero as a placeholder. Plate displays “Price unavailable” and excludes null prices from “under £X” queries and price sorting.

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
  dish.name as dish_name,
  restaurant.id as restaurant_id,
  restaurant.name as restaurant_name,
  restaurant.branch_name
from public.dishes dish
join public.restaurants restaurant on restaurant.id = dish.restaurant_id
order by restaurant.name, dish.menu_position;
```

## Update a restaurant

```sql
update public.restaurants
set
  chain_name = 'Example Group',
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

Create the restaurant first and use its returned ID. Supabase generates IDs automatically.

```sql
insert into public.restaurants
  (name, chain_name, branch_name, area, cuisine, latitude, longitude, city, country_code, description)
values
  ('Example Restaurant', 'Example Group', 'Oxford', 'City Centre', '["Example cuisine"]'::jsonb, 51.7520, -1.2577, 'Oxford', 'GB', 'Restaurant-supplied description.')
returning id;

insert into public.dishes
  (restaurant_id, name, price, description, short_description, course, menu_position)
values
  (42, 'Example Dish', null, 'Full menu description.', 'Concise card description.', 'mains', 1)
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
