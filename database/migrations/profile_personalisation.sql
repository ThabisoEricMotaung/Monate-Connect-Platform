ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferred_name text,
  ADD COLUMN IF NOT EXISTS dashboard_welcome_seen boolean DEFAULT false;
