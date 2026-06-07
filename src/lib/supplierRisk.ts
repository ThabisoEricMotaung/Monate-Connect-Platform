import { supabase } from "./supabase"

// ─── Types ────────────────────────────────────────────────────────────────────

export type RiskLevel = "Low" | "Medium" | "High" | "Critical"

export type RiskFactorSeverity = "low" | "medium" | "high" | "critical"

export type RiskFactor = {
  id: string
  label: string
  description: string
  severity: RiskFactorSeverity
  category: "compliance" | "activity" | "finance" | "verification" | "performance"
}

export type SupplierRiskRecord = {
  supplierId: string
  supplierName: string
  province: string | null
  industry: string | null
  verificationStatus: string | null
  bankingStatus: string | null
  smartScore: number | null
  smartScoreLabel: string | null
  riskLevel: RiskLevel
  riskScore: number
  triggeredFactors: RiskFactor[]
  recommendedActions: string[]
  lastActivityDate: string | null
}

export type RiskSummary = {
  critical: number
  high: number
  medium: number
  low: number
  total: number
}

// ─── Risk factor definitions ──────────────────────────────────────────────────

export const RISK_FACTORS: RiskFactor[] = [
  {
    id: "not_verified",
    label: "Not Verified",
    description: "Supplier profile has not been verified by a procurement administrator.",
    severity: "high",
    category: "verification",
  },
  {
    id: "banking_unverified",
    label: "Banking Details Unverified",
    description: "No verified banking details on record — payments cannot be processed.",
    severity: "high",
    category: "finance",
  },
  {
    id: "banking_missing",
    label: "No Banking Details Submitted",
    description: "Supplier has not submitted any banking details for payment processing.",
    severity: "high",
    category: "finance",
  },
  {
    id: "missing_csd",
    label: "Missing CSD Registration",
    description: "CSD registration number has not been provided — required for government procurement.",
    severity: "high",
    category: "compliance",
  },
  {
    id: "missing_bbbee",
    label: "Missing B-BBEE Level",
    description: "B-BBEE compliance level has not been captured — affects PPPFA scoring.",
    severity: "medium",
    category: "compliance",
  },
  {
    id: "missing_company_reg",
    label: "Missing Company Registration",
    description: "CIPC company registration number has not been provided.",
    severity: "medium",
    category: "compliance",
  },
  {
    id: "missing_tax_status",
    label: "Missing Tax Status",
    description: "SARS tax compliance status has not been captured.",
    severity: "medium",
    category: "compliance",
  },
  {
    id: "no_documents",
    label: "No Compliance Documents Uploaded",
    description: "No compliance documents (CSD, B-BBEE, tax, CIPC) have been uploaded.",
    severity: "medium",
    category: "compliance",
  },
  {
    id: "expired_compliance",
    label: "Expired Compliance Documents",
    description: "One or more compliance document expiry dates have passed.",
    severity: "high",
    category: "compliance",
  },
  {
    id: "rejected_invoices",
    label: "Rejected Invoices",
    description: "This supplier has invoices that were rejected by the finance team.",
    severity: "high",
    category: "finance",
  },
  {
    id: "high_quote_rejection",
    label: "High Quote Rejection Rate",
    description: "More than 40% of submitted quotes have been rejected or not awarded.",
    severity: "medium",
    category: "performance",
  },
  {
    id: "low_completion_rate",
    label: "Low Contract Completion Rate",
    description: "Less than 50% of contracts have been completed (with at least 2 contracts).",
    severity: "high",
    category: "performance",
  },
  {
    id: "terminated_contracts",
    label: "Terminated Contracts",
    description: "One or more contracts for this supplier were terminated before completion.",
    severity: "critical",
    category: "performance",
  },
  {
    id: "low_review_rating",
    label: "Low Review Rating",
    description: "Average supplier review rating is below 3.0 / 5.0 from buyer feedback.",
    severity: "high",
    category: "performance",
  },
  {
    id: "no_recent_activity",
    label: "No Recent Activity",
    description: "No procurement activity (quotes, contracts, invoices) in the past 90 days.",
    severity: "low",
    category: "activity",
  },
  {
    id: "incomplete_profile",
    label: "Incomplete Profile",
    description: "Key profile fields (business name, province, industry, phone) are missing.",
    severity: "medium",
    category: "compliance",
  },
]

const FACTOR_MAP = new Map(RISK_FACTORS.map((f) => [f.id, f]))

// ─── Severity weights ─────────────────────────────────────────────────────────

const SEVERITY_WEIGHT: Record<RiskFactorSeverity, number> = {
  low: 5,
  medium: 15,
  high: 25,
  critical: 40,
}

// ─── Risk level from score ────────────────────────────────────────────────────

export function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 75) return "Critical"
  if (score >= 45) return "High"
  if (score >= 20) return "Medium"
  return "Low"
}

// ─── Recommended actions ──────────────────────────────────────────────────────

function deriveActions(factorIds: string[]): string[] {
  const actions: string[] = []

  if (factorIds.includes("not_verified")) {
    actions.push("Submit for Verification Review")
  }
  if (factorIds.includes("banking_missing") || factorIds.includes("banking_unverified")) {
    actions.push("Request Banking Details Submission")
  }
  if (
    factorIds.some((id) =>
      ["missing_csd", "missing_bbbee", "missing_company_reg", "missing_tax_status", "no_documents", "expired_compliance", "incomplete_profile"].includes(id)
    )
  ) {
    actions.push("Request Compliance Update")
  }
  if (factorIds.includes("rejected_invoices")) {
    actions.push("Review Invoice Disputes")
  }
  if (factorIds.includes("terminated_contracts") || factorIds.includes("low_completion_rate")) {
    actions.push("Conduct Performance Review")
  }
  if (factorIds.includes("low_review_rating")) {
    actions.push("Schedule Supplier Quality Review")
  }
  if (factorIds.includes("high_quote_rejection")) {
    actions.push("Review Quoting Capability")
  }
  if (actions.length === 0) {
    actions.push("Monitor — no immediate action required")
  }
  return actions
}

// ─── Safe data extractor for Promise.allSettled results ──────────────────────

function settled<T>(result: PromiseSettledResult<{ data: T | null; error: unknown }>): T | null {
  return result.status === "fulfilled" ? (result.value.data ?? null) : null
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function getSupplierRiskAssessments(): Promise<SupplierRiskRecord[]> {
  if (!supabase) return []

  // ── Fetch all data in parallel; never crash on missing tables ───────────────
  const raw = await Promise.allSettled([
    supabase
      .from("profiles")
      .select(
        "id, business_name, province, industry, phone, verification_status, " +
        "csd_number, bbbee_level, tax_status, company_registration, " +
        "csd_document_url, bbbee_document_url, tax_document_url, " +
        "company_registration_url, cidb_document_url, capability_statement_url, " +
        "tax_expiry_date, bbbee_expiry_date, csd_expiry_date, cidb_expiry_date, updated_at"
      )
      .eq("role", "supplier"),
    supabase.from("quotes").select("id, supplier_id, status, created_at"),
    supabase.from("contracts").select("id, supplier_id, status, created_at"),
    supabase.from("invoices").select("id, supplier_id, status, created_at"),
    supabase.from("supplier_bank_details").select("supplier_id, verification_status"),
    supabase.from("supplier_reviews").select("supplier_id, rating, delivery_score, compliance_score, communication_score, created_at"),
  ])

  const profileData  = settled(raw[0])
  const quoteData    = settled(raw[1])
  const contractData = settled(raw[2])
  const invoiceData  = settled(raw[3])
  const bankingData  = settled(raw[4])
  const reviewData   = settled(raw[5])

  const profiles = (profileData ?? []) as unknown as Array<{
    id: string
    business_name: string | null
    province: string | null
    industry: string | null
    phone: string | null
    verification_status: string | null
    csd_number: string | null
    bbbee_level: string | null
    tax_status: string | null
    company_registration: string | null
    csd_document_url: string | null
    bbbee_document_url: string | null
    tax_document_url: string | null
    company_registration_url: string | null
    cidb_document_url: string | null
    capability_statement_url: string | null
    tax_expiry_date: string | null
    bbbee_expiry_date: string | null
    csd_expiry_date: string | null
    cidb_expiry_date: string | null
    updated_at: string | null
  }>

  const quotes = (quoteData ?? []) as Array<{ id: number; supplier_id: string | null; status: string | null; created_at: string | null }>
  const contracts = (contractData ?? []) as Array<{ id: number; supplier_id: string | null; status: string | null; created_at: string | null }>
  const invoices = (invoiceData ?? []) as Array<{ id: number; supplier_id: string | null; status: string | null; created_at: string | null }>
  const banking = (bankingData ?? []) as Array<{ supplier_id: string | null; verification_status: string | null }>
  const reviews = (reviewData ?? []) as Array<{
    supplier_id: string | null
    rating: string | number | null
    delivery_score: string | number | null
    compliance_score: string | number | null
    communication_score: string | number | null
    created_at: string | null
  }>

  const now = new Date()
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  function isExpired(dateStr: string | null): boolean {
    if (!dateStr) return false
    return new Date(dateStr) < now
  }

  function toNum(v: string | number | null): number {
    if (v === null || v === undefined) return 0
    const n = typeof v === "number" ? v : Number(v)
    return Number.isFinite(n) ? n : 0
  }

  return profiles.map((p) => {
    const sid = p.id

    // Aggregate per-supplier data
    const sQuotes = quotes.filter((q) => q.supplier_id === sid)
    const sContracts = contracts.filter((c) => c.supplier_id === sid)
    const sInvoices = invoices.filter((i) => i.supplier_id === sid)
    const sBanking = banking.filter((b) => b.supplier_id === sid)
    const sReviews = reviews.filter((r) => r.supplier_id === sid)

    // Latest activity
    const allDates = [
      ...sQuotes.map((q) => q.created_at),
      ...sContracts.map((c) => c.created_at),
      ...sInvoices.map((i) => i.created_at),
    ].filter(Boolean) as string[]
    allDates.sort((a, b) => b.localeCompare(a))
    const lastActivityDate = allDates[0] ?? null

    // Activity recency
    const hasRecentActivity = allDates.some((d) => new Date(d) >= ninetyDaysAgo)

    // Banking
    const bestBank = sBanking.sort((a, b) => {
      const order = ["Verified", "Under Review", "Unverified", "Rejected"]
      return order.indexOf(a.verification_status ?? "") - order.indexOf(b.verification_status ?? "")
    })[0]
    const bankingStatus = bestBank?.verification_status ?? null
    const bankingVerified = bankingStatus === "Verified"
    const bankingMissing = sBanking.length === 0

    // Documents
    const docUrls = [
      p.csd_document_url, p.bbbee_document_url, p.tax_document_url,
      p.company_registration_url, p.cidb_document_url, p.capability_statement_url,
    ]
    const hasAnyDocument = docUrls.some(Boolean)

    // Compliance expiry
    const expiryDates = [p.tax_expiry_date, p.bbbee_expiry_date, p.csd_expiry_date, p.cidb_expiry_date]
    const hasExpiredDoc = expiryDates.some(isExpired)

    // Quote stats
    const rejectedQuotes = sQuotes.filter((q) => q.status === "Rejected" || q.status === "Not Awarded").length
    const quoteRejectionRate = sQuotes.length >= 3
      ? rejectedQuotes / sQuotes.length
      : 0

    // Contract stats
    const completedContracts = sContracts.filter((c) => c.status === "Completed").length
    const terminatedContracts = sContracts.filter((c) => c.status === "Terminated").length
    const completionRate = sContracts.length >= 2
      ? completedContracts / sContracts.length
      : 1 // no penalty if < 2 contracts

    // Invoice stats
    const hasRejectedInvoices = sInvoices.some((i) => i.status === "Rejected")

    // Review stats
    const numReviews = sReviews.length
    const avgRating = numReviews > 0
      ? sReviews.reduce((sum, r) => {
          const scores = [r.rating, r.delivery_score, r.compliance_score, r.communication_score]
            .map(toNum)
            .filter((s) => s > 0)
          return sum + (scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0)
        }, 0) / numReviews
      : null

    // Profile completeness
    const missingProfileFields =
      !p.business_name?.trim() || !p.province?.trim() || !p.industry?.trim() || !p.phone?.trim()

    // ── Evaluate risk factors ───────────────────────────────────────────────

    const triggeredIds: string[] = []

    if (p.verification_status !== "Verified") triggeredIds.push("not_verified")
    if (bankingMissing) triggeredIds.push("banking_missing")
    else if (!bankingVerified) triggeredIds.push("banking_unverified")
    if (!p.csd_number?.trim()) triggeredIds.push("missing_csd")
    if (!p.bbbee_level?.trim()) triggeredIds.push("missing_bbbee")
    if (!p.company_registration?.trim()) triggeredIds.push("missing_company_reg")
    if (!p.tax_status?.trim()) triggeredIds.push("missing_tax_status")
    if (!hasAnyDocument) triggeredIds.push("no_documents")
    if (hasExpiredDoc) triggeredIds.push("expired_compliance")
    if (hasRejectedInvoices) triggeredIds.push("rejected_invoices")
    if (quoteRejectionRate > 0.4) triggeredIds.push("high_quote_rejection")
    if (completionRate < 0.5 && sContracts.length >= 2) triggeredIds.push("low_completion_rate")
    if (terminatedContracts > 0) triggeredIds.push("terminated_contracts")
    if (numReviews >= 2 && avgRating !== null && avgRating < 3.0) triggeredIds.push("low_review_rating")
    if (!hasRecentActivity && allDates.length > 0) triggeredIds.push("no_recent_activity")
    if (missingProfileFields) triggeredIds.push("incomplete_profile")

    const triggeredFactors = triggeredIds
      .map((id) => FACTOR_MAP.get(id))
      .filter(Boolean) as RiskFactor[]

    const riskScore = Math.min(
      100,
      triggeredFactors.reduce((sum, f) => sum + SEVERITY_WEIGHT[f.severity], 0)
    )

    const riskLevel = riskLevelFromScore(riskScore)
    const recommendedActions = deriveActions(triggeredIds)

    return {
      supplierId: sid,
      supplierName: p.business_name ?? "Unnamed Supplier",
      province: p.province,
      industry: p.industry,
      verificationStatus: p.verification_status,
      bankingStatus,
      smartScore: null,
      smartScoreLabel: null,
      riskLevel,
      riskScore,
      triggeredFactors,
      recommendedActions,
      lastActivityDate,
    } satisfies SupplierRiskRecord
  }).sort((a, b) => b.riskScore - a.riskScore)
}

export function getRiskSummary(records: SupplierRiskRecord[]): RiskSummary {
  return {
    critical: records.filter((r) => r.riskLevel === "Critical").length,
    high: records.filter((r) => r.riskLevel === "High").length,
    medium: records.filter((r) => r.riskLevel === "Medium").length,
    low: records.filter((r) => r.riskLevel === "Low").length,
    total: records.length,
  }
}
