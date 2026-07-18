create schema if not exists private;

create or replace function private.import_nandos_batch(payload jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  inserted_count integer := 0;
begin
  lock table public.dishes in share row exclusive mode;

  with payload_rows as (
    select j, j->>'k' as source_record_key
    from pg_catalog.jsonb_array_elements(payload) as t(j)
  ),
  new_rows as (
    select p.*,
           pg_catalog.row_number() over (order by (p.j->>'mp')::integer) as rn
    from payload_rows p
    where not exists (
      select 1
      from public.dishes d
      where d.restaurant_id = 15
        and d.data_sources #>> '{import_record,source_record_key}' = p.source_record_key
    )
  ),
  base as (
    select pg_catalog.coalesce(pg_catalog.max(id), 0)::bigint as max_id
    from public.dishes
  )
  insert into public.dishes (
    id, name, restaurant, area, cuisine, price, description, diets, allergens,
    sponsored, score, rating_count, tag_counts, restaurant_id, course,
    menu_position, crowd_tags, official_description, short_description,
    meal_occasions, ingredients, cooking_methods, serving_style, cultural_origin,
    historical_notes, portion_category, weight_g, volume_ml, piece_count,
    estimated_satiety_score, suitable_for_sharing, people_served, nutrition,
    dietary_flags, allergen_details, sensory_profile, ingredient_profile,
    recommendation_metadata, availability, hidden_search_tokens,
    official_image_url, visual_metadata, derived_features, data_sources,
    created_at, updated_at
  )
  select
    b.max_id + n.rn,
    n.j->>'n',
    'Nando''s Oxford - George Street',
    'George Street',
    '["Portuguese","South African"]'::jsonb,
    null,
    n.j->>'d',
    array(select pg_catalog.jsonb_array_elements_text(pg_catalog.coalesce(n.j->'di','[]'::jsonb))),
    '{}'::text[],
    false,
    0,
    0,
    '{}'::jsonb,
    15,
    n.j->>'c',
    (n.j->>'mp')::integer,
    '{}'::jsonb,
    n.j->>'od',
    null,
    array(select pg_catalog.jsonb_array_elements_text(pg_catalog.coalesce(n.j->'mo','[]'::jsonb))),
    '{}'::text[],
    '{}'::text[],
    null,
    null,
    null,
    null,
    null,
    (n.j->>'vg')::numeric,
    (n.j->>'pc')::integer,
    null,
    (n.j->>'sh')::boolean,
    (n.j->>'ps')::numeric,
    pg_catalog.coalesce(n.j->'nu','{}'::jsonb),
    array(select pg_catalog.jsonb_array_elements_text(pg_catalog.coalesce(n.j->'df','[]'::jsonb))),
    pg_catalog.jsonb_build_object(
      'official_allergens', null,
      'may_contain', null,
      'cross_contamination_risk', null,
      'separate_preparation_available', null,
      'notes', 'Allergen information was not displayed in the supplied source. Empty allergen arrays must not be interpreted as allergen-free.'
    ),
    '{}'::jsonb,
    '{}'::jsonb,
    pg_catalog.jsonb_build_object(
      'official_tags', pg_catalog.coalesce(n.j->'tags','[]'::jsonb),
      'menu_section', n.j->>'sec',
      'menu_subsection', n.j->>'sub',
      'source_course_type', n.j->>'ct'
    ),
    pg_catalog.coalesce(n.j->'av','{"currently_available":true}'::jsonb),
    array(select pg_catalog.jsonb_array_elements_text(pg_catalog.coalesce(n.j->'ht','[]'::jsonb))),
    n.j->>'iu',
    case when n.j->>'alt' is null then '{}'::jsonb
         else pg_catalog.jsonb_build_object('alt_text', n.j->>'alt') end,
    '{}'::jsonb,
    pg_catalog.jsonb_build_object(
      'menu', pg_catalog.jsonb_build_object('status','verified','source_url','https://www.nandos.co.uk/food/menu/','source_name','Nando''s UK online menu','verified_by','JSONL import','verified_on','2026-07-18'),
      'pricing', pg_catalog.jsonb_build_object('status','not_supplied','source_url','https://www.nandos.co.uk/food/menu/','source_name','Nando''s UK online menu','verified_by','JSONL import','verified_on','2026-07-18'),
      'nutrition', pg_catalog.jsonb_build_object('status',case when n.j->>'nd' is null then 'not_supplied' else 'verified' end,'source_url','https://www.nandos.co.uk/food/menu/','source_name','Nando''s UK online menu','verified_by','JSONL import','verified_on','2026-07-18'),
      'allergens', pg_catalog.jsonb_build_object('status','not_supplied','source_url','https://www.nandos.co.uk/food/menu/','source_name','Nando''s UK online menu','verified_by','JSONL import','verified_on','2026-07-18'),
      'dietary', pg_catalog.jsonb_build_object('status',case when n.j->>'sdl' is null then 'not_supplied' else 'verified' end,'source_url','https://www.nandos.co.uk/food/menu/','source_name','Nando''s UK online menu','verified_by','JSONL import','verified_on','2026-07-18'),
      'ingredients', pg_catalog.jsonb_build_object('status','not_supplied','source_url','https://www.nandos.co.uk/food/menu/','source_name','Nando''s UK online menu','verified_by','JSONL import','verified_on','2026-07-18'),
      'availability', pg_catalog.jsonb_build_object('status',case when n.j->'av' ? 'notes' or n.j->>'sec' = 'The Lunch Fix' then 'verified' else 'menu_listed_only' end,'source_url','https://www.nandos.co.uk/food/menu/','source_name','Nando''s UK online menu; local branch availability not individually confirmed','verified_by','JSONL import','verified_on','2026-07-18'),
      'media', pg_catalog.jsonb_build_object('status',case when n.j->>'iu' is null then 'not_supplied' else 'verified' end,'source_url','https://www.nandos.co.uk/food/menu/','source_name','Nando''s UK online menu','rights_confirmed',false,'verified_by','JSONL import','verified_on','2026-07-18'),
      'import_record', pg_catalog.jsonb_build_object(
        'source_file','nandos_menu_2026-07-18(1).jsonl',
        'source_record_key', n.source_record_key,
        'source_index', (n.j->>'mp')::integer,
        'menu_section', n.j->>'sec',
        'menu_subsection', n.j->>'sub',
        'course_type', n.j->>'ct',
        'nutrition_display_text', n.j->>'nd',
        'portion_information', n.j->>'pi',
        'source_dietary_label', n.j->>'sdl',
        'source_tags', pg_catalog.coalesce(n.j->'tags','[]'::jsonb),
        'record_confidence', n.j->>'rc',
        'scope_note', n.j->>'sn'
      ),
      'derived_features', pg_catalog.jsonb_build_object('status','not_generated')
    ),
    pg_catalog.now(),
    pg_catalog.now()
  from new_rows n
  cross join base b;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on function private.import_nandos_batch(jsonb) from public, anon, authenticated;
