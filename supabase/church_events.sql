-- Church events for Central MBC Connect.
-- Run this once in the Supabase SQL Editor for project ksdjtqnfrrdvfyzocuai.
begin;

create table if not exists public.church_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text,
  location text check (location is null or char_length(location) <= 300),
  starts_at timestamptz not null,
  ends_at timestamptz,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  constraint church_events_valid_end
    check (ends_at is null or ends_at >= starts_at)
);

alter table public.church_events enable row level security;

revoke all on public.church_events from anon, authenticated;
grant select on public.church_events to anon, authenticated;
grant insert, update, delete on public.church_events to authenticated;

drop policy if exists "Read upcoming published church events" on public.church_events;
create policy "Read upcoming published church events"
  on public.church_events
  for select
  to anon, authenticated
  using ((published and starts_at >= now()) or public.is_admin());

drop policy if exists "Admins insert church events" on public.church_events;
create policy "Admins insert church events"
  on public.church_events
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins update church events" on public.church_events;
create policy "Admins update church events"
  on public.church_events
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins delete church events" on public.church_events;
create policy "Admins delete church events"
  on public.church_events
  for delete
  to authenticated
  using (public.is_admin());

commit;
