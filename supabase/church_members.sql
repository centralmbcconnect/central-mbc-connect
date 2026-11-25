-- Private membership contact records for Central MBC Connect.
begin;

create table if not exists public.church_members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(btrim(full_name)) between 1 and 200),
  email text check (email is null or char_length(email) <= 254),
  phone text check (phone is null or char_length(phone) <= 40),
  created_at timestamptz not null default now()
);

alter table public.church_members enable row level security;

revoke all on public.church_members from anon, authenticated;
grant select, insert, update, delete on public.church_members to authenticated;

drop policy if exists "Admins read church member records" on public.church_members;
create policy "Admins read church member records"
  on public.church_members
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins add church member records" on public.church_members;
create policy "Admins add church member records"
  on public.church_members
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins update church member records" on public.church_members;
create policy "Admins update church member records"
  on public.church_members
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins delete church member records" on public.church_members;
create policy "Admins delete church member records"
  on public.church_members
  for delete
  to authenticated
  using (public.is_admin());

commit;
