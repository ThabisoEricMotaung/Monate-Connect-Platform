-- Monate Connect: profile trigger + missing columns
-- Run in Supabase SQL editor: https://supabase.com/dashboard/project/enoyrbdflwihxzitpour/sql/new
-- Safe to re-run (all additive, IF NOT EXISTS).

-- 1. Add columns needed by the onboarding flow
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name          text,
  ADD COLUMN IF NOT EXISTS registration_complete boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_seen    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS tax_reference      text,
  ADD COLUMN IF NOT EXISTS vat_number         text;

-- 2. Function: insert a profile row for every new auth user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    created_at,
    updated_at,
    verification_status,
    smart_score,
    registration_complete,
    role
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NOW(),
    NOW(),
    'pending',
    0,
    false,
    COALESCE(NEW.raw_user_meta_data->>'role', 'supplier')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. Backfill full_name from auth.users metadata for existing profiles
UPDATE public.profiles p
SET full_name = u.raw_user_meta_data->>'full_name'
FROM auth.users u
WHERE p.id = u.id
  AND p.full_name IS NULL
  AND u.raw_user_meta_data->>'full_name' IS NOT NULL;