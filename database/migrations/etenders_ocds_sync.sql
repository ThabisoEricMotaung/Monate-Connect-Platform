-- Supports the automated eTenders OCDS Release API sync (src/app/api/cron/sync-etenders).
-- Adds an idempotency key so re-running the sync upserts existing rows instead of
-- duplicating them, and a small service-role-only table to track sync progress.

ALTER TABLE public.rfqs
  ADD COLUMN IF NOT EXISTS external_ocid TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS rfqs_external_ocid_key
  ON public.rfqs (external_ocid)
  WHERE external_ocid IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.etenders_sync_state (
  id SMALLINT PRIMARY KEY DEFAULT 1,
  last_synced_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  last_run_summary JSONB,
  CONSTRAINT etenders_sync_state_singleton CHECK (id = 1)
);

ALTER TABLE public.etenders_sync_state ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.etenders_sync_state FROM anon;
REVOKE ALL ON public.etenders_sync_state FROM authenticated;
