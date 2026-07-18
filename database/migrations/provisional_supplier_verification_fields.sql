-- Additive provisional verification overlay for supplier profiles.
-- This does not alter verification_status, document statuses, or SmartScore logic.

alter table public.profiles
  add column if not exists provisional_missing_document text,
  add column if not exists provisional_deadline date;

create index if not exists idx_profiles_provisional_deadline
  on public.profiles (provisional_deadline)
  where provisional_missing_document is not null;
