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

export type LegacySupplierVerificationFlags = {
  csd_verified?: boolean | null
  bbbee_verified?: boolean | null
  tax_verified?: boolean | null
  bank_verified?: boolean | null
  banking_verified?: boolean | null
}

export type SupplierVerificationMismatch = {
  supplierId: string
  category: SupplierVerificationCategory
  legacyVerified: boolean
  derivedApproved: boolean
  derivedStatus: SupplierVerificationStatus
  documentId: string | null
}

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

export function legacySupplierVerificationState(
  profile: LegacySupplierVerificationFlags | null | undefined,
): Record<SupplierVerificationCategory, boolean> {
  return {
    csd: Boolean(profile?.csd_verified),
    bbbee: Boolean(profile?.bbbee_verified),
    tax: Boolean(profile?.tax_verified),
    banking: Boolean(profile?.bank_verified || profile?.banking_verified),
  }
}

export function compareLegacyAndDerivedVerification({
  supplierId,
  profile,
  derived,
}: {
  supplierId: string
  profile: LegacySupplierVerificationFlags
  derived: SupplierVerificationState
}): SupplierVerificationMismatch[] {
  const legacy = legacySupplierVerificationState(profile)
  return SUPPLIER_VERIFICATION_CATEGORIES.flatMap((category) =>
    legacy[category] === derived[category].approved
      ? []
      : [{
          supplierId,
          category,
          legacyVerified: legacy[category],
          derivedApproved: derived[category].approved,
          derivedStatus: derived[category].status,
          documentId: derived[category].documentId,
        }],
  )
}

export function logSupplierVerificationMismatches(mismatches: SupplierVerificationMismatch[]): void {
  for (const mismatch of mismatches) {
    console.warn("Supplier verification legacy/derived mismatch", mismatch)
  }
}
