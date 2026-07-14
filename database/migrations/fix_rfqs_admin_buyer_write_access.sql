-- Root cause of "Publish selected" / "Discard selected" doing nothing on
-- externally-sourced (eTenders) RFQ drafts:
--
-- The only UPDATE/DELETE policy on public.rfqs is ownership-based:
--   "Buyers can manage their own RFQs"
--   USING/WITH CHECK (created_by = auth.uid() OR buyer_user_id = auth.uid())
--
-- eTenders-synced rows are inserted by the sync cron via the service-role
-- client with created_by = NULL and buyer_user_id = NULL (no owner). That
-- means the ownership check never matches for ANY logged-in user, so
-- Supabase silently updates/deletes 0 rows (no error surfaces client-side -
-- it just looks like nothing happened, which matches what was reported).
--
-- This adds an additional permissive policy so any admin or buyer/curator
-- account can manage ANY RFQ - not just ones they personally own - which is
-- what the review queue (bulk publish/discard, single-record edit/publish)
-- needs to actually work for externally-sourced drafts.

CREATE POLICY "Admins and buyers can manage any RFQ"
ON public.rfqs
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'buyer')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'buyer')
  )
);

CREATE POLICY "Admins and buyers can delete any RFQ"
ON public.rfqs
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'buyer')
  )
);
