import { describe, expect, it } from "vitest"
import {
  isValidDocumentReviewTransition,
  reviewErrorStatus,
  validateSupplierDocumentReviewRequest,
} from "./supplierReview"

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
