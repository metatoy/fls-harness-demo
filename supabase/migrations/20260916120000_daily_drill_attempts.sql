-- The Daily Drill's record: one answer per player per local date. Applied with
-- `supabase db push`, never by hand in the dashboard. Idempotent.
--
-- **The primary key is the feature.** A second submission on the same local date
-- is rejected by this constraint rather than by a disabled button, so two racing
-- requests leave one stored answer and both callers get the same row; UI state
-- cannot promise that. No update and no delete policy, for the same reason: a
-- date with a record is read-only forever. local_date is resolved by the server
-- from the caller's timezone, because a date the client picks it can pick twice.

create table if not exists public.daily_drill_attempts (
  user_id        uuid not null references auth.users on delete cascade,
  local_date     date not null,
  answer         text not null,
  correct_answer text not null,
  submitted_at   timestamptz not null default now(),
  primary key (user_id, local_date)
);

alter table public.daily_drill_attempts enable row level security;

drop policy if exists "read own daily drill attempts" on public.daily_drill_attempts;
create policy "read own daily drill attempts" on public.daily_drill_attempts
  for select using (auth.uid() = user_id);

drop policy if exists "record own daily drill attempt" on public.daily_drill_attempts;
create policy "record own daily drill attempt" on public.daily_drill_attempts
  for insert with check (auth.uid() = user_id);

-- Today's and yesterday's records, nothing older. Security INVOKER throughout.
create or replace function public.daily_drill_recent(p_time_zone text)
returns setof public.daily_drill_attempts
language sql
stable
as $$
  select *
    from public.daily_drill_attempts
   where user_id = auth.uid()
     and local_date >= ((now() at time zone p_time_zone)::date - 1)
$$;

-- Submit today's answer, or hand back the stored one: `on conflict do nothing`
-- waits for a concurrent insert to commit and the select then reads a fresh
-- snapshot, so the loser of a race is told what the winner wrote.
create or replace function public.daily_drill_submit(
  p_time_zone text,
  p_answer text,
  p_correct_answer text
)
returns public.daily_drill_attempts
language plpgsql
as $$
declare
  day date := (now() at time zone p_time_zone)::date;
  stored public.daily_drill_attempts;
begin
  insert into public.daily_drill_attempts (user_id, local_date, answer, correct_answer)
  values (auth.uid(), day, p_answer, p_correct_answer)
  on conflict (user_id, local_date) do nothing;

  select * into stored
    from public.daily_drill_attempts
   where user_id = auth.uid() and local_date = day;

  return stored;
end;
$$;

revoke execute on function public.daily_drill_recent(text) from public, anon;
revoke execute on function public.daily_drill_submit(text, text, text) from public, anon;
grant execute on function public.daily_drill_recent(text) to authenticated;
grant execute on function public.daily_drill_submit(text, text, text) to authenticated;
