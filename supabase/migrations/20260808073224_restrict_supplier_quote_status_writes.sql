-- Prevent suppliers from bypassing the buyer review/award workflow through
-- direct Data API writes. Suppliers may submit and edit their own commercial
-- quote content while it remains Pending; only admins and the RFQ owner may
-- perform review or award status transitions.

alter table public.quotes enable row level security;

drop policy if exists quotes_insert on public.quotes;
drop policy if exists quotes_update on public.quotes;
drop policy if exists quotes_update_supplier on public.quotes;
drop policy if exists quotes_update_reviewer on public.quotes;

create policy quotes_insert
  on public.quotes
  for insert
  to authenticated
  with check (
    supplier_id = (select auth.uid())
    and status = 'Pending'
  );

create policy quotes_update_supplier
  on public.quotes
  for update
  to authenticated
  using (
    supplier_id = (select auth.uid())
    and status = 'Pending'
  )
  with check (
    supplier_id = (select auth.uid())
    and status = 'Pending'
  );

create policy quotes_update_reviewer
  on public.quotes
  for update
  to authenticated
  using (
    is_admin()
    or exists (
      select 1
      from public.rfqs
      where rfqs.id = quotes.rfq_id
        and rfqs.created_by = (select auth.uid())
    )
  )
  with check (
    is_admin()
    or exists (
      select 1
      from public.rfqs
      where rfqs.id = quotes.rfq_id
        and rfqs.created_by = (select auth.uid())
    )
  );
