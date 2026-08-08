export type ExternalDocument = {
  title?: string | null
  description?: string | null
  url?: string | null
}

export type ExternalNoticeInput = {
  reference?: string | null
  description?: string | null
  documents?: ExternalDocument[] | null
}

export type TerminalNoticeReason =
  | "regret_letter"
  | "award_notice"
  | "unsuccessful_bidder_letter"
  | "tender_cancellation"

const SOURCE_BOILERPLATE =
  "Sourced from eTenders.gov.za (National Treasury Transparency Portal). This listing is provided for discovery purposes; refer to the original source for the authoritative tender documents and submission process."

const TERMINAL_NOTICE_RULES: ReadonlyArray<{
  reason: TerminalNoticeReason
  pattern: RegExp
}> = [
  { reason: "regret_letter", pattern: /\bregret\s+letter\b/i },
  {
    reason: "award_notice",
    pattern:
      /\b(?:notification\s+of\s+award|notice\s+of\s+award|award\s+letter|letter\s+of\s+award|awarded\s+contract)\b/i,
  },
  {
    reason: "unsuccessful_bidder_letter",
    pattern:
      /\b(?:unsuccessful\s+(?:bidder|bidders|supplier|suppliers)[^\n]{0,80}\bletter|letter[^\n]{0,80}\bunsuccessful\s+(?:bidder|bidders|supplier|suppliers)|unsuccessful\s+letter)\b/i,
  },
  {
    reason: "tender_cancellation",
    pattern:
      /\b(?:tender\s+cancell?ation|cancellation\s+of\s+(?:the\s+)?tender|notice\s+of\s+tender\s+cancell?ation|cancelled\s+tender|canceled\s+tender|tender\s+(?:has\s+been\s+)?cancelled|tender\s+(?:has\s+been\s+)?canceled)\b/i,
  },
]

function decodeSourceText(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "))
  } catch {
    return value.replace(/%20/gi, " ").replace(/\+/g, " ")
  }
}

function searchableNoticeText(input: ExternalNoticeInput): string {
  const documentText = (input.documents ?? []).flatMap((document) => [
    document.title,
    document.description,
    document.url ? decodeSourceText(document.url) : null,
  ])

  return [input.reference, input.description, ...documentText]
    .filter((value): value is string => Boolean(value?.trim()))
    .join("\n")
}

export function classifyTerminalNotice(
  input: ExternalNoticeInput,
): TerminalNoticeReason | null {
  const searchable = searchableNoticeText(input)
  return TERMINAL_NOTICE_RULES.find((rule) => rule.pattern.test(searchable))?.reason ?? null
}

function truncateAtWord(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  const shortened = value.slice(0, maxLength + 1)
  const lastSpace = shortened.lastIndexOf(" ")
  return `${shortened.slice(0, lastSpace > maxLength * 0.6 ? lastSpace : maxLength).trim()}…`
}

export function resolveExternalOpportunityTitle(
  reference: string | null | undefined,
  description: string | null | undefined,
): string | null {
  const cleanDescription = description
    ?.replace(SOURCE_BOILERPLATE, "")
    .replace(/\r/g, "")
    .trim()

  const firstParagraph = cleanDescription
    ?.split(/\n\s*\n/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .find(Boolean)

  if (firstParagraph) return truncateAtWord(firstParagraph, 180)

  const cleanReference = reference?.replace(/\s+/g, " ").trim()
  return cleanReference || null
}

export function resolveExternalBuyerName(
  buyerName: string | null | undefined,
  procuringEntityName: string | null | undefined,
): string | null {
  return buyerName?.trim() || procuringEntityName?.trim() || null
}
