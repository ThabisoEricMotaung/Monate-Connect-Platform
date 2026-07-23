-- Restore-test RLS setup.
--
-- Mirrors the live Row Level Security policies found on production for the
-- six tables carried by scripts/restore-backup.mts (profiles, rfqs, quotes,
-- supplier_documents, supplier_bank_details, subscriptions). Applied
-- automatically after every `restore-backup.mts --confirm` run against
-- RESTORE_TARGET_DATABASE_URL — see runRls() in scripts/restore-backup.mts.
--
-- Safe to re-run: every policy is dropped and recreated. This intentionally
-- drops every RLS policy name that appears anywhere else in
-- database/migrations/ for these six tables (the `dev_*`, `schema_v2_*`, and
-- older hand-written policies) so the restore-test project ends up with
-- ONLY the production-mirrored policies below, not a superset.
--
-- SOURCE OF TRUTH: the policies below were copied from production's actual
-- live pg_policies (confirmed by direct comparison), NOT from the other
-- migration files under database/migrations/. Production's real policies
-- have drifted from this repo's checked-in migration history.
--
-- KNOWN DRIFT (flagged, not fixed here): production's live policy names
-- (rfqs_*, quotes_*, bank_*, ...) do not match the policy names checked
-- into database/migrations/ elsewhere in this repo (e.g. "Buyers can manage
-- their own RFQs", dev_rfqs_*, schema_v2_profiles_*). That drift between
-- production's real policies and the repo's migration files is a known,
-- tracked issue — do NOT "fix" this file to match the sibling migrations;
-- that would silently replace production's actual behavior with weaker or
-- outdated policies.

\set ON_ERROR_STOP on

-- ── is_admin() helper (SECURITY DEFINER) ─────────────────────────────────
-- Production's policies call public.is_admin(); it does not exist anywhere
-- in database/migrations/, so it's recreated here for the restore-test
-- project.

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated, anon;

-- ── profiles ──────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

drop policy if exists dev_profiles_select on public.profiles;
drop policy if exists dev_profiles_insert on public.profiles;
drop policy if exists dev_profiles_update on public.profiles;
drop policy if exists schema_v2_profiles_select on public.profiles;
drop policy if exists schema_v2_profiles_insert on public.profiles;
drop policy if exists schema_v2_profiles_update on public.profiles;
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Public profiles are visible" on public.profiles;
drop policy if exists "Public supplier directory profiles are visible" on public.profiles;
drop policy if exists profiles_admin_select on public.profiles;
drop policy if exists profiles_admin_update on public.profiles;
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;

create policy profiles_admin_select
  on public.profiles
  for select
  using (is_admin());

create policy profiles_admin_update
  on public.profiles
  for update
  using (is_admin())
  with check (is_admin());

create policy profiles_select_own
  on public.profiles
  for select
  using (auth.uid() = id);

create policy profiles_update_own
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy profiles_insert_own
  on public.profiles
  for insert
  with check (auth.uid() = id);

-- ── rfqs ──────────────────────────────────────────────────────────────────
alter table public.rfqs enable row level security;

drop policy if exists dev_rfqs_select on public.rfqs;
drop policy if exists dev_rfqs_insert on public.rfqs;
drop policy if exists dev_rfqs_update on public.rfqs;
drop policy if exists dev_rfqs_delete on public.rfqs;
drop policy if exists "Public users can read public open RFQs" on public.rfqs;
drop policy if exists "Authenticated users can read RFQs" on public.rfqs;
drop policy if exists "Buyers can manage their own RFQs" on public.rfqs;
drop policy if exists "Admins and buyers can manage any RFQ" on public.rfqs;
drop policy if exists "Admins and buyers can delete any RFQ" on public.rfqs;
drop policy if exists rfqs_select on public.rfqs;
drop policy if exists rfqs_insert on public.rfqs;
drop policy if exists rfqs_update on public.rfqs;
drop policy if exists rfqs_admin_buyer_update on public.rfqs;
drop policy if exists rfqs_admin_buyer_delete on public.rfqs;

-- coalesce(is_public, true) defaults RFQs to PUBLIC when is_public is null.
-- This is deliberate, not a safety bug: most RFQs come from the automated
-- tender-ingestion pipeline and are meant to be publicly visible by default
-- unless explicitly restricted. Changing this to coalesce(is_public, false)
-- would silently take the entire tender directory dark for any RFQ missing
-- an explicit is_public value.
create policy rfqs_select
  on public.rfqs
  for select
  using (coalesce(is_public, true) or created_by = auth.uid() or is_admin());

create policy rfqs_insert
  on public.rfqs
  for insert
  with check (created_by = auth.uid() or is_admin());

create policy rfqs_update
  on public.rfqs
  for update
  using (created_by = auth.uid() or is_admin())
  with check (created_by = auth.uid() or is_admin());

create policy rfqs_admin_buyer_update
  on public.rfqs
  for update
  using (
    is_admin()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'buyer')
  )
  with check (
    is_admin()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'buyer')
  );

create policy rfqs_admin_buyer_delete
  on public.rfqs
  for delete
  using (
    is_admin()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'buyer')
  );

-- ── quotes ────────────────────────────────────────────────────────────────
alter table public.quotes enable row level security;

drop policy if exists dev_quotes_select on public.quotes;
drop policy if exists dev_quotes_insert on public.quotes;
drop policy if exists dev_quotes_update on public.quotes;
drop policy if exists quotes_select on public.quotes;
drop policy if exists quotes_insert on public.quotes;
drop policy if exists quotes_update on public.quotes;

create policy quotes_select
  on public.quotes
  for select
  using (
    supplier_id = auth.uid()
    or is_admin()
    or exists (
      select 1 from public.rfqs
      where rfqs.id = quotes.rfq_id and rfqs.created_by = auth.uid()
    )
  );

create policy quotes_insert
  on public.quotes
  for insert
  with check (
    supplier_id = auth.uid()
    or is_admin()
    or exists (
      select 1 from public.rfqs
      where rfqs.id = quotes.rfq_id and rfqs.created_by = auth.uid()
    )
  );

create policy quotes_update
  on public.quotes
  for update
  using (
    supplier_id = auth.uid()
    or is_admin()
    or exists (
      select 1 from public.rfqs
      where rfqs.id = quotes.rfq_id and rfqs.created_by = auth.uid()
    )
  )
  with check (
    supplier_id = auth.uid()
    or is_admin()
    or exists (
      select 1 from public.rfqs
      where rfqs.id = quotes.rfq_id and rfqs.created_by = auth.uid()
    )
  );

-- ── supplier_documents ────────────────────────────────────────────────────
alter table public.supplier_documents enable row level security;

drop policy if exists "Suppliers can read own supplier documents" on public.supplier_documents;
drop policy if exists "Suppliers can insert own supplier documents" on public.supplier_documents;
drop policy if exists "Admins can update supplier document review fields" on public.supplier_documents;
drop policy if exists supplier_documents_select on public.supplier_documents;
drop policy if exists supplier_documents_insert on public.supplier_documents;
drop policy if exists supplier_documents_admin_update on public.supplier_documents;

create policy supplier_documents_select
  on public.supplier_documents
  for select
  using (
    profile_id = auth.uid()
    or is_admin()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'buyer')
  );

create policy supplier_documents_insert
  on public.supplier_documents
  for insert
  with check (profile_id = auth.uid());

create policy supplier_documents_admin_update
  on public.supplier_documents
  for update
  using (is_admin())
  with check (is_admin());

-- ── supplier_bank_details ─────────────────────────────────────────────────
alter table public.supplier_bank_details enable row level security;

drop policy if exists dev_banking_select on public.supplier_bank_details;
drop policy if exists dev_banking_insert on public.supplier_bank_details;
drop policy if exists dev_banking_update on public.supplier_bank_details;
drop policy if exists bank_select on public.supplier_bank_details;
drop policy if exists bank_insert on public.supplier_bank_details;
drop policy if exists bank_update on public.supplier_bank_details;
drop policy if exists bank_delete on public.supplier_bank_details;

create policy bank_select
  on public.supplier_bank_details
  for select
  using (supplier_id = auth.uid() or is_admin());

create policy bank_insert
  on public.supplier_bank_details
  for insert
  with check (supplier_id = auth.uid() or is_admin());

create policy bank_update
  on public.supplier_bank_details
  for update
  using (supplier_id = auth.uid() or is_admin())
  with check (supplier_id = auth.uid() or is_admin());

create policy bank_delete
  on public.supplier_bank_details
  for delete
  using (is_admin());

-- ── subscriptions ─────────────────────────────────────────────────────────
alter table public.subscriptions enable row level security;

drop policy if exists "Users can read their own subscription" on public.subscriptions;
drop policy if exists subscriptions_select_own on public.subscriptions;

create policy subscriptions_select_own
  on public.subscriptions
  for select
  using (auth.uid() = user_id);

-- No insert/update/delete policies on subscriptions: production relies on
-- service-role writes for this table, and restore-test mirrors that.
