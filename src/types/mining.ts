export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type MiningEntitySize = "EME" | "QSE" | "Generic"
export type MiningCharterCategory =
  | "HDP-owned"
  | "Women-owned"
  | "Youth-owned"
  | "BEE-compliant"
  | "Not classified"
export type MiningDocumentStatus = "pending" | "verified" | "expired" | "rejected"
export type MiningProjectReferenceStatus = "pending" | "verified" | "rejected"
export type MiningOpportunityStatus = "open" | "closed" | "awarded"
export type MiningQualificationStatus = "qualified" | "potentially_qualified" | "not_qualified"
export type MiningGapSeverity = "hard" | "soft"

export type MiningDocumentType =
  | "COIDA"
  | "Public Liability Insurance"
  | "Safety File"
  | "Mine Medical Certificate"
  | "CIDB Grading"
  | "OEM Accreditation"
  | "ISO 9001"
  | "ISO 14001"
  | "SANS Certification"
  | "Environmental Authorisation"
  | "Anti-Bribery Declaration"
  | "Sanctions Screening Declaration"
  | "Modern Slavery Declaration"
  | "Responsible Sourcing Declaration"
  | "Other"

export type MineOperation = {
  id: string
  mine_group: string
  operation_name: string
  commodity: string | null
  province: string
  district_municipality: string | null
  local_municipality: string | null
  host_communities: string[]
  procurement_system: string | null
  procurement_portal_url: string | null
  created_at: string
  updated_at: string
}

export type MiningSupplierProfile = {
  id: string
  supplier_id: string
  black_ownership_pct: number | null
  black_women_ownership_pct: number | null
  youth_ownership_pct: number | null
  hdp_ownership_pct: number | null
  entity_size: MiningEntitySize | null
  is_sa_manufacturer: boolean
  sabs_certified: boolean
  sabs_certificate_url: string | null
  province: string | null
  district_municipality: string | null
  local_municipality: string | null
  mining_charter_category: MiningCharterCategory | null
  bbee_level: number | null
  bbee_certificate_url: string | null
  bbee_certificate_expiry: string | null
  created_at: string
  updated_at: string
}

export type MiningHostCommunityLink = {
  id: string
  supplier_id: string
  mine_operation_id: string
  is_host_community: boolean
  verified: boolean
  verified_at: string | null
  verified_by: string | null
  created_at: string
}

export type MiningComplianceDocument = {
  id: string
  supplier_id: string
  document_type: MiningDocumentType
  document_label: string | null
  document_url: string
  issue_date: string | null
  expiry_date: string | null
  status: MiningDocumentStatus
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export type MiningProjectReference = {
  id: string
  supplier_id: string
  mine_operation_id: string | null
  mine_name: string
  project_description: string
  role_performed: string | null
  start_date: string
  end_date: string | null
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  status: MiningProjectReferenceStatus
  verified_by: string | null
  verified_at: string | null
  created_at: string
  updated_at: string
}

export type MiningEligibilityRules = {
  province?: string[]
  requires_host_community?: boolean
  min_black_ownership_pct?: number
  min_bbee_level?: number
  required_documents?: MiningDocumentType[]
  min_cidb_grade?: string
  required_certifications?: string[]
  min_mining_references?: number
  [key: string]: Json | undefined
}

export type MiningOpportunity = {
  id: string
  mine_operation_id: string | null
  title: string
  description: string | null
  category: string | null
  source_url: string | null
  closing_date: string | null
  eligibility_rules: MiningEligibilityRules
  status: MiningOpportunityStatus
  created_at: string
  updated_at: string
}

export type MiningEligibilityGap = {
  requirement: string
  required: Json
  actual: Json
  severity: MiningGapSeverity
}

export type MiningEligibilityResult = {
  id: string
  supplier_id: string
  opportunity_id: string
  match_percentage: number
  qualification_status: MiningQualificationStatus
  gaps: MiningEligibilityGap[]
  computed_at: string
}

export type MiningOpportunityWithOperation = MiningOpportunity & {
  mine_operations: MineOperation | null
}

export type MiningEligibilityResultWithOpportunity = MiningEligibilityResult & {
  mining_opportunities: MiningOpportunityWithOperation
}
