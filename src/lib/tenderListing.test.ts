import React, { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { TenderCard } from "@/components/TenderCard"
import { isDateOnlyDeadline, southAfricaDateOnlyDeadline } from "./southAfricaTime"
import { toTenderListing, type TenderListingRecord } from "./tenderListing"

// vitest compiles JSX with the classic runtime (React.createElement) here.
Object.assign(globalThis, { React })

const record = (closing_date: string): TenderListingRecord => ({
  id: 1,
  title: "Supply and delivery of bituminous products",
  buyer_org: "City of Johannesburg",
  buyer_name: null,
  buyer_normalized: null,
  external_reference: "COJ/JTC02/26-27",
  external_ocid: "COJ/JTC02/26-27",
  closing_date,
  published_date: null,
  source_name: "City of Johannesburg",
  estimated_budget: null,
  description: null,
  created_at: "2026-10-08T06:44:22.857118+00:00",
  status: "active",
  province: "Gauteng",
  category: null,
})

describe("date-only deadline round trip", () => {
  it("survives database storage, API serialisation and rendering", () => {
    // What a collector writes for "13 October 2099" (no time published)…
    const written = southAfricaDateOnlyDeadline(2099, 10, 13)!.toISOString()
    expect(written).toBe("2099-10-13T21:59:59.999Z")
    // …and how PostgREST returns a timestamptz (offset form, trailing zeros trimmed).
    const stored = "2099-10-13T21:59:59.999+00:00"
    expect(new Date(stored).getTime()).toBe(new Date(written).getTime())
    expect(isDateOnlyDeadline(new Date(stored))).toBe(true)

    // /api/tenders passes closing_date through toTenderListing and NextResponse.json.
    const overTheWire = JSON.parse(JSON.stringify(toTenderListing(record(stored))))
    expect(overTheWire.closing_date).toBe(stored)

    const html = renderToStaticMarkup(createElement(TenderCard, { tender: overTheWire }))
    expect(html).toContain("time not provided")
    expect(html).toMatch(/Closing 1?3 Oct 2099/)
    expect(html).not.toMatch(/23:59/)
  })

  it("still shows a published time as a time", () => {
    const html = renderToStaticMarkup(createElement(TenderCard, { tender: toTenderListing(record("2099-10-13T08:00:00+00:00")) }))
    expect(html).toMatch(/10:00 SAST/)
    expect(html).not.toContain("time not provided")
  })
})
