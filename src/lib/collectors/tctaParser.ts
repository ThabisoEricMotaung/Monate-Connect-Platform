/**
 * Pure parser for TCTA's tenders page (https://www.tcta.co.za/tenders/).
 *
 * The page is server-rendered WordPress. Inside <div class="active-tenders row">
 * each tender is a card:
 *
 *   <div id="7888" class="column-12 first">
 *     <h5 class="vac_title ...">APPOINTMENT OF A SERVICE PROVIDER ...</h5>   (official title)
 *     <h6 class="vac_title ...">Tender N<sup>o</sup> 038/2026/PMID/ECO/RFB</h6>
 *     <p class="text-dark vac_desc"> The RFB can be downloaded from ... </p>   (often empty)
 *     <span class="vac_city">4 November 2026 at 14:00:00 </span>               (closing, SAST)
 *     <a class="btn btn-download" href="/wp-content/uploads/...pdf">Brief Document</a> ...
 *
 * The h6 sometimes carries a label before the number ("RFQ NO: 042/2026/...")
 * or stray text after it ("082/2026/CSO/STAND/RFQ APPOINTMENT").
 */

import { southAfricaDateOnlyDeadline, southAfricaWallTimeToUtc } from "@/lib/southAfricaTime"

export interface TctaDocument {
  label: string
  url: string
}

export interface TctaTender {
  /** The card's id attribute (WordPress post id). */
  cardId: string
  reference: string
  /** The card's <h5> exactly as published (entities decoded, whitespace collapsed). */
  title: string
  /** The card's description paragraph, or null when empty or only the eTenders download notice. */
  description: string | null
  closingDate: Date | null
  documents: TctaDocument[]
  /** The tenders page, anchored at the card. */
  sourceUrl: string
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—",
  rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", hellip: "…", bull: "•",
}

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code = entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : match
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match
  })
}

/** Text of an HTML fragment: tags removed (joined, so "N<sup>o</sup>" reads "No"), entities decoded, whitespace collapsed. */
function textOf(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim()
}

const REFERENCE_NUMBER = /\b\d{1,4}\/\d{4}\/[A-Za-z0-9&/-]+/

/** Extracts the tender number from the h6 text ("Tender No RFQ NO: 042/2026/IA/PROBITY/RFQ"). */
export function parseTctaReference(text: string): string | null {
  const withoutLabel = text.replace(/^tender\s+n(?:o|º|°|umber)\.?\s*:?\s*/i, "").trim()
  const number = withoutLabel.match(REFERENCE_NUMBER)
  if (number) return number[0]
  const unlabelled = withoutLabel.replace(/^(?:RF[BQIPT]|bid)\s*(?:no\.?)?\s*:?\s*/i, "").trim()
  return unlabelled || null
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"]

/**
 * Parses "4 November 2026 at 14:00:00" as South African time. A date without a
 * time becomes a date-only deadline (southAfricaDateOnlyDeadline).
 */
export function parseTctaClosingDate(text: string): Date | null {
  const match = text.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})(?:\s+at\s+(\d{1,2}):(\d{2}))?/)
  if (!match) return null
  const month = MONTHS.indexOf(match[2].toLowerCase())
  if (month < 0) return null
  if (match[4] === undefined) return southAfricaDateOnlyDeadline(Number(match[3]), month + 1, Number(match[1]))
  return southAfricaWallTimeToUtc(Number(match[3]), month + 1, Number(match[1]), Number(match[4]), Number(match[5]))
}

/** The standard notice on most cards; it says where to get the documents, not what the tender is for. */
const DOWNLOAD_NOTICE = /^the\s+(?:rf[a-z]|bid|tender)(?:\s+document)?\s+can\s+be\s+downloaded\s+from\b.*?\borgan\s+of\s+state\.?$/i

export function parseTctaTenders(html: string, pageUrl: string): TctaTender[] {
  const starts = [...html.matchAll(/<div\s+id="([^"]+)"\s+class="column-12\b[^"]*">/gi)]
  const result: TctaTender[] = []

  starts.forEach((start, i) => {
    const from = start.index ?? 0
    const to = i + 1 < starts.length ? (starts[i + 1].index ?? html.length) : html.length
    const block = html.slice(from, to)
    // Each card ends with <hr/>; this keeps the last card from running into the footer.
    const end = block.search(/<hr\b/i)
    const card = end > 0 ? block.slice(0, end) : block

    const heading = card.match(/<h5[^>]*>([\s\S]*?)<\/h5>/i)
    const number = card.match(/<h6[^>]*>([\s\S]*?)<\/h6>/i)
    const title = heading ? textOf(heading[1]) : ""
    const reference = number ? parseTctaReference(textOf(number[1])) : null
    if (!title || !reference) return

    const paragraph = card.match(/<p[^>]*\bvac_desc\b[^>]*>([\s\S]*?)<\/p>/i)
    const descriptionText = paragraph ? textOf(paragraph[1]) : ""
    const closing = card.match(/<span[^>]*\bvac_city\b[^>]*>([\s\S]*?)<\/span>/i)

    const documents: TctaDocument[] = []
    for (const link of card.matchAll(/<a[^>]*\bbtn-download\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>|<a[^>]*href="([^"]+)"[^>]*\bbtn-download\b[^>]*>([\s\S]*?)<\/a>/gi)) {
      const href = link[1] ?? link[3]
      const label = textOf(link[2] ?? link[4] ?? "")
      if (href) documents.push({ label, url: new URL(decodeEntities(href), pageUrl).toString() })
    }

    const anchored = new URL(pageUrl)
    anchored.hash = start[1]

    result.push({
      cardId: start[1],
      reference,
      title,
      description: descriptionText && !DOWNLOAD_NOTICE.test(descriptionText) ? descriptionText : null,
      closingDate: closing ? parseTctaClosingDate(textOf(closing[1])) : null,
      documents,
      sourceUrl: anchored.toString(),
    })
  })

  return result
}

/** Category from the reference's department and procurement-type segments ("038/2026/PMID/ECO/RFB"). */
export function tctaCategory(reference: string): string {
  const segments = reference.split("/")
  if (segments.length < 4) return "Procurement"
  const department = segments[2].toUpperCase()
  const type = segments[segments.length - 1].toUpperCase()

  if (department.includes("HR")) return "Human Resources"
  if (department.includes("EWSS")) return "Water Supply"
  if (department.includes("CSO")) return "Communications"
  if (department.includes("IA")) return "Internal Audit"
  if (type === "RFB") return "Request for Bid"
  if (type === "RFQ") return "Request for Quote"
  if (type === "RFI") return "Request for Information"
  if (type === "RFP") return "Request for Proposal"
  return "Procurement"
}
