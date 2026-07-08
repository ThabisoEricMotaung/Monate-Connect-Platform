import { isVerifiedStatus } from "./supplierStatus"

export type SmartScoreLevel =
  | "Emerging Supplier / High Risk"
  | "Developing Supplier"
  | "Reliable Supplier"
  | "Trusted Supplier"
  | "Elite Supplier"

export type SmartScoreTone = "red" | "orange" | "blue" | "green" | "gold"

export type SmartScoreResult = {
  score: number
  label: SmartScoreLevel
  tone: SmartScoreTone
  monthlyTrend: number
  tips: string[]
  breakdown?: SmartScoreBreakdownItem[]
  complianceBase?: number
  activityBonus?: number
  activityBonusCap?: number
  activityBreakdown?: SupplierSmartScoreActivityBreakdown
}

export type SupplierSmartScoreActivityBreakdown = {
  rfqResponseBonus: number
  awardedQuoteBonus: number
  completedContractBonus: number
  paidInvoiceBonus: number
  paymentReliabilityBonus: number
  reviewBonus: number
  recentActivityBonus: number
  recentUpdateBonus: number
  rawActivityBonus: number
  cappedActivityBonus: number
}

export type SupplierSmartScoreProfile = {
  role?: string | null
  business_name?: string | null
  province?: string | null
  provinces?: string[] | null
  industry?: string | null
  phone?: string | null
  email?: string | null
  description?: string | null
  verification_status?: string | null
  smart_score?: number | string | null
  csd_number?: string | null
  csd_verified?: boolean | null
  bbbee_level?: string | null
  bbbee_verified?: boolean | null
  tax_status?: string | null
  tax_verified?: boolean | null
  tax_clearance_url?: string | null
  company_registration?: string | null
  cidb_grade?: string | null
  csd_document_url?: string | null
  bbbee_document_url?: string | null
  tax_document_url?: string | null
  company_registration_url?: string | null
  cidb_document_url?: string | null
  capability_statement_url?: string | null
  banking_verification_status?: string | null
  bank_verification_status?: string | null
  bank_verified?: boolean | null
  banking_verified?: boolean | null
  bank_name?: string | null
  bank_account_number?: string | null
  account_number?: string | null
  director_verified?: boolean | null
  updated_at?: string | null
  created_at?: string | null
  supplier_documents?: Array<{
    document_type?: string | null
    file_url?: string | null
    status?: string | null
  }> | null
}

export const SUPPLIER_SMART_SCORE_PROFILE_SELECT =
  "id, business_name, province, provinces, industry, phone, email, description, verification_status, smart_score, " +
  "csd_number, csd_verified, bbbee_level, bbbee_verified, tax_status, tax_verified, tax_clearance_url, " +
  "company_registration, cidb_grade, csd_document_url, bbbee_document_url, tax_document_url, " +
  "company_registration_url, cidb_document_url, capability_statement_url, banking_verified, " +
  "bank_verified, director_verified, updated_at, created_at"

export type SmartScoreColour = "success" | "warning" | "danger"

export type SmartScoreBreakdownItem = {
  key: string
  label: string
  points: number
  earnedPoints: number
  status: "earned" | "pending" | "missing" | "optional"
}

export type RFQMatchProfile = {
  industry?: string | null
  province?: string | null
  provinces?: string[] | null
  bbbee_level?: string | null
}

export type RFQMatchRecord = {
  industry?: string | null
  category?: string | null
  province?: string | null
  region?: string | null
  provinces?: string[] | null
  bbbee_requirement?: string | null
  bbee_requirement?: string | null
  bbbee_level?: string | null
}

export type SupplierSmartScoreActivity = {
  rfqResponses?: number
  awardedQuotes?: number
  contracts?: number
  completedContracts?: number
  invoices?: number
  approvedInvoices?: number
  paidInvoices?: number
  payments?: number
  paidPayments?: number
  paymentReliabilityRate?: number
  reviewCount?: number
  averageRating?: number | null
  recentActivityCount?: number
}

export type BuyerSmartScoreProfile = {
  organisation_name?: string | null
  business_name?: string | null
  email?: string | null
  phone?: string | null
  role?: string | null
  verification_status?: string | null
  organisation_verification_status?: string | null
  updated_at?: string | null
}

export type BuyerSmartScoreActivity = {
  rfqsPosted?: number
  rfqsCompleted?: number
  paidInvoices?: number
  approvedInvoices?: number
  supplierMessages?: number
  recentActivityCount?: number
}

function hasValue(value: string | null | undefined): boolean {
  return Boolean(value?.trim())
}

function hasAnyValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.some((item) => hasAnyValue(item))
  if (typeof value === "string") return hasValue(value)
  return value !== null && value !== undefined
}

function hasSupplierDocument(
  profile: SupplierSmartScoreProfile,
  documentType: string,
  fallback?: unknown
): boolean {
  return Boolean(
    profile.supplier_documents?.some(
      (document) =>
        document.document_type === documentType &&
        document.status !== "superseded" &&
        hasAnyValue(document.file_url)
    ) || hasAnyValue(fallback)
  )
}

function profileProvinces(profile: SupplierSmartScoreProfile | RFQMatchProfile): string[] {
  const provinces = Array.isArray(profile.provinces)
    ? profile.provinces.map((item) => item.trim()).filter(Boolean)
    : []

  if (provinces.length > 0) {
    return provinces
  }

  const province = profile.province
  if (typeof province === "string" && province.trim()) {
    return [province.trim()]
  }

  return []
}

function profileCsdVerified(profile: SupplierSmartScoreProfile): boolean {
  return Boolean(profile.csd_verified || isVerified(profile.verification_status))
}

function profileBBBEEVerified(profile: SupplierSmartScoreProfile): boolean {
  return Boolean(profile.bbbee_verified || isVerified(profile.verification_status))
}

function profileTaxVerified(profile: SupplierSmartScoreProfile): boolean {
  if (profile.tax_verified) {
    return true
  }

  return Boolean(
    isVerified(profile.tax_status) &&
      hasSupplierDocument(profile, "tax_clearance", profile.tax_document_url ?? profile.tax_clearance_url)
  )
}

function profileBankingVerified(profile: SupplierSmartScoreProfile): boolean {
  return Boolean(
    profile.banking_verified ||
      profile.bank_verified ||
      isVerified(profile.banking_verification_status) ||
      isVerified(profile.bank_verification_status)
  )
}

function profileHasBankingDetails(profile: SupplierSmartScoreProfile): boolean {
  return hasAnyValue(profile.bank_name) && hasAnyValue(profile.bank_account_number ?? profile.account_number)
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)))
}

function getLevel(score: number): Pick<SmartScoreResult, "label" | "tone"> {
  if (score <= 39) {
    return { label: "Emerging Supplier / High Risk", tone: "red" }
  }

  if (score <= 59) {
    return { label: "Developing Supplier", tone: "orange" }
  }

  if (score <= 74) {
    return { label: "Reliable Supplier", tone: "blue" }
  }

  if (score <= 84) {
    return { label: "Trusted Supplier", tone: "green" }
  }

  return { label: "Elite Supplier", tone: "gold" }
}

const isVerified = isVerifiedStatus
const SUPPLIER_ACTIVITY_BONUS_CAP = 8

function hasRecentDate(value: string | null | undefined): boolean {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false

  const days = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
  return days >= 0 && days <= 30
}

export function getSmartScoreLabel(score: number): string {
  if (score >= 90) return "Excellent"
  if (score >= 75) return "Good standing"
  if (score >= 50) return "Building trust"
  return "Incomplete"
}

export function getSmartScoreColour(score: number): SmartScoreColour {
  if (score >= 75) return "success"
  if (score >= 50) return "warning"
  return "danger"
}

function buildSmartScoreBreakdown(
  profile: SupplierSmartScoreProfile | null | undefined
): SmartScoreBreakdownItem[] {
  const safeProfile = profile ?? {}
  const provinces = profileProvinces(safeProfile)
  const businessEarned =
    hasAnyValue(safeProfile.business_name) &&
    hasAnyValue(safeProfile.industry) &&
    provinces.length > 0 &&
    hasAnyValue(safeProfile.phone) &&
    hasAnyValue(safeProfile.description)
  const csdVerified = profileCsdVerified(safeProfile)
  const csdPending =
    !csdVerified &&
    (hasAnyValue(safeProfile.csd_number) || hasSupplierDocument(safeProfile, "csd", safeProfile.csd_document_url))
  const bbbeeVerified = profileBBBEEVerified(safeProfile)
  const bbbeePending =
    !bbbeeVerified &&
    (hasAnyValue(safeProfile.bbbee_level) || hasSupplierDocument(safeProfile, "bbbee", safeProfile.bbbee_document_url))
  const taxVerified = profileTaxVerified(safeProfile)
  const taxPending = !taxVerified && hasSupplierDocument(safeProfile, "tax_clearance", safeProfile.tax_clearance_url ?? safeProfile.tax_document_url)
  const bankingVerified = profileBankingVerified(safeProfile)
  const bankingPending = !bankingVerified && profileHasBankingDetails(safeProfile)

  return [
    {
      key: "business",
      label: "Business profile",
      points: 20,
      earnedPoints: businessEarned ? 20 : 0,
      status: businessEarned ? "earned" : "missing",
    },
    {
      key: "csd",
      label: "CSD number verified",
      points: 20,
      earnedPoints: csdVerified ? 20 : csdPending ? 10 : 0,
      status: csdVerified ? "earned" : csdPending ? "pending" : "missing",
    },
    {
      key: "bbbee",
      label: "BBBEE certificate verified",
      points: 20,
      earnedPoints: bbbeeVerified ? 20 : bbbeePending ? 10 : 0,
      status: bbbeeVerified ? "earned" : bbbeePending ? "pending" : "missing",
    },
    {
      key: "tax",
      label: "Tax clearance verified",
      points: 15,
      earnedPoints: taxVerified ? 15 : taxPending ? 7 : 0,
      status: taxVerified ? "earned" : taxPending ? "pending" : "missing",
    },
    {
      key: "banking",
      label: "Banking details verified",
      points: 10,
      earnedPoints: bankingVerified ? 10 : bankingPending ? 5 : 0,
      status: bankingVerified ? "earned" : bankingPending ? "pending" : "missing",
    },
    {
      key: "director",
      label: "Director ID verified",
      points: 10,
      earnedPoints: safeProfile.director_verified ? 10 : 0,
      status: safeProfile.director_verified ? "earned" : "optional",
    },
    {
      key: "company_profile",
      label: "Company profile document",
      points: 5,
      earnedPoints: hasSupplierDocument(safeProfile, "company_profile", safeProfile.capability_statement_url) ? 5 : 0,
      status: hasSupplierDocument(safeProfile, "company_profile", safeProfile.capability_statement_url) ? "earned" : "optional",
    },
  ]
}

export function calculateRFQMatch(profile: RFQMatchProfile | null | undefined, rfq: RFQMatchRecord | null | undefined): number {
  if (!profile || !rfq) return 0

  let score = 0
  const supplierIndustry = (profile.industry ?? "").trim().toLowerCase()
  const rfqIndustry = (rfq.industry ?? rfq.category ?? "").trim().toLowerCase()

  if (supplierIndustry && rfqIndustry && supplierIndustry === rfqIndustry) {
    score += 40
  }

  const supplierProvinces = profileProvinces(profile).map((province) => province.toLowerCase())
  const rfqProvinces = [
    ...(Array.isArray(rfq.provinces) ? rfq.provinces : []),
    ...(typeof rfq.province === "string" ? rfq.province.split(/[,;|/]+/) : []),
    ...(typeof rfq.region === "string" ? rfq.region.split(/[,;|/]+/) : []),
  ].map((province) => province.trim().toLowerCase()).filter(Boolean)
  const overlap = supplierProvinces.filter((province) => rfqProvinces.includes(province))

  if (overlap.length > 0) {
    score += 40
  }

  const requirement = rfq.bbbee_requirement ?? rfq.bbee_requirement ?? rfq.bbbee_level ?? null
  if (requirement) {
    const requiredLevel = Number(requirement.replace(/[^0-9]/g, "") || "8")
    const supplierLevel = Number(profile.bbbee_level?.replace(/[^0-9]/g, "") || "9")
    if (supplierLevel <= requiredLevel) score += 20
  } else {
    score += 20
  }

  return Math.min(score, 100)
}

export function getSmartScoreLevel(score: number): SmartScoreResult {
  const normalScore = clampScore(score)
  const level = getLevel(normalScore)

  return {
    score: normalScore,
    label: level.label,
    tone: level.tone,
    monthlyTrend: 0,
    tips: [],
    breakdown: undefined,
  }
}

function complianceBaseFromBreakdown(breakdown: SmartScoreBreakdownItem[]): number {
  return breakdown.reduce((total, item) => total + item.earnedPoints, 0)
}

function activityBonusBreakdown(
  profile: SupplierSmartScoreProfile | null | undefined,
  activity: SupplierSmartScoreActivity
): SupplierSmartScoreActivityBreakdown {
  const averageRating = activity.averageRating ?? null
  const paymentReliabilityRate =
    activity.paymentReliabilityRate ??
    (activity.approvedInvoices && activity.approvedInvoices > 0
      ? Math.round(((activity.paidInvoices ?? 0) / activity.approvedInvoices) * 100)
      : activity.payments && activity.payments > 0
        ? Math.round(((activity.paidPayments ?? 0) / activity.payments) * 100)
        : 0)

  const rfqResponseBonus = Math.min(activity.rfqResponses ?? 0, 5) * 0.6
  const awardedQuoteBonus = Math.min(activity.awardedQuotes ?? 0, 3) * 1.2
  const completedContractBonus = Math.min(activity.completedContracts ?? 0, 3) * 1.2
  const paidInvoiceBonus = Math.min(activity.paidInvoices ?? 0, 5) * 0.5
  const paymentReliabilityBonus = Math.min(100, Math.max(0, paymentReliabilityRate)) * 0.02
  const reviewBonus =
    averageRating === null
      ? Math.min(activity.reviewCount ?? 0, 4) * 0.35
      : Math.min(2, Math.max(0, (averageRating / 5) * 2))
  const recentActivityBonus = Math.min(activity.recentActivityCount ?? 0, 5) * 0.3
  const recentUpdateBonus = hasRecentDate(profile?.updated_at) ? 0.5 : 0
  const rawActivityBonus =
    rfqResponseBonus +
    awardedQuoteBonus +
    completedContractBonus +
    paidInvoiceBonus +
    paymentReliabilityBonus +
    reviewBonus +
    recentActivityBonus +
    recentUpdateBonus
  const cappedActivityBonus = Math.min(SUPPLIER_ACTIVITY_BONUS_CAP, rawActivityBonus)

  return {
    rfqResponseBonus,
    awardedQuoteBonus,
    completedContractBonus,
    paidInvoiceBonus,
    paymentReliabilityBonus,
    reviewBonus,
    recentActivityBonus,
    recentUpdateBonus,
    rawActivityBonus,
    cappedActivityBonus,
  }
}

export function calculateSupplierSmartScore(
  profile: SupplierSmartScoreProfile | null | undefined,
  activity: SupplierSmartScoreActivity = {}
): SmartScoreResult {
  const breakdown = buildSmartScoreBreakdown(profile)
  const complianceBase = complianceBaseFromBreakdown(breakdown)
  const activityBreakdown = activityBonusBreakdown(profile, activity)
  const paymentReliabilityRate =
    activity.paymentReliabilityRate ??
    (activity.approvedInvoices && activity.approvedInvoices > 0
      ? Math.round(((activity.paidInvoices ?? 0) / activity.approvedInvoices) * 100)
      : activity.payments && activity.payments > 0
        ? Math.round(((activity.paidPayments ?? 0) / activity.payments) * 100)
        : 0)
  const activityBonus = activityBreakdown.cappedActivityBonus
  const score = clampScore(complianceBase + activityBonus)

  const level = getLevel(score)
  const tips: string[] = []

  if (!hasSupplierDocument(profile ?? {}, "tax_clearance", profile?.tax_document_url ?? profile?.tax_clearance_url)) {
    tips.push("Upload tax clearance to gain points")
  }

  if (!profileBankingVerified(profile ?? {})) {
    tips.push("Verify banking details to gain points")
  }

  if (!breakdown.find((item) => item.key === "business" && item.status === "earned")) {
    tips.push("Complete profile to gain points")
  }

  if ((activity.rfqResponses ?? 0) === 0) {
    tips.push("Respond to RFQs to improve score")
  }

  if ((activity.contracts ?? 0) > 0 && (activity.completedContracts ?? 0) === 0) {
    tips.push("Complete awarded contracts to improve score")
  }

  if ((activity.approvedInvoices ?? 0) > 0 && paymentReliabilityRate < 80) {
    tips.push("Improve paid invoice reliability to gain points")
  }

  return {
    score,
    label: level.label,
    tone: level.tone,
    monthlyTrend:
      Math.min(activity.recentActivityCount ?? 0, 5) * 6 +
      (hasRecentDate(profile?.updated_at) ? 8 : 0),
    tips: tips.slice(0, 4),
    breakdown,
    complianceBase,
    activityBonus,
    activityBonusCap: SUPPLIER_ACTIVITY_BONUS_CAP,
    activityBreakdown,
  }
}

export function calculateBuyerSmartScore(
  profile: BuyerSmartScoreProfile | null | undefined,
  activity: BuyerSmartScoreActivity = {}
): SmartScoreResult {
  const completedProfileFields = [
    profile?.organisation_name,
    profile?.business_name,
    profile?.email,
    profile?.phone,
  ].filter(hasValue).length

  const approvedInvoices = activity.approvedInvoices ?? 0
  const paymentReliability =
    approvedInvoices > 0
      ? Math.round(((activity.paidInvoices ?? 0) / approvedInvoices) * 160)
      : 0

  const rawScore =
    160 +
      completedProfileFields * 45 +
      (isVerified(profile?.organisation_verification_status) ||
      isVerified(profile?.verification_status)
        ? 160
        : 40) +
      Math.min(activity.rfqsPosted ?? 0, 12) * 22 +
      Math.min(activity.rfqsCompleted ?? 0, 10) * 30 +
      Math.min(paymentReliability, 160) +
      Math.min(activity.supplierMessages ?? 0, 12) * 12 +
      Math.min(activity.recentActivityCount ?? 0, 5) * 20 +
      (hasRecentDate(profile?.updated_at) ? 30 : 0)
  const score = clampScore(rawScore / 10)

  const level = getLevel(score)
  const tips: string[] = []

  if (!isVerified(profile?.organisation_verification_status ?? profile?.verification_status)) {
    tips.push("Verify organisation details to gain points")
  }

  if ((activity.rfqsPosted ?? 0) === 0) {
    tips.push("Post RFQs to improve score")
  }

  if (approvedInvoices === 0 || (activity.paidInvoices ?? 0) < approvedInvoices) {
    tips.push("Maintain payment reliability to improve score")
  }

  if ((activity.supplierMessages ?? 0) === 0) {
    tips.push("Use supplier communication to build reputation")
  }

  return {
    score,
    label: level.label,
    tone: level.tone,
    monthlyTrend:
      Math.min(activity.recentActivityCount ?? 0, 5) * 7 +
      (hasRecentDate(profile?.updated_at) ? 8 : 0),
    tips: tips.slice(0, 4),
  }
}
