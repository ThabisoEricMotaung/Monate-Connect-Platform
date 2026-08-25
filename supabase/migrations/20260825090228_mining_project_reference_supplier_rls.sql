alter table public.mining_project_references enable row level security;

drop policy if exists "Suppliers can view their mining project references" on public.mining_project_references;
create policy "Suppliers can view their mining project references"
on public.mining_project_references
for select
to authenticated
using ((select auth.uid()) = supplier_id);

drop policy if exists "Suppliers can submit mining project references" on public.mining_project_references;
create policy "Suppliers can submit mining project references"
on public.mining_project_references
for insert
to authenticated
with check (
  (select auth.uid()) = supplier_id
  and status = 'pending'
  and verified_by is null
  and verified_at is null
);

drop policy if exists "Suppliers can edit pending mining project references" on public.mining_project_references;
create policy "Suppliers can edit pending mining project references"
on public.mining_project_references
for update
to authenticated
using (
  (select auth.uid()) = supplier_id
  and status = 'pending'
)
with check (
  (select auth.uid()) = supplier_id
  and status = 'pending'
  and verified_by is null
  and verified_at is null
);
