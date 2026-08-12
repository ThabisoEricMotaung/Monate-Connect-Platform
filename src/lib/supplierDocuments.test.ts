import { describe, expect, it } from "vitest"
import { effectiveSupplierDocumentStatus, isSupplierDocumentExpired, type SupplierDocument } from "./supplierDocuments"

const NOW = new Date("2026-08-12T00:00:00Z")

function document(overrides: Partial<SupplierDocument>): SupplierDocument {
  return {
    id: "doc-1",
    profile_id: "supplier-1",
    document_type: "csd",
    file_url: "https://evidence.test/doc.pdf",
    storage_path: null,
    original_filename: null,
    content_type: null,
    file_size: null,
    uploaded_at: "2026-01-01T00:00:00.000Z",
    status: "approved",
    reviewed_at: "2026-01-01T00:00:00.000Z",
    reviewed_by: "reviewer-1",
    review_notes: null,
    expiry_date: null,
    ...overrides,
  }
}

describe("isSupplierDocumentExpired", () => {
  it("treats a past date as expired", () => {
    expect(isSupplierDocumentExpired("2026-08-01", NOW)).toBe(true)
  })
  it("treats today and future dates as not expired", () => {
    expect(isSupplierDocumentExpired("2026-08-12", NOW)).toBe(false)
    expect(isSupplierDocumentExpired("2026-08-13", NOW)).toBe(false)
  })
  it("treats missing or unparseable dates as not expired", () => {
    expect(isSupplierDocumentExpired(null, NOW)).toBe(false)
    expect(isSupplierDocumentExpired(undefined, NOW)).toBe(false)
    expect(isSupplierDocumentExpired("not-a-date", NOW)).toBe(false)
  })
})

describe("effectiveSupplierDocumentStatus", () => {
  it.each(["csd", "bbbee", "tax_clearance", "cidb"] as const)(
    "flips an approved %s document to expired once past its expiry date",
    (documentType) => {
      const doc = document({ document_type: documentType, status: "approved", expiry_date: "2026-08-01" })
      expect(effectiveSupplierDocumentStatus(doc, NOW)).toBe("expired")
    },
  )

  it.each(["csd", "bbbee", "tax_clearance", "cidb"] as const)(
    "keeps an approved %s document approved while its expiry date is in the future",
    (documentType) => {
      const doc = document({ document_type: documentType, status: "approved", expiry_date: "2026-08-13" })
      expect(effectiveSupplierDocumentStatus(doc, NOW)).toBe("approved")
    },
  )

  it("does not expire document types outside the expiry-enabled set", () => {
    const doc = document({ document_type: "bank_letter", status: "approved", expiry_date: "2020-01-01" })
    expect(effectiveSupplierDocumentStatus(doc, NOW)).toBe("approved")
  })

  it("leaves under_review documents untouched even past their expiry date", () => {
    const doc = document({ document_type: "cidb", status: "under_review", expiry_date: "2020-01-01" })
    expect(effectiveSupplierDocumentStatus(doc, NOW)).toBe("under_review")
  })

  it("leaves rejected documents untouched even past their expiry date", () => {
    const doc = document({ document_type: "csd", status: "rejected", expiry_date: "2020-01-01" })
    expect(effectiveSupplierDocumentStatus(doc, NOW)).toBe("rejected")
  })

  it("normalizes a legacy verified status the same way approved is normalized", () => {
    const doc = document({ document_type: "bbbee", status: "verified", expiry_date: "2020-01-01" })
    expect(effectiveSupplierDocumentStatus(doc, NOW)).toBe("expired")
  })

  it("returns under_review for a null document", () => {
    expect(effectiveSupplierDocumentStatus(null, NOW)).toBe("under_review")
  })
})
