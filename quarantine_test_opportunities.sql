-- URGENT: Quarantine test seed data from production
-- These 6 records were added for metric testing and should not be public
-- Sets is_public = false to hide them from the API without deleting

UPDATE public.rfqs
SET is_public = false
WHERE title IN (
  'New Tender - IT Services',
  'New RFQ - Office Supplies',
  'New Opportunity - Construction',
  'Under Evaluation - HR Consulting',
  'Under Evaluation - Training Services',
  'Under Evaluation - Security Services'
)
AND buyer_org IN (
  'Department of Health',
  'Department of Education',
  'Department of Infrastructure',
  'Department of Public Service',
  'Department of Labour',
  'Department of Justice'
);

-- Verify quarantine
SELECT id, title, buyer_org, is_public, created_at
FROM public.rfqs
WHERE title LIKE '%New Tender%'
   OR title LIKE '%New RFQ%'
   OR title LIKE '%New Opportunity%'
   OR title LIKE '%Under Evaluation%'
ORDER BY created_at DESC
LIMIT 10;
