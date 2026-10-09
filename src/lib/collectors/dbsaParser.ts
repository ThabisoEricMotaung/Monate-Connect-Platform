/**
 * Pure parser for the DBSA procurement page (https://www.dbsa.org/procurement).
 *
 * The page has one table ("OPEN RFP's and RFR's" | "Date Published" |
 * "Closing Date and Time"). The first cell of each row holds, separated by
 * <br>:
 *   1. <strong>RFP 181/2026:</strong> Official title
 *   2. Document links: <a>Tender Volume</a>, <a>Annexure A</a>, <a>Addendum 01</a> ...
 *      (sometimes followed by plain-text notes such as "(Upd)")
 *   3. Briefing lines: <strong>Compulsory Tender Briefing:</strong> 02 October 2026 @ 13H00 via Microsoft Teams
 *
 * There are no detail pages (the links are PDFs/ZIPs) and no scope text beyond
 * the title. Stripping the tags of the whole cell without separators glues the
 * title to the first link label ("...DLAB SitesTender Volume, Annexure A, ..."),
 * so this parser splits the cell on <br> before extracting text.
 */

import { southAfricaDateOnlyDeadline, southAfricaWallTimeToUtc } from "@/lib/southAfricaTime"
import { decodeEntities } from "./sanralParser"

export const DBSA_ORIGIN = "https://www.dbsa.org"
export const DBSA_LISTING_URL = `${DBSA_ORIGIN}/procurement`

export interface DbsaDocument {
  label: string
  url: string
}

export interface DbsaListingRow {
  /** e.g. "RFP 181/2026" */
  reference: string
  /** e.g. "RFP", "RFR", "RFI", "RFQ" */
  tenderType: string
  /** Official title only: no reference, document labels or briefing details. */
  title: string
  /** Linked tender documents, in page order. */
  documents: DbsaDocument[]
  /** Briefing lines as published, or null when the row has none. */
  briefing: string | null
  /** Date published, midnight South African time. */
  publishedDate: Date | null
  /** Closing date and time, South African time (date-only deadline when no time is given). */
  closingDate: Date | null
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"]

const REFERENCE = /^(RFP|RFR|RFI|RFQ|RFB|RFT|EOI)\s*([A-Z0-9][A-Z0-9./-]*)\s*:\s*/i

function collapse(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function htmlText(html: string): string {
  return collapse(decodeEntities(html.replace(/<[^>]*>/g, " ")))
}

function levenshtein(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const temp = prev[j]
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1))
      diag = temp
    }
  }
  return prev[b.length]
}

/**
 * Resolves a month name. Accepts full names and 3-letter abbreviations, and
 * tolerates a single-character typo in a full name (the page has published
 * "23 Ocober 2026") as long as exactly one month is that close.
 */
function monthIndex(name: string): number {
  const lower = name.toLowerCase()
  const exact = MONTHS.findIndex((month) => month === lower || (lower.length === 3 && month.startsWith(lower)))
  if (exact >= 0) return exact
  if (lower.length < 4) return -1
  const near = MONTHS.map((month, i) => ({ i, d: levenshtein(lower, month) })).filter((m) => m.d <= 1)
  return near.length === 1 ? near[0].i : -1
}

/**
 * Parses "16 October 2026 @ 23H55" / "23 October 2026 at 23H55" / "2 October 2026"
 * as South African time. Without a time, a deadline becomes a date-only
 * deadline (southAfricaDateOnlyDeadline) and other dates midnight SAST.
 * Impossible dates (e.g. 31 September) give null rather than rolling over.
 */
export function parseDbsaDate(value: string, dateOnly: "deadline" | "startOfDay" = "deadline"): Date | null {
  const match = collapse(value).match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})(?:\s*(?:@|at)\s*(\d{1,2})\s*[Hh:.]\s*(\d{2}))?/)
  if (!match) return null
  const [, day, monthName, year, hour, minute] = match
  const month = monthIndex(monthName)
  if (month < 0) return null
  if (hour) return southAfricaWallTimeToUtc(Number(year), month + 1, Number(day), Number(hour), Number(minute))
  return dateOnly === "deadline"
    ? southAfricaDateOnlyDeadline(Number(year), month + 1, Number(day))
    : southAfricaWallTimeToUtc(Number(year), month + 1, Number(day))
}

function parseFirstCell(cellHtml: string, origin: string): Omit<DbsaListingRow, "publishedDate" | "closingDate"> | null {
  const segments = cellHtml.split(/<br\s*\/?>|<\/p>/i)

  // The title segment ends at the first <br>; guard against a missing <br> by
  // also stopping at the first link.
  const head = segments[0].split(/<a\b/i)[0]
  const headText = htmlText(head)
  const ref = headText.match(REFERENCE)
  if (!ref) return null

  const title = collapse(headText.slice(ref[0].length))
  if (!title) return null

  const documents: DbsaDocument[] = []
  for (const link of cellHtml.matchAll(/<a\b[^>]*\bhref\s*=\s*"([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const label = htmlText(link[2])
    if (!label) continue
    let url: string
    try {
      url = new URL(decodeEntities(link[1]), origin).toString()
    } catch {
      continue
    }
    documents.push({ label, url })
  }

  const briefingLines = segments
    .slice(1)
    .filter((segment) => !/<a\b/i.test(segment))
    .map(htmlText)
    .filter((line) => /briefing/i.test(line))

  return {
    reference: `${ref[1].toUpperCase()} ${ref[2]}`,
    tenderType: ref[1].toUpperCase(),
    title,
    documents,
    briefing: briefingLines.length ? briefingLines.join("; ") : null,
  }
}

/**
 * Parses the open-tenders table. Rows are returned in page order (newest
 * first); when the page lists a reference more than once, the first (most
 * recently updated) row is kept.
 */
export function parseDbsaListing(html: string, origin: string = DBSA_ORIGIN): DbsaListingRow[] {
  const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) ?? []
  const seen = new Set<string>()
  const result: DbsaListingRow[] = []

  for (const row of rows) {
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1])
    if (cells.length < 3) continue

    const first = parseFirstCell(cells[0], origin)
    if (!first || seen.has(first.reference)) continue
    seen.add(first.reference)

    result.push({
      ...first,
      publishedDate: parseDbsaDate(htmlText(cells[1]), "startOfDay"),
      closingDate: parseDbsaDate(htmlText(cells[2])),
    })
  }
  return result
}
