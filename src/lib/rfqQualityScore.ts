// Rule-based data-quality score for RFQ drafts — mainly for eTenders-sourced
// drafts, where an automated OCDS parser fills the fields instead of a
// human. With hundreds of these landing every week, the curator needs a
// fast way to tell "safe to skim and publish" apart from "needs a close
// look," instead of reading every field on every row.
//
// This is NOT a legitimacy/fraud check — it only measures how complete and
// specific the *parsed* data looks. A low score means "look closer, maybe
// open the original document," not "reject." A human still makes every
// publish/discard call.

import { getRFQDeadlineStatus } from "./rfq-deadline"

export type RFQQualityInput = {
  category: string | null | undefined
  province: string | null | undefined
  description: string | null | undefined
  original_source_url: string | null | undefined
  budget: string | number | null | undefined
  estimated_value_min?: number | null | undefined
  deadline: string | null | undefined
}

export type RFQQualityFlag = {
  key: string
  label: string
  passed: boolean
  weight: number
  detail: string
}

export type RFQQualityTier = "high" | "medium" | "low"

export type RFQQualityResult = {
  score: number
  tier: RFQQualityTier
  flags: RFQQualityFlag[]
}

// The fixed sign-off every eTenders draft description ends with (see
// buildDescription() in src/app/api/cron/sync-etenders/route.ts) — strip it
// before judging whether there's any real tender text.
const SOURCING_FOOTER =
  "Sourced from eTenders.gov.za (National Treasury Transparency Portal). This listing is provided for discovery purposes; refer to the original source for the authoritative tender documents and submission process."

const MIN_REAL_DESCRIPTION_LENGTH = 40

function hasRealDescription(description: string | null | undefined): boolean {
  if (!description) return false
  const withoutFooter = description.replace(SOURCING_FOOTER, "").trim()
  return withoutFooter.length >= MIN_REAL_DESCRIPTION_LENGTH
}

function hasDisclosedValue(input: RFQQualityInput): boolean {
  if (typeof input.estimated_value_min === "number" && input.estimated_value_min > 0) return true

  if (input.budget == null || input.budget === "") return false
  const numeric = Number(String(input.budget).replace(/[^\d.]/g, ""))
  return Number.isFinite(numeric) && numeric > 0
}

export function scoreRFQDraft(input: RFQQualityInput): RFQQualityResult {
  const category = input.category?.trim()
  const isClassified = Boolean(category) && category!.toLowerCase() !== "general"
  const hasSourceUrl = Boolean(input.original_source_url?.trim())
  const hasProvince = Boolean(input.province?.trim())
  const hasDescription = hasRealDescription(input.description)
  const hasValue = hasDisclosedValue(input)

  const checks: RFQQualityFlag[] = [
    {
      key: "source_url",
      label: "Original document",
      passed: hasSourceUrl,
      weight: 30,
      detail: hasSourceUrl
        ? "Original listing link available to cross-check."
        : "No original document link — nothing to fall back on if the parsed fields look off.",
    },
    {
      key: "category",
      label: "Category",
      passed: isClassified,
      weight: 20,
      detail: isClassified
        ? `Classified as "${category}".`
        : `Defaulted to "General" — the source didn't classify this tender, so category matching (and supplier match counts) is probably unreliable.`,
    },
    {
      key: "province",
      label: "Province",
      passed: hasProvince,
      weight: 20,
      detail: hasProvince
        ? `Located in ${input.province}.`
        : "No province captured — this won't reach province-filtered supplier matching.",
    },
    {
      key: "description",
      label: "Description",
      passed: hasDescription,
      weight: 20,
      detail: hasDescription
        ? "Real tender text captured beyond the standard sourcing footer."
        : "Description is empty or just the standard sourcing footer — no real scope captured yet.",
    },
    {
      key: "value",
      label: "Estimated value",
      passed: hasValue,
      weight: 10,
      detail: hasValue
        ? "A value was disclosed in the source data."
        : "No value disclosed — common for public tenders, so this counts for less than the checks above.",
    },
  ]

  const totalWeight = checks.reduce((sum, check) => sum + check.weight, 0)
  const earnedWeight = checks.reduce((sum, check) => sum + (check.passed ? check.weight : 0), 0)
  const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 100
  const tier: RFQQualityTier = score >= 80 ? "high" : score >= 50 ? "medium" : "low"

  // Time-to-review is a separate concern from data quality (a perfectly
  // complete draft can still be nearly expired), so it's surfaced as an
  // informational flag with zero weight rather than folded into the score.
  const deadlineStatus = getRFQDeadlineStatus(input.deadline)
  if (deadlineStatus === "Closed" || deadlineStatus === "Closing Soon") {
    checks.push({
      key: "deadline",
      label: "Time to review",
      passed: false,
      weight: 0,
      detail:
        deadlineStatus === "Closed"
          ? "Deadline has already passed — probably not worth publishing."
          : "Closing within 3 days — low value even if published right now.",
    })
  }

  return { score, tier, flags: checks }
}

export function qualityTierBadgeClass(tier: RFQQualityTier): string {
  if (tier === "high") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700"
  if (tier === "medium") return "border-amber-500/25 bg-amber-500/10 text-amber-700"
  return "border-rose-500/25 bg-rose-500/10 text-rose-700"
}

export function qualityTierDotClass(tier: RFQQualityTier): string {
  if (tier === "high") return "bg-emerald-500"
  if (tier === "medium") return "bg-amber-500"
  return "bg-rose-500"
}

export function qualityTierLabel(tier: RFQQualityTier): string {
  if (tier === "high") return "Looks good"
  if (tier === "medium") return "Worth a check"
  return "Needs attention"
}
