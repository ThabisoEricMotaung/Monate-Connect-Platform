import type { AppLocale } from "./config"

export const PUBLIC_DISCOVERY_NAMESPACES = [
  "localeSwitcher", "publicChrome", "home", "opportunities", "opportunityDetail",
] as const
export type PublicDiscoveryNamespace = (typeof PUBLIC_DISCOVERY_NAMESPACES)[number]
export type ReviewStatus = "source" | "machine_translated" | "human_review_in_progress" | "human_reviewed" | "changes_requested"

export type NamespaceReview = {
  locale: AppLocale
  namespace: PublicDiscoveryNamespace
  sourceVersion: "phase2a-en-v1"
  translationMethod: "source" | "ai_assisted"
  status: ReviewStatus
  reviewer: string | null
  reviewedAt: string | null
}

const locales: AppLocale[] = ["en", "af", "nr", "xh", "zu", "nso", "st", "tn", "ss", "ve", "ts"]

export const NAMESPACE_REVIEWS: NamespaceReview[] = locales.flatMap((locale) =>
  PUBLIC_DISCOVERY_NAMESPACES.map((namespace) => ({
    locale,
    namespace,
    sourceVersion: "phase2a-en-v1",
    translationMethod: locale === "en" ? "source" : "ai_assisted",
    status: locale === "en" ? "source" : "machine_translated",
    reviewer: null,
    reviewedAt: null,
  })),
)

export function localeCoverage(locale: AppLocale): "source" | "reviewed" | "machine" {
  if (locale === "en") return "source"
  const records = NAMESPACE_REVIEWS.filter((record) => record.locale === locale)
  return records.length > 0 && records.every((record) => record.status === "human_reviewed") ? "reviewed" : "machine"
}
