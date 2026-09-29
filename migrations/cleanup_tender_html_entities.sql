-- Migration: Cleanup HTML entities in tender data
-- Purpose: Decode &nbsp;, &amp;, and other HTML entities in titles and descriptions
-- Date: 2026-09-29

-- First, create a helper function to decode common HTML entities
CREATE OR REPLACE FUNCTION decode_html_entities(text_input TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(text_input, '&nbsp;', ' '),
          '&amp;', '&'),
        '&lt;', '<'),
      '&gt;', '>'),
    '&quot;', '"');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update tender titles: decode HTML entities and normalize whitespace
UPDATE rfqs
SET title = TRIM(REGEXP_REPLACE(
  decode_html_entities(title),
  '\s+', ' ', 'g'
))
WHERE title LIKE '%&%' OR title LIKE '%  %';

-- Update tender descriptions: decode HTML entities and normalize whitespace
UPDATE rfqs
SET description = TRIM(REGEXP_REPLACE(
  decode_html_entities(description),
  '\s+', ' ', 'g'
))
WHERE description IS NOT NULL AND (description LIKE '%&%' OR description LIKE '%  %');

-- Improve buyer_normalized: extract from title if currently "Unknown"
-- For SANRAL tenders (reference starts with NRA, CONTRACT SANRAL, etc.)
UPDATE rfqs
SET buyer_normalized = 'South African National Roads Agency Limited'
WHERE buyer_normalized = 'Unknown'
  AND (
    title LIKE 'NRA%'
    OR title LIKE 'CONTRACT SANRAL%'
    OR title LIKE 'R.%-%'
  );

-- For Eskom tenders
UPDATE rfqs
SET buyer_normalized = 'Eskom Holdings SOC Limited'
WHERE buyer_normalized = 'Unknown'
  AND source_name = 'Eskom';

-- For Cape Town tenders
UPDATE rfqs
SET buyer_normalized = 'City of Cape Town'
WHERE buyer_normalized = 'Unknown'
  AND source_name = 'Cape Town';

-- For CoJ (City of Johannesburg) tenders
UPDATE rfqs
SET buyer_normalized = 'City of Johannesburg'
WHERE buyer_normalized = 'Unknown'
  AND source_name = 'City of Johannesburg';

-- For Ekurhuleni tenders
UPDATE rfqs
SET buyer_normalized = 'Ekurhuleni Metropolitan Municipality'
WHERE buyer_normalized = 'Unknown'
  AND source_name = 'Ekurhuleni';

-- For Department of Health tenders
UPDATE rfqs
SET buyer_normalized = 'Department of Health'
WHERE buyer_normalized = 'Unknown'
  AND source_name = 'Department of Health';

-- For DBSA tenders
UPDATE rfqs
SET buyer_normalized = 'Development Bank of Southern Africa'
WHERE buyer_normalized = 'Unknown'
  AND source_name = 'DBSA';

-- For TCTA tenders
UPDATE rfqs
SET buyer_normalized = 'Trans-Caledon Tunnel Authority'
WHERE buyer_normalized = 'Unknown'
  AND source_name = 'TCTA';

-- Verify the cleanup
SELECT
  source_name,
  COUNT(*) as total_tenders,
  SUM(CASE WHEN buyer_normalized = 'Unknown' THEN 1 ELSE 0 END) as unknown_buyers,
  SUM(CASE WHEN title LIKE '%&%' THEN 1 ELSE 0 END) as titles_with_entities
FROM rfqs
GROUP BY source_name
ORDER BY source_name;
