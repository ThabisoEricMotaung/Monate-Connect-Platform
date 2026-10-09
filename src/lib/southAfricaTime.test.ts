import { describe, expect, it } from "vitest"
import {
  formatSouthAfricaIso,
  isDateOnlyDeadline,
  southAfricaDateOnlyDeadline,
  southAfricaOffsetMs,
  southAfricaWallTimeToUtc,
} from "./southAfricaTime"

describe("southAfricaWallTimeToUtc", () => {
  it("returns the UTC instant for a published South African time", () => {
    expect(southAfricaWallTimeToUtc(2026, 10, 22, 12, 0)?.toISOString()).toBe("2026-10-22T10:00:00.000Z")
    expect(southAfricaWallTimeToUtc(2026, 11, 6, 11, 0)?.toISOString()).toBe("2026-11-06T09:00:00.000Z")
    // Midnight SAST is the previous UTC day.
    expect(southAfricaWallTimeToUtc(2026, 10, 6)?.toISOString()).toBe("2026-10-05T22:00:00.000Z")
  })

  it("agrees with the IANA zone when formatted back", () => {
    const instant = southAfricaWallTimeToUtc(2026, 10, 30, 18, 0)!
    const shown = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Johannesburg",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(instant)
    expect(shown).toBe("18:00")
  })

  it("rejects impossible dates instead of rolling them over", () => {
    expect(southAfricaWallTimeToUtc(2026, 2, 31, 12, 0)).toBeNull()
    expect(southAfricaWallTimeToUtc(2026, 13, 1, 12, 0)).toBeNull()
  })

  it("uses a +02:00 offset (South Africa has no daylight saving)", () => {
    expect(southAfricaOffsetMs(new Date("2026-01-15T12:00:00Z"))).toBe(2 * 60 * 60 * 1000)
    expect(southAfricaOffsetMs(new Date("2026-07-15T12:00:00Z"))).toBe(2 * 60 * 60 * 1000)
  })
})

describe("date-only deadlines", () => {
  it("are the last millisecond of the South African day, and recognisable", () => {
    const deadline = southAfricaDateOnlyDeadline(2026, 11, 6)!
    expect(deadline.toISOString()).toBe("2026-11-06T21:59:59.999Z")
    expect(isDateOnlyDeadline(deadline)).toBe(true)
    expect(isDateOnlyDeadline(new Date(deadline.toISOString()))).toBe(true)
  })

  it("are not confused with published times", () => {
    expect(isDateOnlyDeadline(southAfricaWallTimeToUtc(2026, 11, 6, 23, 59)!)).toBe(false)
    expect(isDateOnlyDeadline(southAfricaWallTimeToUtc(2026, 11, 6, 12, 0)!)).toBe(false)
    expect(southAfricaDateOnlyDeadline(2026, 2, 30)).toBeNull()
  })
})

describe("formatSouthAfricaIso", () => {
  it("shows the wall time with its explicit offset", () => {
    expect(formatSouthAfricaIso(new Date("2026-10-22T10:00:00Z"))).toBe("2026-10-22T12:00:00+02:00")
    // The stored SANRAL value that was written as 12:00 UTC is 14:00 in South Africa.
    expect(formatSouthAfricaIso(new Date("2026-10-22T12:00:00+00:00"))).toBe("2026-10-22T14:00:00+02:00")
  })
})
