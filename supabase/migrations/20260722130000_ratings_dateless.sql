begin;

set local lock_timeout = '10s';
set local statement_timeout = '10min';

-- Ratings no longer carry a date; only visits do. Drop the NOT NULL/default/
-- future-date check so bare ratings can be saved without a visited_at value.
alter table public.ratings alter column visited_at drop not null;
alter table public.ratings alter column visited_at drop default;
alter table public.ratings drop constraint if exists ratings_visited_not_future;

notify pgrst, 'reload schema';

commit;
