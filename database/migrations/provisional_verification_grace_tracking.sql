-- Extends the provisional-verification overlay (see
-- provisional_supplier_verification_fields.sql) so the automated
-- provisional-verification cron can distinguish "never had a grace period"
-- from "already used and lost their grace period for this document" —
-- without this, a supplier whose 2-week deadline expires would be
-- re-flagged as provisionally approved again the very next day, since the
-- underlying document would still show as the single missing one.
--
-- provisional_grace_used_for stores the supplier_documents.document_type
-- (e.g. "bank_letter") that most recently had its 14-day grace period run
-- out while still missing. It is cleared once that document is uploaded or
-- once the supplier is provisionally approved for a *different* document.

alter table public.profiles
  add column if not exists provisional_grace_used_for text;
