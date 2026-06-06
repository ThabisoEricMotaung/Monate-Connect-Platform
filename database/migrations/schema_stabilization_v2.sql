-- Monate Connect schema stabilization v2
-- Generated: 2026-06-06
-- Purpose: eliminate pilot-era missing table and missing column errors.
-- Safety: additive only. No drops, truncates, destructive updates, or data rewrites.
--
-- Manual Supabase Storage setup still required:
-- 1. Supabase Dashboard -> Storage -> New bucket -> supplier-documents.
-- 2. Mark supplier-documents private unless your deployment intentionally uses public files.
-- 3. Add authenticated SELECT/INSERT/UPDATE policies for supplier-documents.
-- 4. Supabase Dashboard -> Storage -> New bucket -> rfq-documents.
-- 5. Mark rfq-documents private unless your deployment intentionally uses public files.
-- 6. Add authenticated SELECT/INSERT/UPDATE policies for rfq-documents.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Required / previously-warning tables
-- ---------------------------------------------------------------------------

create table if not exists public.pilot_feedback (
  id bigint generated always as identity primary key,
  tester_name text,
  tester_role text,
  page_or_feature text,
  feedback_type text,
  rating integer,
  message text,
  priority text default 'Normal',
  status text default 'New',
  issue_category text,
  admin_notes text,
  assigned_to text,
  created_at timestamptz default timezone('utc', now())
);

create table if not exists public.platform_settings (
  id bigint generated always as identity primary key,
  setting_key text unique,
  setting_value jsonb,
  category text,
  description text,
  created_at timestamptz default timezone('utc', now()),
  updated_at timestamptz default timezone('utc', now())
);

create table if not exists public.saved_rfqs (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  rfq_id bigint not null,
  notes text,
  created_at timestamptz default timezone('utc', now())
);

create table if not exists public.profiles (
  id uuid primary key,
  role text,
  business_name text,
  province text,
  industry text,
  phone text,
  email text,
  verification_status text,
  created_at timestamptz default timezone('utc', now()),
  updated_at timestamptz default timezone('utc', now())
);

create table if not exists public.purchase_orders (
  id bigint generated always as identity primary key,
  po_number text,
  rfq_id bigint,
  quote_id bigint,
  supplier_id uuid,
  supplier_name text,
  amount text,
  timeline text,
  title text,
  status text default 'Issued',
  generated_at timestamptz default timezone('utc', now()),
  issue_date timestamptz,
  delivery_date timestamptz,
  notes text,
  created_at timestamptz default timezone('utc', now())
);

create table if not exists public.whatsapp_alerts (
  id bigint generated always as identity primary key,
  user_id uuid,
  user_email text,
  supplier_id uuid,
  supplier_name text,
  supplier_phone text,
  alert_type text,
  message text,
  whatsapp_link text,
  rfq_id bigint,
  metadata jsonb,
  status text default 'Draft',
  created_at timestamptz default timezone('utc', now())
);

create table if not exists public.quote_evaluations (
  id bigint generated always as identity primary key,
  rfq_id bigint,
  quote_id bigint,
  price_score numeric,
  compliance_score numeric,
  delivery_score numeric,
  experience_score numeric,
  locality_score numeric,
  total_score numeric,
  evaluation_notes text,
  created_at timestamptz default timezone('utc', now()),
  updated_at timestamptz default timezone('utc', now())
);

create table if not exists public.award_recommendations (
  id bigint generated always as identity primary key,
  rfq_id bigint,
  recommended_quote_id bigint,
  recommended_supplier_id uuid,
  evaluator_id uuid,
  recommendation_summary text,
  decision_reason text,
  risks text,
  mitigation_notes text,
  status text default 'Draft',
  created_at timestamptz default timezone('utc', now()),
  updated_at timestamptz default timezone('utc', now())
);

create table if not exists public.invoice_approvals (
  id bigint generated always as identity primary key,
  invoice_id bigint,
  approver_id uuid,
  approval_status text,
  approval_notes text,
  approved_at timestamptz,
  created_at timestamptz default timezone('utc', now())
);

create table if not exists public.supplier_score_history (
  id bigint generated always as identity primary key,
  supplier_id uuid,
  score numeric,
  smart_score numeric,
  previous_score numeric,
  level text,
  risk_level text,
  trend text,
  reason text,
  created_at timestamptz default timezone('utc', now()),
  is_demo boolean default false
);

-- ---------------------------------------------------------------------------
-- Column compatibility patches
-- ---------------------------------------------------------------------------

alter table public.pilot_feedback
  add column if not exists tester_name text,
  add column if not exists tester_role text,
  add column if not exists page_or_feature text,
  add column if not exists feedback_type text,
  add column if not exists rating integer,
  add column if not exists message text,
  add column if not exists priority text default 'Normal',
  add column if not exists status text default 'New',
  add column if not exists issue_category text,
  add column if not exists admin_notes text,
  add column if not exists assigned_to text,
  add column if not exists created_at timestamptz default timezone('utc', now());

alter table public.platform_settings
  add column if not exists setting_key text,
  add column if not exists setting_value jsonb,
  add column if not exists category text,
  add column if not exists description text,
  add column if not exists created_at timestamptz default timezone('utc', now()),
  add column if not exists updated_at timestamptz default timezone('utc', now());

alter table public.saved_rfqs
  add column if not exists user_id uuid,
  add column if not exists rfq_id bigint,
  add column if not exists notes text,
  add column if not exists created_at timestamptz default timezone('utc', now());

alter table public.profiles
  add column if not exists role text,
  add column if not exists business_name text,
  add column if not exists province text,
  add column if not exists industry text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists verification_status text,
  add column if not exists verification_notes text,
  add column if not exists csd_number text,
  add column if not exists bbbee_level text,
  add column if not exists tax_status text,
  add column if not exists company_registration text,
  add column if not exists cidb_grade text,
  add column if not exists csd_document_url text,
  add column if not exists bbbee_document_url text,
  add column if not exists tax_document_url text,
  add column if not exists company_registration_url text,
  add column if not exists cidb_document_url text,
  add column if not exists capability_statement_url text,
  add column if not exists tax_expiry_date date,
  add column if not exists bbbee_expiry_date date,
  add column if not exists csd_expiry_date date,
  add column if not exists cidb_expiry_date date,
  add column if not exists banking_verification_status text,
  add column if not exists banking_verified boolean default false,
  add column if not exists profile_complete boolean default false,
  add column if not exists smart_score numeric,
  add column if not exists smart_score_level text,
  add column if not exists readiness_score numeric,
  add column if not exists risk_level text,
  add column if not exists is_demo boolean default false,
  add column if not exists created_at timestamptz default timezone('utc', now()),
  add column if not exists updated_at timestamptz default timezone('utc', now());

alter table public.purchase_orders
  add column if not exists po_number text,
  add column if not exists rfq_id bigint,
  add column if not exists quote_id bigint,
  add column if not exists supplier_id uuid,
  add column if not exists supplier_name text,
  add column if not exists amount text,
  add column if not exists timeline text,
  add column if not exists title text,
  add column if not exists status text default 'Issued',
  add column if not exists generated_at timestamptz default timezone('utc', now()),
  add column if not exists issue_date timestamptz,
  add column if not exists delivery_date timestamptz,
  add column if not exists notes text,
  add column if not exists is_demo boolean default false,
  add column if not exists created_at timestamptz default timezone('utc', now());

alter table public.whatsapp_alerts
  add column if not exists user_id uuid,
  add column if not exists user_email text,
  add column if not exists supplier_id uuid,
  add column if not exists supplier_name text,
  add column if not exists supplier_phone text,
  add column if not exists alert_type text,
  add column if not exists message text,
  add column if not exists whatsapp_link text,
  add column if not exists rfq_id bigint,
  add column if not exists metadata jsonb,
  add column if not exists status text default 'Draft',
  add column if not exists is_demo boolean default false,
  add column if not exists created_at timestamptz default timezone('utc', now());

alter table public.quote_evaluations
  add column if not exists rfq_id bigint,
  add column if not exists quote_id bigint,
  add column if not exists price_score numeric,
  add column if not exists compliance_score numeric,
  add column if not exists delivery_score numeric,
  add column if not exists experience_score numeric,
  add column if not exists locality_score numeric,
  add column if not exists total_score numeric,
  add column if not exists evaluation_notes text,
  add column if not exists created_at timestamptz default timezone('utc', now()),
  add column if not exists updated_at timestamptz default timezone('utc', now());

alter table public.award_recommendations
  add column if not exists rfq_id bigint,
  add column if not exists recommended_quote_id bigint,
  add column if not exists recommended_supplier_id uuid,
  add column if not exists evaluator_id uuid,
  add column if not exists recommendation_summary text,
  add column if not exists decision_reason text,
  add column if not exists risks text,
  add column if not exists mitigation_notes text,
  add column if not exists status text default 'Draft',
  add column if not exists created_at timestamptz default timezone('utc', now()),
  add column if not exists updated_at timestamptz default timezone('utc', now());

alter table public.invoice_approvals
  add column if not exists invoice_id bigint,
  add column if not exists approver_id uuid,
  add column if not exists approval_status text,
  add column if not exists approval_notes text,
  add column if not exists approved_at timestamptz,
  add column if not exists created_at timestamptz default timezone('utc', now());

alter table public.supplier_score_history
  add column if not exists supplier_id uuid,
  add column if not exists score numeric,
  add column if not exists smart_score numeric,
  add column if not exists previous_score numeric,
  add column if not exists level text,
  add column if not exists risk_level text,
  add column if not exists trend text,
  add column if not exists reason text,
  add column if not exists created_at timestamptz default timezone('utc', now()),
  add column if not exists is_demo boolean default false;

-- ---------------------------------------------------------------------------
-- Constraints and indexes needed by upsert/read paths
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1
    from public.saved_rfqs
    where user_id is not null and rfq_id is not null
    group by user_id, rfq_id
    having count(*) > 1
  ) then
    raise notice 'saved_rfqs has duplicate (user_id, rfq_id) rows; unique constraint was not added to avoid data loss.';
  elsif not exists (
    select 1
    from pg_constraint
    where conname = 'saved_rfqs_user_id_rfq_id_key'
      and conrelid = 'public.saved_rfqs'::regclass
  ) then
    alter table public.saved_rfqs
      add constraint saved_rfqs_user_id_rfq_id_key unique (user_id, rfq_id);
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from public.platform_settings
    where setting_key is not null
    group by setting_key
    having count(*) > 1
  ) then
    raise notice 'platform_settings has duplicate setting_key rows; unique constraint was not added to avoid data loss.';
  elsif not exists (
    select 1
    from pg_constraint
    where conname = 'platform_settings_setting_key_key'
      and conrelid = 'public.platform_settings'::regclass
  ) then
    alter table public.platform_settings
      add constraint platform_settings_setting_key_key unique (setting_key);
  end if;
end $$;

create index if not exists pilot_feedback_status_idx on public.pilot_feedback (status);
create index if not exists pilot_feedback_priority_idx on public.pilot_feedback (priority);
create index if not exists pilot_feedback_issue_category_idx on public.pilot_feedback (issue_category);
create index if not exists pilot_feedback_tester_role_idx on public.pilot_feedback (tester_role);
create index if not exists pilot_feedback_created_at_idx on public.pilot_feedback (created_at desc);

create index if not exists idx_platform_settings_key on public.platform_settings (setting_key);
create index if not exists idx_platform_settings_category on public.platform_settings (category);
create index if not exists idx_saved_rfqs_user_id on public.saved_rfqs (user_id);
create index if not exists idx_saved_rfqs_rfq_id on public.saved_rfqs (rfq_id);
create index if not exists idx_profiles_updated_at on public.profiles (updated_at);
create index if not exists idx_profiles_smart_score on public.profiles (smart_score);
create index if not exists idx_purchase_orders_issue_date on public.purchase_orders (issue_date);
create index if not exists idx_whatsapp_alerts_supplier_id on public.whatsapp_alerts (supplier_id);
create index if not exists idx_whatsapp_alerts_rfq_id on public.whatsapp_alerts (rfq_id);
create index if not exists idx_quote_evaluations_rfq_id on public.quote_evaluations (rfq_id);
create index if not exists idx_quote_evaluations_quote_id on public.quote_evaluations (quote_id);
create index if not exists idx_award_recommendations_rfq_id on public.award_recommendations (rfq_id);
create index if not exists idx_invoice_approvals_invoice_id on public.invoice_approvals (invoice_id);
create index if not exists idx_supplier_score_history_supplier_id on public.supplier_score_history (supplier_id);

-- ---------------------------------------------------------------------------
-- RLS and permissive pilot policies. Tighten before production.
-- ---------------------------------------------------------------------------

alter table public.pilot_feedback enable row level security;
alter table public.platform_settings enable row level security;
alter table public.saved_rfqs enable row level security;
alter table public.profiles enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.whatsapp_alerts enable row level security;
alter table public.quote_evaluations enable row level security;
alter table public.award_recommendations enable row level security;
alter table public.invoice_approvals enable row level security;
alter table public.supplier_score_history enable row level security;

do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pilot_feedback' and policyname = 'schema_v2_pilot_feedback_select') then execute 'create policy "schema_v2_pilot_feedback_select" on public.pilot_feedback for select using (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pilot_feedback' and policyname = 'schema_v2_pilot_feedback_insert') then execute 'create policy "schema_v2_pilot_feedback_insert" on public.pilot_feedback for insert with check (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pilot_feedback' and policyname = 'schema_v2_pilot_feedback_update') then execute 'create policy "schema_v2_pilot_feedback_update" on public.pilot_feedback for update using (true)'; end if; end $$;

do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'platform_settings' and policyname = 'schema_v2_platform_settings_select') then execute 'create policy "schema_v2_platform_settings_select" on public.platform_settings for select using (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'platform_settings' and policyname = 'schema_v2_platform_settings_insert') then execute 'create policy "schema_v2_platform_settings_insert" on public.platform_settings for insert with check (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'platform_settings' and policyname = 'schema_v2_platform_settings_update') then execute 'create policy "schema_v2_platform_settings_update" on public.platform_settings for update using (true)'; end if; end $$;

do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'saved_rfqs' and policyname = 'schema_v2_saved_rfqs_select') then execute 'create policy "schema_v2_saved_rfqs_select" on public.saved_rfqs for select using (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'saved_rfqs' and policyname = 'schema_v2_saved_rfqs_insert') then execute 'create policy "schema_v2_saved_rfqs_insert" on public.saved_rfqs for insert with check (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'saved_rfqs' and policyname = 'schema_v2_saved_rfqs_update') then execute 'create policy "schema_v2_saved_rfqs_update" on public.saved_rfqs for update using (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'saved_rfqs' and policyname = 'schema_v2_saved_rfqs_delete') then execute 'create policy "schema_v2_saved_rfqs_delete" on public.saved_rfqs for delete using (true)'; end if; end $$;

do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'schema_v2_profiles_select') then execute 'create policy "schema_v2_profiles_select" on public.profiles for select using (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'schema_v2_profiles_insert') then execute 'create policy "schema_v2_profiles_insert" on public.profiles for insert with check (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'schema_v2_profiles_update') then execute 'create policy "schema_v2_profiles_update" on public.profiles for update using (true)'; end if; end $$;

do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'purchase_orders' and policyname = 'schema_v2_purchase_orders_select') then execute 'create policy "schema_v2_purchase_orders_select" on public.purchase_orders for select using (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'purchase_orders' and policyname = 'schema_v2_purchase_orders_insert') then execute 'create policy "schema_v2_purchase_orders_insert" on public.purchase_orders for insert with check (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'purchase_orders' and policyname = 'schema_v2_purchase_orders_update') then execute 'create policy "schema_v2_purchase_orders_update" on public.purchase_orders for update using (true)'; end if; end $$;

do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'whatsapp_alerts' and policyname = 'schema_v2_whatsapp_alerts_select') then execute 'create policy "schema_v2_whatsapp_alerts_select" on public.whatsapp_alerts for select using (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'whatsapp_alerts' and policyname = 'schema_v2_whatsapp_alerts_insert') then execute 'create policy "schema_v2_whatsapp_alerts_insert" on public.whatsapp_alerts for insert with check (true)'; end if; end $$;

do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'quote_evaluations' and policyname = 'schema_v2_quote_evaluations_select') then execute 'create policy "schema_v2_quote_evaluations_select" on public.quote_evaluations for select using (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'quote_evaluations' and policyname = 'schema_v2_quote_evaluations_insert') then execute 'create policy "schema_v2_quote_evaluations_insert" on public.quote_evaluations for insert with check (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'quote_evaluations' and policyname = 'schema_v2_quote_evaluations_update') then execute 'create policy "schema_v2_quote_evaluations_update" on public.quote_evaluations for update using (true)'; end if; end $$;

do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'award_recommendations' and policyname = 'schema_v2_award_recommendations_select') then execute 'create policy "schema_v2_award_recommendations_select" on public.award_recommendations for select using (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'award_recommendations' and policyname = 'schema_v2_award_recommendations_insert') then execute 'create policy "schema_v2_award_recommendations_insert" on public.award_recommendations for insert with check (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'award_recommendations' and policyname = 'schema_v2_award_recommendations_update') then execute 'create policy "schema_v2_award_recommendations_update" on public.award_recommendations for update using (true)'; end if; end $$;

do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'invoice_approvals' and policyname = 'schema_v2_invoice_approvals_select') then execute 'create policy "schema_v2_invoice_approvals_select" on public.invoice_approvals for select using (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'invoice_approvals' and policyname = 'schema_v2_invoice_approvals_insert') then execute 'create policy "schema_v2_invoice_approvals_insert" on public.invoice_approvals for insert with check (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'invoice_approvals' and policyname = 'schema_v2_invoice_approvals_update') then execute 'create policy "schema_v2_invoice_approvals_update" on public.invoice_approvals for update using (true)'; end if; end $$;

do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'supplier_score_history' and policyname = 'schema_v2_supplier_score_history_select') then execute 'create policy "schema_v2_supplier_score_history_select" on public.supplier_score_history for select using (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'supplier_score_history' and policyname = 'schema_v2_supplier_score_history_insert') then execute 'create policy "schema_v2_supplier_score_history_insert" on public.supplier_score_history for insert with check (true)'; end if; end $$;

-- Optional updated_at triggers for tables touched by v2.
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'profiles_set_updated_at') then
    create trigger profiles_set_updated_at before update on public.profiles
    for each row execute function public.set_updated_at();
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'platform_settings_set_updated_at') then
    create trigger platform_settings_set_updated_at before update on public.platform_settings
    for each row execute function public.set_updated_at();
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'quote_evaluations_set_updated_at') then
    create trigger quote_evaluations_set_updated_at before update on public.quote_evaluations
    for each row execute function public.set_updated_at();
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'award_recommendations_set_updated_at') then
    create trigger award_recommendations_set_updated_at before update on public.award_recommendations
    for each row execute function public.set_updated_at();
  end if;
end $$;
