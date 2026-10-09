import React, { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { TenderCard } from "./TenderCard"

// vitest compiles JSX with the classic runtime (React.createElement) here.
Object.assign(globalThis, { React })

function render(tender: Parameters<typeof TenderCard>[0]["tender"]): string {
  return renderToStaticMarkup(createElement(TenderCard, { tender }))
}

describe("TenderCard deadline", () => {
  it("shows the published South African closing time for a stored UTC instant", () => {
    // SANRAL publishes "2026/11/06 11:00" (SAST); the parser stores 09:00 UTC.
    const html = render({
      id: 1,
      title: "Stored title",
      display_title: "Readable title",
      closing_date: "2099-11-06T09:00:00.000Z",
    })
    expect(html).toContain('dateTime="2099-11-06T09:00:00.000Z"')
    expect(html).toMatch(/6 Nov 2099,? 11:00 SAST/)
  })
})

describe("TenderCard date-only deadline", () => {
  it("shows the date with 'time not provided' instead of the stored end-of-day value", () => {
    // 6 Nov 2099 23:59:59.999 SAST = southAfricaDateOnlyDeadline(2099, 11, 6)
    const html = render({ id: 3, title: "t", display_title: "Readable title", closing_date: "2099-11-06T21:59:59.999Z" })
    expect(html).toMatch(/Closing 0?6 Nov 2099/)
    expect(html).toContain("time not provided")
    expect(html).not.toContain("23:59")
    expect(html).toContain('dateTime="2099-11-06"')
  })
})

describe("TenderCard scope summary", () => {
  it("labels one row of a multi-contract notice and adds the requirements note", () => {
    const html = render({
      id: 4,
      title: "t",
      display_title: "Routine road maintenance",
      description: "ROUTINE ROAD MAINTENANCE OF NATIONAL ROUTE R521 — Capricorn District Municipality — 60 Months",
      description_is_partial: true,
      has_further_requirements: true,
    })
    expect(html).toContain("One of multiple contracts: </span>ROUTINE ROAD MAINTENANCE OF NATIONAL ROUTE R521")
    expect(html).toContain("See details for eligibility and submission requirements")
  })

  it("shows neither label nor note when they do not apply", () => {
    const html = render({ id: 5, title: "t", display_title: "Readable", description: "Supply of 40 streetlights in Ward 12." })
    expect(html).not.toContain("One of multiple contracts")
    expect(html).not.toContain("See details for eligibility")
  })
})

describe("TenderCard heading", () => {
  it("shows a clear placeholder instead of a reference when no work title exists", () => {
    const html = render({ id: 2, title: "NRA 2026/0021 (B) - Tender Notice: ...", display_title: null, reference_number: "NRA 2026/0021 (B)" })
    expect(html).toContain("Tender title not published in source listing")
    expect(html).toContain("Ref: <span")
  })
})
