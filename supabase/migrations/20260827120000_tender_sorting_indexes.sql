-- Support whole-result tender sorting before pagination.
-- created_at is the immutable first-ingestion timestamp for an RFQ.
CREATE INDEX IF NOT EXISTS idx_rfqs_active_public_created_at
  ON public.rfqs (created_at DESC, id DESC)
  WHERE is_public IS TRUE AND status = 'active' AND closing_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rfqs_active_public_closing_date
  ON public.rfqs (closing_date, id)
  WHERE is_public IS TRUE AND status = 'active' AND closing_date IS NOT NULL;

ALTER TABLE public.saved_searches
  ADD COLUMN IF NOT EXISTS sort TEXT NOT NULL DEFAULT 'recent';

ALTER TABLE public.saved_searches
  DROP CONSTRAINT IF EXISTS saved_searches_sort_check;

ALTER TABLE public.saved_searches
  ADD CONSTRAINT saved_searches_sort_check
  CHECK (sort IN ('recent', 'closing-soon', 'closing-later'));
