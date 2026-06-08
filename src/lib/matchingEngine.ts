import { calculateSupplierSmartScore } from "./smartScore"
import { riskLevelFromScore } from "./supplierRisk"
import { supabase } from "./supabase"

export type MatchLevel =
  | "Excellent Match"
  | "Strong Match"
  | "Moderate Match"
  | "Weak Match"

export type MatchingSupplier = {
  id: string
  business_name?: string | null
  province?: string | null
  industry?: string | null
  phone?: string | null
  email?: string | null
  verification_status?: string | null
  csd_number?: string | null
  bbbee_level?: string | null
  tax_status?: string | null
  company_registration?: string | null
  cidb_grade?: string | null
  csd_document_url?: string | null
  bbbee_document_url?: string | null
  tax_document_url?: string | null
  company_registration_url?: string | null
  cidb_document_url?: string | null
  capability_statement_url?: string | null
  updated_at?: string | null
  created_at?: string | null
}

export type MatchingRFQ = {
  id: number
  title?: string | null
  description?: string | null
  category?: string | null
  province?: string | null
  region?: string | null
  deadline?: string | null
  status?: string | null
  budget?: string | null
}

export type SupplierMatchActivity = {
  quotes?: number
  awardedQuotes?: number
  contracts?: number
  completedContracts?: number
  invoices?: number
  paidInvoices?: number
  reviews?: number
  averageRating?: number | null
  recentActivityCount?: number
}

export type SupplierMatchResult = {
  supplier: MatchingSupplier
  rfq: MatchingRFQ
  match_score: number
  industry_score: number
  province_score: number
  compliance_score: number
  smartscore_score: number
  activity_score: number
  smartscore: number
  match_level: MatchLevel
  activity: SupplierMatchActivity
}

type QuoteRow = {
  supplier_id: string | null
  rfq_id?: number | null
  status: string | null
  created_at?: string | null
}

type ContractRow = {
  supplier_id: string | null
  status: string | null
  created_at?: string | null
}

type InvoiceRow = {
  supplier_id: string | null
  status: string | null
  created_at?: string | null
}

type ReviewRow = {
  supplier_id: string | null
  rating: number | string | null
  created_at?: string | null
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase()
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function hasValue(value: string | null | undefined): boolean {
  return Boolean(value?.trim())
}

function isVerified(status: string | null | undefined): boolean {
  return normalize(status).includes("verified")
}

function isRecent(value: string | null | undefined): boolean {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  const days = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
  return days >= 0 && days <= 90
}

function calculateIndustryScore(
  supplier: MatchingSupplier,
  rfq: MatchingRFQ
): number {
  const supplierIndustry = normalize(supplier.industry)
  const rfqCategory = normalize(rfq.category)

  if (!supplierIndustry || !rfqCategory) return 0
  if (supplierIndustry === rfqCategory) return 40
  if (supplierIndustry.includes(rfqCategory) || rfqCategory.includes(supplierIndustry)) return 40

  const supplierWords = supplierIndustry.split(/[\s,/&-]+/).filter((word) => word.length >= 4)
  const categoryWords = rfqCategory.split(/[\s,/&-]+/).filter((word) => word.length >= 4)
  const overlaps = supplierWords.filter((word) =>
    categoryWords.some((categoryWord) => word.includes(categoryWord) || categoryWord.includes(word))
  ).length

  if (overlaps === 0) return 0
  return overlaps >= 2 ? 32 : 24
}

function calculateProvinceScore(
  supplier: MatchingSupplier,
  rfq: MatchingRFQ
): number {
  const supplierProvince = normalize(supplier.province)
  const rfqProvince = normalize(rfq.province ?? rfq.region)

  if (!supplierProvince || !rfqProvince) return 0
  return supplierProvince === rfqProvince ? 20 : 0
}

function calculateRiskSignal(
  supplier: MatchingSupplier,
  activity: SupplierMatchActivity
): number {
  let riskScore = 0

  if (!isVerified(supplier.verification_status)) riskScore += 25
  if (!hasValue(supplier.csd_number)) riskScore += 15
  if (!hasValue(supplier.tax_status)) riskScore += 10
  if (!hasValue(supplier.business_name) || !hasValue(supplier.province) || !hasValue(supplier.industry)) {
    riskScore += 15
  }
  if ((activity.recentActivityCount ?? 0) === 0 && !isRecent(supplier.updated_at)) riskScore += 5

  return riskScore
}

function calculateComplianceScore(
  supplier: MatchingSupplier,
  activity: SupplierMatchActivity
): number {
  const verificationStatus = normalize(supplier.verification_status)
  let score = 0

  if (verificationStatus.includes("verified")) {
    score = 15
  } else if (verificationStatus.includes("pending") || verificationStatus.includes("review")) {
    score = 8
  } else if (verificationStatus) {
    score = 4
  }

  const riskLevel = riskLevelFromScore(calculateRiskSignal(supplier, activity))
  if (riskLevel === "Critical") return Math.min(score, 4)
  if (riskLevel === "High") return Math.min(score, 8)

  return score
}

function calculateActivityScore(
  supplier: MatchingSupplier,
  activity: SupplierMatchActivity
): number {
  const score =
    Math.min(activity.quotes ?? 0, 4) * 1.25 +
    Math.min(activity.awardedQuotes ?? 0, 3) * 1.5 +
    Math.min(activity.completedContracts ?? 0, 3) * 1.5 +
    Math.min(activity.reviews ?? 0, 3) * 0.75 +
    (isRecent(supplier.updated_at) ? 1 : 0)

  return Math.min(10, score)
}

export function getMatchLevel(score: number): MatchLevel {
  if (score >= 90) return "Excellent Match"
  if (score >= 75) return "Strong Match"
  if (score >= 60) return "Moderate Match"
  return "Weak Match"
}

export function calculateSupplierMatch(
  supplier: MatchingSupplier | null | undefined,
  rfq: MatchingRFQ | null | undefined,
  activity: SupplierMatchActivity = {}
): SupplierMatchResult {
  const safeSupplier: MatchingSupplier = {
    id: supplier?.id ?? "",
    ...supplier,
  }
  const safeRfq: MatchingRFQ = {
    id: rfq?.id ?? 0,
    ...rfq,
  }
  const smartScoreResult = calculateSupplierSmartScore(safeSupplier, {
    rfqResponses: activity.quotes ?? 0,
    awardedQuotes: activity.awardedQuotes ?? 0,
    contracts: activity.contracts ?? 0,
    completedContracts: activity.completedContracts ?? 0,
    invoices: activity.invoices ?? 0,
    paidInvoices: activity.paidInvoices ?? 0,
    reviewCount: activity.reviews ?? 0,
    averageRating: activity.averageRating ?? null,
    recentActivityCount: activity.recentActivityCount ?? 0,
  })

  const industry_score = calculateIndustryScore(safeSupplier, safeRfq)
  const province_score = calculateProvinceScore(safeSupplier, safeRfq)
  const compliance_score = calculateComplianceScore(safeSupplier, activity)
  const smartscore_score = Math.round((smartScoreResult.score / 100) * 15)
  const activity_score = Math.round(calculateActivityScore(safeSupplier, activity))
  const match_score = clampPercent(
    industry_score + province_score + compliance_score + smartscore_score + activity_score
  )

  return {
    supplier: safeSupplier,
    rfq: safeRfq,
    match_score,
    industry_score,
    province_score,
    compliance_score,
    smartscore_score,
    activity_score,
    smartscore: smartScoreResult.score,
    match_level: getMatchLevel(match_score),
    activity,
  }
}

function buildActivityMap({
  quotes,
  contracts,
  invoices,
  reviews,
}: {
  quotes: QuoteRow[]
  contracts: ContractRow[]
  invoices: InvoiceRow[]
  reviews: ReviewRow[]
}): Map<string, SupplierMatchActivity> {
  const map = new Map<string, SupplierMatchActivity>()

  function recordFor(supplierId: string | null | undefined): SupplierMatchActivity | null {
    if (!supplierId) return null
    const existing = map.get(supplierId) ?? {}
    map.set(supplierId, existing)
    return existing
  }

  for (const quote of quotes) {
    const record = recordFor(quote.supplier_id)
    if (!record) continue
    record.quotes = (record.quotes ?? 0) + 1
    if (["awarded", "approved"].includes(normalize(quote.status))) {
      record.awardedQuotes = (record.awardedQuotes ?? 0) + 1
    }
    if (isRecent(quote.created_at)) record.recentActivityCount = (record.recentActivityCount ?? 0) + 1
  }

  for (const contract of contracts) {
    const record = recordFor(contract.supplier_id)
    if (!record) continue
    record.contracts = (record.contracts ?? 0) + 1
    if (normalize(contract.status) === "completed") {
      record.completedContracts = (record.completedContracts ?? 0) + 1
    }
    if (isRecent(contract.created_at)) record.recentActivityCount = (record.recentActivityCount ?? 0) + 1
  }

  for (const invoice of invoices) {
    const record = recordFor(invoice.supplier_id)
    if (!record) continue
    record.invoices = (record.invoices ?? 0) + 1
    if (normalize(invoice.status) === "paid") {
      record.paidInvoices = (record.paidInvoices ?? 0) + 1
    }
    if (isRecent(invoice.created_at)) record.recentActivityCount = (record.recentActivityCount ?? 0) + 1
  }

  const ratingTotals = new Map<string, { total: number; count: number }>()
  for (const review of reviews) {
    const record = recordFor(review.supplier_id)
    if (!record || !review.supplier_id) continue
    record.reviews = (record.reviews ?? 0) + 1
    if (isRecent(review.created_at)) record.recentActivityCount = (record.recentActivityCount ?? 0) + 1

    const rating = Number(review.rating)
    if (Number.isFinite(rating)) {
      const existing = ratingTotals.get(review.supplier_id) ?? { total: 0, count: 0 }
      existing.total += rating
      existing.count += 1
      ratingTotals.set(review.supplier_id, existing)
    }
  }

  for (const [supplierId, rating] of ratingTotals) {
    const record = map.get(supplierId)
    if (record && rating.count > 0) {
      record.averageRating = rating.total / rating.count
    }
  }

  return map
}

async function safeList<T>(
  request: PromiseLike<{ data: unknown; error: unknown }>
): Promise<T[]> {
  try {
    const { data, error } = await request
    if (error) return []
    return Array.isArray(data) ? (data as T[]) : []
  } catch {
    return []
  }
}

async function getMatchingContext() {
  if (!supabase) {
    return {
      suppliers: [] as MatchingSupplier[],
      rfqs: [] as MatchingRFQ[],
      activityMap: new Map<string, SupplierMatchActivity>(),
    }
  }

  const [suppliers, rfqs, quotes, contracts, invoices, reviews] = await Promise.all([
    safeList<MatchingSupplier>(
      supabase
        .from("profiles")
        .select(
          "id, business_name, province, industry, phone, email, verification_status, " +
            "csd_number, bbbee_level, tax_status, company_registration, cidb_grade, " +
            "csd_document_url, bbbee_document_url, tax_document_url, company_registration_url, " +
            "cidb_document_url, capability_statement_url, updated_at, created_at"
        )
        .eq("role", "supplier")
    ),
    safeList<MatchingRFQ>(
      supabase
        .from("rfqs")
        .select("id, title, description, category, province, region, deadline, status, budget")
        .order("id", { ascending: false })
    ),
    safeList<QuoteRow>(supabase.from("quotes").select("supplier_id, rfq_id, status, created_at")),
    safeList<ContractRow>(supabase.from("contracts").select("supplier_id, status, created_at")),
    safeList<InvoiceRow>(supabase.from("invoices").select("supplier_id, status, created_at")),
    safeList<ReviewRow>(supabase.from("supplier_reviews").select("supplier_id, rating, created_at")),
  ])

  return {
    suppliers,
    rfqs,
    activityMap: buildActivityMap({ quotes, contracts, invoices, reviews }),
  }
}

async function persistMatches(matches: SupplierMatchResult[]): Promise<void> {
  if (!supabase || matches.length === 0) return

  try {
    await supabase.from("supplier_matches").insert(
      matches
        .filter((match) => match.supplier.id && match.rfq.id)
        .map((match) => ({
          supplier_id: match.supplier.id,
          rfq_id: match.rfq.id,
          match_score: match.match_score,
          industry_score: match.industry_score,
          province_score: match.province_score,
          compliance_score: match.compliance_score,
          smartscore_score: match.smartscore_score,
          activity_score: match.activity_score,
          match_level: match.match_level,
        }))
    )
  } catch {
    // Matching must remain available even before the supplier_matches migration is applied.
  }
}

export async function calculateRFQMatches(rfqId?: number): Promise<SupplierMatchResult[]> {
  const { suppliers, rfqs, activityMap } = await getMatchingContext()
  const targetRfqs = rfqId ? rfqs.filter((rfq) => rfq.id === rfqId) : rfqs
  const matches = targetRfqs.flatMap((rfq) =>
    suppliers.map((supplier) =>
      calculateSupplierMatch(supplier, rfq, activityMap.get(supplier.id) ?? {})
    )
  )

  matches.sort((a, b) => b.match_score - a.match_score)
  await persistMatches(matches)
  return matches
}

export async function getRFQMatches(rfqId: number): Promise<SupplierMatchResult[]> {
  return calculateRFQMatches(rfqId)
}

export async function getSupplierMatches(supplierId: string): Promise<SupplierMatchResult[]> {
  const { suppliers, rfqs, activityMap } = await getMatchingContext()
  const supplier = suppliers.find((item) => item.id === supplierId)

  if (!supplier) return []

  const matches = rfqs.map((rfq) =>
    calculateSupplierMatch(supplier, rfq, activityMap.get(supplier.id) ?? {})
  )

  matches.sort((a, b) => b.match_score - a.match_score)
  await persistMatches(matches)
  return matches
}
