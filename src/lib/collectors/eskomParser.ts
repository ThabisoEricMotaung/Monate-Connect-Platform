/**
 * Pure parsers for the Eskom Tender Bulletin (https://tenderbulletin.eskom.co.za).
 *
 * The bulletin is a client-rendered SPA: the HTML is an empty <div id="root">
 * shell, so there is nothing to scrape from the page itself. The SPA loads
 * every published tender from one public JSON endpoint:
 *
 *   GET /webapi/api/Lookup/GetTender?TENDER_ID=   (empty id = all tenders)
 *
 * Each record carries REFERENCE (the "Enquiry Number" shown as the card
 * heading), HEADER_DESC (shown as the card body and as "Description" on the
 * detail page), SCOPE_DETAILS ("Scope details" on the detail page; usually an
 * exact copy of HEADER_DESC), CLOSING_DATE / PUBLISHEDDATE as South African
 * wall-clock times without an offset, the division (DESCRIPTION) and Province.
 *
 * The feed also carries post-tender notices (cancellations, regret letters,
 * award notices, bidders lists, validity extensions) that are not open
 * opportunities; classifyEskomNotice identifies them.
 */

import { southAfricaWallTimeToUtc } from "@/lib/southAfricaTime"

export const ESKOM_ORIGIN = "https://tenderbulletin.eskom.co.za"
export const ESKOM_TENDERS_API = `${ESKOM_ORIGIN}/webapi/api/Lookup/GetTender?TENDER_ID=`

/** One record of the GetTender endpoint (only the fields used here). */
export interface EskomApiTender {
  TENDER_ID?: number | null
  REFERENCE?: string | null
  HEADER_DESC?: string | null
  SCOPE_DETAILS?: string | null
  DESCRIPTION?: string | null
  CLOSING_DATE?: string | null
  PUBLISHEDDATE?: string | null
  Province?: string | null
  PUBLISH?: string | null
}

export type EskomNoticeType = "cancellation" | "regret" | "award" | "bidders-list" | "validity-extension" | "withdrawal"

export interface EskomTender {
  tenderId: number
  reference: string
  /** Official description of the work, as published (reference prefix/suffix removed). */
  title: string
  /** Further scope text that the title does not already contain, or null. */
  description: string | null
  closingDate: Date | null
  publishedDate: Date | null
  /** Eskom division, e.g. "GENERATION", "DISTRIBUTION". */
  division: string | null
  /** South African province name, or null when the feed gives none (e.g. "National"). */
  province: string | null
  detailUrl: string
  /** Set when the record is a notice about an earlier tender, not an open opportunity. */
  noticeType: EskomNoticeType | null
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Splits free text into paragraphs; lines inside a paragraph are joined with spaces. */
function paragraphs(value: string | null | undefined): string[] {
  if (!value) return []
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\t ]/g, " ")
    .split(/\n[ ]*\n/)
    .map((block) =>
      block
        .split("\n")
        .map((line) => line.replace(/ +/g, " ").trim())
        .filter(Boolean)
        .join(" ")
    )
    .filter(Boolean)
}

/** Lower-case letters and digits only; used to compare texts that differ in spacing/punctuation. */
function fingerprint(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function words(value: string): string[] {
  return value.toLowerCase().match(/[a-z0-9]+/g) ?? []
}

/** Share of a paragraph's words already present for it to count as a repeat. */
const REPEAT_RATIO = 0.9

/** Removes the tender reference when the text starts or ends with it. Nothing else is removed. */
export function stripEskomReference(text: string, reference: string): string {
  const ref = escapeRegExp(reference.trim())
  let result = text.trim()
  if (ref) {
    result = result.replace(new RegExp(`^(?:tender\\s+no\\.?\\s*)?${ref}(?![A-Za-z0-9])\\s*[-–:.]?\\s*`, "i"), "")
    result = result.replace(new RegExp(`\\s*[-–:]?\\s*${ref}\\s*$`, "i"), "")
  }
  // "Tender No. E1252GXPOU: ..." where the record's reference is a suffixed variant (E1252GXPOU2).
  const labelled = result.match(/^tender\s+no\.?\s*([A-Za-z0-9/-]+)\s*[:\-–]\s*/i)
  if (labelled && reference.trim().toUpperCase().startsWith(labelled[1].toUpperCase())) {
    result = result.slice(labelled[0].length)
  }
  return result.trim()
}

/** A paragraph that reads as a heading over an item list ("VARIOUS METAL ITEMS"), not a description. */
function isListHeading(lead: string, rest: string[]): boolean {
  return rest.length > 0 && lead.length < 40 && !/[a-z]/.test(lead)
}

const NOTICE_TEXT: [RegExp, EskomNoticeType][] = [
  [/\b(?:cancel\w*|cacell\w*)/i, "cancellation"],
  [/\bregre[tr]\w*/i, "regret"],
  // "award" alone also appears in genuine scopes ("... award recommendations").
  [/^\W*(?:tender\s+)?award\b|\bnotifi?cation (?:of|to) award|\bpublication of award|\baward notice\b|\bawarded to\b|\baward\W*$/i, "award"],
  [/\b(?:names? of (?:the )?bidders|bidders'?\s+names?|bidders?\s*list|list of bidders|publication of bidders)\b|^\s*bidders?\b|\bbidders\s*$/i, "bidders-list"],
  [/\b(?:tender\s+)?validity\b/i, "validity-extension"],
  [/\bwithdraw\w*/i, "withdrawal"],
]

const NOTICE_REFERENCE: [RegExp, EskomNoticeType][] = [
  [/cancel|cacell/i, "cancellation"],
  [/regret/i, "regret"],
  [/award/i, "award"],
  [/bidder|publish|names$/i, "bidders-list"],
  [/validity/i, "validity-extension"],
  [/withdraw/i, "withdrawal"],
]

/**
 * Identifies post-tender notices. The bulletin marks them either in the text
 * ("Regret Letter - ...", "... Cancellation", "Publication of Names of Bidders")
 * or only in the reference ("AwardE2227GXPOUR", "E1859GXMPTUTpublish").
 */
export function classifyEskomNotice(reference: string, headerDesc: string, scopeDetails = ""): EskomNoticeType | null {
  for (const text of [headerDesc, scopeDetails]) {
    for (const [pattern, type] of NOTICE_TEXT) {
      if (pattern.test(text)) return type
    }
  }
  for (const [pattern, type] of NOTICE_REFERENCE) {
    if (pattern.test(reference)) return type
  }
  return null
}

/** Parses the API's offset-less "YYYY-MM-DDTHH:MM:SS[.fff]" as South African wall time. */
export function parseEskomDateTime(value: string | null | undefined): Date | null {
  const match = value?.trim().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?$/)
  if (!match) return null
  const [y, m, d, hh, mm] = match.slice(1, 6).map(Number)
  const instant = southAfricaWallTimeToUtc(y, m, d, hh, mm)
  if (!instant) return null
  const seconds = Number(match[6] ?? 0)
  const millis = match[7] ? Number(match[7].slice(0, 3).padEnd(3, "0")) : 0
  return new Date(instant.getTime() + seconds * 1000 + millis)
}

const PROVINCES: Record<string, string> = {
  "eastern cape": "Eastern Cape",
  "free state": "Free State",
  gauteng: "Gauteng",
  "kwa-zulu natal": "KwaZulu-Natal",
  "kwazulu-natal": "KwaZulu-Natal",
  "kwazulu natal": "KwaZulu-Natal",
  limpopo: "Limpopo",
  mpumalanga: "Mpumalanga",
  "north west": "North West",
  "northern cape": "Northern Cape",
  "western cape": "Western Cape",
}

/** Maps the feed's province to a province name; "National", "Northern", "Not Selected" give null. */
export function normalizeEskomProvince(value: string | null | undefined): string | null {
  return value ? (PROVINCES[value.trim().toLowerCase()] ?? null) : null
}

export function parseEskomTender(record: EskomApiTender, origin = ESKOM_ORIGIN): EskomTender | null {
  const tenderId = record.TENDER_ID
  const reference = record.REFERENCE?.trim()
  if (typeof tenderId !== "number" || !reference) return null

  const strip = (blocks: string[]) => blocks.map((block, i) => (i === 0 ? stripEskomReference(block, reference) : block)).filter(Boolean)
  const header = strip(paragraphs(record.HEADER_DESC))
  const scope = strip(paragraphs(record.SCOPE_DETAILS))
  if (header.length === 0 && scope.length === 0) return null

  // HEADER_DESC is the bulletin's own description and normally the title. When
  // it is only a heading over an item list (Koeberg consumables) or a bullet
  // list, SCOPE_DETAILS's opening sentence describes the work instead.
  const headerIsList = header.length > 0 && (isListHeading(header[0], header.slice(1)) || /•/.test(header[0]))
  const scopeLeadUsable = scope.length > 0 && scope[0].length >= 30 && !/•/.test(scope[0])
  const useScope = header.length === 0 || (headerIsList && scopeLeadUsable)
  const [titleBlocks, otherBlocks] = useScope ? [scope, header] : [header, scope]

  let title = titleBlocks[0]
  // HEADER_DESC is sometimes cut off ("... AT LETHABO POWER") while the other
  // field finishes the same sentence; use the complete wording.
  const otherLead = otherBlocks[0]
  if (otherLead) {
    const titlePrint = fingerprint(title)
    const leadPrint = fingerprint(otherLead)
    if (leadPrint.length > titlePrint.length && leadPrint.startsWith(titlePrint) && otherLead.length - title.length <= 40) {
      title = otherLead
    }
  }

  // Description: remaining paragraphs that say something the title does not.
  // SCOPE_DETAILS is usually a copy of HEADER_DESC, sometimes cut off or with a
  // one-word edit ("of the boiler", "Divisioin"); such copies are dropped.
  const kept: string[] = []
  const seen = new Set(words(title))
  for (const block of [...titleBlocks.slice(1), ...otherBlocks]) {
    const blockWords = words(block)
    const repeated = blockWords.filter((word) => seen.has(word)).length
    if (blockWords.length === 0 || repeated / blockWords.length >= REPEAT_RATIO) continue
    kept.push(block)
    blockWords.forEach((word) => seen.add(word))
  }

  return {
    tenderId,
    reference,
    title,
    description: kept.join("\n\n") || null,
    closingDate: parseEskomDateTime(record.CLOSING_DATE),
    publishedDate: parseEskomDateTime(record.PUBLISHEDDATE),
    division: record.DESCRIPTION?.trim() || null,
    province: normalizeEskomProvince(record.Province),
    detailUrl: `${origin}/tender/${tenderId}`,
    noticeType: classifyEskomNotice(reference, record.HEADER_DESC ?? "", record.SCOPE_DETAILS ?? ""),
  }
}

/** Parses the GetTender response; records that are not published or lack an id/reference/text are dropped. */
export function parseEskomTenders(payload: unknown, origin = ESKOM_ORIGIN): EskomTender[] {
  if (!Array.isArray(payload)) throw new Error("Eskom GetTender response is not an array")
  const result: EskomTender[] = []
  for (const record of payload as EskomApiTender[]) {
    if (!record || typeof record !== "object") continue
    if (record.PUBLISH && record.PUBLISH.trim().toUpperCase() !== "Y") continue
    const tender = parseEskomTender(record, origin)
    if (tender) result.push(tender)
  }
  return result
}
