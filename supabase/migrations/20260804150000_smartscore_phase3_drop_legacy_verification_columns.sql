-- SmartScore Phase 3: drop the legacy verification boolean columns now that
-- verification state is derived entirely from supplier_documents and
-- verification_attestations (see src/lib/supplierVerification.ts).
--
-- public_supplier_directory still selects these columns directly, so it must
-- be repointed first or the DROP COLUMN statements below fail with a
-- dependency error. Nothing in the app queries this view (confirmed via a
-- full src/ grep) -- it predates the canonical scoring path -- but it is
-- exposed to anon/authenticated over PostgREST, so it is recreated rather
-- than dropped outright in case an external consumer depends on its shape.
-- The legacy verified columns sit in the middle of the existing column list
-- (id, ..., smart_score, csd_verified, ..., director_verified, website, ...),
-- so CREATE OR REPLACE VIEW can't drop them: Postgres only allows that form
-- to append trailing columns, not remove or reorder existing ones. Drop and
-- recreate instead, then restore the anon/authenticated grants explicitly
-- since a dropped-and-recreated view doesn't retain the old grants.
drop view if exists public.public_supplier_directory;

create view public.public_supplier_directory as
select
  id,
  business_name,
  province,
  provinces,
  industry,
  bbbee_level,
  cidb_grade,
  smart_score,
  website,
  description,
  employee_count,
  linkedin_url,
  founded_year,
  created_at
from public.profiles
where role = 'supplier' and lower(verification_status) = 'verified';

grant all on public.public_supplier_directory to anon, authenticated, service_role;

alter table public.profiles
  drop column if exists csd_verified,
  drop column if exists bbbee_verified,
  drop column if exists tax_verified,
  drop column if exists bank_verified,
  drop column if exists banking_verified,
  drop column if exists director_verified;

alter table public.supplier_bank_details
  drop column if exists verification_status;
