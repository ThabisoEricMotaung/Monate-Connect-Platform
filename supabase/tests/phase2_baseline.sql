create extension if not exists pgcrypto;

do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin; exception when duplicate_object then null; end $$;

create schema if not exists auth;
create table auth.users (
  id uuid primary key,
  email text
);

create or replace function auth.uid() returns uuid
language sql stable
as $$ select null::uuid $$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text,
  email text,
  business_name text,
  industry text,
  province text,
  provinces text,
  phone text,
  description text,
  bbbee_level text,
  verification_status text,
  smart_score numeric default 0,
  csd_expiry_date text,
  bbbee_expiry_date text,
  tax_expiry_date text,
  cidb_expiry_date text,
  updated_at timestamptz default now()
);

create table public.supplier_documents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  document_type text not null,
  file_url text,
  storage_path text,
  original_filename text,
  content_type text,
  file_size bigint,
  uploaded_at timestamptz default now(),
  status text not null default 'under_review',
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  review_notes text,
  constraint supplier_documents_status_check
    check (status in ('under_review', 'verified', 'rejected', 'expired', 'superseded'))
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  user_id uuid,
  user_email text,
  action text,
  entity_type text,
  entity_id text,
  old_values jsonb,
  new_values jsonb,
  metadata jsonb,
  created_at timestamptz default now()
);

create table public.supplier_certifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  expiry_date date,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  status text not null default 'Missing'
    check (status in ('Verified', 'Pending review', 'Rejected', 'Expired', 'Missing')),
  updated_at timestamptz not null default now()
);

create table public.supplier_licences (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  licence_type text not null,
  expiry_date date,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  status text not null default 'Missing'
    check (status in ('Verified', 'Pending review', 'Rejected', 'Expired', 'Missing')),
  updated_at timestamptz not null default now()
);
