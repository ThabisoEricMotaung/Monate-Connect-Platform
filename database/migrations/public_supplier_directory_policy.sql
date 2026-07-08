-- Public directory policy: expose only supplier rows to anonymous SELECTs.
-- Application code must still select only public-safe columns.

alter table public.profiles enable row level security;

drop policy if exists "Public profiles are visible" on public.profiles;
drop policy if exists "Public supplier directory profiles are visible" on public.profiles;

create policy "Public supplier directory profiles are visible"
  on public.profiles
  for select
  to anon
  using (role = 'supplier');
