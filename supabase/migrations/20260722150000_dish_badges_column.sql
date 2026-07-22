begin;

set local lock_timeout = '10s';
set local statement_timeout = '10min';

-- menu_tags drives meal-time-window availability; badges (e.g. "Chef's
-- special") need their own column so they never affect availability matching.
alter table public.dishes
  add column if not exists badges text[] not null default '{}';

comment on column public.dishes.badges is
  'Editor-added dish badges (e.g. Chef''s special). Distinct from menu_tags, which drives time-of-day availability.';

create or replace function public.submit_dish_attribute_flag(
  target_dish_id bigint,
  target_attribute text,
  correction_action text,
  correction_value jsonb
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  flag_id bigint;
  new_diets text[];
  new_allergens text[];
  new_badges text[];
  text_value text;
  numeric_value numeric;
begin
  if caller is null then
    raise exception 'You must be signed in to suggest a correction.';
  end if;

  if not exists (select 1 from public.profiles where id = caller and can_edit) then
    raise exception 'Edit access has not been approved for this account yet.';
  end if;

  if target_attribute not in ('diets', 'allergens', 'price', 'name', 'badges') then
    raise exception 'Attribute % cannot be edited by the community.', target_attribute;
  end if;

  if correction_action not in ('add', 'remove', 'correct') then
    raise exception 'Unknown correction action %.', correction_action;
  end if;

  if not exists (select 1 from public.dishes where id = target_dish_id) then
    raise exception 'Unknown dish %.', target_dish_id;
  end if;

  if exists (
    select 1 from public.dish_attribute_flags flag
    where flag.user_id = caller
      and flag.dish_id = target_dish_id
      and flag.attribute = target_attribute
      and flag.created_at > now() - interval '24 hours'
  ) then
    raise exception 'You have already corrected this field recently. Try again later.';
  end if;

  if target_attribute = 'diets' then
    select dish.diets into new_diets from public.dishes dish where dish.id = target_dish_id;
    text_value := btrim(correction_value #>> '{}');
    if text_value is null or text_value = '' then
      raise exception 'A diet value is required.';
    end if;
    if correction_action = 'add' then
      if not (text_value = any(new_diets)) then
        new_diets := array_append(new_diets, text_value);
      end if;
    elsif correction_action = 'remove' then
      new_diets := array_remove(new_diets, text_value);
    else
      raise exception 'Diets support add/remove only.';
    end if;
    update public.dishes set diets = new_diets, updated_at = now() where id = target_dish_id;

  elsif target_attribute = 'allergens' then
    select dish.allergens into new_allergens from public.dishes dish where dish.id = target_dish_id;
    text_value := btrim(correction_value #>> '{}');
    if text_value is null or text_value = '' then
      raise exception 'An allergen value is required.';
    end if;
    if correction_action = 'add' then
      if not (text_value = any(new_allergens)) then
        new_allergens := array_append(new_allergens, text_value);
      end if;
    elsif correction_action = 'remove' then
      new_allergens := array_remove(new_allergens, text_value);
    else
      raise exception 'Allergens support add/remove only.';
    end if;
    update public.dishes
      set allergens = new_allergens, allergens_verified = false, updated_at = now()
      where id = target_dish_id;

  elsif target_attribute = 'price' then
    if correction_action <> 'correct' then
      raise exception 'Price supports the correct action only.';
    end if;
    numeric_value := (correction_value #>> '{}')::numeric;
    if numeric_value is null or numeric_value < 0 then
      raise exception 'Enter a valid price.';
    end if;
    update public.dishes set price = numeric_value, updated_at = now() where id = target_dish_id;

  elsif target_attribute = 'name' then
    if correction_action <> 'correct' then
      raise exception 'Name supports the correct action only.';
    end if;
    text_value := btrim(correction_value #>> '{}');
    if text_value is null or text_value = '' then
      raise exception 'A dish name is required.';
    end if;
    update public.dishes set name = text_value, updated_at = now() where id = target_dish_id;

  elsif target_attribute = 'badges' then
    select dish.badges into new_badges from public.dishes dish where dish.id = target_dish_id;
    text_value := btrim(correction_value #>> '{}');
    if text_value is null or text_value = '' then
      raise exception 'A badge value is required.';
    end if;
    if correction_action = 'add' then
      if not (text_value = any(new_badges)) then
        new_badges := array_append(new_badges, text_value);
      end if;
    elsif correction_action = 'remove' then
      new_badges := array_remove(new_badges, text_value);
    else
      raise exception 'Badges support add/remove only.';
    end if;
    update public.dishes set badges = new_badges, updated_at = now() where id = target_dish_id;
  end if;

  insert into public.dish_attribute_flags (dish_id, user_id, attribute, action, value, applied_at)
  values (target_dish_id, caller, target_attribute, correction_action, correction_value, now())
  returning id into flag_id;

  return flag_id;
end;
$$;

alter table public.dish_attribute_flags drop constraint if exists dish_attribute_flags_attribute_check;
alter table public.dish_attribute_flags add constraint dish_attribute_flags_attribute_check
  check (attribute in ('diets', 'allergens', 'price', 'name', 'badges'));

revoke all on function public.submit_dish_attribute_flag(bigint, text, text, jsonb) from public, anon;
grant execute on function public.submit_dish_attribute_flag(bigint, text, text, jsonb) to authenticated;

-- Surface badges through the dish_catalog view (targeted rebuild, otherwise unchanged
-- from 20260721110000_menu_windows_photo_privacy_one_rating.sql).
drop view if exists public.dish_catalog;

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
  dish.badges,
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

grant select on public.dish_catalog to anon, authenticated;
grant select on public.dish_catalog to service_role;

notify pgrst, 'reload schema';

commit;
