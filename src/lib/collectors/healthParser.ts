/**
 * Pure parser for the National Department of Health tenders page
 * (https://www.health.gov.za/tenders/).
 *
 * The page is a set of Elementor tabs, each holding a TablePress table. The
 * tender tabs ("NDoH Tenders", "Pharmaceutical Tenders") have the header
 * "Tender No | Description | Bulletin Date | Closing Date | Comments"; the
 * contract tabs use different headers and are ignored.
 *
 * The Description cell starts with the official description of the work,
 * usually as a link to the advert/RFQ PDF (NDoH tab) or as plain text
 * (Pharmaceutical tab). After a blank line (<br><br>) or a list it continues
 * with briefing-session details, NB notes and document links, which are not
 * part of the title.
 */

import { decodeEntities } from "./sanralParser"
import { parseSouthAfricanTenderDate } from "./southAfricanTenderDate"

export interface HealthTenderRow {
  /** "Tender No" cell as published, e.g. "NDOH 24-2026/2027", "HP10-2028BIO". */
  reference: string
  /** Official description of the work, entities decoded, whitespace collapsed. */
  title: string
  /** Absolute URL of the advert/RFQ document linked from the description, if any. */
  documentUrl: string | null
  /** Bulletin (publication) date, 00:00 SAST. */
  bulletinDate: Date | null
  /** Closing date/time (SAST), or null when the cell has no recognisable date. */
  closingDate: Date | null
  /** The closing date cell text as published, for diagnostics. */
  closingDateText: string
  /** TablePress table id the row came from, e.g. "tablepress-61". */
  tableId: string
}

function collapse(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function htmlText(html: string): string {
  return collapse(decodeEntities(html.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]*>/g, " ")))
}

/** Text of the description cell before its first blank line or list. */
function titleFromDescriptionCell(html: string): { title: string; documentUrl: string | null } {
  const leadingLink = html.match(/^\s*<a\s[^>]*?href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i)
  if (leadingLink) {
    return { title: htmlText(leadingLink[2]), documentUrl: leadingLink[1] || null }
  }
  const end = html.search(/<br\s*\/?>\s*<br\s*\/?>|<ol[\s>]|<ul[\s>]|<a\s/i)
  return { title: htmlText(end >= 0 ? html.slice(0, end) : html), documentUrl: null }
}

function headerIndex(headers: string[], name: string): number {
  return headers.findIndex((header) => header.toLowerCase() === name)
}

export function parseHealthTenders(html: string, pageUrl: string): HealthTenderRow[] {
  const result: HealthTenderRow[] = []

  for (const table of html.matchAll(/<table\s+id="(tablepress-\d+)"[^>]*>([\s\S]*?)<\/table>/gi)) {
    const [, tableId, body] = table
    const thead = body.match(/<thead[^>]*>([\s\S]*?)<\/thead>/i)
    if (!thead) continue
    const headers = [...thead[1].matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map((cell) => htmlText(cell[1]))

    const refCol = headerIndex(headers, "tender no")
    const descCol = headerIndex(headers, "description")
    const bulletinCol = headerIndex(headers, "bulletin date")
    const closingCol = headerIndex(headers, "closing date")
    if (refCol < 0 || descCol < 0 || closingCol < 0) continue

    const tbody = body.match(/<tbody[^>]*>([\s\S]*)<\/tbody>/i)?.[1] ?? ""
    for (const row of tbody.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
      // TablePress marks each cell with its 1-based column number.
      const cells = new Map<number, string>()
      for (const cell of row[1].matchAll(/<td\s+class="column-(\d+)"[^>]*>([\s\S]*?)<\/td>/gi)) {
        cells.set(Number(cell[1]) - 1, cell[2])
      }

      const reference = htmlText(cells.get(refCol) ?? "")
      const { title, documentUrl } = titleFromDescriptionCell(cells.get(descCol) ?? "")
      if (!reference || !title) continue

      const closingDateText = htmlText(cells.get(closingCol) ?? "")
      result.push({
        reference,
        title,
        documentUrl: documentUrl ? new URL(decodeEntities(documentUrl), pageUrl).toString() : null,
        bulletinDate: bulletinCol >= 0 ? parseSouthAfricanTenderDate(htmlText(cells.get(bulletinCol) ?? ""), "startOfDay")?.date ?? null : null,
        closingDate: parseSouthAfricanTenderDate(closingDateText)?.date ?? null,
        closingDateText,
        tableId,
      })
    }
  }

  return result
}
