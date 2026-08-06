import type { CanonicalSupplierDocumentStatus, SupplierDocument } from "./supplierDocuments"

export type SupplierDocumentReviewDecision = "approved" | "rejected" | "under_review"

export type SupplierDocumentReviewRequest = {
  decision: SupplierDocumentReviewDecision
  expectedStatus: CanonicalSupplierDocumentStatus
  expectedReviewedAt: string | null
  reason?: string | null
  expiryDate?: string | null
}

export type SupplierReviewRefresh = {
  profile_id: string
  verification_status: string
  smart_score: number
  compliance_base: number
  approved_document_count: number
  director_approved: boolean
}

export type SupplierDocumentReviewResult = {
  document: SupplierDocument
  refresh: SupplierReviewRefresh
  audit_created: boolean
}

const TRANSITIONS = new Set([
  "under_review:approved",
  "under_review:rejected",
  "approved:under_review",
  "rejected:under_review",
])

export function isValidDocumentReviewTransition(
  current: CanonicalSupplierDocumentStatus,
  next: SupplierDocumentReviewDecision,
): boolean {
  return TRANSITIONS.has(`${current}:${next}`)
}

export function validateSupplierDocumentReviewRequest(
  input: unknown,
): { ok: true; value: SupplierDocumentReviewRequest } | { ok: false; error: string } {
  if (!input || typeof input !== "object") return { ok: false, error: "Invalid request body." }
  const body = input as Record<string, unknown>
  const decision = String(body.decision ?? "") as SupplierDocumentReviewDecision
  const expectedStatus = String(body.expectedStatus ?? "") as CanonicalSupplierDocumentStatus
  const expectedReviewedAt = body.expectedReviewedAt
  const expiryDate = body.expiryDate

  if (!(["approved", "rejected", "under_review"] as string[]).includes(decision)) {
    return { ok: false, error: "Invalid review decision." }
  }
  if (!(["under_review", "approved", "rejected", "expired", "superseded"] as string[]).includes(expectedStatus)) {
    return { ok: false, error: "Invalid expected document status." }
  }
  if (expectedReviewedAt !== null && typeof expectedReviewedAt !== "string") {
    return { ok: false, error: "Invalid expected review timestamp." }
  }
  if (!isValidDocumentReviewTransition(expectedStatus, decision)) {
    return { ok: false, error: `Invalid document transition: ${expectedStatus} to ${decision}.` }
  }
  if (
    expiryDate !== undefined &&
    expiryDate !== null &&
    (typeof expiryDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate))
  ) {
    return { ok: false, error: "Invalid expiry date." }
  }

  return {
    ok: true,
    value: {
      decision,
      expectedStatus,
      expectedReviewedAt,
      reason: typeof body.reason === "string" ? body.reason : null,
      expiryDate: typeof expiryDate === "string" ? expiryDate : null,
    },
  }
}

export function reviewErrorStatus(error: { code?: string; message?: string } | null): number {
  if (error?.code === "42501") return 403
  if (error?.code === "P0002") return 404
  if (error?.code === "40001" || error?.message?.toLowerCase().includes("stale")) return 409
  if (error?.code === "22023") return 422
  return 500
}
