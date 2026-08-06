import {
  latestSupplierDocuments,
  normalizeSupplierDocumentStatus,
  type CanonicalSupplierDocumentStatus,
  type SupplierDocument,
  type SupplierDocumentType,
} from "./supplierDocuments"

export const SUPPLIER_VERIFICATION_CATEGORIES = ["csd", "bbbee", "tax", "banking"] as const
export type SupplierVerificationCategory = (typeof SUPPLIER_VERIFICATION_CATEGORIES)[number]
export type SupplierVerificationStatus = CanonicalSupplierDocumentStatus | "missing"

export type SupplierVerificationCategoryState = {
  category: SupplierVerificationCategory
  documentType: SupplierDocumentType
  status: SupplierVerificationStatus
  approved: boolean
  documentId: string | null
  reviewedAt: string | null
}

export type SupplierVerificationState = Record<SupplierVerificationCategory, SupplierVerificationCategoryState>

export type SupplierDirectoryVerificationStatus = "verified" | "provisional" | "in_review"

const CATEGORY_DOCUMENT_TYPES: Record<SupplierVerificationCategory, SupplierDocumentType> = {
  csd: "csd",
  bbbee: "bbbee",
  tax: "tax_clearance",
  banking: "bank_letter",
}

// Categories whose evidence has a meaningful expiry. Banking has none.
const EXPIRY_CHECKED_CATEGORIES = new Set<SupplierVerificationCategory>(["csd", "bbbee", "tax"])

function isDocumentExpired(dateValue: string | null | undefined, now = new Date()): boolean {
  if (!dateValue) return false
  const expiry = new Date(dateValue)
  if (Number.isNaN(expiry.getTime())) return false
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  expiry.setHours(0, 0, 0, 0)
  return expiry.getTime() < today.getTime()
}

function categoryState(
  category: SupplierVerificationCategory,
  documents: SupplierDocument[] | null | undefined,
): SupplierVerificationCategoryState {
  const documentType = CATEGORY_DOCUMENT_TYPES[category]
  const document = latestSupplierDocuments(documents)[documentType]
  let status: SupplierVerificationStatus = document ? normalizeSupplierDocumentStatus(document.status) : "missing"

  if (status === "approved" && EXPIRY_CHECKED_CATEGORIES.has(category) && isDocumentExpired(document?.expiry_date)) {
    status = "expired"
  }

  return {
    category,
    documentType,
    status,
    approved: status === "approved",
    documentId: document?.id ?? null,
    reviewedAt: document?.reviewed_at ?? null,
  }
}

export function deriveSupplierVerificationState(
  documents: SupplierDocument[] | null | undefined,
): SupplierVerificationState {
  return {
    csd: categoryState("csd", documents),
    bbbee: categoryState("bbbee", documents),
    tax: categoryState("tax", documents),
    banking: categoryState("banking", documents),
  }
}

export function getSupplierDirectoryVerificationStatus(
  verification: SupplierVerificationState | null | undefined,
  directorVerified: boolean | null | undefined,
): SupplierDirectoryVerificationStatus {
  if (!verification) return "in_review"

  const categories = [...Object.values(verification), {
    approved: Boolean(directorVerified),
    status: directorVerified ? "approved" : "missing",
  }]
  const approvedCount = categories.filter((category) => category.approved).length
  const hasRejected = categories.some((category) => category.status === "rejected")

  if (approvedCount === 5) return "verified"
  if (approvedCount === 4 && !hasRejected) return "provisional"
  return "in_review"
}
