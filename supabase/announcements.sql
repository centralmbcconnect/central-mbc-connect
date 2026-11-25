-- Public announcements for the Central MBC Connect site.
-- Run this once in the Supabase SQL Editor for project ksdjtqnfrrdvfyzocuai.
begin;

create table if not exists public.church_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  content text,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.church_announcements enable row level security;

revoke all on public.church_announcements from anon, authenticated;
grant select on public.church_announcements to anon, authenticated;
grant insert, update, delete on public.church_announcements to authenticated;

drop policy if exists "Read published church announcements" on public.church_announcements;
create policy "Read published church announcements"
  on public.church_announcements
  for select
  to anon, authenticated
  using (published or public.is_admin());

drop policy if exists "Admins insert church announcements" on public.church_announcements;
create policy "Admins insert church announcements"
  on public.church_announcements
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins update church announcements" on public.church_announcements;
create policy "Admins update church announcements"
  on public.church_announcements
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins delete church announcements" on public.church_announcements;
create policy "Admins delete church announcements"
  on public.church_announcements
  for delete
  to authenticated
  using (public.is_admin());

commit;
