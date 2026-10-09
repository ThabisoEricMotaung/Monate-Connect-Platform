/**
 * Pure parsers for the City of Ekurhuleni open-tenders pages
 * (https://www.ekurhuleni.gov.za/for-my-business/tenders/open-tenders/).
 *
 * The listing is an Elementor posts grid. Each <article> has:
 *   - an <h3> link whose text is the BID NUMBER (e.g. "PS-WS 15-2026") and
 *     whose href is the tender's detail page;
 *   - an excerpt "Bid Number: ... Description: ..." that WordPress cuts off
 *     mid-sentence, so it must not be used as the title;
 *   - the POST date (DD/MM/YYYY, day first), not the closing date.
 *
 * The detail page holds a label/value table (th/td) with "Bid Number",
 * "Description" (the full official description of the work), "Bid closing
 * date" (e.g. "05 NOVEMBER 2026 at 10:00am"), "Information session", contact
 * details and submission instructions.
 */

import { decodeEntities } from "./sanralParser"
import { parseSouthAfricanNumericDate, parseSouthAfricanTenderDate } from "./southAfricanTenderDate"

export interface EkurhuleniListingItem {
  /** Heading link text: the bid number as published. */
  bidNumber: string
  detailUrl: string
  /** Post date from the grid (00:00 SAST). This is NOT the closing date. */
  postedDate: Date | null
}

export interface EkurhuleniDetail {
  bidNumber: string | null
  /** Full official description of the work. */
  description: string | null
  closingDate: Date | null
  closingDateText: string | null
  informationSession: string | null
  /** Post's publication timestamp (<time datetime>, carries its own offset). */
  publishedDate: Date | null
  /** Every label/value row of the detail table, labels without trailing colon. */
  fields: Record<string, string>
}

function collapse(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function htmlText(html: string): string {
  return collapse(decodeEntities(html.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]*>/g, " ")))
}

export function parseEkurhuleniListing(html: string, pageUrl: string): EkurhuleniListingItem[] {
  const result: EkurhuleniListingItem[] = []
  for (const article of html.match(/<article[^>]*elementor-post[^>]*>[\s\S]*?<\/article>/gi) ?? []) {
    const link = article.match(/<h3[^>]*>[\s\S]*?<a[^>]*?href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i)
    if (!link) continue
    const bidNumber = htmlText(link[2])
    if (!bidNumber) continue
    const posted = article.match(/elementor-post-date[^>]*>\s*([^<]+)</i)
    result.push({
      bidNumber,
      detailUrl: new URL(decodeEntities(link[1]), pageUrl).toString(),
      postedDate: parseSouthAfricanNumericDate(posted?.[1]),
    })
  }
  return result
}

export function parseEkurhuleniDetail(html: string): EkurhuleniDetail {
  const start = html.indexOf('class="single-entry-summary"')
  const summary = start >= 0 ? html.slice(start) : html
  const tableEnd = summary.search(/<\/table>/i)
  const table = tableEnd >= 0 ? summary.slice(0, tableEnd) : summary

  const fields: Record<string, string> = {}
  for (const row of table.matchAll(/<tr[^>]*>\s*<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/gi)) {
    const label = htmlText(row[1]).replace(/\s*:\s*$/, "")
    if (label && !(label in fields)) fields[label] = htmlText(row[2])
  }
  const field = (name: string): string | null => {
    const key = Object.keys(fields).find((label) => label.toLowerCase() === name)
    return key && fields[key] ? fields[key] : null
  }

  const closingDateText = field("bid closing date") ?? field("closing date")
  const published = html.match(/<time[^>]*class="entry-date"[^>]*datetime="([^"]+)"/i)
  const publishedDate = published ? new Date(published[1]) : null

  return {
    bidNumber: field("bid number"),
    description: field("description"),
    closingDate: parseSouthAfricanTenderDate(closingDateText)?.date ?? null,
    closingDateText,
    informationSession: field("information session"),
    publishedDate: publishedDate && !isNaN(publishedDate.getTime()) ? publishedDate : null,
    fields,
  }
}
