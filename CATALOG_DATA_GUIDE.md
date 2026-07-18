# Updating Plate's restaurant and dish data

Plate treats a **dish** as the public menu item and a **meal** as one user's private visit/rating of that dish. Restaurant and dish catalogue data belongs in Supabase; it should not be hard-coded into the React components.

Start each new record by copying [`templates/plate-dish-data-template.yaml`](templates/plate-dish-data-template.yaml). It contains every editor-supplied, confirmed, derived, system-managed and future field in one checklist. Values marked `REQUIRED` must be populated before publication; values marked `CONFIRM` must be deliberately verified even when the answer is false, none, or not supplied.

Use the Supabase Dashboard **Table Editor** for small edits or **SQL Editor** for repeatable/bulk updates. Catalogue tables intentionally have no public browser write policy, so a visitor cannot change restaurant-supplied information.

## Where each kind of data lives

| Table | Use it for |
| --- | --- |
| `restaurants` | Restaurant, chain/branch, cuisine, address area, coordinates, city/country and delivery radius |
| `dishes` | Identity, descriptions, preparation, portion, nutrition, dietary/allergen, sensory, availability, visual, derived and search metadata |
| `dish_price_history` | Current and historic eat-in, takeaway and delivery prices, including region and validity dates |
| `dish_media` | Official/restaurant/press dish images and visual descriptors |
| `dish_relationships` | Similar dishes, common combinations, sides, drinks and seasonal recommendations |
| `ratings` | A user's overall score, optional taste/value/presentation/portion scores, comment and repeat-order answer |
| `rating_photos` | Private photos attached to a user's meal log |
| `dish_user_signals` | Per-user saved/favourite state and the aggregate public counts derived from it |
| `dish_embeddings` | Private, model-labelled future embedding storage; it is not exposed to the browser |

The app reads `dish_catalog` and `restaurant_catalog`, which assemble these tables into safe public records. You should update the source tables, not the views.

## Recommended update workflow

1. Confirm the restaurant and dish IDs before writing anything.
2. Copy the dish template, fill its quality-control and source sections, and resolve every `REQUIRED` or `CONFIRM` marker.
3. Enter only sourced facts. Leave an unknown scalar as `NULL`, an unknown list as `{}`, and unknown structured metadata as `{}`.
4. Update the restaurant/dish and its `data_sources` together.
5. Add a new price-history row instead of overwriting history.
6. Check the dish in Plate's **Dish information** tab and try a few search phrases.
7. For allergen or nutrition changes, have the source rechecked before publishing.

Find the record first:

```sql
select
  dish.id as dish_id,
  dish.name as dish_name,
  restaurant.id as restaurant_id,
  restaurant.name as restaurant_name
from public.dishes dish
join public.restaurants restaurant on restaurant.id = dish.restaurant_id
order by restaurant.name, dish.menu_position;
```

## Update an existing restaurant

```sql
update public.restaurants
set
  chain_name = 'Example Group',
  branch_name = 'Oxford City Centre',
  city = 'Oxford',
  country_code = 'GB',
  delivery_radius_km = 5.5,
  latitude = 51.7520,
  longitude = -1.2577,
  description = 'Restaurant-supplied description.'
where id = 42;
```

Replace `42` with the verified ID. `updated_at` is maintained automatically.

## Update an existing dish

The JSON objects are flexible so new attributes can be added without another schema redesign. Keep the documented key names stable so the app can label and search them consistently.

```sql
update public.dishes
set
  official_description = 'Slow-braised chicken in a rich aromatic broth.',
  short_description = 'Tender chicken with a rich, warming broth.',
  course = 'mains',
  meal_occasions = array['lunch', 'dinner'],
  ingredients = array['chicken', 'stock', 'ginger', 'spring onion'],
  cooking_methods = array['braised'],
  serving_style = 'individual',
  cultural_origin = 'Restaurant-supplied origin',
  portion_category = 'large',
  weight_g = 520,
  estimated_satiety_score = 8.2,
  suitable_for_sharing = false,
  people_served = 1,
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
  dietary_flags = array['High-protein'],
  allergens = array['Soybeans'],
  allergen_details = '{
    "official_allergens": ["Soybeans"],
    "may_contain": ["Sesame"],
    "cross_contamination_risk": true,
    "separate_preparation_available": false,
    "notes": "Confirm the latest matrix with staff."
  }'::jsonb,
  sensory_profile = '{
    "textures": ["tender"],
    "flavours": ["rich", "umami"],
    "spice": ["mild"],
    "temperatures": ["hot"],
    "mouthfeel": ["comforting", "brothy"]
  }'::jsonb,
  ingredient_profile = '{
    "primary_protein": "chicken",
    "main_carbohydrate": "rice",
    "vegetables": ["spring onion"],
    "sauces": ["aromatic broth"],
    "contains_alcohol": false
  }'::jsonb,
  availability = '{
    "currently_available": true,
    "seasonal": false,
    "service_windows": ["lunch", "dinner"]
  }'::jsonb,
  hidden_search_tokens = array['warm', 'comfort food', 'winter', 'rich broth', 'high protein'],
  derived_features = '{
    "comfort_score": 9,
    "satiety_score": 8,
    "sick_day_suitability_score": 8
  }'::jsonb,
  data_sources = '{
    "menu": {"source": "restaurant menu", "verified_on": "2026-07-18"},
    "nutrition": {"source": "restaurant nutrition sheet", "verified_on": "2026-07-18"},
    "allergens": {"source": "restaurant allergen matrix", "verified_on": "2026-07-18"},
    "derived_features": {"method": "editorial", "verified_on": "2026-07-18"}
  }'::jsonb
where id = 101;
```

Replace `101` with the verified dish ID and the example values with sourced facts. Do not reuse the sample nutrition or allergen values for a real dish.

Supported `course` values are `starters`, `mains`, `sides`, `desserts`, and `drinks`. Supported portion categories are `small`, `medium`, and `large`.

## Record a new price

Keep the legacy `dishes.price` value aligned with the current eat-in price because compact cards still use it. Close the previous history row and add the new one in a transaction:

```sql
begin;

update public.dish_price_history
set valid_to = date '2026-07-17'
where dish_id = 101
  and service_type = 'eat_in'
  and valid_to is null;

insert into public.dish_price_history
  (dish_id, service_type, price, currency, region, valid_from)
values
  (101, 'eat_in', 16.50, 'GBP', 'Oxford', date '2026-07-18'),
  (101, 'takeaway', 15.50, 'GBP', 'Oxford', date '2026-07-18'),
  (101, 'delivery', 17.50, 'GBP', 'Oxford', date '2026-07-18');

update public.dishes set price = 16.50 where id = 101;

commit;
```

Use `eat_in`, `takeaway`, or `delivery` for `service_type`. If a price is branch-specific, link the dish to that branch's restaurant record and use `region` as supporting context—not as a substitute for the branch relationship.

## Add official media and recommendations

```sql
insert into public.dish_media
  (dish_id, source_type, url, alt_text, colour_profile, plating_style, sort_order)
values
  (101, 'official', 'https://example.com/dish.jpg', 'The dish as served', array['gold', 'green'], 'deep bowl', 0);

insert into public.dish_relationships
  (dish_id, related_dish_id, relationship_type, relevance, note)
values
  (101, 102, 'side_pairing', 0.90, 'Restaurant recommendation')
on conflict (dish_id, related_dish_id, relationship_type)
do update set relevance = excluded.relevance, note = excluded.note;
```

Relationship types are `similar`, `often_ordered_together`, `side_pairing`, `drink_pairing`, and `seasonal_recommendation`.

## Add a new restaurant and dish

Create the restaurant first, capture its returned ID, then create its dishes. Avoid assigning IDs manually; Supabase generates them.

```sql
insert into public.restaurants
  (name, chain_name, branch_name, area, cuisine, latitude, longitude, city, country_code, description)
values
  ('Example Restaurant', 'Example Group', 'Oxford', 'City Centre', 'Example cuisine', 51.7520, -1.2577, 'Oxford', 'GB', 'Restaurant-supplied description')
returning id;

insert into public.dishes
  (restaurant_id, name, price, description, official_description, short_description, course, menu_position)
values
  (42, 'Example Dish', 12.50, 'Short description.', 'Official menu description.', 'User-friendly description.', 'mains', 1)
returning id;
```

After a new dish is created, add its structured metadata and its initial `dish_price_history` row. The catalogue views update immediately; redeploying the React site is not required for data-only changes.

## Data quality rules

- Store nutrition **per serving** and state the source in `data_sources`.
- Treat dietary, pregnancy, diabetic, allergen and cross-contamination claims as sourced labels, not Plate guarantees.
- Keep official media rights and source information outside Plate or add it under `data_sources.media`.
- Use `hidden_search_tokens` for concise human-reviewed synonyms and moods. Put scored/generated concepts in `derived_features` with their method and verification date.
- Never place private review text, personal data, secrets or service-role credentials in a public catalogue field.
- Leave `dish_embeddings` private. A future pgvector migration can add indexed semantic search without changing the public dish contract.
