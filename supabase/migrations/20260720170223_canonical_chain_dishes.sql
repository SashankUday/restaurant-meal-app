begin;

set local lock_timeout = '10s';
set local statement_timeout = '10min';

-- This snapshot makes the migration abort if any branch dish, rating/meal,
-- photo metadata row, storage object, or rating-to-dish relationship changes.
create temporary table plate_canonical_migration_snapshot on commit drop as
select
  (select count(*) from public.dishes) as dish_count,
  (
    select md5(coalesce(string_agg(dish.id::text, ',' order by dish.id), ''))
    from public.dishes dish
  ) as dish_id_fingerprint,
  (select count(*) from public.ratings) as rating_count,
  (
    select md5(coalesce(string_agg(
      rating.id::text || ':' || rating.dish_id::text,
      ',' order by rating.id
    ), ''))
    from public.ratings rating
  ) as rating_dish_fingerprint,
  (select count(*) from public.rating_photos) as photo_count,
  (
    select md5(coalesce(string_agg(
      photo.id::text || ':' || photo.rating_id::text || ':' || photo.storage_path,
      ',' order by photo.id
    ), ''))
    from public.rating_photos photo
  ) as photo_fingerprint,
  (
    select count(*)
    from storage.objects object
    where object.bucket_id = 'meal-photos'
  ) as storage_photo_count;

-- Historical data must never disappear because a parent record was deleted.
alter table public.rating_photos
  drop constraint if exists rating_photos_rating_id_fkey;
alter table public.rating_photos
  add constraint rating_photos_rating_id_fkey
  foreign key (rating_id) references public.ratings(id) on delete restrict
  not valid;
alter table public.rating_photos
  validate constraint rating_photos_rating_id_fkey;

alter table public.ratings
  drop constraint if exists ratings_dish_id_fkey;
alter table public.ratings
  add constraint ratings_dish_id_fkey
  foreign key (dish_id) references public.dishes(id) on delete restrict
  not valid;
alter table public.ratings
  validate constraint ratings_dish_id_fkey;

alter table public.dishes
  drop constraint if exists dishes_restaurant_id_fkey;
alter table public.dishes
  add constraint dishes_restaurant_id_fkey
  foreign key (restaurant_id) references public.restaurants(id) on delete restrict
  not valid;
alter table public.dishes
  validate constraint dishes_restaurant_id_fkey;

-- Archive and remove only the proven-empty duplicate Bella Italia George
-- Street row. The populated row remains the survivor, so its 110 live dish
-- IDs do not move. The archive contains enough data to restore the row.
create schema if not exists archive;
revoke all on schema archive from public, anon, authenticated;
grant usage on schema archive to service_role;

create table if not exists archive.restaurant_merges_20260720170223 (
  removed_restaurant_id bigint primary key,
  survivor_restaurant_id bigint not null,
  removed_row jsonb not null,
  moved_dish_ids bigint[] not null default '{}',
  reason text not null,
  merged_at timestamptz not null default transaction_timestamp()
);

do $$
declare
  candidate_count integer;
  survivor_id bigint;
  survivor_dish_count bigint;
  duplicate record;
  duplicate_dish_count bigint;
begin
  select count(*)
  into candidate_count
  from public.restaurants restaurant
  where lower(btrim(coalesce(restaurant.chain_name, restaurant.name))) = 'bella italia'
    and lower(btrim(restaurant.city)) = 'oxford'
    and lower(btrim(restaurant.area)) = 'george street'
    and regexp_replace(
      lower(coalesce(restaurant.branch_name, '')),
      '[^a-z0-9]+', '', 'g'
    ) = 'oxfordgeorgestreet';

  if candidate_count > 2 then
    raise exception 'Refusing Bella Italia consolidation: found % matching rows', candidate_count;
  end if;

  if candidate_count = 2 then
    select restaurant.id, count(dish.id)
    into survivor_id, survivor_dish_count
    from public.restaurants restaurant
    left join public.dishes dish on dish.restaurant_id = restaurant.id
    where lower(btrim(coalesce(restaurant.chain_name, restaurant.name))) = 'bella italia'
      and lower(btrim(restaurant.city)) = 'oxford'
      and lower(btrim(restaurant.area)) = 'george street'
      and regexp_replace(
        lower(coalesce(restaurant.branch_name, '')),
        '[^a-z0-9]+', '', 'g'
      ) = 'oxfordgeorgestreet'
    group by restaurant.id
    order by count(dish.id) desc, restaurant.id desc
    limit 1;

    if survivor_dish_count = 0 then
      raise exception 'Refusing Bella Italia consolidation: neither row has menu data';
    end if;

    for duplicate in
      select restaurant.*
      from public.restaurants restaurant
      where restaurant.id <> survivor_id
        and lower(btrim(coalesce(restaurant.chain_name, restaurant.name))) = 'bella italia'
        and lower(btrim(restaurant.city)) = 'oxford'
        and lower(btrim(restaurant.area)) = 'george street'
        and regexp_replace(
          lower(coalesce(restaurant.branch_name, '')),
          '[^a-z0-9]+', '', 'g'
        ) = 'oxfordgeorgestreet'
    loop
      select count(*)
      into duplicate_dish_count
      from public.dishes dish
      where dish.restaurant_id = duplicate.id;

      if duplicate_dish_count <> 0 then
        raise exception
          'Refusing Bella Italia consolidation: duplicate restaurant % has % dishes',
          duplicate.id, duplicate_dish_count;
      end if;

      insert into archive.restaurant_merges_20260720170223 (
        removed_restaurant_id,
        survivor_restaurant_id,
        removed_row,
        moved_dish_ids,
        reason
      )
      values (
        duplicate.id,
        survivor_id,
        to_jsonb(duplicate),
        '{}'::bigint[],
        'Duplicate Bella Italia Oxford George Street branch with no dishes or ratings'
      )
      on conflict (removed_restaurant_id) do nothing;

      delete from public.restaurants
      where id = duplicate.id;
    end loop;
  end if;
end;
$$;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table public.brands (
  id bigint generated by default as identity primary key,
  name text not null check (nullif(btrim(name), '') is not null),
  brand_key text not null unique
    check (brand_key = lower(btrim(brand_key)) and nullif(brand_key, '') is not null),
  is_chain boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.brands is
  'One brand per chain or independent restaurant. Restaurants are physical branches of a brand.';

create table public.canonical_dishes (
  id bigint generated by default as identity primary key,
  brand_id bigint not null references public.brands(id) on delete restrict,
  name text not null check (nullif(btrim(name), '') is not null),
  canonical_key text not null
    check (canonical_key = lower(btrim(canonical_key)) and nullif(canonical_key, '') is not null),
  official_menu_item_id text,
  description text not null default '',
  short_description text,
  course text not null default 'mains'
    check (course in ('starters', 'mains', 'sides', 'desserts', 'drinks')),
  diets text[] not null default '{}',
  allergens text[] not null default '{}',
  allergens_verified boolean not null default false,
  allergen_details jsonb not null default '{}',
  nutrition jsonb not null default '{}',
  ingredients text[] not null default '{}',
  meal_occasions text[] not null default '{}',
  official_image_url text,
  market_code text not null default 'GB'
    check (market_code ~ '^[A-Z]{2,8}$'),
  source_identifiers jsonb not null default '{}',
  data_sources jsonb not null default '{}',
  canonicalisation_method text not null default 'manual_review'
    check (canonicalisation_method in ('official_id', 'manual_review', 'one_to_one_backfill')),
  review_status text not null default 'unreviewed'
    check (review_status in ('unreviewed', 'confirmed', 'superseded')),
  version integer not null default 1 check (version > 0),
  is_current boolean not null default true,
  valid_from date,
  valid_until date,
  supersedes_id bigint references public.canonical_dishes(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canonical_dishes_brand_market_key
    unique (brand_id, market_code, canonical_key),
  constraint canonical_dishes_json_objects check (
    jsonb_typeof(allergen_details) = 'object'
    and jsonb_typeof(nutrition) = 'object'
    and jsonb_typeof(source_identifiers) = 'object'
    and jsonb_typeof(data_sources) = 'object'
  ),
  constraint canonical_dishes_validity_window
    check (valid_until is null or valid_from is null or valid_until >= valid_from),
  constraint canonical_dishes_not_self_superseding
    check (supersedes_id is null or supersedes_id <> id)
);

comment on table public.canonical_dishes is
  'Brand products shared by confirmed equivalent branch offerings. Never merge by name or price alone; recipe, portion, protein, variant, market, and official identifiers must agree.';
comment on column public.canonical_dishes.canonical_key is
  'Stable brand-and-market scoped key. Initial legacy:<dish_id> keys deliberately prevent automatic merging.';
comment on column public.canonical_dishes.supersedes_id is
  'Links a materially changed recipe to its prior immutable canonical version.';

alter table public.restaurants
  add column brand_id bigint;

alter table public.dishes
  add column brand_id bigint,
  add column canonical_dish_id bigint,
  add column variant_key text not null default 'default',
  add column is_active boolean not null default true,
  add column available_from date,
  add column available_until date,
  add column local_overrides jsonb not null default '{}';

alter table public.dishes
  add constraint dishes_variant_key_present
    check (nullif(btrim(variant_key), '') is not null),
  add constraint dishes_availability_window
    check (available_until is null or available_from is null or available_until >= available_from),
  add constraint dishes_local_overrides_object
    check (jsonb_typeof(local_overrides) = 'object');

-- Preserve explicit legacy availability signals in the new indexed columns.
-- Unknown/missing values remain active rather than inventing an end date.
update public.dishes
set is_active = false
where lower(coalesce(availability ->> 'currently_available', 'true')) = 'false'
   or lower(coalesce(availability ->> 'out_of_stock', 'false')) = 'true';

comment on column public.restaurants.chain_name is
  'Deprecated compatibility field. Use restaurants.brand_id and brands.name; remove only after the additive rollout is fully verified.';
comment on column public.dishes.canonical_dish_id is
  'Shared brand product. ratings.dish_id intentionally continues to reference this exact branch offering row.';
comment on column public.dishes.is_active is
  'False when removed from the current menu. Historical dish and rating rows must remain in place.';

-- Physical branches may share a display name, and distinct canonical variants
-- may share a local menu label. New structural keys replace these old global
-- and name-only uniqueness rules.
alter table public.restaurants
  drop constraint if exists restaurants_name_key;
alter table public.dishes
  drop constraint if exists dishes_restaurant_id_name_key;
drop index if exists public.dishes_restaurant_name_idx;

with brand_source as (
  select
    lower(regexp_replace(
      btrim(coalesce(nullif(restaurant.chain_name, ''), restaurant.name)),
      '\s+', ' ', 'g'
    )) as brand_key,
    min(btrim(coalesce(nullif(restaurant.chain_name, ''), restaurant.name))) as name,
    bool_or(nullif(btrim(restaurant.chain_name), '') is not null) as is_chain,
    min(restaurant.created_at) as created_at
  from public.restaurants restaurant
  group by 1
)
insert into public.brands (name, brand_key, is_chain, created_at, updated_at)
select source.name, source.brand_key, source.is_chain, source.created_at, now()
from brand_source source
on conflict (brand_key) do update
set is_chain = public.brands.is_chain or excluded.is_chain,
    updated_at = now();

update public.restaurants restaurant
set brand_id = brand.id
from public.brands brand
where brand.brand_key = lower(regexp_replace(
  btrim(coalesce(nullif(restaurant.chain_name, ''), restaurant.name)),
  '\s+', ' ', 'g'
));

alter table public.restaurants
  alter column brand_id set not null,
  add constraint restaurants_brand_id_fkey
    foreign key (brand_id) references public.brands(id) on delete restrict,
  add constraint restaurants_id_brand_id_key unique (id, brand_id);

update public.dishes dish
set brand_id = restaurant.brand_id
from public.restaurants restaurant
where restaurant.id = dish.restaurant_id;

insert into public.canonical_dishes (
  brand_id,
  name,
  canonical_key,
  official_menu_item_id,
  description,
  short_description,
  course,
  diets,
  allergens,
  allergens_verified,
  allergen_details,
  nutrition,
  ingredients,
  meal_occasions,
  official_image_url,
  market_code,
  source_identifiers,
  data_sources,
  canonicalisation_method,
  review_status,
  version,
  is_current,
  valid_from,
  created_at,
  updated_at
)
select
  dish.brand_id,
  dish.name,
  'legacy:' || dish.id::text,
  coalesce(
    nullif(dish.data_sources ->> 'official_menu_item_id', ''),
    nullif(dish.data_sources #>> '{import_record,official_menu_item_id}', '')
  ),
  dish.description,
  dish.short_description,
  dish.course,
  dish.diets,
  dish.allergens,
  dish.allergens_verified,
  dish.allergen_details,
  dish.nutrition,
  dish.ingredients,
  dish.meal_occasions,
  dish.official_image_url,
  restaurant.country_code,
  jsonb_strip_nulls(jsonb_build_object(
    'legacy_dish_id', dish.id,
    'official_menu_item_id', coalesce(
      nullif(dish.data_sources ->> 'official_menu_item_id', ''),
      nullif(dish.data_sources #>> '{import_record,official_menu_item_id}', '')
    ),
    'source_record_key', coalesce(
      nullif(dish.data_sources ->> 'source_record_key', ''),
      nullif(dish.data_sources #>> '{import_record,source_record_key}', ''),
      nullif(dish.data_sources #>> '{import_record,record_key}', '')
    ),
    'source_dish_code', nullif(
      dish.data_sources #>> '{import_record,dish_code}', ''
    )
  )),
  dish.data_sources,
  'one_to_one_backfill',
  'unreviewed',
  1,
  true,
  dish.created_at::date,
  dish.created_at,
  dish.updated_at
from public.dishes dish
join public.restaurants restaurant on restaurant.id = dish.restaurant_id;

update public.dishes dish
set canonical_dish_id = canonical.id
from public.canonical_dishes canonical
join public.restaurants restaurant
  on restaurant.brand_id = canonical.brand_id
where dish.restaurant_id = restaurant.id
  and canonical.canonical_key = 'legacy:' || dish.id::text
  and canonical.market_code = restaurant.country_code;

alter table public.canonical_dishes
  add constraint canonical_dishes_id_brand_id_key unique (id, brand_id);

alter table public.dishes
  alter column brand_id set not null,
  alter column canonical_dish_id set not null,
  add constraint dishes_id_brand_id_key unique (id, brand_id),
  add constraint dishes_restaurant_canonical_variant_key
    unique (restaurant_id, canonical_dish_id, variant_key);

-- Replace the temporary single-column restaurant FK with composite FKs that
-- declaratively prove the restaurant and canonical dish have the same brand.
alter table public.dishes
  drop constraint dishes_restaurant_id_fkey;
alter table public.dishes
  add constraint dishes_restaurant_brand_fkey
    foreign key (restaurant_id, brand_id)
    references public.restaurants(id, brand_id)
    on delete restrict
    not valid,
  add constraint dishes_canonical_brand_fkey
    foreign key (canonical_dish_id, brand_id)
    references public.canonical_dishes(id, brand_id)
    on delete restrict
    not valid;
alter table public.dishes
  validate constraint dishes_restaurant_brand_fkey;
alter table public.dishes
  validate constraint dishes_canonical_brand_fkey;

create index restaurants_brand_id_idx on public.restaurants (brand_id);
create index restaurants_city_idx on public.restaurants (city);
create index restaurants_name_idx on public.restaurants (lower(name));
create index dishes_canonical_dish_id_idx on public.dishes (canonical_dish_id);
create index dishes_restaurant_id_idx on public.dishes (restaurant_id);
create index canonical_dishes_official_item_idx
  on public.canonical_dishes (brand_id, market_code, official_menu_item_id)
  where official_menu_item_id is not null;

-- Unreliable imports may place candidates in this queue, but nothing in the
-- queue rewrites dishes.canonical_dish_id. A service-side reviewer must first
-- approve the suggestion and then perform a separately audited merge.
create table public.canonical_dish_match_suggestions (
  id bigint generated by default as identity primary key,
  dish_id bigint not null,
  candidate_canonical_dish_id bigint not null,
  brand_id bigint not null,
  confidence numeric(5, 4) check (confidence is null or confidence between 0 and 1),
  reason_codes text[] not null default '{}',
  evidence jsonb not null default '{}'
    check (jsonb_typeof(evidence) = 'object'),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canonical_match_suggestion_unique
    unique (dish_id, candidate_canonical_dish_id),
  constraint canonical_match_suggestion_dish_brand_fkey
    foreign key (dish_id, brand_id)
    references public.dishes(id, brand_id) on delete restrict,
  constraint canonical_match_suggestion_candidate_brand_fkey
    foreign key (candidate_canonical_dish_id, brand_id)
    references public.canonical_dishes(id, brand_id) on delete restrict,
  constraint canonical_match_suggestion_review_state check (
    (status = 'pending' and reviewed_at is null)
    or (status in ('approved', 'rejected') and reviewed_at is not null)
  )
);

comment on table public.canonical_dish_match_suggestions is
  'Internal manual-review queue. Suggestions never merge branch dishes automatically.';

-- Public catalogues need global aggregates while raw ratings, comments, meal
-- history and photos remain owner-only. This derived table is readable but not
-- writable by clients and is maintained by locked-down private triggers.
create table public.dish_rating_rollups (
  dish_id bigint primary key references public.dishes(id) on delete restrict,
  rating_count bigint not null default 0 check (rating_count >= 0),
  score_sum numeric not null default 0 check (score_sum >= 0),
  repeat_yes_count bigint not null default 0 check (repeat_yes_count >= 0),
  repeat_response_count bigint not null default 0
    check (repeat_response_count >= 0 and repeat_response_count >= repeat_yes_count),
  rating_tag_counts jsonb not null default '{}'
    check (jsonb_typeof(rating_tag_counts) = 'object'),
  user_photo_count bigint not null default 0 check (user_photo_count >= 0),
  updated_at timestamptz not null default now()
);

comment on table public.dish_rating_rollups is
  'Non-sensitive aggregate boundary used by security-invoker catalogue views. Raw ratings remain protected by owner-only RLS.';

insert into public.dish_rating_rollups (
  dish_id,
  rating_count,
  score_sum,
  repeat_yes_count,
  repeat_response_count,
  rating_tag_counts,
  user_photo_count,
  updated_at
)
select
  dish.id,
  coalesce(rating_stats.rating_count, 0),
  coalesce(rating_stats.score_sum, 0),
  coalesce(rating_stats.repeat_yes_count, 0),
  coalesce(rating_stats.repeat_response_count, 0),
  coalesce(tag_stats.rating_tag_counts, '{}'::jsonb),
  coalesce(photo_stats.user_photo_count, 0),
  now()
from public.dishes dish
left join lateral (
  select
    count(*)::bigint as rating_count,
    coalesce(sum(rating.score), 0)::numeric as score_sum,
    count(*) filter (where rating.would_order_again is true)::bigint
      as repeat_yes_count,
    count(*) filter (where rating.would_order_again is not null)::bigint
      as repeat_response_count
  from public.ratings rating
  where rating.dish_id = dish.id
) rating_stats on true
left join lateral (
  select jsonb_object_agg(tag_count.tag, tag_count.total order by tag_count.total desc)
    as rating_tag_counts
  from (
    select lower(btrim(tag.value)) as tag, count(*)::bigint as total
    from public.ratings rating
    cross join lateral unnest(rating.tags) as tag(value)
    where rating.dish_id = dish.id
      and nullif(btrim(tag.value), '') is not null
    group by lower(btrim(tag.value))
  ) tag_count
) tag_stats on true
left join lateral (
  select count(photo.id)::bigint as user_photo_count
  from public.rating_photos photo
  join public.ratings rating on rating.id = photo.rating_id
  where rating.dish_id = dish.id
) photo_stats on true;

create or replace function private.refresh_dish_rating_rollup(target_dish_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_dish_id is null then
    return;
  end if;

  -- Rating/photo triggers can run concurrently for the same dish. Serialize
  -- the aggregate statement per dish so the waiter takes a fresh READ
  -- COMMITTED snapshot after the preceding transaction commits.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'plate:dish-rating-rollup:' || target_dish_id::text,
      0
    )
  );

  insert into public.dish_rating_rollups (
    dish_id,
    rating_count,
    score_sum,
    repeat_yes_count,
    repeat_response_count,
    rating_tag_counts,
    user_photo_count,
    updated_at
  )
  select
    dish.id,
    coalesce(rating_stats.rating_count, 0),
    coalesce(rating_stats.score_sum, 0),
    coalesce(rating_stats.repeat_yes_count, 0),
    coalesce(rating_stats.repeat_response_count, 0),
    coalesce(tag_stats.rating_tag_counts, '{}'::jsonb),
    coalesce(photo_stats.user_photo_count, 0),
    now()
  from public.dishes dish
  left join lateral (
    select
      count(*)::bigint as rating_count,
      coalesce(sum(rating.score), 0)::numeric as score_sum,
      count(*) filter (where rating.would_order_again is true)::bigint
        as repeat_yes_count,
      count(*) filter (where rating.would_order_again is not null)::bigint
        as repeat_response_count
    from public.ratings rating
    where rating.dish_id = dish.id
  ) rating_stats on true
  left join lateral (
    select jsonb_object_agg(tag_count.tag, tag_count.total order by tag_count.total desc)
      as rating_tag_counts
    from (
      select lower(btrim(tag.value)) as tag, count(*)::bigint as total
      from public.ratings rating
      cross join lateral unnest(rating.tags) as tag(value)
      where rating.dish_id = dish.id
        and nullif(btrim(tag.value), '') is not null
      group by lower(btrim(tag.value))
    ) tag_count
  ) tag_stats on true
  left join lateral (
    select count(photo.id)::bigint as user_photo_count
    from public.rating_photos photo
    join public.ratings rating on rating.id = photo.rating_id
    where rating.dish_id = dish.id
  ) photo_stats on true
  where dish.id = target_dish_id
  on conflict (dish_id) do update
  set rating_count = excluded.rating_count,
      score_sum = excluded.score_sum,
      repeat_yes_count = excluded.repeat_yes_count,
      repeat_response_count = excluded.repeat_response_count,
      rating_tag_counts = excluded.rating_tag_counts,
      user_photo_count = excluded.user_photo_count,
      updated_at = excluded.updated_at;
end;
$$;

create or replace function private.handle_rating_rollup_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform private.refresh_dish_rating_rollup(old.dish_id);
    return old;
  end if;

  if tg_op = 'UPDATE' and old.dish_id is distinct from new.dish_id then
    -- Advisory transaction locks are held until commit. Stable ordering avoids
    -- deadlocks when two transactions move ratings in opposite directions.
    if old.dish_id < new.dish_id then
      perform private.refresh_dish_rating_rollup(old.dish_id);
      perform private.refresh_dish_rating_rollup(new.dish_id);
    else
      perform private.refresh_dish_rating_rollup(new.dish_id);
      perform private.refresh_dish_rating_rollup(old.dish_id);
    end if;
  else
    perform private.refresh_dish_rating_rollup(new.dish_id);
  end if;

  return new;
end;
$$;

create or replace function private.handle_new_dish_rollup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.refresh_dish_rating_rollup(new.id);
  return new;
end;
$$;

create or replace function private.handle_rating_photo_rollup_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_dish_id bigint;
  new_dish_id bigint;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    select rating.dish_id
    into old_dish_id
    from public.ratings rating
    where rating.id = old.rating_id;
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    select rating.dish_id
    into new_dish_id
    from public.ratings rating
    where rating.id = new.rating_id;
  end if;

  if old_dish_id is not null
     and new_dish_id is not null
     and old_dish_id is distinct from new_dish_id then
    if old_dish_id < new_dish_id then
      perform private.refresh_dish_rating_rollup(old_dish_id);
      perform private.refresh_dish_rating_rollup(new_dish_id);
    else
      perform private.refresh_dish_rating_rollup(new_dish_id);
      perform private.refresh_dish_rating_rollup(old_dish_id);
    end if;
  elsif old_dish_id is not null then
    perform private.refresh_dish_rating_rollup(old_dish_id);
  else
    perform private.refresh_dish_rating_rollup(new_dish_id);
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke all on function private.refresh_dish_rating_rollup(bigint)
  from public, anon, authenticated;
revoke all on function private.handle_rating_rollup_change()
  from public, anon, authenticated;
revoke all on function private.handle_new_dish_rollup()
  from public, anon, authenticated;
revoke all on function private.handle_rating_photo_rollup_change()
  from public, anon, authenticated;
grant execute on function private.refresh_dish_rating_rollup(bigint) to service_role;

drop trigger if exists dishes_initialize_rating_rollup on public.dishes;
create trigger dishes_initialize_rating_rollup
after insert on public.dishes
for each row execute function private.handle_new_dish_rollup();

drop trigger if exists ratings_refresh_dish_rollup on public.ratings;
create trigger ratings_refresh_dish_rollup
after insert or update or delete on public.ratings
for each row execute function private.handle_rating_rollup_change();

drop trigger if exists rating_photos_refresh_dish_rollup on public.rating_photos;
create trigger rating_photos_refresh_dish_rollup
after insert or update or delete on public.rating_photos
for each row execute function private.handle_rating_photo_rollup_change();

drop trigger if exists brands_set_updated_at on public.brands;
create trigger brands_set_updated_at
before update on public.brands
for each row execute function public.set_plate_updated_at();

drop trigger if exists canonical_dishes_set_updated_at on public.canonical_dishes;
create trigger canonical_dishes_set_updated_at
before update on public.canonical_dishes
for each row execute function public.set_plate_updated_at();

drop trigger if exists canonical_match_suggestions_set_updated_at
  on public.canonical_dish_match_suggestions;
create trigger canonical_match_suggestions_set_updated_at
before update on public.canonical_dish_match_suggestions
for each row execute function public.set_plate_updated_at();

-- The branch-oriented dish catalogue remains backwards compatible: id is
-- always the exact public.dishes.id. Canonical/city/overall fields and the
-- branches array add grouped browsing without weakening meal-history identity.
drop view if exists public.dish_catalog;

create view public.dish_catalog
with (security_barrier = true, security_invoker = true)
as
with city_rating_stats as (
  select
    dish.canonical_dish_id,
    lower(btrim(restaurant.city)) as city_key,
    sum(rollup.score_sum) as score_sum,
    sum(rollup.rating_count)::bigint as rating_count
  from public.dishes dish
  join public.restaurants restaurant on restaurant.id = dish.restaurant_id
  join public.dish_rating_rollups rollup on rollup.dish_id = dish.id
  group by dish.canonical_dish_id, lower(btrim(restaurant.city))
),
overall_rating_stats as (
  select
    dish.canonical_dish_id,
    sum(rollup.score_sum) as score_sum,
    sum(rollup.rating_count)::bigint as rating_count
  from public.dishes dish
  join public.dish_rating_rollups rollup on rollup.dish_id = dish.id
  group by dish.canonical_dish_id
),
city_offering_stats as (
  select
    dish.canonical_dish_id,
    lower(btrim(restaurant.city)) as city_key,
    min(dish.price) filter (
      where dish.is_active
        and (dish.available_from is null or dish.available_from <= current_date)
        and (dish.available_until is null or dish.available_until >= current_date)
    ) as min_price,
    max(dish.price) filter (
      where dish.is_active
        and (dish.available_from is null or dish.available_from <= current_date)
        and (dish.available_until is null or dish.available_until >= current_date)
    ) as max_price,
    count(distinct restaurant.id) filter (
      where dish.is_active
        and (dish.available_from is null or dish.available_from <= current_date)
        and (dish.available_until is null or dish.available_until >= current_date)
    )::bigint as branch_count,
    jsonb_agg(
      jsonb_build_object(
        'dish_id', dish.id,
        'dish_name', dish.name,
        'restaurant_id', restaurant.id,
        'restaurant_name', restaurant.name,
        'branch_name', restaurant.branch_name,
        'area', restaurant.area,
        'city', restaurant.city,
        'country_code', restaurant.country_code,
        'latitude', restaurant.latitude,
        'longitude', restaurant.longitude,
        'price', dish.price,
        'variant_key', dish.variant_key,
        'is_active', dish.is_active,
        'is_currently_available', (
          dish.is_active
          and (dish.available_from is null or dish.available_from <= current_date)
          and (dish.available_until is null or dish.available_until >= current_date)
        ),
        'available_from', dish.available_from,
        'available_until', dish.available_until,
        'score', coalesce(
          round(rollup.score_sum / nullif(rollup.rating_count, 0), 1),
          0
        ),
        'rating_count', rollup.rating_count
      )
      order by restaurant.name, restaurant.branch_name, dish.variant_key, dish.id
    ) filter (
      where dish.is_active
        and (dish.available_from is null or dish.available_from <= current_date)
        and (dish.available_until is null or dish.available_until >= current_date)
    ) as branches
  from public.dishes dish
  join public.restaurants restaurant on restaurant.id = dish.restaurant_id
  join public.dish_rating_rollups rollup on rollup.dish_id = dish.id
  group by dish.canonical_dish_id, lower(btrim(restaurant.city))
)
select
  dish.id,
  dish.restaurant_id,
  dish.canonical_dish_id,
  canonical.name as canonical_name,
  dish.brand_id,
  brand.name as brand_name,
  canonical.market_code,
  canonical.version as canonical_version,
  canonical.review_status as canonical_review_status,
  dish.name,
  dish.price,
  dish.description,
  dish.short_description,
  dish.course,
  dish.menu_position,
  dish.diets,
  dish.allergens,
  dish.allergens_verified,
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
  dish.variant_key,
  dish.is_active,
  dish.available_from,
  dish.available_until,
  dish.local_overrides,
  dish.created_at,
  dish.updated_at,
  restaurant.name as restaurant_name,
  restaurant.chain_name,
  restaurant.branch_name,
  restaurant.area,
  restaurant.cuisine,
  restaurant.city,
  restaurant.country_code,
  restaurant.latitude,
  restaurant.longitude,
  coalesce(
    round(branch_rollup.score_sum / nullif(branch_rollup.rating_count, 0), 1),
    0
  )::double precision as score,
  branch_rollup.rating_count as rating_count,
  coalesce(
    round(branch_rollup.score_sum / nullif(branch_rollup.rating_count, 0), 1),
    0
  )::double precision as branch_score,
  branch_rollup.rating_count as branch_rating_count,
  coalesce(
    round(city_ratings.score_sum / nullif(city_ratings.rating_count, 0), 1),
    0
  )::double precision as city_score,
  coalesce(city_ratings.rating_count, 0)::bigint as city_rating_count,
  coalesce(
    round(overall_ratings.score_sum / nullif(overall_ratings.rating_count, 0), 1),
    0
  )::double precision as overall_score,
  coalesce(overall_ratings.rating_count, 0)::bigint as overall_rating_count,
  coalesce(
    round(
      branch_rollup.repeat_yes_count::numeric
      / nullif(branch_rollup.repeat_response_count, 0),
      3
    ),
    0
  )::double precision as repeat_order_rate,
  branch_rollup.user_photo_count,
  coalesce(tag_stats.tag_counts, '{}'::jsonb) as tag_counts,
  coalesce(tag_stats.search_tags, '{}'::text[]) as search_tags,
  offerings.min_price,
  offerings.max_price,
  offerings.branch_count,
  coalesce(offerings.branches, '[]'::jsonb) as branches
from public.dishes dish
join public.restaurants restaurant on restaurant.id = dish.restaurant_id
join public.brands brand on brand.id = dish.brand_id
join public.canonical_dishes canonical on canonical.id = dish.canonical_dish_id
join public.dish_rating_rollups branch_rollup on branch_rollup.dish_id = dish.id
left join city_rating_stats city_ratings
  on city_ratings.canonical_dish_id = dish.canonical_dish_id
  and city_ratings.city_key = lower(btrim(restaurant.city))
left join overall_rating_stats overall_ratings
  on overall_ratings.canonical_dish_id = dish.canonical_dish_id
left join city_offering_stats offerings
  on offerings.canonical_dish_id = dish.canonical_dish_id
  and offerings.city_key = lower(btrim(restaurant.city))
left join lateral (
  select
    jsonb_object_agg(initcap(tag_rollup.tag), tag_rollup.total order by tag_rollup.total desc)
      as tag_counts,
    array_agg(tag_rollup.tag order by tag_rollup.total desc) as search_tags
  from (
    select source.tag, sum(source.total)::bigint as total
    from (
      select lower(btrim(crowd.key)) as tag, crowd.value::bigint as total
      from jsonb_each_text(dish.crowd_tags) crowd
      where nullif(btrim(crowd.key), '') is not null

      union all

      select lower(btrim(user_tag.key)) as tag, user_tag.value::bigint as total
      from jsonb_each_text(branch_rollup.rating_tag_counts) user_tag
      where nullif(btrim(user_tag.key), '') is not null
    ) source
    group by source.tag
  ) tag_rollup
) tag_stats on true;

drop view if exists public.restaurant_catalog;

create view public.restaurant_catalog
with (security_barrier = true, security_invoker = true)
as
select
  restaurant.id,
  restaurant.brand_id,
  brand.name as brand_name,
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
  coalesce(
    round(sum(rollup.score_sum) / nullif(sum(rollup.rating_count), 0), 1),
    0
  )::double precision as score,
  coalesce(sum(rollup.rating_count), 0)::bigint as rating_count,
  count(dish.id) filter (
    where dish.is_active
      and (dish.available_from is null or dish.available_from <= current_date)
      and (dish.available_until is null or dish.available_until >= current_date)
  )::bigint as active_dish_count
from public.restaurants restaurant
join public.brands brand on brand.id = restaurant.brand_id
left join public.dishes dish on dish.restaurant_id = restaurant.id
left join public.dish_rating_rollups rollup on rollup.dish_id = dish.id
group by
  restaurant.id,
  restaurant.brand_id,
  brand.name,
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
  restaurant.updated_at;

alter table public.brands enable row level security;
alter table public.canonical_dishes enable row level security;
alter table public.canonical_dish_match_suggestions enable row level security;
alter table public.dish_rating_rollups enable row level security;

drop policy if exists "Brands are public" on public.brands;
create policy "Brands are public"
on public.brands for select
to anon, authenticated
using (true);

drop policy if exists "Canonical dishes are public" on public.canonical_dishes;
create policy "Canonical dishes are public"
on public.canonical_dishes for select
to anon, authenticated
using (true);

drop policy if exists "Dish rating rollups are public" on public.dish_rating_rollups;
create policy "Dish rating rollups are public"
on public.dish_rating_rollups for select
to anon, authenticated
using (true);

drop policy if exists "Service role manages canonical match suggestions"
  on public.canonical_dish_match_suggestions;
create policy "Service role manages canonical match suggestions"
on public.canonical_dish_match_suggestions for all
to service_role
using (true)
with check (true);

-- Remove out-of-band duplicate policies and keep one least-privilege policy
-- per operation. Wrapping auth.uid() avoids per-row re-evaluation.
drop policy if exists "Anyone can view dishes" on public.dishes;
drop policy if exists "Dishes are public" on public.dishes;
create policy "Dishes are public"
on public.dishes for select
to anon, authenticated
using (true);

drop policy if exists "Restaurants are public" on public.restaurants;
create policy "Restaurants are public"
on public.restaurants for select
to anon, authenticated
using (true);

drop policy if exists "Users can submit one rating as themselves" on public.ratings;
drop policy if exists "Users can view their own ratings" on public.ratings;
drop policy if exists "Ratings are owner managed" on public.ratings;
create policy "Ratings are owner managed"
on public.ratings for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Profiles are owner managed" on public.profiles;
create policy "Profiles are owner managed"
on public.profiles for all
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Rating photos are owner managed" on public.rating_photos;
create policy "Rating photos are owner managed"
on public.rating_photos for all
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.ratings rating
    where rating.id = rating_id
      and rating.user_id = (select auth.uid())
  )
);

-- Explicit grants are required by Supabase's 2026 Data API defaults. Client
-- roles can read catalogue data but cannot mutate brands, canonical products,
-- rollups, or the internal review queue.
revoke all on public.brands, public.canonical_dishes,
  public.canonical_dish_match_suggestions, public.dish_rating_rollups
  from anon, authenticated;
grant select on public.brands, public.canonical_dishes, public.dish_rating_rollups
  to anon, authenticated;
grant all on public.brands, public.canonical_dishes,
  public.canonical_dish_match_suggestions, public.dish_rating_rollups
  to service_role;

grant select on public.restaurants, public.dishes,
  public.dish_catalog, public.restaurant_catalog
  to anon, authenticated;
grant select on public.dish_catalog, public.restaurant_catalog to service_role;
grant usage, select on all sequences in schema public to service_role;

revoke all on public.profiles, public.ratings, public.rating_photos from anon;
grant select, insert, update, delete
  on public.profiles, public.ratings, public.rating_photos
  to authenticated;

create table if not exists archive.migration_integrity_checks (
  migration_name text primary key,
  checked_at timestamptz not null default transaction_timestamp(),
  baseline jsonb not null,
  result jsonb not null,
  passed boolean not null
);

do $$
declare
  baseline record;
  current_dish_count bigint;
  current_dish_fingerprint text;
  current_rating_count bigint;
  current_rating_fingerprint text;
  current_photo_count bigint;
  current_photo_fingerprint text;
  current_storage_photo_count bigint;
  rollup_rating_count bigint;
  source_score_sum numeric;
  rollup_score_sum numeric;
begin
  select * into baseline from plate_canonical_migration_snapshot;

  select count(*), md5(coalesce(string_agg(dish.id::text, ',' order by dish.id), ''))
  into current_dish_count, current_dish_fingerprint
  from public.dishes dish;

  select
    count(*),
    md5(coalesce(string_agg(
      rating.id::text || ':' || rating.dish_id::text,
      ',' order by rating.id
    ), ''))
  into current_rating_count, current_rating_fingerprint
  from public.ratings rating;

  select
    count(*),
    md5(coalesce(string_agg(
      photo.id::text || ':' || photo.rating_id::text || ':' || photo.storage_path,
      ',' order by photo.id
    ), ''))
  into current_photo_count, current_photo_fingerprint
  from public.rating_photos photo;

  select count(*)
  into current_storage_photo_count
  from storage.objects object
  where object.bucket_id = 'meal-photos';

  if current_dish_count <> baseline.dish_count
     or current_dish_fingerprint <> baseline.dish_id_fingerprint then
    raise exception 'Dish IDs changed during canonical migration';
  end if;

  if current_rating_count <> baseline.rating_count
     or current_rating_fingerprint <> baseline.rating_dish_fingerprint then
    raise exception 'Ratings/meal-history relationships changed during canonical migration';
  end if;

  if current_photo_count <> baseline.photo_count
     or current_photo_fingerprint <> baseline.photo_fingerprint then
    raise exception 'Rating photo metadata changed during canonical migration';
  end if;

  if current_storage_photo_count <> baseline.storage_photo_count then
    raise exception 'Meal photo storage object count changed during canonical migration';
  end if;

  if (select count(*) from public.canonical_dishes) <> current_dish_count
     or (select count(distinct canonical_dish_id) from public.dishes) <> current_dish_count then
    raise exception 'Initial canonical backfill is not exactly one-to-one with dishes';
  end if;

  if exists (
    select 1
    from public.dishes dish
    join public.restaurants restaurant on restaurant.id = dish.restaurant_id
    join public.canonical_dishes canonical on canonical.id = dish.canonical_dish_id
    where dish.brand_id <> restaurant.brand_id
       or dish.brand_id <> canonical.brand_id
  ) then
    raise exception 'A branch offering crosses restaurant/canonical brand boundaries';
  end if;

  if (select count(*) from public.dish_rating_rollups) <> current_dish_count then
    raise exception 'A dish rating rollup row is missing';
  end if;

  select coalesce(sum(rollup.rating_count), 0), coalesce(sum(rollup.score_sum), 0)
  into rollup_rating_count, rollup_score_sum
  from public.dish_rating_rollups rollup;

  select coalesce(sum(rating.score), 0)
  into source_score_sum
  from public.ratings rating;

  if rollup_rating_count <> current_rating_count
     or rollup_score_sum <> source_score_sum then
    raise exception 'Rating rollup totals do not match protected source ratings';
  end if;

  if (select count(*) from public.dish_catalog) <> current_dish_count then
    raise exception 'dish_catalog is not branch-oriented one-row-per-dish';
  end if;

  if (select count(*) from public.restaurant_catalog)
     <> (select count(*) from public.restaurants) then
    raise exception 'restaurant_catalog is not one-row-per-physical-branch';
  end if;

  if (
    select count(*)
    from public.restaurants restaurant
    where lower(btrim(coalesce(restaurant.chain_name, restaurant.name))) = 'bella italia'
      and lower(btrim(restaurant.city)) = 'oxford'
      and lower(btrim(restaurant.area)) = 'george street'
      and regexp_replace(
        lower(coalesce(restaurant.branch_name, '')),
        '[^a-z0-9]+', '', 'g'
      ) = 'oxfordgeorgestreet'
  ) > 1 then
    raise exception 'Bella Italia George Street duplicate remains after consolidation';
  end if;
end;
$$;

insert into archive.migration_integrity_checks (
  migration_name,
  baseline,
  result,
  passed
)
select
  '20260720170223_canonical_chain_dishes',
  jsonb_build_object(
    'dishes', snapshot.dish_count,
    'dish_id_fingerprint', snapshot.dish_id_fingerprint,
    'ratings_and_meal_history', snapshot.rating_count,
    'rating_dish_fingerprint', snapshot.rating_dish_fingerprint,
    'rating_photos', snapshot.photo_count,
    'photo_fingerprint', snapshot.photo_fingerprint,
    'meal_photo_storage_objects', snapshot.storage_photo_count
  ),
  jsonb_build_object(
    'dishes', (select count(*) from public.dishes),
    'canonical_dishes', (select count(*) from public.canonical_dishes),
    'ratings_and_meal_history', (select count(*) from public.ratings),
    'rating_photos', (select count(*) from public.rating_photos),
    'meal_photo_storage_objects', (
      select count(*) from storage.objects object where object.bucket_id = 'meal-photos'
    ),
    'brands', (select count(*) from public.brands),
    'physical_restaurants', (select count(*) from public.restaurants),
    'bella_rows_archived', (
      select count(*) from archive.restaurant_merges_20260720170223
    )
  ),
  true
from plate_canonical_migration_snapshot snapshot
on conflict (migration_name) do update
set checked_at = transaction_timestamp(),
    baseline = excluded.baseline,
    result = excluded.result,
    passed = excluded.passed;

-- Archive data is outside the exposed schema already; RLS adds defence in
-- depth and the service role retains read-only recovery access.
do $$
declare
  archive_table record;
begin
  for archive_table in
    select table_name
    from information_schema.tables
    where table_schema = 'archive'
      and table_type = 'BASE TABLE'
  loop
    execute format('alter table archive.%I enable row level security', archive_table.table_name);
  end loop;
end;
$$;

revoke all on all tables in schema archive
  from public, anon, authenticated, service_role;
grant select on all tables in schema archive to service_role;

notify pgrst, 'reload schema';

commit;
