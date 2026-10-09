/**
 * Parses the long-form dates South African government sites publish for tender
 * closing/briefing/bulletin dates, e.g.
 *   "16 October 2026 @ 11:00AM", "28 September 2026 @ 11h00",
 *   "05 NOVEMBER 2026 at 10:00am", "13 May 2026 at 12h00pm", "09 October 2026".
 *
 * The times are South African wall-clock times (Africa/Johannesburg), so they
 * are converted with southAfricaWallTimeToUtc rather than `new Date(string)`,
 * which would use the server's own zone (UTC in production).
 */

import { southAfricaDateOnlyDeadline, southAfricaWallTimeToUtc } from "@/lib/southAfricaTime"

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
]

const LONG_DATE = /(\d{1,2})\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})(?:\s*(?:@|at|,)?\s*(\d{1,2})\s*[:h.]\s*(\d{2})\s*(am|pm)?)?/i

export interface ParsedTenderDate {
  /**
   * The UTC instant. A date without a time becomes a date-only deadline
   * (southAfricaDateOnlyDeadline: open through that South African day, shown
   * as "time not provided"), or 00:00 SAST when `dateOnly` is "startOfDay"
   * (for publication dates).
   */
  date: Date
  /** False when the source gave a date only. */
  hasTime: boolean
}

function monthIndex(name: string): number {
  // Accept the full name or an abbreviation of it ("Sept", "Oct"), not other words.
  const lower = name.toLowerCase()
  return MONTHS.findIndex((month) => month.startsWith(lower))
}

/** Finds the first "D Month YYYY [@|at HH:MM|HHhMM [am|pm]]" in `text`. */
export function parseSouthAfricanTenderDate(
  text: string | null | undefined,
  dateOnly: "endOfDay" | "startOfDay" = "endOfDay",
): ParsedTenderDate | null {
  if (!text) return null
  const match = text.match(LONG_DATE)
  if (!match) return null

  const month = monthIndex(match[2])
  if (month < 0) return null
  const year = Number(match[3])
  const day = Number(match[1])

  if (match[4] === undefined) {
    const date = dateOnly === "endOfDay"
      ? southAfricaDateOnlyDeadline(year, month + 1, day)
      : southAfricaWallTimeToUtc(year, month + 1, day)
    return date ? { date, hasTime: false } : null
  }

  let hour = Number(match[4])
  const minute = Number(match[5])
  const meridiem = match[6]?.toLowerCase()
  // "16:00 pm" and "12h00pm" occur; a pm suffix only shifts hours 1-11.
  if (meridiem === "pm" && hour >= 1 && hour < 12) hour += 12
  if (meridiem === "am" && hour === 12) hour = 0
  if (hour > 23 || minute > 59) return null

  const date = southAfricaWallTimeToUtc(year, month + 1, day, hour, minute)
  return date ? { date, hasTime: true } : null
}

/** Parses "DD/MM/YYYY" (day first) as midnight South African time. */
export function parseSouthAfricanNumericDate(text: string | null | undefined): Date | null {
  const match = text?.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (!match) return null
  return southAfricaWallTimeToUtc(Number(match[3]), Number(match[2]), Number(match[1]))
}
