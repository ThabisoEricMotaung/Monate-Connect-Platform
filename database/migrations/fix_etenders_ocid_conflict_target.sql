-- Fixes the eTenders OCDS sync's upsert failing with "there is no unique or
-- exclusion constraint matching the ON CONFLICT specification".
--
-- Root cause: etenders_ocds_sync.sql created a PARTIAL unique index
-- (UNIQUE INDEX ... WHERE external_ocid IS NOT NULL). Postgres requires an
-- ON CONFLICT (external_ocid) target to match a unique constraint/index
-- exactly, including its predicate. The Supabase client's
-- .upsert(rows, { onConflict: "external_ocid" }) has no way to express that
-- WHERE clause, so every sync run's bulk upsert failed as a single
-- statement-level error (0 rows upserted, 1 error), even though real open
-- tenders were being fetched successfully.
--
-- Fix: replace the partial index with a plain UNIQUE constraint. Postgres
-- treats NULL as distinct from other NULLs under UNIQUE, so this does not
-- restrict rows that still have external_ocid = NULL (i.e. every RFQ
-- created through the normal buyer/admin forms, which never sets this
-- column).

DROP INDEX IF EXISTS rfqs_external_ocid_key;

ALTER TABLE public.rfqs
  ADD CONSTRAINT rfqs_external_ocid_key UNIQUE (external_ocid);
