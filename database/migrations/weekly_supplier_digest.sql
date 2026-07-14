-- Supports the weekly supplier activity digest
-- (src/app/api/cron/weekly-supplier-digest) and its unsubscribe link
-- (src/app/api/unsubscribe/weekly-digest).
--
-- A supplier is subscribed by default (column is null). Clicking the
-- unsubscribe link in the email sets this to the time they opted out, and
-- the cron excludes anyone with a non-null value here going forward.

alter table public.profiles
  add column if not exists weekly_digest_unsubscribed_at timestamptz;
