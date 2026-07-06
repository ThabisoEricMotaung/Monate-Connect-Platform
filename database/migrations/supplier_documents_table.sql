-- Supplier compliance documents: history-preserving document storage.
-- This table replaces the fixed document URL columns on public.profiles for new reads/writes.
-- The legacy profile columns are intentionally left in place as a rollback safety net.

CREATE TABLE IF NOT EXISTS public.supplier_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (
    document_type IN (
      'cipc',
      'tax_clearance',
      'vat',
      'bbbee',
      'csd',
      'bank_letter',
      'uif',
      'coid',
      'company_profile',
      'supporting_document',
      'cidb'
    )
  ),
  file_url text NOT NULL,
  storage_path text,
  original_filename text,
  content_type text,
  file_size bigint,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'under_review' CHECK (
    status IN ('under_review', 'verified', 'rejected', 'expired', 'superseded')
  ),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  review_notes text
);

CREATE INDEX IF NOT EXISTS supplier_documents_profile_type_uploaded_idx
  ON public.supplier_documents(profile_id, document_type, uploaded_at DESC);

CREATE INDEX IF NOT EXISTS supplier_documents_status_idx
  ON public.supplier_documents(status);

ALTER TABLE public.supplier_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Suppliers can read own supplier documents" ON public.supplier_documents;
CREATE POLICY "Suppliers can read own supplier documents"
  ON public.supplier_documents
  FOR SELECT
  USING (
    profile_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.profiles admin_profile
      WHERE admin_profile.id = auth.uid()
        AND lower(coalesce(admin_profile.role, '')) IN ('admin', 'buyer')
    )
  );

DROP POLICY IF EXISTS "Suppliers can insert own supplier documents" ON public.supplier_documents;
CREATE POLICY "Suppliers can insert own supplier documents"
  ON public.supplier_documents
  FOR INSERT
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "Admins can update supplier document review fields" ON public.supplier_documents;
CREATE POLICY "Admins can update supplier document review fields"
  ON public.supplier_documents
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles admin_profile
      WHERE admin_profile.id = auth.uid()
        AND lower(coalesce(admin_profile.role, '')) = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles admin_profile
      WHERE admin_profile.id = auth.uid()
        AND lower(coalesce(admin_profile.role, '')) = 'admin'
    )
  );

CREATE OR REPLACE FUNCTION public.supersede_supplier_documents(
  p_profile_id uuid,
  p_document_type text,
  p_keep_document_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_profile_id THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  UPDATE public.supplier_documents
  SET status = 'superseded'
  WHERE profile_id = p_profile_id
    AND document_type = p_document_type
    AND id <> p_keep_document_id
    AND status <> 'superseded';
END;
$$;

GRANT EXECUTE ON FUNCTION public.supersede_supplier_documents(uuid, text, uuid) TO authenticated;

-- Backfill from legacy public.profiles columns.
-- CIDB is intentionally NOT backfilled. Existing profiles.cidb_document_url values are
-- Construction Industry Development Board documents, not COID documents. The table accepts
-- document_type = 'cidb' for a future/manual CIDB migration, but this migration leaves those
-- legacy CIDB pointers untouched for manual review.
WITH legacy_documents AS (
  SELECT
    p.id AS profile_id,
    values.document_type,
    values.file_url,
    values.storage_path,
    CASE
      WHEN lower(trim(coalesce(p.verification_status, ''))) IN ('verified', 'approved') THEN 'verified'
      ELSE 'under_review'
    END AS status
  FROM public.profiles p
  CROSS JOIN LATERAL (
    VALUES
      ('csd', p.csd_document_url, p.csd_document_url),
      ('bbbee', p.bbbee_document_url, p.bbbee_document_url),
      ('tax_clearance', p.tax_document_url, p.tax_document_url),
      ('cipc', p.company_registration_url, p.company_registration_url),
      ('company_profile', p.capability_statement_url, p.capability_statement_url)
  ) AS values(document_type, file_url, storage_path)
  WHERE NULLIF(btrim(coalesce(values.file_url, '')), '') IS NOT NULL
)
INSERT INTO public.supplier_documents (
  profile_id,
  document_type,
  file_url,
  storage_path,
  status
)
SELECT
  legacy.profile_id,
  legacy.document_type,
  legacy.file_url,
  legacy.storage_path,
  legacy.status
FROM legacy_documents legacy
WHERE NOT EXISTS (
  SELECT 1
  FROM public.supplier_documents existing
  WHERE existing.profile_id = legacy.profile_id
    AND existing.document_type = legacy.document_type
    AND existing.file_url = legacy.file_url
);
