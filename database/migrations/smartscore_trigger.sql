-- Monate Connect SmartScore trigger
-- Keeps profiles.smart_score aligned when verification fields change server-side.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS provinces TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS smart_score NUMERIC DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS csd_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bbbee_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tax_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banking_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS director_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tax_clearance_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_account_number TEXT;

CREATE OR REPLACE FUNCTION update_smart_score()
RETURNS TRIGGER AS $$
DECLARE
  new_score integer := 0;
  bbbee_level_num integer := 0;
  profile_province_count integer := 0;
BEGIN
  profile_province_count := COALESCE(array_length(NEW.provinces, 1), 0);
  IF profile_province_count = 0 AND NULLIF(BTRIM(COALESCE(NEW.province, '')), '') IS NOT NULL THEN
    profile_province_count := 1;
  END IF;

  -- Business profile (20 pts)
  IF NULLIF(BTRIM(COALESCE(NEW.business_name, '')), '') IS NOT NULL
    AND NULLIF(BTRIM(COALESCE(NEW.industry, '')), '') IS NOT NULL
    AND NULLIF(BTRIM(COALESCE(NEW.phone, '')), '') IS NOT NULL
    AND NULLIF(BTRIM(COALESCE(NEW.description, '')), '') IS NOT NULL
    AND profile_province_count > 0
  THEN
    new_score := new_score + 20;
  END IF;

  -- CSD (20 full, 10 partial)
  IF NEW.csd_verified = true
    OR LOWER(COALESCE(NEW.verification_status, '')) LIKE '%verified%' THEN
    new_score := new_score + 20;
  ELSIF NULLIF(BTRIM(COALESCE(NEW.csd_number, '')), '') IS NOT NULL THEN
    new_score := new_score + 10;
  END IF;

  -- BBBEE (20 for level 1-4, 10 for 5-8)
  IF NEW.bbbee_verified = true
    OR (
      LOWER(COALESCE(NEW.verification_status, '')) LIKE '%verified%'
      AND NULLIF(BTRIM(COALESCE(NEW.bbbee_level, '')), '') IS NOT NULL
    )
  THEN
    bbbee_level_num := COALESCE(NULLIF(regexp_replace(COALESCE(NEW.bbbee_level, '0'), '[^0-9]', '', 'g'), ''), '0')::integer;
    IF bbbee_level_num BETWEEN 1 AND 4 THEN
      new_score := new_score + 20;
    ELSIF bbbee_level_num BETWEEN 5 AND 8 THEN
      new_score := new_score + 10;
    END IF;
  END IF;

  -- Tax clearance (15 full, 7 partial)
  IF NEW.tax_verified = true THEN
    new_score := new_score + 15;
  ELSIF NULLIF(BTRIM(COALESCE(NEW.tax_clearance_url, NEW.tax_document_url, '')), '') IS NOT NULL THEN
    new_score := new_score + 7;
  END IF;

  -- Banking (10 full, 5 partial)
  IF NEW.banking_verified = true OR NEW.bank_verified = true THEN
    new_score := new_score + 10;
  ELSIF NULLIF(BTRIM(COALESCE(NEW.bank_name, '')), '') IS NOT NULL
    AND NULLIF(BTRIM(COALESCE(NEW.bank_account_number, '')), '') IS NOT NULL THEN
    new_score := new_score + 5;
  END IF;

  -- Director verified (10 optional)
  IF NEW.director_verified = true THEN
    new_score := new_score + 10;
  END IF;

  -- Company profile document (5 optional)
  IF NULLIF(BTRIM(COALESCE(NEW.capability_statement_url, '')), '') IS NOT NULL THEN
    new_score := new_score + 5;
  END IF;

  NEW.smart_score := LEAST(new_score, 100);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS recalculate_smart_score ON public.profiles;

CREATE TRIGGER recalculate_smart_score
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_smart_score();
