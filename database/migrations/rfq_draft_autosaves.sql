-- Moves the RFQ creation form's background autosave from browser localStorage
-- (lost on cache clear, not shared across devices) to Supabase, scoped per user.
-- This is separate from the "Save as draft" button, which already writes real
-- rows into public.rfqs; this table only holds the in-progress scratch form
-- state used to resume an unfinished form, and is cleaned up once the user
-- actually saves or publishes.

CREATE TABLE IF NOT EXISTS public.rfq_draft_autosaves (
  draft_id UUID PRIMARY KEY,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  form JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS rfq_draft_autosaves_created_by_updated_at_idx
  ON public.rfq_draft_autosaves (created_by, updated_at DESC);

ALTER TABLE public.rfq_draft_autosaves ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'rfq_draft_autosaves'
      AND policyname = 'Users manage their own RFQ draft autosaves'
  ) THEN
    CREATE POLICY "Users manage their own RFQ draft autosaves"
      ON public.rfq_draft_autosaves
      FOR ALL
      TO authenticated
      USING (created_by = auth.uid())
      WITH CHECK (created_by = auth.uid());
  END IF;
END $$;
