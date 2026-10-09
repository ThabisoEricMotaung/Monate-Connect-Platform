/**
 * Conversions between South African wall-clock times (as tender sources
 * publish them) and UTC instants (as the database stores them).
 *
 * Offsets come from the IANA zone rather than a hard-coded "+02:00", so the
 * conversion stays correct regardless of the server's own time zone.
 *
 * CONVENTION — deadlines published without a time ("13 October 2026"):
 *   rfqs.closing_date has no "time unknown" flag, so such a deadline is
 *   stored as the last millisecond of that South African day,
 *   23:59:59.999 SAST (= 21:59:59.999Z), via southAfricaDateOnlyDeadline.
 *   - closing_date is timestamptz (microsecond precision); PostgREST returns
 *     it as "2026-10-13T21:59:59.999+00:00", which parses back exactly.
 *   - isDateOnlyDeadline recognises the value; TenderCard then shows
 *     "Closing 13 Oct 2026 · time not provided" instead of a time.
 *   - Listings filter closing_date > now and the status upkeep job
 *     (tenderStatusReconciliation.ts) expires at closing_date, so the tender
 *     stays open through the whole day.
 *   - No source publishes deadlines to the millisecond, so a real published
 *     time cannot be mistaken for the sentinel (23:59 published is 23:59:00.000).
 *   Producers: collectors' date parsers (cojParser, dbsaParser, tctaParser,
 *   capeTownParser, southAfricanTenderDate). Tests: southAfricaTime.test.ts,
 *   tenderListing.test.ts (storage → API → card round trip).
 */

export const SOUTH_AFRICA_TIME_ZONE = "Africa/Johannesburg"

const partsFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: SOUTH_AFRICA_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
})

interface WallTime {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

function wallTimeOf(instant: Date): WallTime {
  const parts = Object.fromEntries(partsFormat.formatToParts(instant).map((part) => [part.type, part.value]))
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  }
}

/** Milliseconds by which South African wall time is ahead of UTC at `instant`. */
export function southAfricaOffsetMs(instant: Date): number {
  const wall = wallTimeOf(instant)
  const wallAsUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second)
  return wallAsUtc - Math.floor(instant.getTime() / 1000) * 1000
}

/**
 * The UTC instant at which South African clocks show the given date and time,
 * or null if the components do not form a real date (e.g. 31 February).
 */
export function southAfricaWallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
): Date | null {
  const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute)
  if (!Number.isFinite(wallAsUtc)) return null

  let instant = new Date(wallAsUtc - southAfricaOffsetMs(new Date(wallAsUtc)))
  // Re-derive with the offset at the candidate instant (matters only near an offset change).
  instant = new Date(wallAsUtc - southAfricaOffsetMs(instant))

  const check = wallTimeOf(instant)
  const matches = check.year === year && check.month === month && check.day === day && check.hour === hour && check.minute === minute
  return matches ? instant : null
}

/**
 * Deadline for a source that publishes a closing DATE but no time: the last
 * millisecond of that South African day (23:59:59.999 SAST). Listings stay
 * open through the date, and isDateOnlyDeadline recognises the value so the
 * time can be shown as "not provided" instead of as an official time. (No
 * source publishes deadlines to the millisecond.)
 */
export function southAfricaDateOnlyDeadline(year: number, month: number, day: number): Date | null {
  const lastMinute = southAfricaWallTimeToUtc(year, month, day, 23, 59)
  return lastMinute ? new Date(lastMinute.getTime() + 59_999) : null
}

/** True for deadlines produced by southAfricaDateOnlyDeadline. */
export function isDateOnlyDeadline(instant: Date): boolean {
  if (isNaN(instant.getTime())) return false
  const wall = new Date(instant.getTime() + southAfricaOffsetMs(instant))
  return wall.getUTCHours() === 23 && wall.getUTCMinutes() === 59 && wall.getUTCSeconds() === 59 && wall.getUTCMilliseconds() === 999
}

/** ISO 8601 with the South African offset, e.g. "2026-10-22T12:00:00+02:00". */
export function formatSouthAfricaIso(instant: Date): string {
  const wall = wallTimeOf(instant)
  const offsetMinutes = Math.round(southAfricaOffsetMs(instant) / 60000)
  const sign = offsetMinutes >= 0 ? "+" : "-"
  const abs = Math.abs(offsetMinutes)
  const pad = (value: number, length = 2) => String(value).padStart(length, "0")
  return `${pad(wall.year, 4)}-${pad(wall.month)}-${pad(wall.day)}T${pad(wall.hour)}:${pad(wall.minute)}:${pad(wall.second)}${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
}
