-- YouTube sermon/video links for Central MBC Connect.
begin;

create table if not exists public.church_sermons (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text check (description is null or char_length(description) <= 3000),
  youtube_url text not null check (char_length(youtube_url) <= 2048),
  youtube_video_id text not null check (youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.church_sermons enable row level security;
revoke all on public.church_sermons from anon, authenticated;
grant select on public.church_sermons to anon, authenticated;
grant insert, update, delete on public.church_sermons to authenticated;

drop policy if exists "Read published church sermons" on public.church_sermons;
create policy "Read published church sermons"
  on public.church_sermons for select to anon, authenticated
  using (published or public.is_admin());

drop policy if exists "Admins insert church sermons" on public.church_sermons;
create policy "Admins insert church sermons"
  on public.church_sermons for insert to authenticated
  with check (public.is_admin());

drop policy if exists "Admins update church sermons" on public.church_sermons;
create policy "Admins update church sermons"
  on public.church_sermons for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins delete church sermons" on public.church_sermons;
create policy "Admins delete church sermons"
  on public.church_sermons for delete to authenticated
  using (public.is_admin());

commit;
