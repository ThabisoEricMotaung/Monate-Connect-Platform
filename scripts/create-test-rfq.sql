-- Test RFQ for Thuso development/testing
-- This creates an active RFQ that can be matched to supplier accounts

INSERT INTO public.rfqs (
  title,
  description,
  category,
  province,
  region,
  budget,
  status,
  deadline,
  published_date,
  estimated_budget,
  estimated_value_min,
  estimated_value_max,
  is_external_opportunity,
  created_at,
  updated_at
) VALUES (
  'Software Development Services - Web Platform',
  'We are seeking a qualified software development team to build and maintain a modern web-based procurement platform. The platform should include supplier management, RFQ tracking, and analytics dashboards. Required: 3+ years experience with Next.js, React, and Node.js. Experience with Supabase/PostgreSQL is preferred.',
  'Information Technology',
  'Gauteng',
  'Johannesburg',
  '250000',
  'Open',
  NOW() + INTERVAL '30 days',
  NOW(),
  250000,
  200000,
  300000,
  false,
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- Optional: Create supplier-to-RFQ matches for testing
-- First, get the new RFQ ID
WITH new_rfq AS (
  SELECT id FROM public.rfqs
  WHERE title = 'Software Development Services - Web Platform'
  AND status = 'Open'
  LIMIT 1
)
INSERT INTO public.supplier_rfq_matches (
  supplier_id,
  rfq_id,
  match_score,
  match_level,
  smartscore,
  created_at,
  updated_at
)
SELECT
  s.id,
  new_rfq.id,
  78,
  'Strong Match',
  '7.8',
  NOW(),
  NOW()
FROM new_rfq
CROSS JOIN (
  SELECT id FROM public.suppliers
  WHERE business_name LIKE '%test%' OR business_name LIKE '%demo%'
  LIMIT 1
) s
ON CONFLICT DO NOTHING;
