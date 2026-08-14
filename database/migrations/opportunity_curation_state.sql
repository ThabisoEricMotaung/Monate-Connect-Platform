-- Adds explicit provenance and curation state for externally-sourced opportunities.
-- Public application queries only expose external rows that have been approved.
--
-- The nine terminal notices below were individually reviewed and quarantined on
-- 2026-08-08 before this migration was created.

ALTER TABLE public.rfqs
  ADD COLUMN IF NOT EXISTS external_reference TEXT,
  ADD COLUMN IF NOT EXISTS curation_status TEXT NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS curation_reason TEXT,
  ADD COLUMN IF NOT EXISTS curated_at TIMESTAMPTZ;

ALTER TABLE public.rfqs
  DROP CONSTRAINT IF EXISTS rfqs_curation_status_check;

ALTER TABLE public.rfqs
  ADD CONSTRAINT rfqs_curation_status_check
  CHECK (curation_status IN ('not_required', 'pending', 'approved', 'quarantined'));

-- The old sync stored the eTenders reference code in title. Preserve it before
-- the separate feed-backed backfill replaces title with descriptive text.
UPDATE public.rfqs
SET external_reference = title
WHERE is_external_opportunity IS TRUE
  AND external_reference IS NULL;

-- Existing external drafts remain pending. External rows that were deliberately
-- published are treated as approved. The reviewed quarantine set is recorded
-- explicitly so it cannot regain public eligibility through a later edit.
UPDATE public.rfqs
SET
  is_public = CASE
    WHEN lower(trim(coalesce(status, ''))) = 'draft'
      OR id = ANY (ARRAY[76, 484, 485, 529, 642, 686, 726, 740, 786]::BIGINT[])
      THEN FALSE
    ELSE is_public
  END,
  curation_status = CASE
    WHEN id = ANY (ARRAY[76, 484, 485, 529, 642, 686, 726, 740, 786]::BIGINT[])
      THEN 'quarantined'
    WHEN lower(trim(coalesce(status, ''))) = 'draft'
      THEN 'pending'
    ELSE 'approved'
  END,
  curation_reason = CASE
    WHEN id = ANY (ARRAY[76, 484, 485, 529, 642, 686, 726, 740, 786]::BIGINT[])
      THEN 'terminal_notice'
    ELSE NULL
  END,
  curated_at = CASE
    WHEN lower(trim(coalesce(status, ''))) = 'draft'
      AND id <> ALL (ARRAY[76, 484, 485, 529, 642, 686, 726, 740, 786]::BIGINT[])
      THEN NULL
    ELSE coalesce(published_date, created_at, now())
  END
WHERE is_external_opportunity IS TRUE;

-- Pending external drafts are deliberately non-public. Preserve the existing
-- curator review queue by granting those designated buyer accounts explicit
-- read access instead of exposing drafts through the public policy.
DROP POLICY IF EXISTS "Opportunity curators can read all RFQs" ON public.rfqs;
CREATE POLICY "Opportunity curators can read all RFQs"
  ON public.rfqs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.is_opportunities_curator IS TRUE
    )
  );

CREATE INDEX IF NOT EXISTS idx_rfqs_public_opportunity_eligibility
  ON public.rfqs (closing_date)
  WHERE is_public IS TRUE AND lower(status) = 'open';

CREATE INDEX IF NOT EXISTS idx_rfqs_external_curation_status
  ON public.rfqs (curation_status)
  WHERE is_external_opportunity IS TRUE;
