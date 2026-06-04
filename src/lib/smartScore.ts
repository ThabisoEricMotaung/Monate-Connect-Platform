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
  banking_verification_status?: string | null
  bank_verification_status?: string | null
  bank_verified?: boolean | null
  updated_at?: string | null
  created_at?: string | null
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

function clampScore(score: number): number {
  return Math.max(0, Math.min(1000, Math.round(score)))
}

function getLevel(score: number): Pick<SmartScoreResult, "label" | "tone"> {
  if (score <= 399) {
    return { label: "Emerging Supplier / High Risk", tone: "red" }
  }

  if (score <= 599) {
    return { label: "Developing Supplier", tone: "orange" }
  }

  if (score <= 749) {
    return { label: "Reliable Supplier", tone: "blue" }
  }

  if (score <= 849) {
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

  const score = clampScore(
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
  )

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

  const score = clampScore(
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
  )

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
