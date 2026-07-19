import { supabase } from "@/lib/supabase"

export const SUPPLIER_DOCUMENT_TYPES = [
  "cipc",
  "tax_clearance",
  "vat",
  "bbbee",
  "csd",
  "bank_letter",
  "uif",
  "coid",
  "company_profile",
  "supporting_document",
  "cidb",
] as const

export type SupplierDocumentType = (typeof SUPPLIER_DOCUMENT_TYPES)[number]
export type SupplierDocumentStatus = "under_review" | "verified" | "rejected" | "expired" | "superseded"

export type SupplierDocument = {
  id: string
  profile_id: string
  document_type: SupplierDocumentType
  file_url: string
  storage_path: string | null
  original_filename: string | null
  content_type: string | null
  file_size: number | null
  uploaded_at: string
  status: SupplierDocumentStatus
  reviewed_at: string | null
  reviewed_by: string | null
  review_notes: string | null
}

export type SupplierDocumentMap = Partial<Record<SupplierDocumentType, SupplierDocument>>

export type LegacyDocumentProfile = {
  id: string
  csd_document_url?: string | null
  bbbee_document_url?: string | null
  tax_document_url?: string | null
  company_registration_url?: string | null
  cidb_document_url?: string | null
  capability_statement_url?: string | null
  supplier_documents?: SupplierDocument[]
}

export const supplierDocumentLabels: Record<SupplierDocumentType, string> = {
  cipc: "CIPC",
  tax_clearance: "Tax Clearance",
  vat: "VAT",
  bbbee: "BBBEE Certificate",
  csd: "CSD",
  bank_letter: "Bank Letter",
  uif: "UIF",
  coid: "COID",
  company_profile: "Company Profile",
  supporting_document: "Supporting Document",
  cidb: "CIDB",
}

export const supplierDocumentStorageFolders: Record<SupplierDocumentType, string> = {
  cipc: "cipc",
  tax_clearance: "tax-clearance",
  vat: "vat",
  bbbee: "bbbee-certificate",
  csd: "csd",
  bank_letter: "bank-letter",
  uif: "uif",
  coid: "coid",
  company_profile: "company-profile",
  supporting_document: "supporting-document",
  cidb: "cidb",
}

export function latestSupplierDocuments(documents: SupplierDocument[] | null | undefined): SupplierDocumentMap {
  const latest: SupplierDocumentMap = {}
  const sorted = [...(documents ?? [])].sort(
    (a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime(),
  )

  for (const document of sorted) {
    if (document.status === "superseded") continue
    if (latest[document.document_type]) continue
    latest[document.document_type] = document
  }

  return latest
}

export function activeSupplierDocuments(documents: SupplierDocument[] | null | undefined): SupplierDocument[] {
  return (documents ?? []).filter((document) => document.status !== "superseded")
}

export function applySupplierDocuments<T extends LegacyDocumentProfile>(profile: T, documents: SupplierDocument[]): T {
  const latest = latestSupplierDocuments(documents)

  return {
    ...profile,
    supplier_documents: documents,
    csd_document_url: latest.csd?.file_url ?? null,
    bbbee_document_url: latest.bbbee?.file_url ?? null,
    tax_document_url: latest.tax_clearance?.file_url ?? null,
    company_registration_url: latest.cipc?.file_url ?? null,
    capability_statement_url: latest.company_profile?.file_url ?? null,
    cidb_document_url: profile.cidb_document_url ?? null,
  }
}

export function applySupplierDocumentsToProfiles<T extends LegacyDocumentProfile>(
  profiles: T[],
  documentsByProfile: Record<string, SupplierDocument[]>,
): T[] {
  return profiles.map((profile) => applySupplierDocuments(profile, documentsByProfile[profile.id] ?? []))
}

export async function fetchSupplierDocumentsByProfileIds(
  profileIds: string[],
): Promise<{ documentsByProfile: Record<string, SupplierDocument[]>; error: string | null }> {
  if (!supabase || profileIds.length === 0) {
    return { documentsByProfile: {}, error: null }
  }

  const { data, error } = await supabase
    .from("supplier_documents")
    .select(
      "id, profile_id, document_type, file_url, storage_path, original_filename, content_type, file_size, uploaded_at, status, reviewed_at, reviewed_by, review_notes",
    )
    .in("profile_id", profileIds)
    .order("uploaded_at", { ascending: false })

  if (error) return { documentsByProfile: {}, error: error.message }

  const documentsByProfile = ((data ?? []) as SupplierDocument[]).reduce<Record<string, SupplierDocument[]>>(
    (grouped, document) => {
      grouped[document.profile_id] = [...(grouped[document.profile_id] ?? []), document]
      return grouped
    },
    {},
  )

  return { documentsByProfile, error: null }
}

export async function fetchSupplierDocumentsForProfile(
  profileId: string,
): Promise<{ documents: SupplierDocument[]; error: string | null }> {
  const { documentsByProfile, error } = await fetchSupplierDocumentsByProfileIds(profileId ? [profileId] : [])
  return { documents: documentsByProfile[profileId] ?? [], error }
}

export function hasActiveSupplierDocument(
  documents: SupplierDocument[] | null | undefined,
  documentType: SupplierDocumentType,
): boolean {
  return Boolean(latestSupplierDocuments(documents)[documentType]?.file_url?.trim())
}

// Canonical set of documents a supplier must have on file before their profile
// can be fully verified. Used both by the document-reminders cron (nudge emails)
// and the provisional-verification cron (auto provisional-approval + revert).
// Keeping this in one place avoids the two crons silently disagreeing about
// what "required" means.
export type RequiredSupplierDocument = {
  type: SupplierDocumentType
  label: string
  // Legacy profile columns that predate the supplier_documents table. A
  // non-empty value in any of these still counts as "has the document".
  legacyFields?: readonly string[]
}

export const REQUIRED_SUPPLIER_DOCUMENTS: readonly RequiredSupplierDocument[] = [
  { type: "csd", label: "CSD document", legacyFields: ["csd_document_url"] },
  { type: "bbbee", label: "BBBEE Certificate", legacyFields: ["bbbee_document_url"] },
  { type: "tax_clearance", label: "Tax Clearance", legacyFields: ["tax_clearance_url", "tax_document_url"] },
  { type: "cipc", label: "CIPC / company registration document", legacyFields: ["company_registration_url"] },
  { type: "bank_letter", label: "Bank Confirmation Letter" },
]

function hasValueString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0
}

export function hasRequiredSupplierDocument(
  profile: Record<string, unknown>,
  documents: SupplierDocument[] | null | undefined,
  requirement: RequiredSupplierDocument,
): boolean {
  const activeDocument = (documents ?? []).some(
    (document) =>
      document.document_type === requirement.type &&
      document.status !== "superseded" &&
      hasValueString(document.file_url),
  )

  if (activeDocument) return true

  return (requirement.legacyFields ?? []).some((field) => hasValueString(profile[field]))
}

export function missingRequiredSupplierDocuments(
  profile: Record<string, unknown>,
  documents: SupplierDocument[] | null | undefined,
): RequiredSupplierDocument[] {
  return REQUIRED_SUPPLIER_DOCUMENTS.filter(
    (requirement) => !hasRequiredSupplierDocument(profile, documents, requirement),
  )
}

