-- Published ministry listings for Central MBC Connect.
begin;

create table if not exists public.church_ministries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 200),
  description text check (description is null or char_length(description) <= 5000),
  leader text check (leader is null or char_length(leader) <= 200),
  meeting_info text check (meeting_info is null or char_length(meeting_info) <= 300),
  published boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.church_ministries enable row level security;

revoke all on public.church_ministries from anon, authenticated;
grant select on public.church_ministries to anon, authenticated;
grant insert, update, delete on public.church_ministries to authenticated;

drop policy if exists "Read published church ministries" on public.church_ministries;
create policy "Read published church ministries"
  on public.church_ministries
  for select
  to anon, authenticated
  using (published or public.is_admin());

drop policy if exists "Admins insert church ministries" on public.church_ministries;
create policy "Admins insert church ministries"
  on public.church_ministries
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins update church ministries" on public.church_ministries;
create policy "Admins update church ministries"
  on public.church_ministries
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins delete church ministries" on public.church_ministries;
create policy "Admins delete church ministries"
  on public.church_ministries
  for delete
  to authenticated
  using (public.is_admin());

commit;
