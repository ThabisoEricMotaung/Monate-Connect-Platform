import {
  normalizeOpportunityTitleCase,
  resolveExternalBuyerName,
  resolveExternalOpportunityTitle,
} from "@/lib/externalOpportunity"

export type OcdsValue = { amount?: unknown; currency?: string | null }
export type OcdsDocument = {
  id?: string | null
  title?: string | null
  description?: string | null
  url?: string | null
  documentType?: string | null
}
export type OcdsBuyer = { id?: string | null; name?: string | null }
export type OcdsTender = {
  id?: string | null
  title?: string | null
  status?: string | null
  description?: string | null
  province?: string | null
  deliveryLocation?: string | null
  mainProcurementCategory?: string | null
  classification?: { description?: string | null } | null
  value?: OcdsValue | null
  tenderPeriod?: { startDate?: string | null; endDate?: string | null } | null
  items?: Array<{ description?: string | null; quantity?: number | null; unit?: string | null }> | null
  documents?: OcdsDocument[] | null
  procuringEntity?: OcdsBuyer | null
}
export type OcdsRelease = {
  ocid?: string | null
  id?: string | null
  date?: string | null
  tender?: OcdsTender | null
  buyer?: OcdsBuyer | null
}
export type OcdsReleasePackage = {
  releases?: OcdsRelease[] | null
  links?: { next?: string | null; prev?: string | null } | null
}

export type ExtractedDocument = { title: string | null; url: string }

export type RfqUpsertPayload = {
  external_ocid: string
  external_reference: string
  title: string
  description: string
  category: string
  industry: string
  province: string | null
  closing_date: string
  deadline: string
  published_date: string | null
  status: string
  is_external_opportunity: true
  is_public: boolean
  curation_status: "not_required" | "pending" | "approved" | "quarantined"
  curation_reason: string | null
  source_name: string
  original_source_url: string | null
  estimated_value_min: number | null
  estimated_value_max: number | null
  budget: string | null
  buyer_org: string | null
}

export function normalizeAmount(value: unknown): number | null {
  const raw = typeof value === "object" && value !== null && "amount" in value
    ? (value as { amount?: unknown }).amount
    : value
  if (raw === null || raw === undefined || raw === "") return null
  const normalized = typeof raw === "string" ? raw.replace(/[^\d.-]/g, "") : raw
  const amount = typeof normalized === "number" ? normalized : Number(normalized)
  return Number.isFinite(amount) && amount > 0 ? amount : null
}

export function extractAllDocuments(release: OcdsRelease | null | undefined): ExtractedDocument[] {
  const seen = new Set<string>()
  const documents: ExtractedDocument[] = []
  for (const document of release?.tender?.documents ?? []) {
    const url = document.url?.trim()
    if (!url || seen.has(url)) continue
    seen.add(url)
    documents.push({ title: document.title?.trim() || document.description?.trim() || null, url })
  }
  return documents
}

function validDate(value: string | null | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function isOpenTender(tender: OcdsTender, now: Date): boolean {
  const status = tender.status?.trim().toLowerCase()
  if (status && !["active", "planning", "planned"].includes(status)) return false
  const closingDate = validDate(tender.tenderPeriod?.endDate)
  return Boolean(closingDate && new Date(closingDate).getTime() > now.getTime())
}

// Listing titles are cut at a word boundary only after the work description
// has been extracted, so the scope is never lost to a mid-sentence cut.
export const ETENDERS_TITLE_MAX_LENGTH = 300
// A first sentence shorter than this is usually a fragment ("Bid No. 4."), so
// the whole first paragraph is used instead.
const MIN_SENTENCE_TITLE_LENGTH = 40
const NON_TERMINAL_ABBREVIATIONS = new Set([
  "co", "dr", "etc", "inc", "ltd", "mr", "mrs", "ms", "no", "nr", "pty", "ref", "st", "vol", "vs",
])

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function stripLeadingReference(text: string, reference: string): string {
  const ref = reference.replace(/\s+/g, " ").trim()
  if (!ref) return text
  const pattern = new RegExp(`^${escapeRegExp(ref).replace(/ /g, "\\s+")}(?:\\s*[-–:]\\s*|\\s+)`, "i")
  return text.replace(pattern, "").trim() || text
}

function firstSentence(paragraph: string): string {
  const boundary = /\.\s+(?=[A-Z])/g
  for (let match = boundary.exec(paragraph); match; match = boundary.exec(paragraph)) {
    const before = paragraph.slice(0, match.index)
    const lastWord = before.match(/[A-Za-z]+$/)?.[0]?.toLowerCase()
    // Initials ("S.A.") and abbreviations ("Pty. Ltd") do not end a sentence.
    if (lastWord && (lastWord.length === 1 || NON_TERMINAL_ABBREVIATIONS.has(lastWord))) continue
    if (before.length >= MIN_SENTENCE_TITLE_LENGTH) return before
    break
  }
  return paragraph.replace(/\.$/, "")
}

function truncateAtWord(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  const shortened = value.slice(0, maxLength + 1)
  const lastSpace = shortened.lastIndexOf(" ")
  return `${shortened.slice(0, lastSpace > maxLength * 0.6 ? lastSpace : maxLength).trim()}…`
}

// Title-casing an ALL-CAPS notice lowers short bracketed acronyms ("(AIS)" ->
// "(Ais)"). Casing only changes letters in place, so they can be restored by
// position from the source text.
function titleCaseKeepingBracketedAcronyms(value: string): string {
  const normalized = normalizeOpportunityTitleCase(value)
  if (normalized.length !== value.length) return normalized
  let result = normalized
  for (const match of value.matchAll(/\(([A-Z]{2,5})\)/g)) {
    const start = match.index! + 1
    result = `${result.slice(0, start)}${match[1]}${result.slice(start + match[1].length)}`
  }
  return result
}

/**
 * eTenders publishes the bid number as `tender.title` and the work as
 * `tender.description`, which often repeats the bid number and adds detail
 * after the first sentence. The title is the first sentence of the work
 * description without the bid number; the reference is kept separately.
 */
export function resolveETendersTitle(tender: OcdsTender | null | undefined): string | null {
  const reference = tender?.title?.replace(/\s+/g, " ").trim() ?? ""
  const source = tender?.description?.trim()
    || tender?.items?.find((item) => item.description?.trim())?.description?.trim()
    || ""
  const paragraph = source
    .replace(/\r/g, "")
    .split(/\n\s*\n/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .find(Boolean)

  if (!paragraph) return resolveExternalOpportunityTitle(reference, null)

  const work = firstSentence(stripLeadingReference(paragraph, reference))
  return titleCaseKeepingBracketedAcronyms(truncateAtWord(work, ETENDERS_TITLE_MAX_LENGTH))
}

function buildDescription(tender: OcdsTender, documents: ExtractedDocument[]): string {
  const parts: string[] = []
  if (tender.description?.trim()) parts.push(tender.description.trim())
  const items = (tender.items ?? []).filter((item) => item.description?.trim())
  if (items.length) {
    parts.push("", "Items:")
    for (const item of items) {
      const quantity = item.quantity ? `${item.quantity}${item.unit ? ` ${item.unit}` : ""}` : null
      parts.push(`- ${item.description!.trim()}${quantity ? ` (${quantity})` : ""}`)
    }
  }
  if (documents.length) {
    parts.push("", "Tender documents:")
    for (const [index, document] of documents.entries()) {
      parts.push(`- ${document.title || `Document ${index + 1}`}: ${document.url}`)
    }
  }
  parts.push(
    "",
    "Sourced from eTenders.gov.za (National Treasury Transparency Portal). This listing is provided for discovery purposes; refer to the original source for the authoritative tender documents and submission process.",
  )
  return parts.join("\n")
}

export function toRfqPayload(
  release: OcdsRelease | null | undefined,
  now: Date = new Date(),
): RfqUpsertPayload | null {
  const tender = release?.tender
  const ocid = release?.ocid?.trim()
  const externalReference = tender?.title?.trim()
  const title = resolveETendersTitle(tender)
  const closingDate = validDate(tender?.tenderPeriod?.endDate)
  if (!release || !tender || !ocid || !externalReference || !title || !closingDate || !isOpenTender(tender, now)) {
    return null
  }

  const category = tender.classification?.description?.trim()
    || tender.mainProcurementCategory?.trim()
    || "General"
  const amount = normalizeAmount(tender.value)
  const documents = extractAllDocuments(release)

  return {
    external_ocid: ocid,
    external_reference: externalReference,
    title,
    description: buildDescription(tender, documents),
    category,
    industry: category,
    province: tender.province?.trim() || tender.deliveryLocation?.trim() || null,
    closing_date: closingDate,
    deadline: closingDate,
    published_date: validDate(release.date),
    status: "draft",
    is_external_opportunity: true,
    is_public: false,
    curation_status: "pending",
    curation_reason: null,
    source_name: "eTenders.gov.za",
    original_source_url: documents[0]?.url ?? null,
    estimated_value_min: amount,
    estimated_value_max: amount,
    budget: amount === null ? null : String(amount),
    buyer_org: resolveExternalBuyerName(release.buyer?.name, tender.procuringEntity?.name),
  }
}
