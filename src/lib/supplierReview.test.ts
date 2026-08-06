import { describe, expect, it } from "vitest"
import {
  isValidDocumentReviewTransition,
  reviewErrorStatus,
  validateSupplierDocumentReviewRequest,
} from "./supplierReview"
import { deriveSupplierVerificationState } from "./supplierVerification"
import type { SupplierDocument } from "./supplierDocuments"

const request = (decision: string, expectedStatus = "under_review") =>
  validateSupplierDocumentReviewRequest({ decision, expectedStatus, expectedReviewedAt: null })

describe("supplier document review contract", () => {
  it("accepts approval", () => expect(request("approved").ok).toBe(true))
  it("accepts rejection", () => expect(request("rejected").ok).toBe(true))
  it("accepts revocation", () => expect(request("under_review", "approved").ok).toBe(true))
  it("refuses an invalid or missing-document transition", () => {
    expect(request("approved", "superseded").ok).toBe(false)
    expect(isValidDocumentReviewTransition("expired", "approved")).toBe(false)
  })
  it("maps stale concurrent reviews to conflict", () => {
    expect(reviewErrorStatus({ code: "40001", message: "Stale document review" })).toBe(409)
  })
})

describe("supplier document review expiry date", () => {
  it("accepts an omitted expiry date and defaults it to null", () => {
    const result = validateSupplierDocumentReviewRequest({ decision: "approved", expectedStatus: "under_review", expectedReviewedAt: null })
    expect(result.ok).toBe(true)
    expect(result.ok && result.value.expiryDate).toBe(null)
  })
  it("accepts an explicit null expiry date", () => {
    const result = validateSupplierDocumentReviewRequest({
      decision: "approved", expectedStatus: "under_review", expectedReviewedAt: null, expiryDate: null,
    })
    expect(result.ok).toBe(true)
  })
  it("accepts an ISO date string", () => {
    const result = validateSupplierDocumentReviewRequest({
      decision: "approved", expectedStatus: "under_review", expectedReviewedAt: null, expiryDate: "2030-01-01",
    })
    expect(result.ok).toBe(true)
    expect(result.ok && result.value.expiryDate).toBe("2030-01-01")
  })
  it("refuses a malformed expiry date", () => {
    expect(
      validateSupplierDocumentReviewRequest({
        decision: "approved", expectedStatus: "under_review", expectedReviewedAt: null, expiryDate: "01/01/2030",
      }).ok,
    ).toBe(false)
  })
})

function approvedDocument(overrides: Partial<SupplierDocument>): SupplierDocument {
  return {
    id: "doc-1",
    profile_id: "profile-1",
    document_type: "csd",
    file_url: "https://evidence.test/doc.pdf",
    storage_path: null,
    original_filename: null,
    content_type: null,
    file_size: null,
    uploaded_at: new Date().toISOString(),
    status: "approved",
    reviewed_at: new Date().toISOString(),
    reviewed_by: "reviewer-1",
    review_notes: null,
    expiry_date: null,
    ...overrides,
  }
}

describe("verification category state honors document expiry", () => {
  it("keeps an approved csd document approved with no expiry_date (deploy is inert)", () => {
    const state = deriveSupplierVerificationState([approvedDocument({ document_type: "csd", expiry_date: null })])
    expect(state.csd.status).toBe("approved")
    expect(state.csd.approved).toBe(true)
  })
  it("downgrades an approved csd document to expired once expiry_date has passed", () => {
    const state = deriveSupplierVerificationState([approvedDocument({ document_type: "csd", expiry_date: "2020-01-01" })])
    expect(state.csd.status).toBe("expired")
    expect(state.csd.approved).toBe(false)
  })
  it("keeps an approved bbbee document approved before its expiry_date", () => {
    const state = deriveSupplierVerificationState([approvedDocument({ document_type: "bbbee", expiry_date: "2099-01-01" })])
    expect(state.bbbee.status).toBe("approved")
  })
  it("does not apply expiry to the banking category", () => {
    const state = deriveSupplierVerificationState([approvedDocument({ document_type: "bank_letter", expiry_date: "2020-01-01" })])
    expect(state.banking.status).toBe("approved")
  })
})
