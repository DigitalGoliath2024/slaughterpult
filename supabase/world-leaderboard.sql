-- Run once in your Supabase project's SQL Editor. Safe to run again.
begin;
create table if not exists public.slaughterpult_scores (
  run_id uuid primary key,
  initials text not null check (initials ~ '^[A-Z]{2}$'),
  score bigint not null check (score between 1 and 100000000),
  distance integer not null check (distance between 1 and 10000000),
  achieved_month date not null default (date_trunc('month', now() at time zone 'UTC')::date) check (extract(day from achieved_month)=1 and achieved_month between date '2010-01-01' and date_trunc('month', now() at time zone 'UTC')::date),
  course text check (course in ('slide','factory','trampoline')),
  character_id text check (character_id in ('cowboy','human','meshy')),
  created_at timestamptz not null default now()
);
create index if not exists slaughterpult_scores_order_idx
  on public.slaughterpult_scores (score desc, distance desc, created_at asc, run_id asc);
alter table public.slaughterpult_scores enable row level security;
revoke all on public.slaughterpult_scores from anon, authenticated;
grant select on public.slaughterpult_scores to anon, authenticated;
-- Clients cannot choose the recorded date or overwrite/delete existing runs.
grant insert (run_id,initials,score,distance,course,character_id,achieved_month)
  on public.slaughterpult_scores to anon, authenticated;
drop policy if exists "Read arcade records" on public.slaughterpult_scores;
create policy "Read arcade records" on public.slaughterpult_scores
  for select to anon, authenticated using (true);
drop policy if exists "Submit arcade records" on public.slaughterpult_scores;
create policy "Submit arcade records" on public.slaughterpult_scores
  for insert to anon, authenticated with check (
    initials ~ '^[A-Z]{2}$' and score between 1 and 100000000
    and distance between 1 and 10000000
    and (course is null or course in ('slide','factory','trampoline'))
    and (character_id is null or character_id in ('cowboy','human','meshy'))
  );
-- One best record per initials; the game displays only the first five.
create index if not exists slaughterpult_scores_initials_idx
  on public.slaughterpult_scores (initials, score desc, distance desc, created_at asc, run_id asc);
create or replace view public.slaughterpult_world_best with (security_invoker=true) as
select distinct on (initials) run_id, initials, score, distance, achieved_month, created_at
from public.slaughterpult_scores
order by initials, score desc, distance desc, created_at asc, run_id asc;
grant select on public.slaughterpult_world_best to anon, authenticated;
notify pgrst, 'reload schema';
commit;
-- Verification: this should return 0–5 rows, ordered exactly like the game.
select initials, score, distance, to_char(achieved_month,'Mon YYYY') as date
from public.slaughterpult_world_best
order by score desc, distance desc, created_at asc, run_id asc limit 5;
