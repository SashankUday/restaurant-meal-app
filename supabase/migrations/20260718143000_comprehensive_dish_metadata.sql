-- Comprehensive dish metadata. Empty values mean "not supplied"; the
-- migration deliberately does not invent nutrition, ingredient, or AI data.

alter table public.restaurants add column if not exists chain_name text;
alter table public.restaurants add column if not exists branch_name text;
alter table public.restaurants add column if not exists city text not null default 'Oxford';
alter table public.restaurants add column if not exists country_code text not null default 'GB';
alter table public.restaurants add column if not exists delivery_radius_km numeric(6, 2);
alter table public.restaurants add column if not exists updated_at timestamptz not null default now();

alter table public.dishes add column if not exists official_description text;
alter table public.dishes add column if not exists short_description text;
alter table public.dishes add column if not exists meal_occasions text[] not null default '{}';
alter table public.dishes add column if not exists ingredients text[] not null default '{}';
alter table public.dishes add column if not exists cooking_methods text[] not null default '{}';
alter table public.dishes add column if not exists serving_style text;
alter table public.dishes add column if not exists cultural_origin text;
alter table public.dishes add column if not exists historical_notes text;
alter table public.dishes add column if not exists portion_category text;
alter table public.dishes add column if not exists weight_g numeric(8, 2);
alter table public.dishes add column if not exists volume_ml numeric(8, 2);
alter table public.dishes add column if not exists piece_count integer;
alter table public.dishes add column if not exists estimated_satiety_score numeric(3, 1);
alter table public.dishes add column if not exists suitable_for_sharing boolean;
alter table public.dishes add column if not exists people_served numeric(4, 1);
alter table public.dishes add column if not exists nutrition jsonb not null default '{}';
alter table public.dishes add column if not exists dietary_flags text[] not null default '{}';
alter table public.dishes add column if not exists allergen_details jsonb not null default '{}';
alter table public.dishes add column if not exists sensory_profile jsonb not null default '{}';
alter table public.dishes add column if not exists ingredient_profile jsonb not null default '{}';
alter table public.dishes add column if not exists recommendation_metadata jsonb not null default '{}';
alter table public.dishes add column if not exists availability jsonb not null default '{"currently_available":true}';
alter table public.dishes add column if not exists hidden_search_tokens text[] not null default '{}';
alter table public.dishes add column if not exists official_image_url text;
alter table public.dishes add column if not exists visual_metadata jsonb not null default '{}';
alter table public.dishes add column if not exists derived_features jsonb not null default '{}';
alter table public.dishes add column if not exists data_sources jsonb not null default '{}';
alter table public.dishes add column if not exists updated_at timestamptz not null default now();

update public.dishes
set official_description = coalesce(official_description, description),
    short_description = coalesce(short_description, description),
    dietary_flags = case when cardinality(dietary_flags) = 0 then diets else dietary_flags end,
    availability = case when availability = '{}'::jsonb then '{"currently_available":true}'::jsonb else availability end;

alter table public.dishes drop constraint if exists dishes_course_check;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'restaurants_country_code_format') then
    alter table public.restaurants add constraint restaurants_country_code_format
      check (country_code ~ '^[A-Z]{2}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'restaurants_delivery_radius_positive') then
    alter table public.restaurants add constraint restaurants_delivery_radius_positive
      check (delivery_radius_km is null or delivery_radius_km >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'dishes_course_allowed') then
    alter table public.dishes add constraint dishes_course_allowed
      check (course in ('starters', 'mains', 'sides', 'desserts', 'drinks'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'dishes_portion_category_allowed') then
    alter table public.dishes add constraint dishes_portion_category_allowed
      check (portion_category is null or portion_category in ('small', 'medium', 'large'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'dishes_portion_values_positive') then
    alter table public.dishes add constraint dishes_portion_values_positive
      check (
        (weight_g is null or weight_g > 0)
        and (volume_ml is null or volume_ml > 0)
        and (piece_count is null or piece_count > 0)
        and (people_served is null or people_served > 0)
      );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'dishes_satiety_score_range') then
    alter table public.dishes add constraint dishes_satiety_score_range
      check (estimated_satiety_score is null or estimated_satiety_score between 0 and 10);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'dishes_metadata_objects') then
    alter table public.dishes add constraint dishes_metadata_objects check (
      jsonb_typeof(nutrition) = 'object'
      and jsonb_typeof(allergen_details) = 'object'
      and jsonb_typeof(sensory_profile) = 'object'
      and jsonb_typeof(ingredient_profile) = 'object'
      and jsonb_typeof(recommendation_metadata) = 'object'
      and jsonb_typeof(availability) = 'object'
      and jsonb_typeof(visual_metadata) = 'object'
      and jsonb_typeof(derived_features) = 'object'
      and jsonb_typeof(data_sources) = 'object'
    );
  end if;
end $$;

comment on column public.dishes.nutrition is
  'Per-serving nutrition. Suggested keys: calories_kcal, protein_g, carbohydrates_g, sugars_g, fibre_g, total_fat_g, saturated_fat_g, monounsaturated_fat_g, polyunsaturated_fat_g, trans_fat_g, sodium_mg, salt_g, cholesterol_mg, water_g, micronutrients.';
comment on column public.dishes.allergen_details is
  'Suggested keys: official_allergens, may_contain, cross_contamination_risk, separate_preparation_available, notes.';
comment on column public.dishes.sensory_profile is
  'Suggested array keys: textures, flavours, spice, temperatures, mouthfeel.';
comment on column public.dishes.ingredient_profile is
  'Suggested keys: primary_protein, main_carbohydrate, vegetables, sauces, toppings, garnishes, contains_alcohol, fermented_ingredients, ultra_processed_score.';
comment on column public.dishes.availability is
  'Suggested keys: currently_available, seasonal, limited_edition, breakfast_only, lunch_only, service_windows, out_of_stock, available_from, available_until.';
comment on column public.dishes.derived_features is
  'Optional sourced or generated scores such as healthiness, comfort, satiety, adventurousness, indulgence, freshness, protein, gym, hangover, sick_day, season and date_night suitability.';
comment on column public.dishes.data_sources is
  'Provenance and verification metadata for menu, ingredient, nutrition, allergen, availability and generated fields.';

alter table public.ratings add column if not exists taste_score numeric(3, 1);
alter table public.ratings add column if not exists value_score numeric(3, 1);
alter table public.ratings add column if not exists presentation_score numeric(3, 1);
alter table public.ratings add column if not exists portion_score numeric(3, 1);
alter table public.ratings add column if not exists would_order_again boolean;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ratings_breakdown_scores_range') then
    alter table public.ratings add constraint ratings_breakdown_scores_range check (
      (taste_score is null or taste_score between 0 and 10)
      and (value_score is null or value_score between 0 and 10)
      and (presentation_score is null or presentation_score between 0 and 10)
      and (portion_score is null or portion_score between 0 and 10)
    );
  end if;
end $$;

create table if not exists public.dish_price_history (
  id bigint generated by default as identity primary key,
  dish_id bigint not null references public.dishes(id) on delete cascade,
  service_type text not null default 'eat_in' check (service_type in ('eat_in', 'takeaway', 'delivery')),
  price numeric(7, 2) not null check (price >= 0),
  currency text not null default 'GBP' check (currency ~ '^[A-Z]{3}$'),
  region text,
  valid_from date not null default current_date,
  valid_to date,
  created_at timestamptz not null default now(),
  constraint dish_price_dates_valid check (valid_to is null or valid_to >= valid_from),
  unique (dish_id, service_type, region, valid_from)
);

create table if not exists public.dish_media (
  id uuid primary key default gen_random_uuid(),
  dish_id bigint not null references public.dishes(id) on delete cascade,
  media_type text not null default 'image' check (media_type = 'image'),
  source_type text not null default 'official' check (source_type in ('official', 'restaurant', 'press')),
  url text not null,
  alt_text text not null default '',
  colour_profile text[] not null default '{}',
  plating_style text,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  unique (dish_id, url)
);

create table if not exists public.dish_relationships (
  dish_id bigint not null references public.dishes(id) on delete cascade,
  related_dish_id bigint not null references public.dishes(id) on delete cascade,
  relationship_type text not null check (relationship_type in ('similar', 'often_ordered_together', 'side_pairing', 'drink_pairing', 'seasonal_recommendation')),
  relevance numeric(4, 3) check (relevance is null or relevance between 0 and 1),
  note text,
  created_at timestamptz not null default now(),
  primary key (dish_id, related_dish_id, relationship_type),
  constraint dish_relationship_not_self check (dish_id <> related_dish_id)
);

-- Kept private and model-agnostic. A future pgvector migration can add an
-- indexed vector column without changing the dish or catalogue contracts.
create table if not exists public.dish_embeddings (
  dish_id bigint not null references public.dishes(id) on delete cascade,
  model text not null,
  dimensions integer not null check (dimensions > 0),
  embedding double precision[] not null,
  source_text_hash text,
  created_at timestamptz not null default now(),
  primary key (dish_id, model),
  constraint dish_embedding_dimensions_match check (cardinality(embedding) = dimensions)
);

create table if not exists public.dish_user_signals (
  user_id uuid not null,
  dish_id bigint not null references public.dishes(id) on delete cascade,
  saved boolean not null default false,
  favourite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, dish_id)
);

insert into public.dish_price_history (dish_id, service_type, price, currency, valid_from)
select dish.id, 'eat_in', dish.price, 'GBP', dish.created_at::date
from public.dishes dish
where not exists (
  select 1 from public.dish_price_history history
  where history.dish_id = dish.id and history.service_type = 'eat_in'
);

create index if not exists dish_price_history_lookup_idx
  on public.dish_price_history (dish_id, service_type, valid_from desc);
create index if not exists dish_media_dish_order_idx
  on public.dish_media (dish_id, sort_order);
create index if not exists dish_relationships_dish_idx
  on public.dish_relationships (dish_id, relationship_type);
create index if not exists dish_user_signals_dish_idx
  on public.dish_user_signals (dish_id) where saved or favourite;

create or replace function public.set_plate_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists restaurants_set_updated_at on public.restaurants;
create trigger restaurants_set_updated_at
before update on public.restaurants
for each row execute function public.set_plate_updated_at();

drop trigger if exists dishes_set_updated_at on public.dishes;
create trigger dishes_set_updated_at
before update on public.dishes
for each row execute function public.set_plate_updated_at();

drop trigger if exists dish_user_signals_set_updated_at on public.dish_user_signals;
create trigger dish_user_signals_set_updated_at
before update on public.dish_user_signals
for each row execute function public.set_plate_updated_at();

-- These views gain many columns in a new order. PostgreSQL cannot reorder an
-- existing view with CREATE OR REPLACE, so recreate them explicitly.
drop view if exists public.dish_catalog;

create view public.dish_catalog
with (security_barrier = true, security_invoker = false)
as
select
  d.id,
  d.restaurant_id,
  d.name,
  d.price,
  d.description,
  d.official_description,
  d.short_description,
  d.course,
  d.menu_position,
  d.meal_occasions,
  d.ingredients,
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
  d.nutrition,
  d.diets,
  d.dietary_flags,
  d.allergens,
  d.allergen_details,
  d.sensory_profile,
  d.ingredient_profile,
  d.recommendation_metadata,
  d.availability,
  d.hidden_search_tokens,
  d.official_image_url,
  d.visual_metadata,
  d.derived_features,
  d.data_sources,
  d.sponsored,
  d.created_at as date_added,
  d.updated_at as date_last_updated,
  restaurant.name as restaurant_name,
  restaurant.chain_name,
  restaurant.branch_name,
  restaurant.area,
  restaurant.cuisine,
  restaurant.city,
  restaurant.country_code,
  coalesce(round(rating_stats.score::numeric, 1), 0)::double precision as score,
  coalesce(rating_stats.rating_count, 0)::bigint as rating_count,
  jsonb_build_object(
    'taste', round(rating_stats.taste_score::numeric, 1),
    'value', round(rating_stats.value_score::numeric, 1),
    'presentation', round(rating_stats.presentation_score::numeric, 1),
    'portion', round(rating_stats.portion_score::numeric, 1),
    'repeat_order_rate', round(rating_stats.repeat_order_rate::numeric, 3)
  ) as experience_scores,
  coalesce(photo_stats.photo_count, 0)::bigint as user_photo_count,
  coalesce(signal_stats.save_count, 0)::bigint as save_count,
  coalesce(signal_stats.favourite_count, 0)::bigint as favourite_count,
  coalesce(tag_stats.tag_counts, '{}'::jsonb) as tag_counts,
  coalesce(tag_stats.search_tags, '{}'::text[]) as search_tags,
  coalesce(price_stats.current_prices, '{}'::jsonb) as current_prices,
  coalesce(price_history_stats.price_history, '[]'::jsonb) as price_history,
  coalesce(media_stats.official_media, '[]'::jsonb) as official_media,
  coalesce(relationship_stats.related_dishes, '[]'::jsonb) as related_dishes,
  case
    when (d.nutrition ->> 'calories_kcal') ~ '^[0-9]+([.][0-9]+)?$'
      then case
        when (d.nutrition ->> 'calories_kcal')::numeric > 0
          then round(d.price / (d.nutrition ->> 'calories_kcal')::numeric, 4)
      end
  end as price_per_calorie,
  case
    when (d.nutrition ->> 'protein_g') ~ '^[0-9]+([.][0-9]+)?$'
      then case
        when (d.nutrition ->> 'protein_g')::numeric > 0
          then round(d.price / (d.nutrition ->> 'protein_g')::numeric, 2)
      end
  end as price_per_gram_protein,
  concat_ws(' ',
    d.name,
    restaurant.name,
    restaurant.chain_name,
    restaurant.branch_name,
    restaurant.area,
    restaurant.cuisine,
    d.description,
    d.official_description,
    d.short_description,
    d.serving_style,
    d.cultural_origin,
    d.portion_category,
    array_to_string(d.meal_occasions, ' '),
    array_to_string(d.ingredients, ' '),
    array_to_string(d.cooking_methods, ' '),
    array_to_string(d.dietary_flags, ' '),
    array_to_string(d.hidden_search_tokens, ' '),
    d.nutrition::text,
    d.allergen_details::text,
    d.sensory_profile::text,
    d.ingredient_profile::text,
    d.recommendation_metadata::text,
    d.availability::text,
    d.visual_metadata::text,
    d.derived_features::text
  ) as search_metadata_text
from public.dishes d
join public.restaurants restaurant on restaurant.id = d.restaurant_id
left join lateral (
  select
    avg(r.score) as score,
    count(*) as rating_count,
    avg(r.taste_score) as taste_score,
    avg(r.value_score) as value_score,
    avg(r.presentation_score) as presentation_score,
    avg(r.portion_score) as portion_score,
    avg(case when r.would_order_again is true then 1.0 when r.would_order_again is false then 0.0 end) as repeat_order_rate
  from public.ratings r
  where r.dish_id = d.id
) rating_stats on true
left join lateral (
  select count(photo.id) as photo_count
  from public.rating_photos photo
  join public.ratings photo_rating on photo_rating.id = photo.rating_id
  where photo_rating.dish_id = d.id
) photo_stats on true
left join lateral (
  select
    count(*) filter (where signal.saved) as save_count,
    count(*) filter (where signal.favourite) as favourite_count
  from public.dish_user_signals signal
  where signal.dish_id = d.id
) signal_stats on true
left join lateral (
  select
    jsonb_object_agg(initcap(rollup.tag), rollup.total order by rollup.total desc) as tag_counts,
    array_agg(rollup.tag order by rollup.total desc) as search_tags
  from (
    select source.tag, sum(source.total)::bigint as total
    from (
      select lower(trim(crowd.key)) as tag, crowd.value::bigint as total
      from jsonb_each_text(d.crowd_tags) crowd
      union all
      select lower(trim(user_tag.tag)) as tag, count(*)::bigint as total
      from public.ratings user_rating
      cross join lateral unnest(user_rating.tags) as user_tag(tag)
      where user_rating.dish_id = d.id and trim(user_tag.tag) <> ''
      group by lower(trim(user_tag.tag))
    ) source
    group by source.tag
  ) rollup
) tag_stats on true
left join lateral (
  select jsonb_object_agg(latest.service_type, latest.price) as current_prices
  from (
    select distinct on (history.service_type)
      history.service_type,
      history.price
    from public.dish_price_history history
    where history.dish_id = d.id
      and history.valid_from <= current_date
      and (history.valid_to is null or history.valid_to >= current_date)
    order by history.service_type, history.valid_from desc
  ) latest
) price_stats on true
left join lateral (
  select jsonb_agg(
    jsonb_build_object(
      'service_type', history.service_type,
      'price', history.price,
      'currency', history.currency,
      'region', history.region,
      'valid_from', history.valid_from,
      'valid_to', history.valid_to
    ) order by history.valid_from desc, history.service_type
  ) as price_history
  from public.dish_price_history history
  where history.dish_id = d.id
) price_history_stats on true
left join lateral (
  select jsonb_agg(
    jsonb_build_object(
      'id', media.id,
      'url', media.url,
      'alt_text', media.alt_text,
      'source_type', media.source_type,
      'colour_profile', media.colour_profile,
      'plating_style', media.plating_style
    ) order by media.sort_order, media.created_at
  ) as official_media
  from public.dish_media media
  where media.dish_id = d.id
) media_stats on true
left join lateral (
  select jsonb_agg(
    jsonb_build_object(
      'dish_id', relationship.related_dish_id,
      'name', related.name,
      'restaurant_id', related.restaurant_id,
      'relationship_type', relationship.relationship_type,
      'relevance', relationship.relevance,
      'note', relationship.note
    ) order by relationship.relevance desc nulls last, related.name
  ) as related_dishes
  from public.dish_relationships relationship
  join public.dishes related on related.id = relationship.related_dish_id
  where relationship.dish_id = d.id
) relationship_stats on true;

drop view if exists public.restaurant_catalog;

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
  restaurant.delivery_radius_km,
  restaurant.description,
  restaurant.created_at,
  restaurant.updated_at,
  coalesce(round(avg(rating.score)::numeric, 1), 0)::double precision as score,
  count(rating.id)::bigint as rating_count
from public.restaurants restaurant
left join public.dishes dish on dish.restaurant_id = restaurant.id
left join public.ratings rating on rating.dish_id = dish.id
group by restaurant.id;

alter table public.dish_price_history enable row level security;
alter table public.dish_media enable row level security;
alter table public.dish_relationships enable row level security;
alter table public.dish_embeddings enable row level security;
alter table public.dish_user_signals enable row level security;

drop policy if exists "Dish prices are public" on public.dish_price_history;
create policy "Dish prices are public" on public.dish_price_history for select using (true);

drop policy if exists "Dish media are public" on public.dish_media;
create policy "Dish media are public" on public.dish_media for select using (true);

drop policy if exists "Dish relationships are public" on public.dish_relationships;
create policy "Dish relationships are public" on public.dish_relationships for select using (true);

drop policy if exists "Dish signals are owner managed" on public.dish_user_signals;
create policy "Dish signals are owner managed" on public.dish_user_signals
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select on public.dish_price_history, public.dish_media, public.dish_relationships to anon, authenticated;
grant select, insert, update, delete on public.dish_user_signals to authenticated;
revoke all on public.dish_user_signals, public.dish_embeddings from anon;
grant select on public.dish_catalog, public.restaurant_catalog to anon, authenticated;
