begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(48);

select has_table('public', 'brands', 'brands table exists');
select has_table('public', 'canonical_dishes', 'canonical dishes table exists');
select has_table(
  'public',
  'canonical_dish_match_suggestions',
  'manual canonical match review queue exists'
);
select has_table('public', 'dish_rating_rollups', 'safe public rating rollup exists');

select has_column('public', 'restaurants', 'brand_id', 'restaurants belong to brands');
select has_column('public', 'dishes', 'canonical_dish_id', 'branch dishes link to canonical dishes');
select has_column('public', 'dishes', 'variant_key', 'branch dishes retain variant identity');
select has_column('public', 'dishes', 'is_active', 'branch dishes have structured availability');

select ok(
  exists (
    select 1
    from pg_constraint constraint_record
    where constraint_record.conrelid = 'public.ratings'::regclass
      and constraint_record.conname = 'ratings_dish_id_fkey'
      and pg_get_constraintdef(constraint_record.oid) like '%ON DELETE RESTRICT%'
  ),
  'deleting a dish cannot cascade into ratings/meal history'
);
select ok(
  exists (
    select 1
    from pg_constraint constraint_record
    where constraint_record.conrelid = 'public.rating_photos'::regclass
      and constraint_record.conname = 'rating_photos_rating_id_fkey'
      and pg_get_constraintdef(constraint_record.oid) like '%ON DELETE RESTRICT%'
  ),
  'deleting a rating cannot cascade into photo metadata'
);
select ok(
  exists (
    select 1
    from pg_constraint constraint_record
    where constraint_record.conrelid = 'public.dishes'::regclass
      and constraint_record.conname = 'dishes_restaurant_brand_fkey'
      and pg_get_constraintdef(constraint_record.oid) like '%ON DELETE RESTRICT%'
  ),
  'restaurant deletion is restricted by branch offerings'
);
select ok(
  exists (
    select 1
    from pg_constraint constraint_record
    where constraint_record.conrelid = 'public.dishes'::regclass
      and constraint_record.conname = 'dishes_canonical_brand_fkey'
      and pg_get_constraintdef(constraint_record.oid) like '%ON DELETE RESTRICT%'
  ),
  'canonical deletion is restricted by branch offerings'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.brands'::regclass),
  'brands has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.canonical_dishes'::regclass),
  'canonical dishes has RLS enabled'
);
select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.canonical_dish_match_suggestions'::regclass
  ),
  'manual match suggestions has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.dish_rating_rollups'::regclass),
  'rating rollups has RLS enabled'
);
select ok(
  coalesce(
    (select reloptions from pg_class where oid = 'public.dish_catalog'::regclass),
    '{}'::text[]
  ) @> array['security_invoker=true'],
  'dish catalogue is a security-invoker view'
);
select ok(
  coalesce(
    (select reloptions from pg_class where oid = 'public.restaurant_catalog'::regclass),
    '{}'::text[]
  ) @> array['security_invoker=true'],
  'restaurant catalogue is a security-invoker view'
);

select is(
  (select count(*) from public.restaurants where brand_id is null),
  0::bigint,
  'every restaurant was backfilled to a brand'
);
select is(
  (select count(*) from public.dishes where canonical_dish_id is null),
  0::bigint,
  'every branch dish was backfilled to a canonical dish'
);
select is(
  (
    select count(*)
    from public.dishes dish
    join public.restaurants restaurant on restaurant.id = dish.restaurant_id
    join public.canonical_dishes canonical on canonical.id = dish.canonical_dish_id
    where dish.brand_id <> restaurant.brand_id
       or dish.brand_id <> canonical.brand_id
  ),
  0::bigint,
  'all branch offerings have same-brand restaurant and canonical links'
);
select ok(
  (
    select passed
    from archive.migration_integrity_checks
    where migration_name = '20260720170223_canonical_chain_dishes'
  ),
  'migration recorded a successful historical-data integrity check'
);
select ok(
  (
    select count(*) = 5
    from pg_indexes index_record
    where index_record.schemaname = 'public'
      and index_record.indexname in (
        'restaurants_brand_id_idx',
        'restaurants_city_idx',
        'dishes_canonical_dish_id_idx',
        'dishes_restaurant_id_idx',
        'ratings_dish_idx'
      )
  ),
  'all required brand, city, canonical, restaurant and rating indexes exist'
);
select ok(
  pg_get_functiondef('private.refresh_dish_rating_rollup(bigint)'::regprocedure)
    like '%pg_advisory_xact_lock%',
  'rating rollup refreshes serialize concurrent writes per dish'
);
select ok(
  (
    select count(*) <= 1
    from public.restaurants restaurant
    where lower(btrim(coalesce(restaurant.chain_name, restaurant.name))) = 'bella italia'
      and lower(btrim(restaurant.city)) = 'oxford'
      and lower(btrim(restaurant.area)) = 'george street'
      and regexp_replace(
        lower(coalesce(restaurant.branch_name, '')),
        '[^a-z0-9]+', '', 'g'
      ) = 'oxfordgeorgestreet'
  ),
  'Bella Italia George Street has at most one physical branch row'
);

insert into public.brands (id, name, brand_key, is_chain)
values
  (-9100, 'Bella Italia Test', 'test:bella-italia', true),
  (-9200, 'Other Brand Test', 'test:other-brand', true);

insert into public.restaurants (
  id, brand_id, name, area, cuisine, latitude, longitude, description,
  chain_name, branch_name, city, country_code
)
values
  (-9101, -9100, 'Bella Italia Test', 'Oxford One', '["Italian"]'::jsonb,
    51.7501, -1.2501, '', 'Bella Italia Test', 'Oxford One', 'Oxford', 'GB'),
  (-9102, -9100, 'Bella Italia Test', 'Oxford Two', '["Italian"]'::jsonb,
    51.7502, -1.2502, '', 'Bella Italia Test', 'Oxford Two', 'Oxford', 'GB'),
  (-9103, -9100, 'Bella Italia Test', 'London One', '["Italian"]'::jsonb,
    51.5001, -0.1201, '', 'Bella Italia Test', 'London One', 'London', 'GB');

insert into public.canonical_dishes (
  id, brand_id, name, canonical_key, description, course, market_code,
  canonicalisation_method, review_status
)
values
  (-9100, -9100, 'Chicken Alfredo', 'test:chicken-alfredo-v1', '', 'mains', 'GB',
    'manual_review', 'confirmed'),
  (-9200, -9200, 'Other Dish', 'test:other-dish-v1', '', 'mains', 'GB',
    'manual_review', 'confirmed');

select throws_ok(
  $$
    insert into public.canonical_dishes (
      id, brand_id, name, canonical_key, description, course, market_code,
      canonicalisation_method, review_status, version
    ) values (
      -9104, -9100, 'Duplicate Key', 'test:chicken-alfredo-v1', '', 'mains', 'GB',
      'manual_review', 'confirmed', 2
    )
  $$,
  '23505',
  null,
  'a brand and market cannot reuse a canonical key even for another version'
);
select throws_ok(
  $$
    insert into public.canonical_dishes (
      id, brand_id, name, canonical_key, description, course, market_code,
      canonicalisation_method, review_status, version
    ) values (
      -9105, -9100, 'Invalid Version', 'test:invalid-version', '', 'mains', 'GB',
      'manual_review', 'confirmed', 0
    )
  $$,
  '23514',
  null,
  'canonical version numbers must be positive'
);

insert into public.dishes (
  id, restaurant_id, brand_id, canonical_dish_id, name, price, description,
  course, menu_position, variant_key
)
values
  (-9101, -9101, -9100, -9100, 'Chicken Alfredo', 10.00, '', 'mains', 1, 'default'),
  (-9102, -9102, -9100, -9100, 'Chicken Alfredo', 12.50, '', 'mains', 1, 'default'),
  (-9103, -9103, -9100, -9100, 'Chicken Alfredo', 14.00, '', 'mains', 1, 'default');

insert into public.ratings (id, user_id, dish_id, score)
values
  ('00000000-0000-4000-8000-000000009101', '00000000-0000-4000-8000-000000009901', -9101, 8),
  ('00000000-0000-4000-8000-000000009102', '00000000-0000-4000-8000-000000009902', -9102, 10),
  ('00000000-0000-4000-8000-000000009103', '00000000-0000-4000-8000-000000009903', -9103, 4);

insert into public.rating_photos (
  id, rating_id, user_id, storage_path, mime_type, size_bytes
)
values (
  '00000000-0000-4000-8000-000000008101',
  '00000000-0000-4000-8000-000000009101',
  '00000000-0000-4000-8000-000000009901',
  'test/canonical-chain-dishes/photo.jpg',
  'image/jpeg',
  1
);

select throws_ok(
  $$
    delete from public.ratings
    where id = '00000000-0000-4000-8000-000000009101'
  $$,
  '23503',
  null,
  'a rating with photo metadata cannot be deleted before its photos'
);

select is(
  (select branch_score from public.dish_catalog where id = -9101),
  8::double precision,
  'branch score uses only the exact branch dish ratings'
);
select is(
  (select city_score from public.dish_catalog where id = -9101),
  9::double precision,
  'city score combines same-canonical ratings across Oxford branches'
);
select is(
  (select city_rating_count from public.dish_catalog where id = -9101),
  2::bigint,
  'city rating count includes both Oxford branch offerings'
);
select is(
  (select overall_score from public.dish_catalog where id = -9101),
  7.3::double precision,
  'overall score combines all cities using individual rating weights'
);
select is(
  (select overall_rating_count from public.dish_catalog where id = -9101),
  3::bigint,
  'overall rating count includes every branch offering'
);
select is(
  (select jsonb_array_length(branches) from public.dish_catalog where id = -9101),
  2,
  'Oxford grouped branch list contains both physical locations'
);
select results_eq(
  $$
    select array_agg((branch ->> 'dish_id')::bigint order by (branch ->> 'dish_id')::bigint)
    from public.dish_catalog catalog
    cross join lateral jsonb_array_elements(catalog.branches) branch
    where catalog.id = -9101
  $$,
  $$ values (array[-9102, -9101]::bigint[]) $$,
  'grouped branches preserve exact branch-specific dish IDs'
);
select is(
  (select min_price from public.dish_catalog where id = -9101),
  10.00::numeric,
  'grouped current minimum price is correct'
);
select is(
  (select max_price from public.dish_catalog where id = -9101),
  12.50::numeric,
  'grouped current maximum price is correct'
);

select throws_ok(
  $$
    insert into public.dishes (
      id, restaurant_id, brand_id, canonical_dish_id, name, price,
      description, course, menu_position, variant_key
    ) values (
      -9198, -9101, -9100, -9100, 'Duplicate Offering', 11,
      '', 'mains', 2, 'default'
    )
  $$,
  '23505',
  null,
  'one restaurant cannot duplicate a canonical dish and variant key'
);
select throws_ok(
  $$
    insert into public.dishes (
      id, restaurant_id, brand_id, canonical_dish_id, name, price,
      description, course, menu_position, variant_key
    ) values (
      -9199, -9101, -9100, -9200, 'Cross-brand Offering', 11,
      '', 'mains', 2, 'default'
    )
  $$,
  '23503',
  null,
  'a restaurant cannot serve a canonical dish from another brand'
);

update public.dishes set is_active = false where id = -9102;

select results_eq(
  $$ select min_price, max_price, branch_count from public.dish_catalog where id = -9101 $$,
  $$ values (10.00::numeric, 10.00::numeric, 1::bigint) $$,
  'inactive branches leave historical rows but not current price/location aggregates'
);
select results_eq(
  $$ select city_score, city_rating_count from public.dish_catalog where id = -9101 $$,
  $$ values (9::double precision, 2::bigint) $$,
  'inactive branches remain in historical city rating aggregates'
);
select is(
  (select jsonb_array_length(branches) from public.dish_catalog where id = -9101),
  1,
  'inactive branches are excluded from the current grouped branches list'
);

select throws_ok(
  $$ delete from public.dishes where id = -9101 $$,
  '23503',
  null,
  'a rated historical dish cannot be deleted'
);
select throws_ok(
  $$ delete from public.restaurants where id = -9101 $$,
  '23503',
  null,
  'a physical branch with offerings cannot be deleted'
);
select throws_ok(
  $$ delete from public.canonical_dishes where id = -9100 $$,
  '23503',
  null,
  'a canonical dish with branch offerings cannot be deleted'
);

set local role anon;

select results_eq(
  $$ select city_rating_count from public.dish_catalog where id = -9101 $$,
  $$ values (2::bigint) $$,
  'anonymous catalogue users can read global aggregate counts'
);
select throws_ok(
  $$ select comment from public.ratings where dish_id = -9101 $$,
  '42501',
  null,
  'anonymous users cannot read raw meal history or comments'
);
select throws_ok(
  $$ select * from public.canonical_dish_match_suggestions $$,
  '42501',
  null,
  'anonymous users cannot access the internal canonical review queue'
);

reset role;

select * from finish();
rollback;
