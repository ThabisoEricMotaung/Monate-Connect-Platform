-- Migration: Add test opportunities for New in 48H and Under Evaluation metrics
-- This script adds test data to populate the OpportunityStatsBanner metrics

-- Add opportunities created in the last 48 hours (for "New in 48H" metric)
INSERT INTO public.rfqs (
  title, description, buyer_name, buyer_org, industry, category,
  province, status, closing_date, published_date, created_at, is_public
) VALUES
  (
    'New Tender - IT Services',
    'Recently posted IT services tender available for bidding',
    'Department of Health',
    'Department of Health',
    'Information Technology',
    'Software Development',
    'Gauteng',
    'active',
    NOW() + INTERVAL '15 days',
    NOW() - INTERVAL '12 hours',
    NOW() - INTERVAL '12 hours',
    true
  ),
  (
    'New RFQ - Office Supplies',
    'Recently posted office supplies RFQ open for quotations',
    'Department of Education',
    'Department of Education',
    'Procurement',
    'Office Supplies',
    'Western Cape',
    'active',
    NOW() + INTERVAL '20 days',
    NOW() - INTERVAL '24 hours',
    NOW() - INTERVAL '24 hours',
    true
  ),
  (
    'New Opportunity - Construction',
    'Recently posted construction project tender',
    'Department of Infrastructure',
    'Department of Infrastructure',
    'Construction',
    'Civil Works',
    'KwaZulu-Natal',
    'active',
    NOW() + INTERVAL '30 days',
    NOW() - INTERVAL '36 hours',
    NOW() - INTERVAL '36 hours',
    true
  );

-- Add opportunities with past closing dates (for "Under Evaluation" metric)
INSERT INTO public.rfqs (
  title, description, buyer_name, buyer_org, industry, category,
  province, status, closing_date, published_date, created_at, is_public
) VALUES
  (
    'Under Evaluation - HR Consulting',
    'Tender closed, currently under evaluation phase',
    'Department of Public Service',
    'Department of Public Service',
    'Professional Services',
    'Consulting',
    'Gauteng',
    'active',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '30 days',
    true
  ),
  (
    'Under Evaluation - Training Services',
    'RFQ closed, responses under evaluation',
    'Department of Labour',
    'Department of Labour',
    'Training',
    'Skills Development',
    'Western Cape',
    'active',
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '25 days',
    NOW() - INTERVAL '25 days',
    true
  ),
  (
    'Under Evaluation - Security Services',
    'Security services tender in evaluation stage',
    'Department of Justice',
    'Department of Justice',
    'Security',
    'Security Services',
    'Eastern Cape',
    'active',
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '20 days',
    NOW() - INTERVAL '20 days',
    true
  );

-- Note: Run this script in Supabase SQL Editor or via your database migration tool
-- The id field will auto-generate. After running, the metrics should populate correctly:
-- - "New in 48H" will show 3
-- - "Under Evaluation" will show 3
