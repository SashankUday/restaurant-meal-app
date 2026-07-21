begin;

create index if not exists canonical_match_suggestions_candidate_brand_idx
  on public.canonical_dish_match_suggestions
  (candidate_canonical_dish_id, brand_id);

create index if not exists canonical_match_suggestions_dish_brand_idx
  on public.canonical_dish_match_suggestions
  (dish_id, brand_id);

create index if not exists canonical_dishes_supersedes_id_idx
  on public.canonical_dishes (supersedes_id)
  where supersedes_id is not null;

create index if not exists dishes_canonical_brand_idx
  on public.dishes (canonical_dish_id, brand_id);

create index if not exists dishes_restaurant_brand_idx
  on public.dishes (restaurant_id, brand_id);

-- Some hosted projects contain Supabase's RLS event-trigger helper even when
-- a clean local replay does not. Event triggers do not need client EXECUTE;
-- remove the inherited RPC privilege when the helper is present.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable()
      from public, anon, authenticated;
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;
