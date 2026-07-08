import { isVerifiedStatus } from "./supplierStatus"
import {
  calculateSupplierSmartScore,
  type SmartScoreResult,
  type SupplierSmartScoreActivity,
  type SupplierSmartScoreProfile,
} from "./smartScore"
import type { SupplierDocument } from "./supplierDocuments"

export type SupplierBankScoreRecord = {
  supplier_id: string | null
  bank_name?: string | null
  account_number?: string | null
  verification_status?: string | null
}

export type SupplierScoreMergeFields = {
  provinces: string[]
  supplier_documents: SupplierDocument[]
  bank_name: string | null
  bank_account_number: string | null
  account_number: string | null
  bank_verification_status: string | null
  bank_verified: boolean
}

export type CanonicalSupplierScoreInput = SupplierSmartScoreProfile & { id: string } & SupplierScoreMergeFields

// Merges profile + document + banking rows into the single shape calculateSupplierSmartScore expects.
// Shared by the canonical single/batch scorers and by every batch-fetching lib that scores many
// suppliers at once, so the merge logic can't re-diverge across call sites.
export function mergeSupplierScoreInputs<T extends SupplierSmartScoreProfile & { id: string }>({
  profile,
  documents = [],
  banks = [],
}: {
  profile: T
  documents?: SupplierDocument[]
  banks?: SupplierBankScoreRecord[]
}): T & SupplierScoreMergeFields {
  const latestBank = banks[0]
  const bankVerified = banks.some((bank) => isVerifiedStatus(bank.verification_status))

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
    bank_verification_status: latestBank?.verification_status ?? null,
    bank_verified: Boolean(profile.bank_verified || profile.banking_verified || bankVerified),
  }
}

export function scoreCanonicalSupplierInput(
  input: SupplierSmartScoreProfile | null | undefined,
  activity: SupplierSmartScoreActivity = {}
): SmartScoreResult {
  return calculateSupplierSmartScore(input, activity)
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
