import { supabase } from "./supabase"
import { calculateSupplierScore, type SupplierScoreProfile } from "./supplierScore"
import { getComplianceStatus } from "./complianceStatus"
import { displayIndustry } from "./industries"
import {
  applySupplierDocumentsToProfiles,
  fetchSupplierDocumentsByProfileIds,
  type SupplierDocument,
} from "./supplierDocuments"

// ─── Types ────────────────────────────────────────────────────────────────────

export type RFQForMatching = {
  id: number
  title: string | null
  category: string | null
  province: string | null
  budget: string | null
  deadline: string | null
  status: string | null
}

export type SupplierForMatching = {
  id: string
  business_name: string | null
  province: string | null
  industry: string | null
  verification_status: string | null
  phone: string | null
  email: string | null
  bbbee_level: string | null
  csd_number: string | null
  tax_status: string | null
  company_registration: string | null
  csd_document_url: string | null
  bbbee_document_url: string | null
  tax_document_url: string | null
  company_registration_url: string | null
  cidb_document_url: string | null
  capability_statement_url: string | null
  supplier_documents?: SupplierDocument[]
  tax_expiry_date: string | null
  bbbee_expiry_date: string | null
  csd_expiry_date: string | null
  cidb_expiry_date: string | null
}

export type SupplierStats = {
  totalQuotes: number
  awardedQuotes: number
  completedContracts: number
  totalContracts: number
  hasQuotedThisRFQ: boolean
}

export type MatchLabel =
  | "Excellent Match"
  | "Strong Match"
  | "Possible Match"
  | "Weak Match"

export type ScoreBreakdown = {
  provinceMatch: number
  industryMatch: number
  verificationBonus: number
  readinessBonus: number
  complianceBonus: number
  historyBonus: number
}

export type SupplierMatchResult = {
  supplier: SupplierForMatching
  stats: SupplierStats
  score: number
  label: MatchLabel
  reasons: string[]
  scoreBreakdown: ScoreBreakdown
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalise(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().trim()
}

function industryMatchScore(
  category: string | null,
  industry: string | null
): { score: number; reason: string | null } {
  const cat = normalise(category)
  const ind = normalise(displayIndustry(industry))

  if (!cat || !ind) return { score: 0, reason: null }

  // Exact match
  if (cat === ind) {
    return { score: 25, reason: `Industry (${industry}) exactly matches the RFQ category (${category})` }
  }

  // One contains the other
  if (cat.includes(ind) || ind.includes(cat)) {
    return { score: 25, reason: `Industry (${industry}) aligns with the RFQ category (${category})` }
  }

  // Word-level overlap — any significant word (4+ chars) shared
  const catWords = cat.split(/[\s,/&\-]+/).filter((w) => w.length >= 4)
  const indWords = ind.split(/[\s,/&\-]+/).filter((w) => w.length >= 4)
  const overlap = catWords.some((w) => indWords.some((iw) => iw.includes(w) || w.includes(iw)))

  if (overlap) {
    return {
      score: 15,
      reason: `Industry (${industry}) partially relates to the RFQ category (${category})`,
    }
  }

  return { score: 0, reason: null }
}

function complianceRiskLevel(supplier: SupplierForMatching): "none" | "low" | "high" {
  const expiryDates = [
    supplier.tax_expiry_date,
    supplier.bbbee_expiry_date,
    supplier.csd_expiry_date,
    supplier.cidb_expiry_date,
  ]

  const statuses = expiryDates.map((d) => getComplianceStatus(d).status)
  if (statuses.some((s) => s === "expired")) return "high"
  if (statuses.some((s) => s === "expiring_soon")) return "low"
  return "none"
}

function matchLabel(score: number): MatchLabel {
  if (score >= 85) return "Excellent Match"
  if (score >= 70) return "Strong Match"
  if (score >= 50) return "Possible Match"
  return "Weak Match"
}

// ─── calculateSupplierMatch ───────────────────────────────────────────────────

export function calculateSupplierMatch(
  rfq: RFQForMatching,
  supplier: SupplierForMatching,
  stats: SupplierStats
): SupplierMatchResult {
  const reasons: string[] = []
  const breakdown: ScoreBreakdown = {
    provinceMatch: 0,
    industryMatch: 0,
    verificationBonus: 0,
    readinessBonus: 0,
    complianceBonus: 0,
    historyBonus: 0,
  }

  // 1. Province / region match (+25)
  const suppProv = normalise(supplier.province)
  const rfqProv = normalise(rfq.province)
  if (suppProv && rfqProv && suppProv === rfqProv) {
    breakdown.provinceMatch = 25
    reasons.push(`Based in ${supplier.province}, matching the RFQ's target province`)
  } else if (suppProv && rfqProv) {
    reasons.push(`Province mismatch: supplier is in ${supplier.province}, RFQ targets ${rfq.province}`)
  }

  // 2. Industry / category match (+25 or +15 partial)
  const { score: indScore, reason: indReason } = industryMatchScore(rfq.category, supplier.industry)
  breakdown.industryMatch = indScore
  if (indReason) reasons.push(indReason)

  // 3. Verification status (+15)
  if (supplier.verification_status === "Verified") {
    breakdown.verificationBonus = 15
    reasons.push("Verified supplier with confirmed compliance documentation")
  }

  // 4. Supplier readiness score above 80 (+15)
  const scoreProfile: SupplierScoreProfile = {
    business_name: supplier.business_name,
    province: supplier.province,
    industry: supplier.industry,
    phone: supplier.phone,
    csd_number: supplier.csd_number,
    bbbee_level: supplier.bbbee_level,
    tax_status: supplier.tax_status,
    company_registration: supplier.company_registration,
    verification_status: supplier.verification_status,
    csd_document_url: supplier.csd_document_url,
    bbbee_document_url: supplier.bbbee_document_url,
    tax_document_url: supplier.tax_document_url,
    company_registration_url: supplier.company_registration_url,
    cidb_document_url: supplier.cidb_document_url,
    capability_statement_url: supplier.capability_statement_url,
  }
  const { score: readiness } = calculateSupplierScore(scoreProfile)
  if (readiness >= 80) {
    breakdown.readinessBonus = 15
    reasons.push(`High readiness score of ${readiness}/100 — strong procurement candidate`)
  } else if (readiness >= 60) {
    reasons.push(`Readiness score of ${readiness}/100 — approaching procurement readiness`)
  }

  // 5. Low compliance risk (+10)
  const complianceRisk = complianceRiskLevel(supplier)
  if (complianceRisk === "none") {
    breakdown.complianceBonus = 10
    reasons.push("All tracked compliance documents are valid")
  } else if (complianceRisk === "low") {
    reasons.push("One or more compliance documents are expiring soon — action required")
  } else {
    reasons.push("Compliance documents require immediate renewal — elevated risk")
  }

  // 6. Previous award / completion history (+10)
  const hasHistory = stats.awardedQuotes > 0 || stats.completedContracts > 0
  if (hasHistory) {
    breakdown.historyBonus = 10
    const parts: string[] = []
    if (stats.awardedQuotes > 0)
      parts.push(`${stats.awardedQuotes} awarded quote${stats.awardedQuotes > 1 ? "s" : ""}`)
    if (stats.completedContracts > 0)
      parts.push(`${stats.completedContracts} completed contract${stats.completedContracts > 1 ? "s" : ""}`)
    reasons.push(`Proven track record: ${parts.join(" and ")} on the platform`)
  } else if (stats.totalQuotes > 0) {
    reasons.push(`${stats.totalQuotes} quote${stats.totalQuotes > 1 ? "s" : ""} submitted — no awards yet`)
  } else {
    reasons.push("No previous procurement activity on the platform")
  }

  const score =
    breakdown.provinceMatch +
    breakdown.industryMatch +
    breakdown.verificationBonus +
    breakdown.readinessBonus +
    breakdown.complianceBonus +
    breakdown.historyBonus

  return {
    supplier,
    stats,
    score,
    label: matchLabel(score),
    reasons,
    scoreBreakdown: breakdown,
  }
}

// ─── getRecommendedSuppliersForRFQ ────────────────────────────────────────────

export async function getRecommendedSuppliersForRFQ(
  rfqId: number
): Promise<{ rfq: RFQForMatching; results: SupplierMatchResult[] }> {
  if (!supabase) {
    return { rfq: {} as RFQForMatching, results: [] }
  }

  const [rfqRes, profileRes, quoteRes, contractRes] = await Promise.all([
    supabase
      .from("rfqs")
      .select("id, title, category, province, budget, deadline, status")
      .eq("id", rfqId)
      .single(),
    supabase
      .from("profiles")
      .select(
        `id, business_name, province, industry, verification_status, phone, email,
         bbbee_level, csd_number, tax_status, company_registration,
         csd_document_url, bbbee_document_url, tax_document_url,
         company_registration_url, cidb_document_url, capability_statement_url,
         tax_expiry_date, bbbee_expiry_date, csd_expiry_date, cidb_expiry_date`
      )
      .eq("role", "supplier"),
    supabase
      .from("quotes")
      .select("supplier_id, status, rfq_id"),
    supabase
      .from("contracts")
      .select("supplier_id, status"),
  ])

  if (rfqRes.error || !rfqRes.data) {
    throw new Error(rfqRes.error?.message ?? "RFQ not found")
  }

  const rfq = rfqRes.data as RFQForMatching
  const supplierRows = (profileRes.data ?? []) as SupplierForMatching[]
  const documents = await fetchSupplierDocumentsByProfileIds(supplierRows.map((supplier) => supplier.id))
  const suppliers = applySupplierDocumentsToProfiles(supplierRows, documents.documentsByProfile)
  const allQuotes = (quoteRes.data ?? []) as Array<{
    supplier_id: string | null; status: string | null; rfq_id: number | null
  }>
  const allContracts = (contractRes.data ?? []) as Array<{
    supplier_id: string | null; status: string | null
  }>

  const results = suppliers.map((supplier) => {
    const supplierQuotes = allQuotes.filter((q) => q.supplier_id === supplier.id)
    const supplierContracts = allContracts.filter((c) => c.supplier_id === supplier.id)

    const stats: SupplierStats = {
      totalQuotes: supplierQuotes.length,
      awardedQuotes: supplierQuotes.filter(
        (q) => q.status === "Awarded" || q.status === "Approved"
      ).length,
      completedContracts: supplierContracts.filter((c) => c.status === "Completed").length,
      totalContracts: supplierContracts.length,
      hasQuotedThisRFQ: supplierQuotes.some((q) => q.rfq_id === rfqId),
    }

    return calculateSupplierMatch(rfq, supplier, stats)
  })

  results.sort((a, b) => b.score - a.score)

  return { rfq, results }
}
