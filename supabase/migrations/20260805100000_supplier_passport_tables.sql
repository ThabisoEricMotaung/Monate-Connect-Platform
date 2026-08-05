-- Supplier Passport: certifications, licences, service categories, operating
-- areas, past projects and references. Six purpose-built tables (no generic
-- catch-all) backing the new "Passport" dashboard tab and the condensed
-- public-page summary.
--
-- Two tables carry review metadata (certifications, licences) and follow the
-- same evidence-review shape as public.supplier_documents. The other four are
-- lightweight descriptive tables the supplier maintains directly, with no
-- review workflow.
--
-- Expiry handling: only expiry_date is stored. "Expiring soon" is a derived
-- UI label computed from expiry_date at read time -- there is no reminder or
-- cron logic here; that is the separate Compliance Expiry Monitoring roadmap
-- item.

-- ---------------------------------------------------------------------------
-- supplier_certifications (review-backed)
-- ---------------------------------------------------------------------------
create table if not exists public.supplier_certifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  issuing_body text,
  certificate_number text,
  issue_date date,
  expiry_date date,
  status text not null default 'Missing'
    check (status in ('Verified', 'Pending review', 'Rejected', 'Expired', 'Missing')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  evidence_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists supplier_certifications_profile_idx
  on public.supplier_certifications (profile_id);
create index if not exists supplier_certifications_status_idx
  on public.supplier_certifications (status);
create index if not exists supplier_certifications_expiry_idx
  on public.supplier_certifications (expiry_date)
  where expiry_date is not null;

drop trigger if exists set_supplier_certifications_updated_at on public.supplier_certifications;
create trigger set_supplier_certifications_updated_at
before update on public.supplier_certifications
for each row execute function public.set_updated_at();

alter table public.supplier_certifications enable row level security;

drop policy if exists "Suppliers manage own certifications" on public.supplier_certifications;
create policy "Suppliers manage own certifications"
  on public.supplier_certifications
  for all
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

drop policy if exists "Admins can read supplier certifications" on public.supplier_certifications;
create policy "Admins can read supplier certifications"
  on public.supplier_certifications
  for select
  using (
    exists (
      select 1 from public.profiles admin_profile
      where admin_profile.id = (select auth.uid())
        and lower(coalesce(admin_profile.role, '')) = 'admin'
    )
  );

drop policy if exists "Admins can review supplier certifications" on public.supplier_certifications;
create policy "Admins can review supplier certifications"
  on public.supplier_certifications
  for update
  using (
    exists (
      select 1 from public.profiles admin_profile
      where admin_profile.id = (select auth.uid())
        and lower(coalesce(admin_profile.role, '')) = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles admin_profile
      where admin_profile.id = (select auth.uid())
        and lower(coalesce(admin_profile.role, '')) = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- supplier_licences (review-backed)
-- ---------------------------------------------------------------------------
create table if not exists public.supplier_licences (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  licence_type text not null,
  issuing_body text,
  licence_number text,
  issue_date date,
  expiry_date date,
  status text not null default 'Missing'
    check (status in ('Verified', 'Pending review', 'Rejected', 'Expired', 'Missing')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  evidence_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists supplier_licences_profile_idx
  on public.supplier_licences (profile_id);
create index if not exists supplier_licences_status_idx
  on public.supplier_licences (status);
create index if not exists supplier_licences_expiry_idx
  on public.supplier_licences (expiry_date)
  where expiry_date is not null;

drop trigger if exists set_supplier_licences_updated_at on public.supplier_licences;
create trigger set_supplier_licences_updated_at
before update on public.supplier_licences
for each row execute function public.set_updated_at();

alter table public.supplier_licences enable row level security;

drop policy if exists "Suppliers manage own licences" on public.supplier_licences;
create policy "Suppliers manage own licences"
  on public.supplier_licences
  for all
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

drop policy if exists "Admins can read supplier licences" on public.supplier_licences;
create policy "Admins can read supplier licences"
  on public.supplier_licences
  for select
  using (
    exists (
      select 1 from public.profiles admin_profile
      where admin_profile.id = (select auth.uid())
        and lower(coalesce(admin_profile.role, '')) = 'admin'
    )
  );

drop policy if exists "Admins can review supplier licences" on public.supplier_licences;
create policy "Admins can review supplier licences"
  on public.supplier_licences
  for update
  using (
    exists (
      select 1 from public.profiles admin_profile
      where admin_profile.id = (select auth.uid())
        and lower(coalesce(admin_profile.role, '')) = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles admin_profile
      where admin_profile.id = (select auth.uid())
        and lower(coalesce(admin_profile.role, '')) = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- supplier_service_categories (descriptive, no review fields)
-- ---------------------------------------------------------------------------
create table if not exists public.supplier_service_categories (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  category_name text not null,
  category_group text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists supplier_service_categories_profile_idx
  on public.supplier_service_categories (profile_id);

drop trigger if exists set_supplier_service_categories_updated_at on public.supplier_service_categories;
create trigger set_supplier_service_categories_updated_at
before update on public.supplier_service_categories
for each row execute function public.set_updated_at();

alter table public.supplier_service_categories enable row level security;

drop policy if exists "Suppliers manage own service categories" on public.supplier_service_categories;
create policy "Suppliers manage own service categories"
  on public.supplier_service_categories
  for all
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- supplier_operating_areas (descriptive, no review fields)
-- ---------------------------------------------------------------------------
create table if not exists public.supplier_operating_areas (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  province text,
  municipality text,
  city text,
  region text,
  service_radius_km numeric,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists supplier_operating_areas_profile_idx
  on public.supplier_operating_areas (profile_id);

drop trigger if exists set_supplier_operating_areas_updated_at on public.supplier_operating_areas;
create trigger set_supplier_operating_areas_updated_at
before update on public.supplier_operating_areas
for each row execute function public.set_updated_at();

alter table public.supplier_operating_areas enable row level security;

drop policy if exists "Suppliers manage own operating areas" on public.supplier_operating_areas;
create policy "Suppliers manage own operating areas"
  on public.supplier_operating_areas
  for all
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- supplier_projects (descriptive, no review fields)
-- ---------------------------------------------------------------------------
create table if not exists public.supplier_projects (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  project_name text not null,
  client_name text,
  description text,
  sector text,
  location text,
  start_date date,
  end_date date,
  value numeric,
  outcome_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists supplier_projects_profile_idx
  on public.supplier_projects (profile_id);

drop trigger if exists set_supplier_projects_updated_at on public.supplier_projects;
create trigger set_supplier_projects_updated_at
before update on public.supplier_projects
for each row execute function public.set_updated_at();

alter table public.supplier_projects enable row level security;

drop policy if exists "Suppliers manage own projects" on public.supplier_projects;
create policy "Suppliers manage own projects"
  on public.supplier_projects
  for all
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- supplier_references (descriptive, no review fields)
-- ---------------------------------------------------------------------------
create table if not exists public.supplier_references (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  referrer_name text not null,
  organisation_name text,
  relationship text,
  contact_email text,
  contact_phone text,
  project_summary text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists supplier_references_profile_idx
  on public.supplier_references (profile_id);

drop trigger if exists set_supplier_references_updated_at on public.supplier_references;
create trigger set_supplier_references_updated_at
before update on public.supplier_references
for each row execute function public.set_updated_at();

alter table public.supplier_references enable row level security;

drop policy if exists "Suppliers manage own references" on public.supplier_references;
create policy "Suppliers manage own references"
  on public.supplier_references
  for all
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));
