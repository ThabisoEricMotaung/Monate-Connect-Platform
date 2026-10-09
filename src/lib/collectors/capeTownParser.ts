/**
 * Pure parser for the City of Cape Town tender portal listing
 * (https://web1.capetown.gov.za/web1/tenderportal/Tender).
 *
 * Every open tender is in the page's HTML (the table is paginated client-side
 * by DataTables). Each `<tr class="gridDetails">` row has:
 *   0 tender number, 1 description, 2 directorate, 3 department,
 *   4 closing date (hidden), 5 closing date + time, 6 posted date (hidden),
 *   7 posted date + time, 8 link to the details page (requires login).
 *
 * The description cell shows the text cut off at ~100 characters with "..."
 * but carries the full text in the `<pre>` element's `title` attribute, e.g.
 *   <pre class="descriptionColumn ..." title="...security alarm systems, equipment and ancillaries.">
 *     ...security alarm systems, equipment and ancillari...</pre>
 * That full description is the tender's official description of the work and
 * is the only descriptive text the public listing has. The details page
 * redirects anonymous visitors to the log-in form.
 *
 * Times on the portal are South African time (SAST, UTC+02:00, no DST).
 */

import { southAfricaDateOnlyDeadline, southAfricaWallTimeToUtc } from "@/lib/southAfricaTime"
import { decodeEntities } from "./sanralParser"

export interface CapeTownListingRow {
  reference: string
  /** Full description of the work, from the description cell's title attribute. */
  title: string
  /** True when the only text available was the cut-off visible text ("..."). */
  titleTruncatedAtSource: boolean
  directorate: string
  department: string
  closingDate: Date | null
  /**
   * The "Posted Date" column. It is NOT the first publication date: it moves
   * forward when a notice is added (tenders we first saw on 2026-08-26 show
   * posted dates in October), so it must not be stored as published_date.
   */
  postedDate: Date | null
  /** The row's details page (login required), or null if the row has no link. */
  detailUrl: string | null
}

function collapse(value: string): string {
  return value.replace(/[\s​]+/g, " ").trim()
}

function cellText(html: string | undefined): string {
  return collapse(decodeEntities((html ?? "").replace(/<[^>]*>/g, " ")))
}

/**
 * Parses the portal's date/time cells as South African time. The portal prints
 * a 24-hour clock followed by an AM/PM designator ("10:00 AM", "13:04 PM",
 * "16:00 PM"), so an hour of 13-23 is taken as-is; an hour of 1-12 is read as
 * a 12-hour clock. A bare "YYYY-MM-DD" is the start of that day, or a
 * date-only deadline (southAfricaDateOnlyDeadline) when `dateOnly` is "deadline".
 */
export function parseCapeTownDateTime(value: string, dateOnly: "deadline" | "startOfDay" = "startOfDay"): Date | null {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{1,2}):(\d{2})(?::\d{2})?\s*([AP]M)?)?$/i)
  if (!match) return null
  const [, y, m, d, hh, mm, meridiem] = match
  if (!hh) {
    return dateOnly === "deadline"
      ? southAfricaDateOnlyDeadline(Number(y), Number(m), Number(d))
      : southAfricaWallTimeToUtc(Number(y), Number(m), Number(d))
  }
  let hours = parseInt(hh, 10)
  if (hours > 23) return null
  if (meridiem && hours >= 1 && hours <= 12) {
    hours = (hours % 12) + (meridiem.toUpperCase() === "PM" ? 12 : 0)
  }
  return southAfricaWallTimeToUtc(Number(y), Number(m), Number(d), hours, Number(mm))
}

const TRUNCATION_MARK = /(?:\.\.\.|…)$/
// Some descriptions are entered with a field label in front of the text.
const LABEL_PREFIX = /^tender description\s*:\s*/i

function stripLabel(text: string): string {
  const stripped = text.replace(LABEL_PREFIX, "")
  if (stripped === text || !stripped) return text
  return stripped.charAt(0).toUpperCase() + stripped.slice(1)
}

export function parseCapeTownListing(html: string, origin: string): CapeTownListingRow[] {
  const rows = html.match(/<tr\s+class="gridDetails"[^>]*>[\s\S]*?<\/tr>/gi) ?? []
  const result: CapeTownListingRow[] = []

  for (const row of rows) {
    const cells = row.match(/<td[^>]*>[\s\S]*?<\/td>/gi) ?? []
    if (cells.length < 6) continue

    const reference = cellText(cells[0])
    const titleAttr = (cells[1] ?? "").match(/<pre[^>]*\stitle="([^"]*)"/i)
    const fullText = titleAttr ? collapse(decodeEntities(titleAttr[1])) : ""
    const visibleText = cellText(cells[1])
    const title = stripLabel(fullText || visibleText)
    if (!reference || !title) continue

    // Columns 4 and 6 are date-only duplicates of 5 and 7; prefer the timed ones.
    const closingDate = parseCapeTownDateTime(cellText(cells[5])) ?? parseCapeTownDateTime(cellText(cells[4]), "deadline")
    const postedDate = cells.length > 7
      ? parseCapeTownDateTime(cellText(cells[7])) ?? parseCapeTownDateTime(cellText(cells[6]))
      : null
    const detail = row.match(/<a[^>]*\shref="([^"]*\/Tender\/Details\/\d+)"/i)

    result.push({
      reference,
      title,
      titleTruncatedAtSource: !fullText && TRUNCATION_MARK.test(visibleText),
      directorate: cellText(cells[2]),
      department: cellText(cells[3]),
      closingDate,
      postedDate,
      detailUrl: detail ? new URL(decodeEntities(detail[1]), origin).toString() : null,
    })
  }
  return result
}

/**
 * The portal lists some tenders more than once under the same tender number
 * (separate postings of the same notice). Collapses them to one row per
 * reference, keeping the most recently posted row.
 */
export function dedupeCapeTownRows(rows: CapeTownListingRow[]): CapeTownListingRow[] {
  const byReference = new Map<string, CapeTownListingRow[]>()
  for (const row of rows) {
    byReference.set(row.reference, [...(byReference.get(row.reference) ?? []), row])
  }
  return Array.from(byReference.values()).map((group) => {
    if (group.length === 1) return group[0]
    const time = (date: Date | null) => date?.getTime() ?? Number.NEGATIVE_INFINITY
    return group.reduce((a, b) => (time(b.postedDate) > time(a.postedDate) ? b : a))
  })
}
