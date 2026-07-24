-- Monate Connect profiles schema compatibility contract
-- Generated: 2026-06-08
-- Purpose: add every public.profiles column referenced by the current app and ensure updated_at trigger support.
-- Safety: additive only. No drops, renames, data rewrites, or UI changes.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key,
  created_at timestamptz default timezone('utc', now()),
  updated_at timestamptz default timezone('utc', now())
);

alter table public.profiles
  add column if not exists role text,
  add column if not exists business_name text,
  add column if not exists preferred_name text,
  add column if not exists full_name text,
  add column if not exists province text,
  add column if not exists provinces text,
  add column if not exists industry text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists website text,
  add column if not exists description text,
  add column if not exists company_registration text,
  add column if not exists tax_reference text,
  add column if not exists vat_number text,
  add column if not exists verification_status text,
  add column if not exists verification_notes text,
  add column if not exists csd_number text,
  add column if not exists bbbee_level text,
  add column if not exists tax_status text,
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
  add column if not exists bank_name text,
  add column if not exists account_number text,
  add column if not exists banking_verification_status text,
  add column if not exists bank_verification_status text,
  -- bank_verified is authoritative for banking verification. banking_verified
  -- is redundant, not legacy/unused: it's still actively read at five
  -- app-layer sites (smartScore.ts, supplierScoreAssembly.ts,
  -- suppliers/[id]/page.tsx, SupplierDirectory.tsx,
  -- dashboard/onboarding/page.tsx) and by the smartscore_trigger.sql Postgres
  -- trigger, always as `banking_verified || bank_verified`. Across all real
  -- supplier rows it has never once been true while bank_verified was false,
  -- so it has never changed a real outcome — but it still executes on every
  -- read. Removing it means updating all five call sites plus the trigger,
  -- not just dropping the column.
  add column if not exists bank_verified boolean default false,
  add column if not exists banking_verified boolean default false,
  add column if not exists bbbee_verified boolean default false,
  add column if not exists csd_verified boolean default false,
  add column if not exists tax_verified boolean default false,
  add column if not exists director_verified boolean default false,
  add column if not exists profile_complete boolean default false,
  add column if not exists smart_score numeric default 0,
  add column if not exists created_at timestamptz default timezone('utc', now()),
  add column if not exists updated_at timestamptz default timezone('utc', now());

create index if not exists idx_profiles_updated_at on public.profiles (updated_at);

-- Add updated_at trigger for profile rows if it does not already exist.
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'profiles_set_updated_at') then
    create trigger profiles_set_updated_at before update on public.profiles
    for each row execute function public.set_updated_at();
  end if;
end $$;
