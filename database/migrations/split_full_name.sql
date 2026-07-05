-- Add split personal-name fields while keeping full_name/preferred_name for
-- existing accounts and older code paths.
alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text;
