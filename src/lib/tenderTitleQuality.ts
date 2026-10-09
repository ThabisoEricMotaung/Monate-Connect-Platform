import { isGenericWording } from "@/lib/tenderDisplayTitle"

/**
 * Judges whether a listing heading tells a supplier what the opportunity
 * involves. Used by the title audit; rules are deliberately simple and
 * explainable so each verdict can be checked by hand.
 */
export type TitleVerdict =
  | "usable"
  | "missing"
  | "reference-only"
  | "boilerplate"
  | "document-labels"
  | "truncated"
  | "generic"

const BOILERPLATE = [
  /^tender notice\b/i,
  /^(?:t\s?1\.1\b|section \d+:)/i,
  /^bid number\b/i,
  /^south african national roads agency soc limited bid number\b/i,
  /\bregister on the national treasury central supplier database\b/i,
]

// A title glued to the labels of its document links ("…ComplexTender Volume").
const DOCUMENT_LABELS = /[a-z)](?:Tender Volumes?|Annexures?|Addendum)\b/

export function judgeTenderTitle(displayTitle: string | null | undefined, reference: string | null | undefined): TitleVerdict {
  const title = displayTitle?.replace(/\s+/g, " ").trim()
  if (!title) return "missing"
  if (reference && title.toLowerCase() === reference.replace(/\s+/g, " ").trim().toLowerCase()) return "reference-only"
  if (BOILERPLATE.some((pattern) => pattern.test(title))) return "boilerplate"
  if (DOCUMENT_LABELS.test(title)) return "document-labels"
  if (/(?:\.{3}|…)$/.test(title)) return "truncated"
  // Says what kind of work, but not what or where.
  if (isGenericWording(title)) return "generic"
  return "usable"
}
