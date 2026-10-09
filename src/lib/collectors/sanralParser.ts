/**
 * Pure parsers for SANRAL's tender pages (https://www.nra.co.za).
 *
 * The open-tenders listing gives, per row: reference (linking to a detail
 * page), project type, province, a cut-off preview of the notice, a contact and
 * the closing date/time. The preview is NOT a title: it is the first ~100
 * characters of the detail page's body, which is often boilerplate
 * ("SOUTH AFRICAN NATIONAL ROADS AGENCY SOC LIMITED BID NUMBER: ...") or the
 * labels of the page's always-present, usually empty award-results table
 * ("Awarded To: BBBEE Points: ...").
 *
 * The detail page carries the official title in the main column's <h3>, the
 * award-results table (label/value rows), and the tender notice text
 * ("T1.1 TENDER NOTICE AND INVITATION TO TENDER" ... "TENDER DOCUMENTS").
 */

import { southAfricaWallTimeToUtc } from "@/lib/southAfricaTime"

export interface SanralListingRow {
  reference: string
  detailUrl: string
  projectType: string
  province: string
  /** Closing date and time as published (SAST), or null if unparseable. */
  closingDate: Date | null
}

export interface SanralDetail {
  /** The <h3> heading exactly as published (entities decoded, whitespace collapsed). */
  officialTitle: string | null
  /** officialTitle with the trailing tender reference removed (exact match only). */
  title: string | null
  /** Tender notice body describing the work, or null when the page has none. */
  scope: string | null
  /** Award-results table: label -> value (empty string when unfilled). */
  awardFields: Record<string, string>
  /** True only when the page's "Awarded To" field actually names someone. */
  hasAwardResult: boolean
  /** "Tender No:" shown on the page, used to confirm the page matches the record. */
  tenderNumber: string | null
  /** "Create Date" from the page's document panel. */
  createdDate: Date | null
  /** Closing date/time shown under the page's reference heading (SAST). */
  closingDate: Date | null
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", copy: "©", reg: "®",
  deg: "°", ndash: "–", mdash: "—", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“",
  middot: "·", plusmn: "±", hellip: "…", bull: "•",
}

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code = entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : match
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match
  })
}

function collapse(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function cellText(html: string): string {
  // Decode twice: the listing double-encodes (&amp;nbsp;).
  return collapse(decodeEntities(decodeEntities(html.replace(/<[^>]*>/g, " "))))
}

// SANRAL sometimes puts a whole notice in one table cell; such a cell is far
// longer than any data-table cell (contract descriptions run to ~400 chars).
const LONG_CELL_CHARS = 1000

/**
 * Converts an HTML fragment to text lines. A table row becomes one line with
 * its cells joined by " — ", unless a cell holds a whole notice, in which case
 * the notice's paragraphs are kept as separate lines.
 */
function htmlToLines(html: string): string[] {
  const flattened = html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<tr[^>]*>([\s\S]*?)<\/tr>/gi, (row, inner: string) => {
      const cells = inner.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi) ?? []
      const texts = cells.map(cellText)
      if (texts.some((text) => text.length > LONG_CELL_CHARS)) return row
      return `\n${texts.filter(Boolean).join(" — ")}\n`
    })
  const text = flattened
    .replace(/<\/(td|th)>/gi, "\u0001")
    .replace(/<(br|\/p|\/div|\/h\d|\/li|\/tr)[^>]*>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
  return decodeEntities(decodeEntities(text))
    .split("\n")
    .map((line) => line.split("\u0001").map(collapse).filter(Boolean).join(" — "))
    .filter(Boolean)
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Parses "YYYY/MM/DD HH:MM" as published South African time; returns the UTC instant. */
export function parseSanralClosingDate(value: string): Date | null {
  const match = value.match(/(\d{4})\/(\d{2})\/(\d{2})\s+(\d{1,2}):(\d{2})/)
  if (!match) return null
  const [, y, m, d, hh, mm] = match.map(Number)
  return southAfricaWallTimeToUtc(y, m, d, hh, mm)
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"]

/** Parses "October 06, 2026" as midnight South African time. */
function parseSanralLongDate(value: string): Date | null {
  const match = value.trim().match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/)
  if (!match) return null
  const month = MONTHS.indexOf(match[1].toLowerCase())
  if (month < 0) return null
  return southAfricaWallTimeToUtc(Number(match[3]), month + 1, Number(match[2]))
}

export function parseSanralListing(html: string, origin: string): SanralListingRow[] {
  const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) ?? []
  const result: SanralListingRow[] = []

  for (const row of rows) {
    const link = row.match(/<a\s+href="(\/sanral-tenders\/detail\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/i)
    if (!link) continue
    const cells = (row.match(/<td[^>]*>[\s\S]*?<\/td>/gi) ?? []).map(cellText)
    const reference = cellText(link[2])
    if (!reference || cells.length < 6) continue

    result.push({
      reference,
      detailUrl: new URL(link[1], origin).toString(),
      projectType: cells[1],
      province: cells[2],
      closingDate: parseSanralClosingDate(cells[5]),
    })
  }
  return result
}

export function parseSanralDetail(html: string, reference: string): SanralDetail {
  const mainStart = html.indexOf('mdc-layout-grid__cell--span-8">')
  const main = mainStart >= 0 ? html.slice(mainStart) : html
  const endCandidates = ["Attached Files", "Download Documents"].map((marker) => main.indexOf(marker)).filter((i) => i > 0)
  const body = endCandidates.length ? main.slice(0, Math.min(...endCandidates)) : main

  const heading = body.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)
  const officialTitle = heading ? cellText(heading[1]) || null : null

  const ref = collapse(reference)
  const title = officialTitle
    ? collapse(officialTitle.replace(new RegExp(`\\s*${escapeRegExp(ref).replace(/ /g, "\\s+")}\\s*$`, "i"), "")) || null
    : null

  const awardFields: Record<string, string> = {}
  for (const match of body.matchAll(/<td[^>]*>\s*<strong>\s*([^<]+?)\s*:?\s*<\/strong>[\s\S]*?<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/gi)) {
    const label = collapse(decodeEntities(match[1])).replace(/:$/, "")
    if (label.toLowerCase() === "tender notice") continue
    awardFields[label] = cellText(match[2])
  }

  const tenderNumberMatch = html.match(/Tender No:\s*<\/span>\s*<span[^>]*>([^<]+)</i)
  const createDateMatch = html.match(/Create Date<\/th>\s*<td[^>]*>([^<]+)<\/td>/i)
  const closingMatch = html.match(/<h2>[^<]*<\/h2>\s*<p>\s*(\d{4}\/\d{2}\/\d{2}\s+\d{1,2}:\d{2})\s*<\/p>/i)

  return {
    officialTitle,
    title,
    scope: extractScope(htmlToLines(body.slice(heading ? (heading.index ?? 0) + heading[0].length : 0))),
    awardFields,
    hasAwardResult: Boolean(awardFields["Awarded To"]),
    tenderNumber: tenderNumberMatch ? collapse(decodeEntities(tenderNumberMatch[1])) : null,
    createdDate: createDateMatch ? parseSanralLongDate(decodeEntities(createDateMatch[1])) : null,
    closingDate: closingMatch ? parseSanralClosingDate(closingMatch[1]) : null,
  }
}

const NOTICE_HEADING = /TENDER NOTICE AND INVITATION TO TENDER/i
const NOTICE_END = /^(?:TENDER DOCUMENTS|TENDERER'?S MEETING|CLOSING DATE)\b/i
const INVITATION_SENTENCE = /^the south african national roads agency soc (?:limited|ltd)\b.*\binvites tenders?\b/i
const CONTRACT_TABLE_HEADER = /^contract number\b.*\bproject description\b/i

/** The notice text between its heading and "TENDER DOCUMENTS", minus the invitation sentence. */
function extractScope(lines: string[]): string | null {
  const start = lines.findIndex((line) => NOTICE_HEADING.test(line))
  if (start < 0) return null

  const scope: string[] = []
  for (const line of lines.slice(start + 1)) {
    if (NOTICE_END.test(line)) break
    if (INVITATION_SENTENCE.test(line) || CONTRACT_TABLE_HEADER.test(line)) continue
    scope.push(line)
  }
  return scope.join("\n") || null
}
