alter table public.dishes alter column price drop not null;
comment on column public.dishes.price is 'Current representative price where explicitly supplied; NULL when the source does not provide a price.';
