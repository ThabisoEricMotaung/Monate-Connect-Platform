import { supabase } from "@/lib/supabase"
import { latestSupplierDocuments, normalizeSupplierDocumentStatus, type SupplierDocument } from "@/lib/supplierDocuments"
import { deriveDirectorVerificationState, type VerificationAttestation } from "@/lib/verificationAttestations"
import { type SupplierVerificationState } from "@/lib/supplierVerification"

// --- Review-backed status ladder (certifications, licences) ---

export const PASSPORT_REVIEW_STATUSES = ["Verified", "Pending review", "Rejected", "Expired", "Missing"] as const
export type PassportReviewStatus = (typeof PASSPORT_REVIEW_STATUSES)[number]

// Days out from expiry_date at which the UI starts showing "Expiring soon".
// Matches the 30-day threshold already used for compliance-expiry nudges
// elsewhere in the app (see isWithinDays in lib/automationRules.ts).
const EXPIRING_SOON_WINDOW_DAYS = 30

export type PassportDisplayStatus = "Verified" | "Pending review" | "Expiring soon" | "Expired" | "Rejected" | "Missing"

export type SupplierCertification = {
  id: string
  profile_id: string
  name: string
  issuing_body: string | null
  certificate_number: string | null
  issue_date: string | null
  expiry_date: string | null
  status: PassportReviewStatus
  reviewed_by: string | null
  reviewed_at: string | null
  evidence_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type SupplierLicence = {
  id: string
  profile_id: string
  licence_type: string
  issuing_body: string | null
  licence_number: string | null
  issue_date: string | null
  expiry_date: string | null
  status: PassportReviewStatus
  reviewed_by: string | null
  reviewed_at: string | null
  evidence_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type SupplierServiceCategory = {
  id: string
  profile_id: string
  category_name: string
  category_group: string | null
  description: string | null
  created_at: string
  updated_at: string
}

export type SupplierOperatingArea = {
  id: string
  profile_id: string
  province: string | null
  municipality: string | null
  city: string | null
  region: string | null
  service_radius_km: number | null
  is_primary: boolean
  created_at: string
  updated_at: string
}

export type SupplierProject = {
  id: string
  profile_id: string
  project_name: string
  client_name: string | null
  description: string | null
  sector: string | null
  location: string | null
  start_date: string | null
  end_date: string | null
  value: number | null
  outcome_summary: string | null
  created_at: string
  updated_at: string
}

export type SupplierReference = {
  id: string
  profile_id: string
  referrer_name: string
  organisation_name: string | null
  relationship: string | null
  contact_email: string | null
  contact_phone: string | null
  project_summary: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type SupplierPassport = {
  certifications: SupplierCertification[]
  licences: SupplierLicence[]
  serviceCategories: SupplierServiceCategory[]
  operatingAreas: SupplierOperatingArea[]
  projects: SupplierProject[]
  references: SupplierReference[]
}

export const EMPTY_SUPPLIER_PASSPORT: SupplierPassport = {
  certifications: [],
  licences: [],
  serviceCategories: [],
  operatingAreas: [],
  projects: [],
  references: [],
}

const CERTIFICATION_SELECT =
  "id, profile_id, name, issuing_body, certificate_number, issue_date, expiry_date, status, reviewed_by, reviewed_at, evidence_url, notes, created_at, updated_at"
const LICENCE_SELECT =
  "id, profile_id, licence_type, issuing_body, licence_number, issue_date, expiry_date, status, reviewed_by, reviewed_at, evidence_url, notes, created_at, updated_at"
const SERVICE_CATEGORY_SELECT = "id, profile_id, category_name, category_group, description, created_at, updated_at"
const OPERATING_AREA_SELECT =
  "id, profile_id, province, municipality, city, region, service_radius_km, is_primary, created_at, updated_at"
const PROJECT_SELECT =
  "id, profile_id, project_name, client_name, description, sector, location, start_date, end_date, value, outcome_summary, created_at, updated_at"
const REFERENCE_SELECT =
  "id, profile_id, referrer_name, organisation_name, relationship, contact_email, contact_phone, project_summary, notes, created_at, updated_at"

export async function fetchSupplierPassport(profileId: string): Promise<{ passport: SupplierPassport; error: string | null }> {
  if (!supabase || !profileId) return { passport: EMPTY_SUPPLIER_PASSPORT, error: null }

  const [certifications, licences, serviceCategories, operatingAreas, projects, references] = await Promise.all([
    supabase.from("supplier_certifications").select(CERTIFICATION_SELECT).eq("profile_id", profileId).order("created_at", { ascending: false }),
    supabase.from("supplier_licences").select(LICENCE_SELECT).eq("profile_id", profileId).order("created_at", { ascending: false }),
    supabase.from("supplier_service_categories").select(SERVICE_CATEGORY_SELECT).eq("profile_id", profileId).order("created_at", { ascending: true }),
    supabase.from("supplier_operating_areas").select(OPERATING_AREA_SELECT).eq("profile_id", profileId).order("created_at", { ascending: true }),
    supabase.from("supplier_projects").select(PROJECT_SELECT).eq("profile_id", profileId).order("start_date", { ascending: false }),
    supabase.from("supplier_references").select(REFERENCE_SELECT).eq("profile_id", profileId).order("created_at", { ascending: false }),
  ])

  const error =
    certifications.error?.message ??
    licences.error?.message ??
    serviceCategories.error?.message ??
    operatingAreas.error?.message ??
    projects.error?.message ??
    references.error?.message ??
    null

  return {
    passport: {
      certifications: (certifications.data ?? []) as SupplierCertification[],
      licences: (licences.data ?? []) as SupplierLicence[],
      serviceCategories: (serviceCategories.data ?? []) as SupplierServiceCategory[],
      operatingAreas: (operatingAreas.data ?? []) as SupplierOperatingArea[],
      projects: (projects.data ?? []) as SupplierProject[],
      references: (references.data ?? []) as SupplierReference[],
    },
    error,
  }
}

// --- Derived "expiring soon" / "expired" labelling ---
// Stored data is only ever a status + an expiry_date. Everything below is a
// read-time label, never written back to the database.

export function daysUntil(dateStr: string | null | undefined, now = new Date()): number | null {
  if (!dateStr) return null
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return null
  return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function isExpiringSoon(dateStr: string | null | undefined, now = new Date()): boolean {
  const days = daysUntil(dateStr, now)
  return days !== null && days >= 0 && days <= EXPIRING_SOON_WINDOW_DAYS
}

export function isPastExpiry(dateStr: string | null | undefined, now = new Date()): boolean {
  const days = daysUntil(dateStr, now)
  return days !== null && days < 0
}

export function displayStatusFor(
  status: PassportReviewStatus,
  expiryDate: string | null | undefined,
  now = new Date(),
): PassportDisplayStatus {
  if (status === "Rejected" || status === "Missing") return status
  if (status === "Verified") {
    if (isPastExpiry(expiryDate, now)) return "Expired"
    if (isExpiringSoon(expiryDate, now)) return "Expiring soon"
    return "Verified"
  }
  // "Pending review" and the stored "Expired" both pass through as-is; a
  // pending item can still be past its stated expiry_date, but that is the
  // reviewer's concern, not a separate display state.
  return status
}

// --- Compliance snapshot ---
// Reuses the existing verification engine's semantics (deriveSupplierVerificationState,
// deriveDirectorVerificationState) rather than introducing a second source of truth.
// CIPC has no dedicated category in that engine, so it is derived the same way the
// engine derives csd/bbbee/tax internally: latest non-superseded document + its status.

export type ComplianceSnapshotKey = "csd" | "bbbee" | "tax" | "banking" | "director" | "cipc"

export type ComplianceSnapshotItem = {
  key: ComplianceSnapshotKey
  label: string
  status: PassportDisplayStatus
  detail: string | null
}

const COMPLIANCE_SNAPSHOT_LABELS: Record<ComplianceSnapshotKey, string> = {
  csd: "CSD",
  bbbee: "BBBEE",
  tax: "Tax",
  banking: "Banking",
  director: "Director attestation",
  cipc: "CIPC / company registration",
}

function documentDisplayStatus(
  approved: boolean,
  rawStatus: string,
  expiryDate: string | null | undefined,
  now: Date,
): PassportDisplayStatus {
  if (rawStatus === "rejected") return "Rejected"
  if (rawStatus === "expired") return "Expired"
  if (approved) {
    if (isPastExpiry(expiryDate, now)) return "Expired"
    if (isExpiringSoon(expiryDate, now)) return "Expiring soon"
    return "Verified"
  }
  if (rawStatus === "under_review") return "Pending review"
  return "Missing"
}

function formatSnapshotDate(value: string | null | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })
}

// Caption shown under the category label on each snapshot card. Prefers the
// expiry_date (when the category tracks one) over the submission/review date,
// since "when does this stop being valid" is the more actionable fact.
function snapshotDetail(
  status: PassportDisplayStatus,
  dates: { expiryDate?: string | null; uploadedAt?: string | null; reviewedAt?: string | null },
): string | null {
  const expiry = formatSnapshotDate(dates.expiryDate)
  const uploaded = formatSnapshotDate(dates.uploadedAt)
  const reviewed = formatSnapshotDate(dates.reviewedAt)

  switch (status) {
    case "Verified":
      return expiry ? `Valid until ${expiry}` : reviewed ? `Verified on ${reviewed}` : null
    case "Expiring soon":
      return expiry ? `Expires ${expiry} soon` : null
    case "Expired":
      return expiry ? `Expired ${expiry} — resubmit` : "Expired — resubmit"
    case "Pending review":
      return uploaded ? `Under review since ${uploaded}` : "Awaiting review"
    case "Rejected":
      return "Needs resubmission"
    default:
      return null
  }
}

export function derivePassportComplianceSnapshot(input: {
  verification: SupplierVerificationState
  documents: SupplierDocument[] | null | undefined
  attestations: VerificationAttestation[] | null | undefined
  csdExpiryDate?: string | null
  bbbeeExpiryDate?: string | null
  taxExpiryDate?: string | null
  now?: Date
}): ComplianceSnapshotItem[] {
  const now = input.now ?? new Date()
  const { verification, documents, attestations } = input

  const director = deriveDirectorVerificationState(attestations, now)
  const latestDocuments = latestSupplierDocuments(documents)
  const cipcDocument = latestDocuments.cipc
  const cipcStatus = cipcDocument ? normalizeSupplierDocumentStatus(cipcDocument.status) : "missing"
  const cipcApproved = cipcStatus === "approved"

  const csdStatus = documentDisplayStatus(verification.csd.approved, verification.csd.status, input.csdExpiryDate, now)
  const bbbeeStatus = documentDisplayStatus(verification.bbbee.approved, verification.bbbee.status, input.bbbeeExpiryDate, now)
  const taxStatus = documentDisplayStatus(verification.tax.approved, verification.tax.status, input.taxExpiryDate, now)
  const bankingStatus = documentDisplayStatus(verification.banking.approved, verification.banking.status, null, now)
  const directorStatus: PassportDisplayStatus =
    director.status === "missing"
      ? "Missing"
      : director.status === "rejected" || director.status === "revoked"
        ? "Rejected"
        : director.status === "expired"
          ? "Expired"
          : director.approved && isExpiringSoon(director.attestation?.expires_at, now)
            ? "Expiring soon"
            : "Verified"
  const cipcStatusDisplay = documentDisplayStatus(cipcApproved, cipcStatus, null, now)

  return [
    {
      key: "csd",
      label: COMPLIANCE_SNAPSHOT_LABELS.csd,
      status: csdStatus,
      detail: snapshotDetail(csdStatus, {
        expiryDate: input.csdExpiryDate,
        uploadedAt: latestDocuments.csd?.uploaded_at,
        reviewedAt: latestDocuments.csd?.reviewed_at,
      }),
    },
    {
      key: "bbbee",
      label: COMPLIANCE_SNAPSHOT_LABELS.bbbee,
      status: bbbeeStatus,
      detail: snapshotDetail(bbbeeStatus, {
        expiryDate: input.bbbeeExpiryDate,
        uploadedAt: latestDocuments.bbbee?.uploaded_at,
        reviewedAt: latestDocuments.bbbee?.reviewed_at,
      }),
    },
    {
      key: "tax",
      label: COMPLIANCE_SNAPSHOT_LABELS.tax,
      status: taxStatus,
      detail: snapshotDetail(taxStatus, {
        expiryDate: input.taxExpiryDate,
        uploadedAt: latestDocuments.tax_clearance?.uploaded_at,
        reviewedAt: latestDocuments.tax_clearance?.reviewed_at,
      }),
    },
    {
      key: "banking",
      label: COMPLIANCE_SNAPSHOT_LABELS.banking,
      status: bankingStatus,
      detail: snapshotDetail(bankingStatus, {
        uploadedAt: latestDocuments.bank_letter?.uploaded_at,
        reviewedAt: latestDocuments.bank_letter?.reviewed_at,
      }),
    },
    {
      key: "director",
      label: COMPLIANCE_SNAPSHOT_LABELS.director,
      status: directorStatus,
      detail: snapshotDetail(directorStatus, {
        expiryDate: director.attestation?.expires_at,
        reviewedAt: director.attestation?.reviewed_at,
      }),
    },
    {
      key: "cipc",
      label: COMPLIANCE_SNAPSHOT_LABELS.cipc,
      status: cipcStatusDisplay,
      detail: snapshotDetail(cipcStatusDisplay, {
        uploadedAt: cipcDocument?.uploaded_at,
        reviewedAt: cipcDocument?.reviewed_at,
      }),
    },
  ] as ComplianceSnapshotItem[]
}

export function passportStatusBadgeColor(status: PassportDisplayStatus): "green" | "amber" | "red" | "gray" {
  if (status === "Verified") return "green"
  if (status === "Pending review" || status === "Expiring soon") return "amber"
  if (status === "Rejected" || status === "Expired") return "red"
  return "gray"
}
