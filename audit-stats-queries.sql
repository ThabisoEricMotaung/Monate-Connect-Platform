-- AUDIT: Verify Stats Calculations
-- Run these queries to validate the 270 & 87% numbers

-- ============================================
-- STAT 1: "270 Closing This Week"
-- Should match: active, public RFQs closing in next 7 days
-- ============================================

SELECT COUNT(*) as "Closing This Week"
FROM rfqs
WHERE is_public = true
  AND status = 'active'
  AND closing_date >= NOW()  -- today or later
  AND closing_date <= NOW() + INTERVAL '7 days';  -- within 7 days

-- Expected: ~270

-- ============================================
-- STAT 2: "87% Automatically Screened"
-- Should be: (approved + quarantined external) / total external × 100
-- ============================================

-- Query A: Total external opportunities (non-draft)
SELECT COUNT(*) as "Total External (non-draft)"
FROM rfqs
WHERE is_external_opportunity = true
  AND status NOT ILIKE 'draft';

-- Query B: Screened external (approved or quarantined)
SELECT COUNT(*) as "External Screened (approved + quarantined)"
FROM rfqs
WHERE is_external_opportunity = true
  AND status NOT ILIKE 'draft'
  AND curation_status IN ('approved', 'quarantined');

-- Query C: Calculate percentage
SELECT
  ROUND((
    (SELECT COUNT(*) FROM rfqs WHERE is_external_opportunity = true AND status NOT ILIKE 'draft' AND curation_status IN ('approved', 'quarantined'))::NUMERIC /
    (SELECT COUNT(*) FROM rfqs WHERE is_external_opportunity = true AND status NOT ILIKE 'draft')
  ) * 100) as "Screened Percentage";

-- Expected: ~87%

-- ============================================
-- INTERPRETATION CHECK
-- ============================================
-- Q: Does 87% mean "87% of external opportunities have been screened"?
-- A: YES - it means:
--    - Total pool = All external (non-draft) RFQs
--    - Screened = Those marked as either "approved" or "quarantined"
--    - 87% = (screened / total) × 100
--
-- So out of all external opportunities in the system,
-- 87% have gone through the curation review process.
-- The remaining ~13% are likely:
--    - status = "draft" (excluded from count)
--    - curation_status = "pending" (awaiting review)
--    - curation_status = NULL/not_required
