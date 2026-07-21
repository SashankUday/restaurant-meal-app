alter table public.dishes
  add column if not exists allergens_verified boolean not null default false;

update public.dishes
set allergens_verified = true
where cardinality(allergens) > 0
  and allergens_verified = false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'dishes_allergens_require_verification'
      and conrelid = 'public.dishes'::regclass
  ) then
    alter table public.dishes
      add constraint dishes_allergens_require_verification
      check (allergens_verified = true or cardinality(allergens) = 0);
  end if;
end;
$$;

comment on column public.dishes.allergens_verified is
  'Whether the recorded allergen information has been verified. false with an empty allergens array means information is unavailable; true with an empty array means verified no declared allergens; true with a non-empty array means verified listed allergens.';
