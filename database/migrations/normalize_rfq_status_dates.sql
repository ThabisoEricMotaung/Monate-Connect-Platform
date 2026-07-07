-- Normalize RFQ lifecycle values and public closing dates.
-- Keep deadline as a legacy/fallback column while public/supplier visibility
-- standardizes on closing_date.

UPDATE public.rfqs
SET closing_date = deadline::timestamptz
WHERE closing_date IS NULL
  AND deadline IS NOT NULL;

UPDATE public.rfqs
SET status = lower(status)
WHERE status IS NOT NULL
  AND status <> lower(status);
