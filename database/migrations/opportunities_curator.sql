-- Additive curator capability for buyer accounts that can post external tenders.
-- Curators remain role='buyer', so existing RFQ ownership RLS remains valid:
-- "Buyers can manage their own RFQs" checks created_by = auth.uid()
-- or buyer_user_id = auth.uid() for both USING and WITH CHECK.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_opportunities_curator BOOLEAN DEFAULT FALSE;

ALTER TABLE public.rfqs
  ADD COLUMN IF NOT EXISTS is_external_opportunity BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS original_source_url TEXT,
  ADD COLUMN IF NOT EXISTS source_name TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_is_opportunities_curator
  ON public.profiles (is_opportunities_curator);

CREATE INDEX IF NOT EXISTS idx_rfqs_external_opportunity
  ON public.rfqs (is_external_opportunity);

CREATE OR REPLACE FUNCTION public.prevent_external_opportunity_quotes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.rfqs
    WHERE id = NEW.rfq_id
      AND is_external_opportunity = TRUE
  ) THEN
    RAISE EXCEPTION 'Quotes cannot be submitted through AiForm Procure for externally-sourced opportunities.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_external_opportunity_quotes ON public.quotes;
CREATE TRIGGER prevent_external_opportunity_quotes
  BEFORE INSERT ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_external_opportunity_quotes();
