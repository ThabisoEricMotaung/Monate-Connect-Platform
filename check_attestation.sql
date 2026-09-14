-- Check verification_attestations for PHOKENG SOLUTIONS GROUP
SELECT 
  va.id,
  va.profile_id,
  va.category,
  va.decision,
  va.reviewed_at,
  va.expires_at,
  va.reviewed_by,
  sp.business_name
FROM verification_attestations va
LEFT JOIN supplier_profiles sp ON va.profile_id = sp.id
WHERE sp.business_name ILIKE '%PHOKENG%'
ORDER BY va.reviewed_at DESC;
