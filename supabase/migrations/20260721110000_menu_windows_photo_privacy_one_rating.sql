begin;

set local lock_timeout = '10s';
set local statement_timeout = '10min';

-- ---------------------------------------------------------------------------
-- 1. Menu time windows: dishes carry menu tags (lunch/dinner/etc.), restaurants
--    declare a time range per tag. A dish with no specific tag (or the
--    'all_day' tag) is always shown regardless of the selected meal time.
-- ---------------------------------------------------------------------------

alter table public.dishes
  add column if not exists menu_tags text[] not null default '{all_day}';

alter table public.restaurants
  add column if not exists menu_windows jsonb not null default '{}';

alter table public.restaurants
  add constraint restaurants_menu_windows_object
    check (jsonb_typeof(menu_windows) = 'object');

comment on column public.dishes.menu_tags is
  'Which service(s) this dish appears on, e.g. {lunch}, {dinner}, {breakfast,lunch}. {all_day} (the default) is always shown.';
comment on column public.restaurants.menu_windows is
  'Time-of-day ranges per menu tag, e.g. {"lunch": {"start": "11:00", "end": "15:00"}, "dinner": {"start": "17:00", "end": "22:00"}}. A tag with no entry here is treated as always available.';

-- ---------------------------------------------------------------------------
-- 2. Photo privacy: photos are public by default and attached to the dish
--    they were taken of, but a diner can mark their own photos private.
-- ---------------------------------------------------------------------------

alter table public.rating_photos
  add column if not exists is_private boolean not null default false;

comment on column public.rating_photos.is_private is
  'False (default) means the photo is visible to any visitor via public.dish_photos. True restricts it to the uploader.';

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

drop policy if exists "Public rating photos are viewable" on public.rating_photos;
create policy "Public rating photos are viewable"
on public.rating_photos for select
to anon, authenticated
using (is_private = false);

grant select on public.rating_photos to anon;

drop policy if exists "Meal photos are owner readable" on storage.objects;
create policy "Meal photos are owner readable"
on storage.objects for select
to authenticated
using (
  bucket_id = 'meal-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Public meal photos are readable" on storage.objects;
create policy "Public meal photos are readable"
on storage.objects for select
to anon, authenticated
using (
  bucket_id = 'meal-photos'
  and exists (
    select 1
    from public.rating_photos photo
    where photo.storage_path = storage.objects.name
      and photo.is_private = false
  )
);

drop view if exists public.dish_photos;
create view public.dish_photos
with (security_barrier = true, security_invoker = true)
as
select
  photo.id,
  rating.dish_id,
  dish.canonical_dish_id,
  photo.storage_path,
  photo.created_at
from public.rating_photos photo
join public.ratings rating on rating.id = photo.rating_id
join public.dishes dish on dish.id = rating.dish_id
where photo.is_private = false;

grant select on public.dish_photos to anon, authenticated;
grant select on public.dish_photos to service_role;

-- ---------------------------------------------------------------------------
-- 3. One rating per canonical dish per user. A later rating overwrites the
--    previous one instead of creating a new row; logging a new visit for a
--    dish the user already rated edits that same rating.
--
--    Existing duplicate rows (mostly seeded popularity data: many rows for
--    one seed user against the same dish) are deduped down to a single
--    survivor row per (user, canonical dish). The count/score removed by
--    deduping is preserved as a separate "legacy" aggregate on the branch's
--    rollup row so displayed scores and rating counts do not collapse.
-- ---------------------------------------------------------------------------

create schema if not exists archive;

alter table public.ratings
  add column if not exists canonical_dish_id bigint;

update public.ratings rating
set canonical_dish_id = dish.canonical_dish_id
from public.dishes dish
where dish.id = rating.dish_id
  and rating.canonical_dish_id is null;

create table if not exists archive.ratings_deduped_20260721110000 as
select * from public.ratings where false;

alter table archive.ratings_deduped_20260721110000 enable row level security;
revoke all on archive.ratings_deduped_20260721110000 from public, anon, authenticated;
grant select on archive.ratings_deduped_20260721110000 to service_role;

with ranked as (
  select
    rating.id,
    rating.user_id,
    rating.canonical_dish_id,
    rating.dish_id,
    rating.score,
    row_number() over (
      partition by rating.user_id, rating.canonical_dish_id
      order by rating.visited_at desc, rating.created_at desc, rating.id desc
    ) as rank,
    first_value(rating.id) over (
      partition by rating.user_id, rating.canonical_dish_id
      order by rating.visited_at desc, rating.created_at desc, rating.id desc
    ) as survivor_id
  from public.ratings rating
),
losers as (
  select * from ranked where rank > 1
)
insert into archive.ratings_deduped_20260721110000
select rating.*
from public.ratings rating
join losers on losers.id = rating.id;

-- Move any photos on a losing rating onto the surviving rating so real user
-- uploads are never lost.
with ranked as (
  select
    rating.id,
    rating.user_id,
    rating.canonical_dish_id,
    first_value(rating.id) over (
      partition by rating.user_id, rating.canonical_dish_id
      order by rating.visited_at desc, rating.created_at desc, rating.id desc
    ) as survivor_id
  from public.ratings rating
)
update public.rating_photos photo
set rating_id = ranked.survivor_id
from ranked
where ranked.id = photo.rating_id
  and ranked.id <> ranked.survivor_id;

-- Preserve the popularity that deduped rows represented. Legacy rows in this
-- dataset always share the survivor's exact dish_id (the seed loop inserted
-- many rows against one branch dish), so the leftover count/score is banked
-- against that same branch's rollup row.
alter table public.dish_rating_rollups
  add column if not exists legacy_rating_count bigint not null default 0
    check (legacy_rating_count >= 0),
  add column if not exists legacy_score_sum numeric not null default 0
    check (legacy_score_sum >= 0);

with ranked as (
  select
    rating.id,
    rating.dish_id,
    rating.score,
    row_number() over (
      partition by rating.user_id, rating.canonical_dish_id
      order by rating.visited_at desc, rating.created_at desc, rating.id desc
    ) as rank,
    first_value(rating.dish_id) over (
      partition by rating.user_id, rating.canonical_dish_id
      order by rating.visited_at desc, rating.created_at desc, rating.id desc
    ) as survivor_dish_id
  from public.ratings rating
),
losers as (
  select survivor_dish_id as dish_id, count(*)::bigint as removed_count, sum(score) as removed_score
  from ranked
  where rank > 1
  group by survivor_dish_id
)
update public.dish_rating_rollups rollup
set legacy_rating_count = rollup.legacy_rating_count + losers.removed_count,
    legacy_score_sum = rollup.legacy_score_sum + losers.removed_score
from losers
where losers.dish_id = rollup.dish_id;

delete from public.ratings rating
using (
  select id from (
    select
      id,
      row_number() over (
        partition by user_id, canonical_dish_id
        order by visited_at desc, created_at desc, id desc
      ) as rank
    from public.ratings
  ) ranked
  where ranked.rank > 1
) losers
where losers.id = rating.id;

alter table public.ratings
  alter column canonical_dish_id set not null;

alter table public.ratings
  add constraint ratings_user_canonical_dish_unique unique (user_id, canonical_dish_id);

create or replace function private.set_rating_canonical_dish_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select dish.canonical_dish_id
  into new.canonical_dish_id
  from public.dishes dish
  where dish.id = new.dish_id;

  if new.canonical_dish_id is null then
    raise exception 'Unknown dish_id % for rating', new.dish_id;
  end if;

  return new;
end;
$$;

revoke all on function private.set_rating_canonical_dish_id()
  from public, anon, authenticated;

drop trigger if exists ratings_set_canonical_dish_id on public.ratings;
create trigger ratings_set_canonical_dish_id
before insert or update of dish_id on public.ratings
for each row execute function private.set_rating_canonical_dish_id();

create index if not exists ratings_canonical_dish_idx
  on public.ratings (canonical_dish_id);

-- ---------------------------------------------------------------------------
-- 4. Rebuild the rollup refresh function and catalogue views so legacy counts
--    add to (rather than replace) live-computed scores and counts, and so
--    menu tags / menu windows / photo counts reach the client.
-- ---------------------------------------------------------------------------

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

drop view if exists public.dish_catalog;
drop view if exists public.restaurant_catalog;

create view public.dish_catalog
with (security_barrier = true, security_invoker = true)
as
with city_rating_stats as (
  select
    dish.canonical_dish_id,
    lower(btrim(restaurant.city)) as city_key,
    sum(rollup.score_sum + rollup.legacy_score_sum) as score_sum,
    sum(rollup.rating_count + rollup.legacy_rating_count)::bigint as rating_count
  from public.dishes dish
  join public.restaurants restaurant on restaurant.id = dish.restaurant_id
  join public.dish_rating_rollups rollup on rollup.dish_id = dish.id
  group by dish.canonical_dish_id, lower(btrim(restaurant.city))
),
overall_rating_stats as (
  select
    dish.canonical_dish_id,
    sum(rollup.score_sum + rollup.legacy_score_sum) as score_sum,
    sum(rollup.rating_count + rollup.legacy_rating_count)::bigint as rating_count
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
        'menu_tags', to_jsonb(dish.menu_tags),
        'menu_windows', restaurant.menu_windows,
        'score', coalesce(
          round((rollup.score_sum + rollup.legacy_score_sum) / nullif(rollup.rating_count + rollup.legacy_rating_count, 0), 1),
          0
        ),
        'rating_count', rollup.rating_count + rollup.legacy_rating_count
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
  dish.menu_tags,
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
  restaurant.menu_windows,
  coalesce(
    round((branch_rollup.score_sum + branch_rollup.legacy_score_sum) / nullif(branch_rollup.rating_count + branch_rollup.legacy_rating_count, 0), 1),
    0
  )::double precision as score,
  branch_rollup.rating_count + branch_rollup.legacy_rating_count as rating_count,
  coalesce(
    round((branch_rollup.score_sum + branch_rollup.legacy_score_sum) / nullif(branch_rollup.rating_count + branch_rollup.legacy_rating_count, 0), 1),
    0
  )::double precision as branch_score,
  branch_rollup.rating_count + branch_rollup.legacy_rating_count as branch_rating_count,
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
  restaurant.menu_windows,
  restaurant.created_at,
  restaurant.updated_at,
  coalesce(
    round(sum(rollup.score_sum + rollup.legacy_score_sum) / nullif(sum(rollup.rating_count + rollup.legacy_rating_count), 0), 1),
    0
  )::double precision as score,
  coalesce(sum(rollup.rating_count + rollup.legacy_rating_count), 0)::bigint as rating_count,
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
  restaurant.menu_windows,
  restaurant.created_at,
  restaurant.updated_at;

grant select on public.dish_catalog, public.restaurant_catalog to anon, authenticated;
grant select on public.dish_catalog, public.restaurant_catalog to service_role;

notify pgrst, 'reload schema';

commit;
