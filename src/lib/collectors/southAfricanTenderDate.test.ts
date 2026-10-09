import { describe, expect, it } from "vitest"
import { parseSouthAfricanNumericDate, parseSouthAfricanTenderDate } from "./southAfricanTenderDate"

const iso = (text: string, dateOnly?: "endOfDay" | "startOfDay") =>
  parseSouthAfricanTenderDate(text, dateOnly)?.date.toISOString() ?? null

describe("parseSouthAfricanTenderDate", () => {
  it("parses the time formats the sources publish, as SAST (UTC+2)", () => {
    expect(iso("16 October 2026 @ 11:00AM")).toBe("2026-10-16T09:00:00.000Z")
    expect(iso("28 September 2026 @ 11h00")).toBe("2026-09-28T09:00:00.000Z")
    expect(iso("18 June 2026 @11:00")).toBe("2026-06-18T09:00:00.000Z")
    expect(iso("05 NOVEMBER 2026 at 10:00am")).toBe("2026-11-05T08:00:00.000Z")
    expect(iso("13 May 2026 at 12h00pm")).toBe("2026-05-13T10:00:00.000Z")
    expect(iso("30 January 2026 @ 16:00 pm")).toBe("2026-01-30T14:00:00.000Z")
    expect(iso("2 November 2026 @ 2:30 pm")).toBe("2026-11-02T12:30:00.000Z")
    expect(iso("1 Sept 2026 at 09:00")).toBe("2026-09-01T07:00:00.000Z")
  })

  it("treats a date-only value as end of day by default, start of day on request", () => {
    expect(parseSouthAfricanTenderDate("09 October 2026 ")?.hasTime).toBe(false)
    expect(iso("09 October 2026 ")).toBe("2026-10-09T21:59:59.999Z")
    expect(iso("7 October 2026", "startOfDay")).toBe("2026-10-06T22:00:00.000Z")
  })

  it("rejects non-dates", () => {
    expect(iso("")).toBeNull()
    expect(iso("TBC")).toBeNull()
    expect(iso("31 February 2026")).toBeNull()
    expect(iso("5 Mayday 2026")).toBeNull()
  })
})

describe("parseSouthAfricanNumericDate", () => {
  it("reads DD/MM/YYYY day-first as 00:00 SAST", () => {
    expect(parseSouthAfricanNumericDate(" 01/10/2026 ")?.toISOString()).toBe("2026-09-30T22:00:00.000Z")
    expect(parseSouthAfricanNumericDate("15/09/2026")?.toISOString()).toBe("2026-09-14T22:00:00.000Z")
    expect(parseSouthAfricanNumericDate("31/02/2026")).toBeNull()
  })
})
