-- Monate Connect: RLS policies for the profiles table
-- Run in Supabase SQL editor after the main schema migration.
-- Safe to re-run (policies are dropped and recreated).

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are visible"  ON public.profiles;

-- Suppliers can read/write their own row
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Public can view verified supplier profiles (for /suppliers directory)
CREATE POLICY "Public profiles are visible"
  ON public.profiles FOR SELECT
  USING (verification_status = 'Verified');