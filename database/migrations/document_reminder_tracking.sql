-- Tracks automated supplier compliance document reminders.
-- This table is intentionally service-role only; no client-side access is required.

CREATE TABLE IF NOT EXISTS public.supplier_reminder_log (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_reminder_sent_at timestamptz,
  reminder_count integer NOT NULL DEFAULT 0 CHECK (reminder_count >= 0),
  last_missing_documents text[] NOT NULL DEFAULT '{}',
  last_missing_document_count integer NOT NULL DEFAULT 0 CHECK (last_missing_document_count >= 0),
  last_checked_at timestamptz,
  completed_at timestamptz,
  last_email_error text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS supplier_reminder_log_last_sent_idx
  ON public.supplier_reminder_log(last_reminder_sent_at);

CREATE INDEX IF NOT EXISTS supplier_reminder_log_missing_count_idx
  ON public.supplier_reminder_log(last_missing_document_count);

ALTER TABLE public.supplier_reminder_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.supplier_reminder_log FROM anon;
REVOKE ALL ON public.supplier_reminder_log FROM authenticated;
