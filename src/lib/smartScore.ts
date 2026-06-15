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
}

export type SupplierSmartScoreProfile = {
  business_name?: string | null
  province?: string | null
  provinces?: string[] | null
  industry?: string | null
  phone?: string | null
  email?: string | null
  description?: string | null
  verification_status?: string | null
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
}

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

function parseLevel(value: string | null | undefined): number {
  return Number(value?.replace(/[^0-9]/g, "") || "0")
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
    isVerified(profile.tax_status) && hasAnyValue(profile.tax_document_url ?? profile.tax_clearance_url)
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

function isVerified(status: string | null | undefined): boolean {
  return (status ?? "").toLowerCase().includes("verified")
}

function hasRecentDate(value: string | null | undefined): boolean {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false

  const days = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
  return days >= 0 && days <= 30
}

function bankingVerified(profile: SupplierSmartScoreProfile): boolean {
  return Boolean(
    profile.bank_verified ||
      isVerified(profile.banking_verification_status) ||
      isVerified(profile.bank_verification_status)
  )
}

export function calculateSmartScore(profile: SupplierSmartScoreProfile | null | undefined): number {
  if (!profile) return 0

  let score = 0
  const provinces = profileProvinces(profile)

  if (
    hasAnyValue(profile.business_name) &&
    hasAnyValue(profile.industry) &&
    provinces.length > 0 &&
    hasAnyValue(profile.phone) &&
    hasAnyValue(profile.description)
  ) {
    score += 20
  }

  if (profileCsdVerified(profile)) {
    score += 20
  } else if (hasAnyValue(profile.csd_number)) {
    score += 10
  }

  if (profileBBBEEVerified(profile)) {
    const level = parseLevel(profile.bbbee_level)
    if (level >= 1 && level <= 4) score += 20
    else score += 10
  }

  if (profileTaxVerified(profile)) {
    score += 15
  } else if (hasAnyValue(profile.tax_clearance_url ?? profile.tax_document_url)) {
    score += 7
  }

  if (profileBankingVerified(profile)) {
    score += 10
  } else if (profileHasBankingDetails(profile)) {
    score += 5
  }

  if (profile.director_verified) {
    score += 10
  }

  if (hasAnyValue(profile.capability_statement_url)) {
    score += 5
  }

  return Math.min(score, 100)
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

export function getSmartScoreBreakdown(
  profile: SupplierSmartScoreProfile | null | undefined
): SmartScoreBreakdownItem[] {
  const safeProfile = profile ?? {}
  const provinces = profileProvinces(safeProfile)
  const bbbeeLevel = parseLevel(safeProfile.bbbee_level)
  const businessEarned =
    hasAnyValue(safeProfile.business_name) &&
    hasAnyValue(safeProfile.industry) &&
    provinces.length > 0 &&
    hasAnyValue(safeProfile.phone) &&
    hasAnyValue(safeProfile.description)
  const csdVerified = profileCsdVerified(safeProfile)
  const csdPending = !csdVerified && hasAnyValue(safeProfile.csd_number)
  const bbbeeVerified = profileBBBEEVerified(safeProfile)
  const taxVerified = profileTaxVerified(safeProfile)
  const taxPending = !taxVerified && hasAnyValue(safeProfile.tax_clearance_url ?? safeProfile.tax_document_url)
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
      earnedPoints: bbbeeVerified && bbbeeLevel >= 1 && bbbeeLevel <= 4 ? 20 : bbbeeVerified ? 10 : 0,
      status: bbbeeVerified ? "earned" : hasAnyValue(safeProfile.bbbee_level) ? "pending" : "missing",
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
      earnedPoints: hasAnyValue(safeProfile.capability_statement_url) ? 5 : 0,
      status: hasAnyValue(safeProfile.capability_statement_url) ? "earned" : "optional",
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
  }
}

export function calculateSupplierSmartScore(
  profile: SupplierSmartScoreProfile | null | undefined,
  activity: SupplierSmartScoreActivity = {}
): SmartScoreResult {
  const complianceDocuments = [
    profile?.csd_document_url,
    profile?.bbbee_document_url,
    profile?.tax_document_url,
    profile?.company_registration_url,
    profile?.cidb_document_url,
    profile?.capability_statement_url,
  ]

  const completedProfileFields = [
    profile?.business_name,
    profile?.province,
    profile?.industry,
    profile?.phone,
    profile?.email,
    profile?.csd_number,
    profile?.bbbee_level,
    profile?.tax_status,
    profile?.company_registration,
    profile?.cidb_grade,
  ].filter(hasValue).length

  const uploadedDocuments = complianceDocuments.filter(hasValue).length
  const averageRating = activity.averageRating ?? null
  const paymentReliabilityRate =
    activity.paymentReliabilityRate ??
    (activity.approvedInvoices && activity.approvedInvoices > 0
      ? Math.round(((activity.paidInvoices ?? 0) / activity.approvedInvoices) * 100)
      : activity.payments && activity.payments > 0
        ? Math.round(((activity.paidPayments ?? 0) / activity.payments) * 100)
        : 0)
  const reviewContribution =
    averageRating === null
      ? Math.min(activity.reviewCount ?? 0, 5) * 10
      : Math.min(120, Math.round((averageRating / 5) * 120))

  const rawScore =
    80 +
      (isVerified(profile?.verification_status) ? 120 : 30) +
      uploadedDocuments * 30 +
      (bankingVerified(profile ?? {}) ? 90 : 0) +
      completedProfileFields * 16 +
      Math.min(activity.rfqResponses ?? 0, 10) * 14 +
      Math.min(activity.awardedQuotes ?? 0, 8) * 22 +
      Math.min(activity.contracts ?? 0, 6) * 18 +
      Math.min(activity.completedContracts ?? 0, 6) * 30 +
      Math.min(activity.invoices ?? 0, 8) * 10 +
      Math.min(activity.approvedInvoices ?? 0, 8) * 14 +
      Math.min(activity.paidInvoices ?? 0, 8) * 18 +
      Math.min(100, Math.max(0, paymentReliabilityRate)) * 1.25 +
      reviewContribution +
      Math.min(activity.recentActivityCount ?? 0, 5) * 18 +
      (hasRecentDate(profile?.updated_at) ? 30 : 0)
  const score = clampScore(rawScore / 10)

  const level = getLevel(score)
  const tips: string[] = []

  if (!hasValue(profile?.tax_document_url)) {
    tips.push("Upload tax clearance to gain points")
  }

  if (!bankingVerified(profile ?? {})) {
    tips.push("Verify banking details to gain points")
  }

  if (completedProfileFields < 8) {
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
