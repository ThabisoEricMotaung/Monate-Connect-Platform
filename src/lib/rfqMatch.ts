import { getRFQDisplayStatus } from "@/lib/rfq-deadline"

export type RFQMatchProfile = {
  province?: string | null
  industry?: string | null
}

export type RFQMatchRFQ = {
  province?: string | null
  region?: string | null
  category?: string | null
  status?: string | null
  deadline?: string | Date | null
}

export type RFQMatchScore = {
  score: number
  label: "Strong Match" | "Good Match" | "Possible Match" | "Low Match"
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase()
}

export function isRFQLocalMatch(
  profile: RFQMatchProfile | null | undefined,
  rfq: RFQMatchRFQ
): boolean {
  const supplierProvince = normalize(profile?.province)
  const rfqProvince = normalize(rfq.province ?? rfq.region)

  return Boolean(supplierProvince && rfqProvince === supplierProvince)
}

export function isRFQIndustryMatch(
  profile: RFQMatchProfile | null | undefined,
  rfq: RFQMatchRFQ
): boolean {
  const supplierIndustry = normalize(profile?.industry)
  const rfqCategory = normalize(rfq.category)

  return Boolean(supplierIndustry && rfqCategory === supplierIndustry)
}

export function calculateRFQMatchScore(
  profile: RFQMatchProfile | null | undefined,
  rfq: RFQMatchRFQ
): RFQMatchScore {
  const displayStatus = getRFQDisplayStatus(rfq.status, rfq.deadline)
  const score =
    (isRFQLocalMatch(profile, rfq) ? 45 : 0) +
    (isRFQIndustryMatch(profile, rfq) ? 45 : 0) +
    (displayStatus === "Open" ? 10 : 0) +
    (displayStatus === "Closing Soon" ? 5 : 0)

  if (score >= 80) {
    return { score, label: "Strong Match" }
  }

  if (score >= 50) {
    return { score, label: "Good Match" }
  }

  if (score >= 20) {
    return { score, label: "Possible Match" }
  }

  return { score, label: "Low Match" }
}
