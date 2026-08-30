-- Data Quality Audit: Source Attribution & External Links
-- Check for missing/incorrect source attribution on opportunities

SELECT 
  COUNT(*) as total_opportunities,
  COUNT(CASE WHEN is_external_opportunity THEN 1 END) as external_opportunities,
  COUNT(CASE WHEN is_external_opportunity AND source_name IS NULL THEN 1 END) as missing_source_name,
  COUNT(CASE WHEN is_external_opportunity AND original_source_url IS NULL THEN 1 END) as missing_source_url,
  COUNT(CASE WHEN is_external_opportunity AND original_source_url IS NOT NULL AND original_source_url = '' THEN 1 END) as empty_source_url
FROM rfqs
WHERE status = 'active' AND is_public = true;
