import { describe, expect, it } from "vitest"
import { extractAllDocuments, normalizeAmount, toRfqPayload, type OcdsRelease } from "@/lib/etendersTransform"

const NOW = new Date("2026-08-13T10:00:00Z")
const release = (overrides: Partial<OcdsRelease> = {}): OcdsRelease => ({
  ocid: "ocds-test-1",
  id: "release-1",
  date: "2026-08-12T08:00:00Z",
  buyer: { name: "National Department" },
  tender: {
    title: "RFQ-123",
    status: "active",
    description: "Supply services",
    province: "Gauteng",
    mainProcurementCategory: "services",
    value: { amount: 125000, currency: "ZAR" },
    tenderPeriod: { endDate: "2026-09-01T12:00:00Z" },
    documents: [
      { title: "Specification", url: "https://example.test/spec.pdf" },
      { title: "Pricing", url: "https://example.test/pricing.pdf" },
    ],
  },
  ...overrides,
})

describe("eTenders transformation", () => {
  it("normalizes disclosed amounts and returns null for invalid or undisclosed values", () => {
    expect(normalizeAmount({ amount: "R 1,234.50" })).toBe(1234.5)
    expect(normalizeAmount(0)).toBeNull()
    expect(normalizeAmount("Undisclosed")).toBeNull()
    expect(normalizeAmount(null)).toBeNull()
  })

  it("preserves every unique document URL", () => {
    const input = release()
    input.tender!.documents!.push({ title: "Duplicate", url: "https://example.test/spec.pdf" })
    expect(extractAllDocuments(input)).toEqual([
      { title: "Specification", url: "https://example.test/spec.pdf" },
      { title: "Pricing", url: "https://example.test/pricing.pdf" },
    ])
  })

  it("maps release date, normalized value, and all documents into the RFQ payload", () => {
    const payload = toRfqPayload(release(), NOW)
    expect(payload).toMatchObject({
      external_ocid: "ocds-test-1",
      published_date: "2026-08-12T08:00:00.000Z",
      estimated_value_min: 125000,
      estimated_value_max: 125000,
      budget: "125000",
      original_source_url: "https://example.test/spec.pdf",
    })
    expect(payload?.description).toContain("https://example.test/spec.pdf")
    expect(payload?.description).toContain("https://example.test/pricing.pdf")
  })

  it("returns null for null tenders, missing OCIDs, invalid dates, and closed tenders", () => {
    expect(toRfqPayload({ ocid: "x", tender: null }, NOW)).toBeNull()
    expect(toRfqPayload(release({ ocid: null }), NOW)).toBeNull()
    expect(toRfqPayload(release({ tender: { ...release().tender!, status: "complete" } }), NOW)).toBeNull()
    expect(toRfqPayload(release({ tender: {
      ...release().tender!,
      tenderPeriod: { endDate: "2020-01-01" },
    } }), NOW)).toBeNull()
  })
})
