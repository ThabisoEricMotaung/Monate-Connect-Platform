import {
  calculateSupplierSmartScore,
  type SmartScoreResult,
  type SupplierSmartScoreActivity,
  type SupplierSmartScoreProfile,
} from "./smartScore"
import {
  REQUIRED_SUPPLIER_DOCUMENTS,
  type SupplierDocument,
  type SupplierDocumentType,
} from "./supplierDocuments"
import {
  deriveSupplierVerificationState,
  type SupplierVerificationState,
} from "./supplierVerification"
import { deriveDirectorVerificationState, type VerificationAttestation } from "./verificationAttestations"

export type SupplierBankScoreRecord = {
  supplier_id: string | null
  bank_name?: string | null
  account_number?: string | null
}

export type SupplierScoreMergeFields = {
  provinces: string[]
  supplier_documents: SupplierDocument[]
  bank_name: string | null
  bank_account_number: string | null
  account_number: string | null
  bank_verification_status: string | null
  bank_verified: boolean
  verification_state: SupplierVerificationState
  verification_attestations: VerificationAttestation[]
  director_verified: boolean
}

export type CanonicalSupplierScoreInput = SupplierSmartScoreProfile & { id: string } & SupplierScoreMergeFields

// Merges profile + document + banking rows into the single shape calculateSupplierSmartScore expects.
// Shared by the canonical single/batch scorers and by every batch-fetching lib that scores many
// suppliers at once, so the merge logic can't re-diverge across call sites.
export function mergeSupplierScoreInputs<T extends SupplierSmartScoreProfile & { id: string }>({
  profile,
  documents = [],
  banks = [],
  attestations = [],
}: {
  profile: T
  documents?: SupplierDocument[]
  banks?: SupplierBankScoreRecord[]
  attestations?: VerificationAttestation[]
}): T & SupplierScoreMergeFields {
  const latestBank = banks[0]
  const verificationState = deriveSupplierVerificationState(documents)
  const directorVerified = deriveDirectorVerificationState(attestations).approved
  return {
    ...profile,
    provinces: Array.isArray(profile.provinces)
      ? profile.provinces
      : profile.province
        ? [profile.province]
        : [],
    supplier_documents: documents,
    bank_name: latestBank?.bank_name ?? null,
    bank_account_number: latestBank?.account_number ?? null,
    account_number: latestBank?.account_number ?? null,
    bank_verification_status: verificationState.banking.status,
    bank_verified: verificationState.banking.approved,
    verification_state: verificationState,
    verification_attestations: attestations,
    director_verified: directorVerified,
  }
}

export function scoreCanonicalSupplierInput(
  input: SupplierSmartScoreProfile | null | undefined,
  activity: SupplierSmartScoreActivity = {}
): SmartScoreResult {
  return calculateSupplierSmartScore(input, activity)
}

export function projectSupplierSmartScoreWithApprovedDocuments({
  input,
  activity = {},
  approvedDocumentTypes = REQUIRED_SUPPLIER_DOCUMENTS.map((requirement) => requirement.type),
}: {
  input: CanonicalSupplierScoreInput
  activity?: SupplierSmartScoreActivity
  approvedDocumentTypes?: readonly SupplierDocumentType[]
}): SmartScoreResult {
  const projectedTypes = new Set(approvedDocumentTypes)
  const actualDocuments = input.supplier_documents as SupplierDocument[]
  const preservedDocuments = actualDocuments.filter(
    (document) => !projectedTypes.has(document.document_type),
  )
  const projectedDocuments: SupplierDocument[] = approvedDocumentTypes.map((documentType) => ({
    id: `smartscore-projection-${documentType}`,
    profile_id: input.id,
    document_type: documentType,
    file_url: `projection://${documentType}`,
    storage_path: null,
    original_filename: null,
    content_type: null,
    file_size: null,
    uploaded_at: new Date().toISOString(),
    status: "approved",
    reviewed_at: new Date().toISOString(),
    reviewed_by: null,
    review_notes: null,
    expiry_date: null,
  }))
  const supplierDocuments = [...projectedDocuments, ...preservedDocuments]
  const verificationState = deriveSupplierVerificationState(supplierDocuments)

  return calculateSupplierSmartScore(
    {
      ...input,
      supplier_documents: supplierDocuments,
      verification_state: verificationState,
      bank_verification_status: verificationState.banking.status,
    },
    activity,
  )
}

export function groupBySupplierId<T extends { supplier_id: string | null }>(
  rows: T[]
): Record<string, T[]> {
  return rows.reduce<Record<string, T[]>>((grouped, row) => {
    if (!row.supplier_id) return grouped
    grouped[row.supplier_id] = [...(grouped[row.supplier_id] ?? []), row]
    return grouped
  }, {})
}
