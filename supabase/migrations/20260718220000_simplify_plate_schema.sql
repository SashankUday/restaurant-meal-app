begin;

set local lock_timeout = '10s';
set local statement_timeout = '5min';

-- Keep all archived data outside the API-facing public schema. The archive is
-- deliberately readable only by postgres and service_role.
create schema if not exists archive;

revoke all on schema archive from public, anon, authenticated;
grant usage on schema archive to service_role;

create table if not exists archive.readme (
  source_migration text not null,
  archived_at timestamptz not null default transaction_timestamp(),
  archive_table text not null,
  source_object text not null,
  source_row_count bigint not null,
  what_was_moved text not null,
  details jsonb not null default '{}'::jsonb,
  primary key (source_migration, archive_table)
);

-- Snapshot every dish column that will be dropped, along with the original
-- values of kept columns that this migration may merge into.
create table archive.dishes_dropped_metadata_20260718220000 as
select
  d.id as dish_id,
  d.diets as diets_before_merge,
  d.description as description_before_merge,
  d.official_image_url as official_image_url_before_media_merge,
  d.restaurant,
  d.area,
  d.cuisine,
  d.score,
  d.rating_count,
  d.tag_counts,
  d.official_description,
  d.dietary_flags,
  d.cooking_methods,
  d.serving_style,
  d.cultural_origin,
  d.historical_notes,
  d.portion_category,
  d.weight_g,
  d.volume_ml,
  d.piece_count,
  d.estimated_satiety_score,
  d.suitable_for_sharing,
  d.people_served,
  d.sensory_profile,
  d.ingredient_profile,
  d.recommendation_metadata,
  d.visual_metadata,
  d.derived_features
from public.dishes d;

alter table archive.dishes_dropped_metadata_20260718220000
  add primary key (dish_id);

create table archive.restaurants_dropped_metadata_20260718220000 as
select
  restaurant.id as restaurant_id,
  restaurant.delivery_radius_km
from public.restaurants restaurant;

alter table archive.restaurants_dropped_metadata_20260718220000
  add primary key (restaurant_id);

create table archive.ratings_dropped_subscores_20260718220000 as
select
  rating.id as rating_id,
  rating.user_id,
  rating.dish_id,
  rating.taste_score,
  rating.value_score,
  rating.presentation_score,
  rating.portion_score
from public.ratings rating;

alter table archive.ratings_dropped_subscores_20260718220000
  add primary key (rating_id);

-- Whole-table archives retain every source column and row.
create table archive.dish_price_history_20260718220000 as
table public.dish_price_history;

alter table archive.dish_price_history_20260718220000
  add primary key (id);

create table archive.dish_media_20260718220000 as
table public.dish_media;

alter table archive.dish_media_20260718220000
  add primary key (id);

create table archive.dish_relationships_20260718220000 as
table public.dish_relationships;

alter table archive.dish_relationships_20260718220000
  add primary key (dish_id, related_dish_id, relationship_type);

create table archive.dish_embeddings_20260718220000 as
table public.dish_embeddings;

alter table archive.dish_embeddings_20260718220000
  add primary key (dish_id, model);

create table archive.dish_user_signals_20260718220000 as
table public.dish_user_signals;

alter table archive.dish_user_signals_20260718220000
  add primary key (user_id, dish_id);

-- Abort the transaction before any merge or drop if an archive is incomplete.
do $$
begin
  if (select count(*) from archive.dishes_dropped_metadata_20260718220000)
     <> (select count(*) from public.dishes) then
    raise exception 'Archive validation failed for public.dishes';
  end if;

  if (select count(*) from archive.restaurants_dropped_metadata_20260718220000)
     <> (select count(*) from public.restaurants) then
    raise exception 'Archive validation failed for public.restaurants';
  end if;

  if (select count(*) from archive.ratings_dropped_subscores_20260718220000)
     <> (select count(*) from public.ratings) then
    raise exception 'Archive validation failed for public.ratings';
  end if;

  if (select count(*) from archive.dish_price_history_20260718220000)
     <> (select count(*) from public.dish_price_history) then
    raise exception 'Archive validation failed for public.dish_price_history';
  end if;

  if (select count(*) from archive.dish_media_20260718220000)
     <> (select count(*) from public.dish_media) then
    raise exception 'Archive validation failed for public.dish_media';
  end if;

  if (select count(*) from archive.dish_relationships_20260718220000)
     <> (select count(*) from public.dish_relationships) then
    raise exception 'Archive validation failed for public.dish_relationships';
  end if;

  if (select count(*) from archive.dish_embeddings_20260718220000)
     <> (select count(*) from public.dish_embeddings) then
    raise exception 'Archive validation failed for public.dish_embeddings';
  end if;

  if (select count(*) from archive.dish_user_signals_20260718220000)
     <> (select count(*) from public.dish_user_signals) then
    raise exception 'Archive validation failed for public.dish_user_signals';
  end if;
end;
$$;

-- Merge dietary_flags into diets as a case-insensitive distinct union. Existing
-- diets retain their order and spelling; new flag values are appended.
with merged_diets as (
  select
    dish.id,
    array(
      select unique_value.value
      from (
        select distinct on (lower(btrim(candidate.value)))
          btrim(candidate.value) as value,
          candidate.source_order,
          candidate.item_order
        from (
          select diet.value, 0 as source_order, diet.item_order
          from unnest(dish.diets) with ordinality as diet(value, item_order)

          union all

          select flag.value, 1 as source_order, flag.item_order
          from unnest(dish.dietary_flags) with ordinality as flag(value, item_order)
        ) candidate
        where nullif(btrim(candidate.value), '') is not null
        order by
          lower(btrim(candidate.value)),
          candidate.source_order,
          candidate.item_order
      ) unique_value
      order by unique_value.source_order, unique_value.item_order
    )::text[] as diets
  from public.dishes dish
)
update public.dishes dish
set diets = merged.diets
from merged_diets merged
where dish.id = merged.id
  and dish.diets is distinct from merged.diets;

-- Preserve the longest available curated description if description is blank.
-- short_description itself remains a first-class dish column.
update public.dishes dish
set description = case
  when char_length(btrim(coalesce(dish.official_description, '')))
       >= char_length(btrim(coalesce(dish.short_description, '')))
    then btrim(dish.official_description)
  else btrim(dish.short_description)
end
where nullif(btrim(dish.description), '') is null
  and (
    nullif(btrim(dish.official_description), '') is not null
    or nullif(btrim(dish.short_description), '') is not null
  );

-- Copy the preferred archived media URL into the kept dish image column only
-- when the dish does not already have an official image.
with preferred_media as (
  select distinct on (media.dish_id)
    media.dish_id,
    media.url
  from public.dish_media media
  where nullif(btrim(media.url), '') is not null
  order by media.dish_id, media.sort_order, media.created_at, media.id
)
update public.dishes dish
set official_image_url = media.url
from preferred_media media
where dish.id = media.dish_id
  and dish.official_image_url is null;

do $$
begin
  if exists (
    select 1
    from public.dish_media media
    join public.dishes dish on dish.id = media.dish_id
    where nullif(btrim(media.url), '') is not null
      and dish.official_image_url is null
  ) then
    raise exception 'Media URL merge validation failed';
  end if;
end;
$$;

-- Both catalog views depend on columns and tables removed below. They are
-- recreated with their existing security settings after the simplification.
drop view public.dish_catalog;
drop view public.restaurant_catalog;

alter table public.dishes
  drop constraint dishes_metadata_objects,
  drop constraint dishes_portion_category_allowed,
  drop constraint dishes_portion_values_positive,
  drop constraint dishes_satiety_score_range;

alter table public.dishes
  drop column restaurant,
  drop column area,
  drop column cuisine,
  drop column score,
  drop column rating_count,
  drop column tag_counts,
  drop column official_description,
  drop column dietary_flags,
  drop column cooking_methods,
  drop column serving_style,
  drop column cultural_origin,
  drop column historical_notes,
  drop column portion_category,
  drop column weight_g,
  drop column volume_ml,
  drop column piece_count,
  drop column estimated_satiety_score,
  drop column suitable_for_sharing,
  drop column people_served,
  drop column sensory_profile,
  drop column ingredient_profile,
  drop column recommendation_metadata,
  drop column visual_metadata,
  drop column derived_features;

-- Retain object validation for every JSON metadata column that remains.
alter table public.dishes
  add constraint dishes_metadata_objects check (
    jsonb_typeof(nutrition) = 'object'
    and jsonb_typeof(allergen_details) = 'object'
    and jsonb_typeof(availability) = 'object'
    and jsonb_typeof(data_sources) = 'object'
  );

alter table public.restaurants
  drop constraint restaurants_delivery_radius_positive,
  drop column delivery_radius_km;

alter table public.ratings
  drop constraint ratings_breakdown_scores_range,
  drop column taste_score,
  drop column value_score,
  drop column presentation_score,
  drop column portion_score;

drop table public.dish_price_history;
drop table public.dish_media;
drop table public.dish_relationships;
drop table public.dish_embeddings;
drop table public.dish_user_signals;

create view public.dish_catalog
with (security_barrier = true, security_invoker = false)
as
select
  dish.id,
  dish.restaurant_id,
  dish.name,
  dish.price,
  dish.description,
  dish.short_description,
  dish.course,
  dish.menu_position,
  dish.diets,
  dish.allergens,
  dish.allergen_details,
  dish.nutrition,
  dish.ingredients,
  dish.meal_occasions,
  dish.crowd_tags,
  dish.official_image_url,
  dish.availability,
  dish.hidden_search_tokens,
  dish.data_sources,
  dish.sponsored,
  dish.created_at,
  dish.updated_at,
  restaurant.name as restaurant_name,
  restaurant.chain_name,
  restaurant.branch_name,
  restaurant.area,
  restaurant.cuisine,
  restaurant.city,
  coalesce(round(rating_stats.score::numeric, 1), 0)::double precision as score,
  coalesce(rating_stats.rating_count, 0)::bigint as rating_count,
  coalesce(round(rating_stats.repeat_order_rate::numeric, 3), 0)::double precision
    as repeat_order_rate,
  coalesce(photo_stats.photo_count, 0)::bigint as user_photo_count,
  coalesce(tag_stats.tag_counts, '{}'::jsonb) as tag_counts,
  coalesce(tag_stats.search_tags, '{}'::text[]) as search_tags
from public.dishes dish
join public.restaurants restaurant on restaurant.id = dish.restaurant_id
left join lateral (
  select
    avg(rating.score) as score,
    count(*) as rating_count,
    avg(
      case
        when rating.would_order_again is true then 1.0
        when rating.would_order_again is false then 0.0
      end
    ) as repeat_order_rate
  from public.ratings rating
  where rating.dish_id = dish.id
) rating_stats on true
left join lateral (
  select count(photo.id) as photo_count
  from public.rating_photos photo
  join public.ratings photo_rating on photo_rating.id = photo.rating_id
  where photo_rating.dish_id = dish.id
) photo_stats on true
left join lateral (
  select
    jsonb_object_agg(initcap(rollup.tag), rollup.total order by rollup.total desc)
      as tag_counts,
    array_agg(rollup.tag order by rollup.total desc) as search_tags
  from (
    select source.tag, sum(source.total)::bigint as total
    from (
      select lower(trim(crowd.key)) as tag, crowd.value::bigint as total
      from jsonb_each_text(dish.crowd_tags) crowd

      union all

      select lower(trim(user_tag.tag)) as tag, count(*)::bigint as total
      from public.ratings user_rating
      cross join lateral unnest(user_rating.tags) as user_tag(tag)
      where user_rating.dish_id = dish.id
        and trim(user_tag.tag) <> ''
      group by lower(trim(user_tag.tag))
    ) source
    group by source.tag
  ) rollup
) tag_stats on true;

create view public.restaurant_catalog
with (security_barrier = true, security_invoker = false)
as
select
  restaurant.id,
  restaurant.name,
  restaurant.chain_name,
  restaurant.branch_name,
  restaurant.area,
  restaurant.cuisine,
  restaurant.latitude,
  restaurant.longitude,
  restaurant.city,
  restaurant.country_code,
  restaurant.description,
  restaurant.created_at,
  restaurant.updated_at,
  coalesce(round(avg(rating.score)::numeric, 1), 0)::double precision as score,
  count(rating.id)::bigint as rating_count
from public.restaurants restaurant
left join public.dishes dish on dish.restaurant_id = restaurant.id
left join public.ratings rating on rating.dish_id = dish.id
group by restaurant.id;

-- New public relations inherit the project's existing non-DML default ACLs.
-- Restore the two explicit SELECT grants present on the original views.
grant select on public.dish_catalog, public.restaurant_catalog to anon, authenticated;

insert into archive.readme (
  source_migration,
  archive_table,
  source_object,
  source_row_count,
  what_was_moved,
  details
)
values
  (
    '20260718220000_simplify_plate_schema',
    'archive.dishes_dropped_metadata_20260718220000',
    'public.dishes',
    (select count(*) from archive.dishes_dropped_metadata_20260718220000),
    'All dropped dish metadata plus pre-merge diets, description, and official_image_url.',
    jsonb_build_object(
      'diets_changed', (
        select count(*)
        from archive.dishes_dropped_metadata_20260718220000 archived
        join public.dishes dish on dish.id = archived.dish_id
        where dish.diets is distinct from archived.diets_before_merge
      ),
      'descriptions_changed', (
        select count(*)
        from archive.dishes_dropped_metadata_20260718220000 archived
        join public.dishes dish on dish.id = archived.dish_id
        where dish.description is distinct from archived.description_before_merge
      ),
      'official_image_urls_filled', (
        select count(*)
        from archive.dishes_dropped_metadata_20260718220000 archived
        join public.dishes dish on dish.id = archived.dish_id
        where archived.official_image_url_before_media_merge is null
          and dish.official_image_url is not null
      )
    )
  ),
  (
    '20260718220000_simplify_plate_schema',
    'archive.restaurants_dropped_metadata_20260718220000',
    'public.restaurants',
    (select count(*) from archive.restaurants_dropped_metadata_20260718220000),
    'The dropped delivery_radius_km column keyed by restaurant_id.',
    '{}'::jsonb
  ),
  (
    '20260718220000_simplify_plate_schema',
    'archive.ratings_dropped_subscores_20260718220000',
    'public.ratings',
    (select count(*) from archive.ratings_dropped_subscores_20260718220000),
    'The four dropped rating sub-score columns keyed by rating_id.',
    '{}'::jsonb
  ),
  (
    '20260718220000_simplify_plate_schema',
    'archive.dish_price_history_20260718220000',
    'public.dish_price_history',
    (select count(*) from archive.dish_price_history_20260718220000),
    'Full rows, including service type, prices, dates, and Oxford region labels.',
    '{}'::jsonb
  ),
  (
    '20260718220000_simplify_plate_schema',
    'archive.dish_media_20260718220000',
    'public.dish_media',
    (select count(*) from archive.dish_media_20260718220000),
    'Full media rows; preferred URLs were copied to dishes.official_image_url where null.',
    '{}'::jsonb
  ),
  (
    '20260718220000_simplify_plate_schema',
    'archive.dish_relationships_20260718220000',
    'public.dish_relationships',
    (select count(*) from archive.dish_relationships_20260718220000),
    'Full relationship rows.',
    '{}'::jsonb
  ),
  (
    '20260718220000_simplify_plate_schema',
    'archive.dish_embeddings_20260718220000',
    'public.dish_embeddings',
    (select count(*) from archive.dish_embeddings_20260718220000),
    'Full embedding rows.',
    '{}'::jsonb
  ),
  (
    '20260718220000_simplify_plate_schema',
    'archive.dish_user_signals_20260718220000',
    'public.dish_user_signals',
    (select count(*) from archive.dish_user_signals_20260718220000),
    'Full saved and favourite signal rows.',
    '{}'::jsonb
  );

revoke all on all tables in schema archive from public, anon, authenticated, service_role;
grant select on all tables in schema archive to service_role;

commit;
