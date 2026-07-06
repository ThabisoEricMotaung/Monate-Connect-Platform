export const OFFICIAL_INDUSTRY_OPTIONS = [
  "Construction & Infrastructure",
  "Electrical",
  "Plumbing",
  "ICT & Technology",
  "Professional Services (Legal, Accounting, Consulting)",
  "Cleaning & Facilities",
  "Security Services",
  "Logistics & Transport",
  "Manufacturing",
  "Agriculture & Agri-processing",
  "Energy (Solar, Renewable)",
  "Corporate Merchandise & Branding",
  "Catering & Hospitality",
  "Healthcare & Medical Supplies",
  "Education & Training",
  "Other",
] as const

export type OfficialIndustry = (typeof OFFICIAL_INDUSTRY_OPTIONS)[number]

const INDUSTRY_ALIASES: Record<string, OfficialIndustry> = {
  "agriculture": "Agriculture & Agri-processing",
  "agriculture & agri-processing": "Agriculture & Agri-processing",
  "cleaning": "Cleaning & Facilities",
  "cleaning & facilities": "Cleaning & Facilities",
  "construction": "Construction & Infrastructure",
  "construction & infrastructure": "Construction & Infrastructure",
  "electrical": "Electrical",
  "facilities & cleaning": "Cleaning & Facilities",
  "ict": "ICT & Technology",
  "ict & technology": "ICT & Technology",
  "it & technology": "ICT & Technology",
  "logistics": "Logistics & Transport",
  "logistics & transport": "Logistics & Transport",
  "manufacturing": "Manufacturing",
  "professional services": "Professional Services (Legal, Accounting, Consulting)",
  "professional services (legal, accounting, consulting)": "Professional Services (Legal, Accounting, Consulting)",
}

export function canonicalIndustry(value: string | null | undefined): OfficialIndustry | null {
  const normalized = String(value ?? "").trim().toLowerCase()
  if (!normalized) return null
  return INDUSTRY_ALIASES[normalized] ?? null
}

export function industryFormValue(value: string | null | undefined): OfficialIndustry | "" {
  if (!String(value ?? "").trim()) return ""
  return canonicalIndustry(value) ?? "Other"
}

export function displayIndustry(value: string | null | undefined): string {
  return canonicalIndustry(value) ?? String(value ?? "").trim()
}
