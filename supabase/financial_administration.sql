-- Private church financial records; individual donor/member giving is intentionally excluded.
begin;

create table if not exists public.church_financial_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null default current_date,
  type text not null check (type in ('income','expense')),
  category text not null check (char_length(btrim(category)) between 1 and 100),
  description text check (description is null or char_length(description) <= 1000),
  amount numeric(12,2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.church_monthly_budgets (
  id uuid primary key default gen_random_uuid(),
  budget_month date not null check (extract(day from budget_month) = 1),
  category text not null check (char_length(btrim(category)) between 1 and 100),
  planned_amount numeric(12,2) not null check (planned_amount > 0),
  created_at timestamptz not null default now(),
  unique (budget_month,category)
);

alter table public.church_financial_entries enable row level security;
alter table public.church_monthly_budgets enable row level security;

revoke all on public.church_financial_entries from anon,authenticated;
revoke all on public.church_monthly_budgets from anon,authenticated;
grant select,insert,update,delete on public.church_financial_entries to authenticated;
grant select,insert,update,delete on public.church_monthly_budgets to authenticated;

drop policy if exists "Admins manage church financial entries" on public.church_financial_entries;
create policy "Admins manage church financial entries"
  on public.church_financial_entries
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins manage church monthly budgets" on public.church_monthly_budgets;
create policy "Admins manage church monthly budgets"
  on public.church_monthly_budgets
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

commit;
