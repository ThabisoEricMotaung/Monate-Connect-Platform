-- Soft-delete support for the admin suggestions queue.
-- Cleared suggestions remain in public.suggestions for the submitter/audit trail.

alter table public.suggestions
  add column if not exists deleted_at timestamptz;

create index if not exists suggestions_deleted_at_idx
  on public.suggestions (deleted_at);
