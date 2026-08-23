-- =========================================================
-- AiForm Mining — Supplier Passport Schema Extension
-- Run in Supabase SQL Editor (project: enoyrbdflwihxzitpour)
-- Extends existing supplier/profile tables — does not replace them.
-- Assumes an existing `profiles` table with `id uuid` matching auth.users.id,
-- and an existing supplier/company table. Adjust FK names below to match
-- your actual table names if they differ (e.g. `suppliers`, `companies`).
-- =========================================================

-- ---------------------------------------------------------
-- 0. Reference table: mine operations & host communities
-- Needed before host-community matching can work at all.
-- Populate manually or via a seed script as you onboard mines.
-- ---------------------------------------------------------
create table if not exists public.mine_operations (
  id uuid primary key default gen_random_uuid(),
  mine_group text not null,               -- e.g. 'Sibanye-Stillwater'
  operation_name text not null,           -- e.g. 'Kloof Operation'
  commodity text,                          -- e.g. 'gold', 'PGM', 'coal'
  province text not null,
  district_municipality text,
  local_municipality text,
  host_communities text[] default '{}',   -- e.g. ARRAY['Merafong City']
  procurement_system text,                -- e.g. 'Coupa', 'SAP Ariba', 'SCNet', 'proprietary'
  procurement_portal_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.mine_operations is
  'Reference data for mine sites used in host-community matching. Not supplier-owned data.';

-- Public read (this is reference data, not sensitive) — no RLS needed,
-- but keep write access admin-only.
alter table public.mine_operations enable row level security;

create policy "mine_operations_select_all"
  on public.mine_operations for select
  using (true);

create policy "mine_operations_admin_write"
  on public.mine_operations for all
  using (auth.jwt() ->> 'role' = 'admin')
  with check (auth.jwt() ->> 'role' = 'admin');


-- ---------------------------------------------------------
-- 1. Mining transformation & classification profile
-- One row per supplier. Extends the existing supplier/company record.
-- ---------------------------------------------------------
create table if not exists public.mining_supplier_profiles (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.profiles(id) on delete cascade,

  -- Ownership / transformation (Mining Charter categories)
  black_ownership_pct numeric(5,2) check (black_ownership_pct between 0 and 100),
  black_women_ownership_pct numeric(5,2) check (black_women_ownership_pct between 0 and 100),
  youth_ownership_pct numeric(5,2) check (youth_ownership_pct between 0 and 100),
  hdp_ownership_pct numeric(5,2) check (hdp_ownership_pct between 0 and 100),
  entity_size text check (entity_size in ('EME', 'QSE', 'Generic')),

  -- Manufacturing vs. supply distinction (see research: SA supplier != SA-manufactured product)
  is_sa_manufacturer boolean default false,
  sabs_certified boolean default false,
  sabs_certificate_url text,

  -- Location for local/provincial/municipal matching (separate from host-community table below)
  province text,
  district_municipality text,
  local_municipality text,

  -- Mining Charter self-classification (supplier's own claim — verified status tracked separately)
  mining_charter_category text check (
    mining_charter_category in ('HDP-owned', 'Women-owned', 'Youth-owned', 'BEE-compliant', 'Not classified')
  ),

  bbee_level int check (bbee_level between 1 and 8),
  bbee_certificate_url text,
  bbee_certificate_expiry date,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (supplier_id)
);

comment on table public.mining_supplier_profiles is
  'Mining Charter transformation attributes and ownership classification, one row per supplier.';

alter table public.mining_supplier_profiles enable row level security;

create policy "mining_supplier_profiles_owner_select"
  on public.mining_supplier_profiles for select
  using (auth.uid() = supplier_id or auth.jwt() ->> 'role' = 'admin');

create policy "mining_supplier_profiles_owner_write"
  on public.mining_supplier_profiles for insert
  with check (auth.uid() = supplier_id);

create policy "mining_supplier_profiles_owner_update"
  on public.mining_supplier_profiles for update
  using (auth.uid() = supplier_id or auth.jwt() ->> 'role' = 'admin')
  with check (auth.uid() = supplier_id or auth.jwt() ->> 'role' = 'admin');

-- Public-facing directory view should only expose non-sensitive columns,
-- following the same pattern as public_supplier_directory.
create or replace view public.public_mining_supplier_directory as
select
  supplier_id,
  entity_size,
  is_sa_manufacturer,
  province,
  local_municipality,
  mining_charter_category,
  bbee_level
from public.mining_supplier_profiles;


-- ---------------------------------------------------------
-- 2. Host-community mapping
-- A supplier can qualify as "host community" for more than one mine
-- operation (e.g. if they operate in more than one host-community area).
-- Kept separate from mining_supplier_profiles because it's a many-to-many
-- relationship, not a single classification.
-- ---------------------------------------------------------
create table if not exists public.mining_host_community_links (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.profiles(id) on delete cascade,
  mine_operation_id uuid not null references public.mine_operations(id) on delete cascade,
  is_host_community boolean not null default false,
  verified boolean not null default false,
  verified_at timestamptz,
  verified_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),

  unique (supplier_id, mine_operation_id)
);

comment on table public.mining_host_community_links is
  'Many-to-many: which mine operations a supplier qualifies as a host-community supplier for.';

alter table public.mining_host_community_links enable row level security;

create policy "host_community_links_owner_select"
  on public.mining_host_community_links for select
  using (auth.uid() = supplier_id or auth.jwt() ->> 'role' = 'admin');

create policy "host_community_links_owner_write"
  on public.mining_host_community_links for insert
  with check (auth.uid() = supplier_id);

create policy "host_community_links_admin_verify"
  on public.mining_host_community_links for update
  using (auth.jwt() ->> 'role' = 'admin')
  with check (auth.jwt() ->> 'role' = 'admin');


-- ---------------------------------------------------------
-- 3. Safety, insurance & operational readiness documents
-- Multiple rows per supplier — each row is one document with its own
-- expiry, so the existing compliance-expiry monitoring pattern can reuse
-- this table directly (same shape as your general compliance documents).
-- ---------------------------------------------------------
create table if not exists public.mining_compliance_documents (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.profiles(id) on delete cascade,

  document_type text not null check (document_type in (
    'COIDA', 'Public Liability Insurance', 'Safety File', 'Mine Medical Certificate',
    'CIDB Grading', 'OEM Accreditation', 'ISO 9001', 'ISO 14001', 'SANS Certification',
    'Environmental Authorisation', 'Anti-Bribery Declaration', 'Sanctions Screening Declaration',
    'Modern Slavery Declaration', 'Responsible Sourcing Declaration', 'Other'
  )),
  document_label text,                 -- free-text sub-label, e.g. 'Welding certificate - AWS D1.1'
  document_url text not null,          -- signed URL / storage path, same pattern as existing private docs
  issue_date date,
  expiry_date date,
  status text not null default 'pending' check (status in ('pending', 'verified', 'expired', 'rejected')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.mining_compliance_documents is
  'Mining-specific compliance documents with expiry tracking. Feeds the existing expiry-alert system.';

create index if not exists idx_mining_compliance_documents_expiry
  on public.mining_compliance_documents (expiry_date)
  where status = 'verified';

alter table public.mining_compliance_documents enable row level security;

create policy "mining_compliance_docs_owner_select"
  on public.mining_compliance_documents for select
  using (auth.uid() = supplier_id or auth.jwt() ->> 'role' = 'admin');

create policy "mining_compliance_docs_owner_write"
  on public.mining_compliance_documents for insert
  with check (auth.uid() = supplier_id);

create policy "mining_compliance_docs_owner_update"
  on public.mining_compliance_documents for update
  using (auth.uid() = supplier_id or auth.jwt() ->> 'role' = 'admin')
  with check (auth.uid() = supplier_id or auth.jwt() ->> 'role' = 'admin');


-- ---------------------------------------------------------
-- 4. Mining opportunities — extends whatever RFQ/opportunity table
-- already exists. If you already have an `opportunities` or `rfqs`
-- table, ALTER it instead of creating a new one. Shown here as a
-- standalone table for clarity; merge with existing schema as needed.
-- ---------------------------------------------------------
create table if not exists public.mining_opportunities (
  id uuid primary key default gen_random_uuid(),
  mine_operation_id uuid references public.mine_operations(id),
  title text not null,
  description text,
  category text,                        -- e.g. 'Engineering services', 'Earthmoving equipment'
  source_url text,                      -- link to originating mine portal / Coupa / Ariba / SCNet listing
  closing_date date,

  -- Eligibility rules as structured JSON so the matching engine can evaluate
  -- them generically without a schema change per new rule type.
  -- Example:
  -- {
  --   "province": ["Limpopo"],
  --   "requires_host_community": true,
  --   "min_black_ownership_pct": 51,
  --   "min_bbee_level": 4,
  --   "required_documents": ["COIDA", "Public Liability Insurance"],
  --   "min_cidb_grade": "6CE",
  --   "required_certifications": ["ISO 9001"],
  --   "min_mining_references": 2
  -- }
  eligibility_rules jsonb not null default '{}'::jsonb,

  status text not null default 'open' check (status in ('open', 'closed', 'awarded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.mining_opportunities is
  'Mining-sector opportunities with structured eligibility_rules for the matching engine.';

alter table public.mining_opportunities enable row level security;

create policy "mining_opportunities_select_all"
  on public.mining_opportunities for select
  using (true);

create policy "mining_opportunities_admin_write"
  on public.mining_opportunities for all
  using (auth.jwt() ->> 'role' = 'admin')
  with check (auth.jwt() ->> 'role' = 'admin');


-- ---------------------------------------------------------
-- 5. Cached eligibility results
-- The matching engine (application code, not SQL) evaluates a supplier
-- against an opportunity's eligibility_rules and writes the result here.
-- Recompute on profile change or nightly — don't compute on every page view.
-- ---------------------------------------------------------
create table if not exists public.mining_eligibility_results (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.profiles(id) on delete cascade,
  opportunity_id uuid not null references public.mining_opportunities(id) on delete cascade,

  match_percentage numeric(5,2) not null check (match_percentage between 0 and 100),
  qualification_status text not null check (
    qualification_status in ('qualified', 'potentially_qualified', 'not_qualified')
  ),

  -- Structured gap list so the UI can render "COIDA expires in 11 days"
  -- style messages without re-running the engine.
  -- Example: [{"requirement": "min_black_ownership_pct", "required": 51, "actual": 40, "severity": "hard"}]
  gaps jsonb not null default '[]'::jsonb,

  computed_at timestamptz not null default now(),

  unique (supplier_id, opportunity_id)
);

comment on table public.mining_eligibility_results is
  'Cached output of the eligibility/matching engine. Recomputed, not user-editable.';

create index if not exists idx_mining_eligibility_supplier
  on public.mining_eligibility_results (supplier_id, match_percentage desc);

alter table public.mining_eligibility_results enable row level security;

create policy "mining_eligibility_results_owner_select"
  on public.mining_eligibility_results for select
  using (auth.uid() = supplier_id or auth.jwt() ->> 'role' = 'admin');

create policy "mining_eligibility_results_system_write"
  on public.mining_eligibility_results for all
  using (auth.jwt() ->> 'role' = 'admin')
  with check (auth.jwt() ->> 'role' = 'admin');


-- ---------------------------------------------------------
-- 6. Updated-at triggers (reuse if you already have a generic one)
-- ---------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_mining_supplier_profiles_updated on public.mining_supplier_profiles;
create trigger trg_mining_supplier_profiles_updated
  before update on public.mining_supplier_profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_mining_compliance_documents_updated on public.mining_compliance_documents;
create trigger trg_mining_compliance_documents_updated
  before update on public.mining_compliance_documents
  for each row execute function public.set_updated_at();

drop trigger if exists trg_mine_operations_updated on public.mine_operations;
create trigger trg_mine_operations_updated
  before update on public.mine_operations
  for each row execute function public.set_updated_at();

drop trigger if exists trg_mining_opportunities_updated on public.mining_opportunities;
create trigger trg_mining_opportunities_updated
  before update on public.mining_opportunities
  for each row execute function public.set_updated_at();

-- =========================================================
-- Notes for Claude Code implementation:
-- 1. Matching engine lives in application code (Next.js API route or edge
--    function), not SQL — it reads mining_opportunities.eligibility_rules,
--    joins mining_supplier_profiles + mining_compliance_documents +
--    mining_host_community_links for a supplier, computes match_percentage
--    and gaps, and upserts into mining_eligibility_results.
-- 2. Recompute triggers: on mining_supplier_profiles update, on new/renewed
--    mining_compliance_documents, and on new mining_opportunities insert.
-- 3. FK assumption: replace `public.profiles(id)` with your actual
--    supplier/company table + PK if it differs from `profiles`.
-- 4. Ghost profile issue (aiformstudio@gmail.com): these new tables cascade
--    on delete from profiles, so cleaning the ghost profile from `profiles`
--    will also clean any stray mining rows automatically.
-- =========================================================
