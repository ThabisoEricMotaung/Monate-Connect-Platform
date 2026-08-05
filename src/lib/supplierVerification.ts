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

function categoryState(
  category: SupplierVerificationCategory,
  documents: SupplierDocument[] | null | undefined,
): SupplierVerificationCategoryState {
  const documentType = CATEGORY_DOCUMENT_TYPES[category]
  const document = latestSupplierDocuments(documents)[documentType]
  const status = document ? normalizeSupplierDocumentStatus(document.status) : "missing"

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
