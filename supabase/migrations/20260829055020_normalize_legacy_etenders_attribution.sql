-- Twelve legacy, manually ingested eTenders rows stored the tender reference
-- in source_name and the descriptive title in external_reference. Normalize
-- those fields so attribution filters and detail pages use consistent values.
UPDATE public.rfqs
SET
  external_reference = substring(source_name FROM '^eTenders\\.gov\\.za \\((.*)\\)$'),
  source_name = 'eTenders.gov.za'
WHERE id = ANY (ARRAY[49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60]::BIGINT[])
  AND source_name ~ '^eTenders\\.gov\\.za \\(.*\\)$';
