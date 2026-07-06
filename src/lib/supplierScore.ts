export type SupplierScoreProfile = {
  business_name?: string | null
  province?: string | null
  industry?: string | null
  phone?: string | null
  csd_number?: string | null
  bbbee_level?: string | null
  tax_status?: string | null
  company_registration?: string | null
  verification_status?: string | null
  csd_document_url?: string | null
  bbbee_document_url?: string | null
  tax_document_url?: string | null
  company_registration_url?: string | null
  cidb_document_url?: string | null
  capability_statement_url?: string | null
  supplier_documents?: Array<{
    document_type?: string | null
    file_url?: string | null
    status?: string | null
  }> | null
}

export type SupplierScore = {
  score: number
  label: "Incomplete" | "Needs Improvement" | "Procurement Ready" | "Strong Candidate"
}

function hasValue(value: string | null | undefined): boolean {
  return Boolean(value?.trim())
}

function hasSupplierDocument(profile: SupplierScoreProfile | null | undefined): boolean {
  return Boolean(
    profile?.supplier_documents?.some(
      (document) => document.status !== "superseded" && hasValue(document.file_url)
    )
  )
}

export function calculateSupplierScore(
  profile: SupplierScoreProfile | null | undefined
): SupplierScore {
  const complianceDocumentUrls = [
    profile?.csd_document_url,
    profile?.bbbee_document_url,
    profile?.tax_document_url,
    profile?.company_registration_url,
    profile?.cidb_document_url,
    profile?.capability_statement_url,
  ]

  const score =
    (hasValue(profile?.business_name) ? 10 : 0) +
    (hasValue(profile?.province) ? 10 : 0) +
    (hasValue(profile?.industry) ? 10 : 0) +
    (hasValue(profile?.phone) ? 10 : 0) +
    (hasValue(profile?.csd_number) ? 10 : 0) +
    (hasValue(profile?.bbbee_level) ? 10 : 0) +
    (hasValue(profile?.tax_status) ? 10 : 0) +
    (hasValue(profile?.company_registration) ? 10 : 0) +
    (complianceDocumentUrls.some(hasValue) || hasSupplierDocument(profile) ? 10 : 0) +
    (profile?.verification_status === "Verified" ? 10 : 0)

  if (score <= 39) {
    return { score, label: "Incomplete" }
  }

  if (score <= 69) {
    return { score, label: "Needs Improvement" }
  }

  if (score <= 89) {
    return { score, label: "Procurement Ready" }
  }

  return { score, label: "Strong Candidate" }
}
