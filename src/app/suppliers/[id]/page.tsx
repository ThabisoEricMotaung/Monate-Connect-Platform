import Image from "next/image"
import Link from "next/link"
import { ProfileImage, initialsFromName } from "@/components/ProfileImage"
import { notFound } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { getCanonicalSupplierSmartScore } from "@/lib/supplierScoring"
import type { SupplierDocument } from "@/lib/supplierDocuments"
import {
  deriveSupplierVerificationState,
  getSupplierDirectoryVerificationStatus,
  type SupplierVerificationState,
} from "@/lib/supplierVerification"
import { deriveDirectorVerificationState, type VerificationAttestation } from "@/lib/verificationAttestations"
import { derivePassportComplianceSnapshot, displayStatusFor, isPublicPassportCredentialStatus, passportEvidenceUrl, type ComplianceSnapshotItem, type PassportDisplayStatus, type PassportReviewStatus } from "@/lib/supplierPassport"

type Props = {
  params: Promise<{ id: string }>
}

type PublicSupplierProfile = {
  id: string
  full_name: string | null
  preferred_name: string | null
  email: string | null
  avatar_url: string | null
  company_logo_url: string | null
  business_name: string | null
  province: string | null
  provinces: string[] | null
  industry: string | null
  verification_status: string | null
  bbbee_level: string | null
  cidb_grade: string | null
  smart_score: number | string | null
  director_verified: boolean | null
  website: string | null
  description: string | null
  employee_count: number | string | null
  linkedin_url: string | null
  founded_year: number | string | null
  created_at: string | null
  verification_state: SupplierVerificationState
  passport: PassportSummary
}

// Condensed public summary only. Deliberately excludes internal review
// metadata (reviewed_by, reviewed_at, notes) and reference contact details
// (contact_email, contact_phone) -- those stay private to the dashboard.
type PassportCertificationSummary = {
  id: string
  name: string
  issuing_body: string | null
  expiry_date: string | null
  displayStatus: PassportDisplayStatus
  evidence_url: string | null
}
type PassportLicenceSummary = {
  id: string
  licence_type: string
  issuing_body: string | null
  expiry_date: string | null
  displayStatus: PassportDisplayStatus
  evidence_url: string | null
}
type PassportServiceCategorySummary = { id: string; category_name: string; category_group: string | null }
type PassportOperatingAreaSummary = {
  id: string
  province: string | null
  municipality: string | null
  city: string | null
  region: string | null
  service_radius_km: number | null
  is_primary: boolean
}
type PassportProjectSummary = {
  id: string
  project_name: string
  client_name: string | null
  sector: string | null
  location: string | null
  start_date: string | null
  end_date: string | null
  description: string | null
  outcome_summary: string | null
}
type PassportReferenceSummary = {
  id: string
  referrer_name: string
  organisation_name: string | null
  relationship: string | null
  project_summary: string | null
}

type PassportSummary = {
  complianceSnapshot: ComplianceSnapshotItem[]
  certifications: PassportCertificationSummary[]
  licences: PassportLicenceSummary[]
  serviceCategories: PassportServiceCategorySummary[]
  operatingAreas: PassportOperatingAreaSummary[]
  projects: PassportProjectSummary[]
  references: PassportReferenceSummary[]
}

const MAX_KEY_CERTIFICATIONS = 6
const MAX_PUBLIC_PROJECTS = 2
const MAX_PUBLIC_REFERENCES = 2

const FOREST = "#1a3a2a"
const GOLD = "#c8a060"
const COVER_GRADIENTS = [
  ["#1a3a2a", "#2d5a3d"],
  ["#c8a060", "#a67c3a"],
  ["#2d4a6b", "#1a2f45"],
  ["#6b3a2d", "#4a2419"],
  ["#1a4a4a", "#0d2d2d"],
  ["#4a3a6b", "#2d2145"],
] as const

async function getSupplier(id: string): Promise<PublicSupplierProfile> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) notFound()

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  })

  const coreSelect =
    "id,full_name,preferred_name,email,business_name,province,provinces,industry,verification_status,bbbee_level,cidb_grade,smart_score,website,description,employee_count,linkedin_url,founded_year,created_at,tax_expiry_date,bbbee_expiry_date,csd_expiry_date"
  let { data, error } = await supabase
    .from("profiles")
    .select(`${coreSelect},avatar_url,company_logo_url`)
    .eq("id", id)
    .maybeSingle()

  if (error?.code === "42703") {
    const retry = await supabase
      .from("profiles")
      .select(`${coreSelect},avatar_url,company_logo_url`)
      .eq("id", id)
      .maybeSingle()
    data = retry.data
      ? {
          ...retry.data,
        }
      : null
    error = retry.error
  }

  if (error?.code === "42703") {
    const retry = await supabase
      .from("profiles")
      .select(coreSelect)
      .eq("id", id)
      .maybeSingle()
    data = retry.data
      ? {
          ...retry.data,
          avatar_url: null,
          company_logo_url: null,
        }
      : null
    error = retry.error
  }

  if (error || !data) notFound()

  const [canonical, documentsResult, attestationsResult, certificationsResult, licencesResult, serviceCategoriesResult, operatingAreasResult, projectsResult, referencesResult] =
    await Promise.all([
      getCanonicalSupplierSmartScore(id, supabase),
      supabase
        .from("supplier_documents")
        .select("id,profile_id,document_type,file_url,uploaded_at,status,reviewed_at")
        .eq("profile_id", id),
      supabase
        .from("verification_attestations")
        .select("id,profile_id,category,decision,reason,evidence_reference,reviewed_by,reviewed_at,expires_at")
        .eq("profile_id", id),
      supabase
        .from("supplier_certifications")
        .select("id,name,issuing_body,expiry_date,status,evidence_url")
        .eq("profile_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("supplier_licences")
        .select("id,licence_type,issuing_body,expiry_date,status,evidence_url")
        .eq("profile_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("supplier_service_categories")
        .select("id,category_name,category_group")
        .eq("profile_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("supplier_operating_areas")
        .select("id,province,municipality,city,region,service_radius_km,is_primary")
        .eq("profile_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("supplier_projects")
        .select("id,project_name,client_name,sector,location,start_date,end_date,description,outcome_summary")
        .eq("profile_id", id)
        .order("start_date", { ascending: false })
        .limit(MAX_PUBLIC_PROJECTS),
      supabase
        .from("supplier_references")
        .select("id,referrer_name,organisation_name,relationship,project_summary")
        .eq("profile_id", id)
        .order("created_at", { ascending: false })
        .limit(MAX_PUBLIC_REFERENCES),
    ])
  if (!canonical) notFound()
  if (documentsResult.error) notFound()

  const verificationState = deriveSupplierVerificationState((documentsResult.data ?? []) as unknown as SupplierDocument[])
  const attestations = (attestationsResult.data ?? []) as VerificationAttestation[]

  const keyCertifications = ((certificationsResult.data ?? []) as Array<{
    id: string
    name: string
    issuing_body: string | null
    expiry_date: string | null
    status: string
    evidence_url: string | null
  }>)
    .map((row) => ({ ...row, displayStatus: displayStatusFor(row.status as PassportReviewStatus, row.expiry_date) }))
    .filter((row) => isPublicPassportCredentialStatus(row.displayStatus))
    .slice(0, MAX_KEY_CERTIFICATIONS)
    .map((row) => ({
      id: row.id,
      name: row.name,
      issuing_body: row.issuing_body,
      expiry_date: row.expiry_date,
      evidence_url: passportEvidenceUrl(row.evidence_url),
      displayStatus: row.displayStatus,
    }))

  const keyLicences = ((licencesResult.data ?? []) as Array<{
    id: string
    licence_type: string
    issuing_body: string | null
    expiry_date: string | null
    status: string
    evidence_url: string | null
  }>)
    .map((row) => ({ ...row, displayStatus: displayStatusFor(row.status as PassportReviewStatus, row.expiry_date) }))
    .filter((row) => isPublicPassportCredentialStatus(row.displayStatus))
    .slice(0, MAX_KEY_CERTIFICATIONS)
    .map((row) => ({
      id: row.id,
      licence_type: row.licence_type,
      issuing_body: row.issuing_body,
      expiry_date: row.expiry_date,
      evidence_url: passportEvidenceUrl(row.evidence_url),
      displayStatus: row.displayStatus,
    }))

  const passport: PassportSummary = {
    complianceSnapshot: derivePassportComplianceSnapshot({
      verification: verificationState,
      documents: (documentsResult.data ?? []) as unknown as SupplierDocument[],
      attestations,
      csdExpiryDate: data.csd_expiry_date,
      bbbeeExpiryDate: data.bbbee_expiry_date,
      taxExpiryDate: data.tax_expiry_date,
    }),
    certifications: keyCertifications,
    licences: keyLicences,
    serviceCategories: (serviceCategoriesResult.data ?? []) as PassportServiceCategorySummary[],
    operatingAreas: (operatingAreasResult.data ?? []) as PassportOperatingAreaSummary[],
    projects: (projectsResult.data ?? []) as PassportProjectSummary[],
    references: (referencesResult.data ?? []) as PassportReferenceSummary[],
  }

  return {
    ...(data as Omit<PublicSupplierProfile, "verification_state" | "director_verified" | "passport">),
    smart_score: canonical.result.score,
    director_verified: deriveDirectorVerificationState(attestations).approved,
    verification_state: verificationState,
    passport,
  }
}

function asNumber(value: number | string | null | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (value === null || value === undefined || value === "") return null
  const parsed = Number(String(value).replace(/[^\d.]/g, ""))
  return Number.isFinite(parsed) ? parsed : null
}

function formatScore(value: number | string | null | undefined): string {
  const score = asNumber(value)
  if (score === null) return "-"
  return String(Math.round(Math.min(100, Math.max(0, score))))
}

function statusLabel(status: string | null | undefined): string {
  return status?.trim() || "Pending Review"
}

function displayScore(value: number | string | null | undefined, verified: boolean, provisional: boolean): string {
  // Deliberately suppress the numeric SmartScore whenever a document is
  // still outstanding (provisional) or the supplier isn't fully verified —
  // do not "simplify" this back to always showing the stored score. This is
  // the exact bug we fixed: a supplier previously showed a SmartScore of 100
  // while their tax clearance was still unverified.
  if (!verified || provisional) return "In review"
  return formatScore(value)
}

function coverGradient(name: string | null | undefined): string {
  const firstLetter = name?.trim().charAt(0).toUpperCase() || "S"
  const [from, to] = COVER_GRADIENTS[firstLetter.charCodeAt(0) % COVER_GRADIENTS.length]
  return `linear-gradient(135deg, ${from}, ${to})`
}

function valueOrDash(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "-"
  return String(value)
}

function primaryProvince(supplier: PublicSupplierProfile): string {
  return supplier.province?.trim() || supplier.provinces?.find(Boolean)?.trim() || "National"
}

function externalHref(value: string | null | undefined): string | null {
  const href = value?.trim()
  if (!href) return null
  return /^https?:\/\//i.test(href) ? href : `https://${href}`
}

function ExternalLinkIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  )
}

function VerificationMark({ active }: { active: boolean }) {
  return (
    <span
      className={[
        "flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold",
        active ? "bg-[#E1F5EE] text-[#085041]" : "bg-stone-100 text-stone-400",
      ].join(" ")}
      aria-label={active ? "Verified" : "Not verified"}
    >
      {active ? <span aria-hidden="true">&#10003;</span> : <span aria-hidden="true">-</span>}
    </span>
  )
}

function VerificationRow({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-stone-100 py-3 last:border-b-0">
      <span className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-stone-600">{label}</span>
      <VerificationMark active={active} />
    </div>
  )
}

function VerificationPill({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={[
        "rounded-full px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em]",
        active ? "bg-[#E1F5EE] text-[#085041]" : "bg-stone-100 text-stone-500",
      ].join(" ")}
    >
      {label}
    </span>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-[#fbf8f1] p-4">
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-stone-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[#1f2f28]">{value}</p>
    </div>
  )
}

const PASSPORT_STATUS_STYLES: Record<PassportDisplayStatus, string> = {
  "Self-reported": "bg-sky-100 text-sky-800",
  Verified: "bg-[#E1F5EE] text-[#085041]",
  "Pending review": "bg-amber-100 text-amber-800",
  "Expiring soon": "bg-amber-100 text-amber-800",
  Expired: "bg-rose-100 text-rose-700",
  Rejected: "bg-rose-100 text-rose-700",
  Missing: "bg-stone-100 text-stone-500",
}

function PassportStatusChip({ status }: { status: PassportDisplayStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.1em] ${PASSPORT_STATUS_STYLES[status]}`}>
      {status}
    </span>
  )
}

function InfoChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-stone-200 bg-[#fbf8f1] px-3 py-1.5 text-xs font-semibold text-[#1f2f28]">
      {children}
    </span>
  )
}

function PassportSummarySection({ passport }: { passport: PassportSummary }) {
  const hasCertsOrLicences = passport.certifications.length > 0 || passport.licences.length > 0
  const hasProjectsOrReferences = passport.projects.length > 0 || passport.references.length > 0

  return (
    <>
      <div className="rounded-lg border border-stone-200 bg-white p-5 sm:p-6">
        <h2 className="font-display text-xl font-medium text-[#1a3a2a]">Compliance snapshot</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {passport.complianceSnapshot.map((item) => (
            <div key={item.key} className="flex items-center justify-between gap-2 rounded-lg border border-stone-200 bg-[#fbf8f1] p-3">
              <div className="min-w-0">
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-stone-500">{item.label}</p>
                {item.informational && (
                  <p className="mt-0.5 text-[0.58rem] font-semibold uppercase tracking-[0.04em] text-stone-400">Informational</p>
                )}
              </div>
              <PassportStatusChip status={item.status} />
            </div>
          ))}
        </div>
      </div>

      {(passport.serviceCategories.length > 0 || passport.operatingAreas.length > 0) && (
        <div className="rounded-lg border border-stone-200 bg-white p-5 sm:p-6">
          <h2 className="font-display text-xl font-medium text-[#1a3a2a]">Where we work</h2>
          {passport.serviceCategories.length > 0 && (
            <div className="mt-4">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-stone-500">Service categories</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {passport.serviceCategories.map((category) => (
                  <InfoChip key={category.id}>
                    {category.category_name}
                    {category.category_group ? ` (${category.category_group})` : ""}
                  </InfoChip>
                ))}
              </div>
            </div>
          )}
          {passport.operatingAreas.length > 0 && (
            <div className="mt-4">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-stone-500">Operating areas</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {passport.operatingAreas.map((area) => (
                  <InfoChip key={area.id}>
                    {[area.province, area.municipality || area.city, area.region].filter(Boolean).join(" · ") || "Area"}
                    {area.is_primary ? " ★" : ""}
                    {area.service_radius_km ? ` · ${area.service_radius_km}km radius` : ""}
                  </InfoChip>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {hasCertsOrLicences && (
        <div className="rounded-lg border border-stone-200 bg-white p-5 sm:p-6">
          <h2 className="font-display text-xl font-medium text-[#1a3a2a]">Key certifications &amp; licences</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
            Unless marked Verified, these items were supplied by the business and have not been independently verified by AiForm Procure.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {passport.certifications.map((cert) => (
              <div key={cert.id} className="rounded-lg border border-stone-200 bg-[#fbf8f1] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-[#1f2f28]">{cert.name}</p>
                  <PassportStatusChip status={cert.displayStatus} />
                </div>
                <p className="mt-1 text-xs text-stone-600">{cert.issuing_body || "Certification"}</p>
                {cert.evidence_url && (
                  <a href={cert.evidence_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#1a3a2a] hover:text-[#8c6a2f]">
                    View supporting evidence <ExternalLinkIcon />
                  </a>
                )}
              </div>
            ))}
            {passport.licences.map((licence) => (
              <div key={licence.id} className="rounded-lg border border-stone-200 bg-[#fbf8f1] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-[#1f2f28]">{licence.licence_type}</p>
                  <PassportStatusChip status={licence.displayStatus} />
                </div>
                <p className="mt-1 text-xs text-stone-600">{licence.issuing_body || "Licence"}</p>
                {licence.evidence_url && (
                  <a href={licence.evidence_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#1a3a2a] hover:text-[#8c6a2f]">
                    View supporting evidence <ExternalLinkIcon />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {hasProjectsOrReferences && (
        <div className="rounded-lg border border-stone-200 bg-white p-5 sm:p-6">
          <h2 className="font-display text-xl font-medium text-[#1a3a2a]">Track record</h2>
          {passport.projects.length > 0 && (
            <div className="mt-4 space-y-3">
              {passport.projects.map((project) => (
                <div key={project.id} className="rounded-lg border border-stone-200 bg-[#fbf8f1] p-4">
                  <p className="text-sm font-semibold text-[#1f2f28]">{project.project_name}</p>
                  <p className="mt-1 text-xs text-stone-600">
                    {[project.client_name, project.sector, project.location].filter(Boolean).join(" · ") || "Past project"}
                  </p>
                  {project.description && <p className="mt-2 text-xs leading-6 text-stone-700">{project.description}</p>}
                </div>
              ))}
            </div>
          )}
          {passport.references.length > 0 && (
            <div className="mt-4 space-y-3">
              {passport.references.map((reference) => (
                <div key={reference.id} className="rounded-lg border border-stone-200 bg-[#fbf8f1] p-4">
                  <p className="text-sm font-semibold text-[#1f2f28]">{reference.referrer_name}</p>
                  <p className="mt-1 text-xs text-stone-600">
                    {[reference.organisation_name, reference.relationship].filter(Boolean).join(" · ") || "Reference"}
                  </p>
                  {reference.project_summary && <p className="mt-2 text-xs leading-6 text-stone-700">{reference.project_summary}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}

export default async function SupplierProfilePage({ params }: Props) {
  const { id } = await params
  const supplier = await getSupplier(id)
  const websiteHref = externalHref(supplier.website)
  const linkedinHref = externalHref(supplier.linkedin_url)
  const directoryStatus = getSupplierDirectoryVerificationStatus(
    supplier.verification_state,
    supplier.director_verified,
  )
  const verifiedSupplier = directoryStatus === "verified"
  const provisionallyVerified = directoryStatus === "provisional"
  const supplierStatus = statusLabel(supplier.verification_status)
  const bankVerified = supplier.verification_state.banking.approved
  const supplierName = supplier.business_name?.trim() || "Supplier profile"
  const contactName =
    supplier.preferred_name?.trim() ||
    supplier.full_name?.trim() ||
    supplier.email?.trim() ||
    "Supplier contact"

  return (
    <main className="min-h-screen bg-[#f8f4ec] text-[#1f2f28]">
      <header className="px-4 pt-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/suppliers"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#1a3a2a] transition hover:text-[#8c6a2f]"
          >
            <span aria-hidden="true">&larr;</span>
            Supplier Directory
          </Link>

          <div className="mt-5 overflow-hidden rounded-lg border border-stone-200 bg-white">
            <div className="relative h-[180px]">
              {supplier.company_logo_url ? (
                <Image
                  src={supplier.company_logo_url}
                  alt={`${supplierName} cover image`}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="(min-width: 1152px) 1152px, 100vw"
                />
              ) : (
                <div className="h-full w-full" style={{ background: coverGradient(supplierName) }} />
              )}
              <div className="absolute bottom-0 left-6 translate-y-1/2">
                <ProfileImage
                  src={supplier.avatar_url}
                  alt={`${contactName} avatar`}
                  className="h-24 w-24 rounded-full border-[3px] border-white object-cover shadow-lg"
                  fallbackClassName="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-[3px] border-white bg-[#E7F8F2] text-2xl font-bold text-[#085041] shadow-lg"
                  fallbackText={initialsFromName(contactName, "S")}
                  seedName={contactName}
                />
              </div>
            </div>

            <div className="px-6 pb-6 pt-14">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p
                    className="text-[0.72rem] font-bold uppercase tracking-[0.18em]"
                    style={{ color: provisionallyVerified || verifiedSupplier ? GOLD : "#8a6a2f" }}
                  >
                    {provisionallyVerified ? (
                      "Provisionally Approved"
                    ) : verifiedSupplier ? (
                      <>
                        <span aria-hidden="true">&#10003;</span> Verified Supplier
                      </>
                    ) : (
                      supplierStatus
                    )}
                  </p>
                  <h1 className="mt-2 font-display text-[28px] font-medium leading-tight text-[#1a3a2a] sm:text-4xl">
                    {supplierName}
                  </h1>
                  <p className="mt-2 text-sm text-stone-600">
                    {[supplier.industry, primaryProvince(supplier)].filter(Boolean).join(" | ")}
                  </p>
                </div>
                <div className="w-fit rounded-lg border bg-white px-4 py-3 text-center" style={{ borderColor: GOLD }}>
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em]" style={{ color: GOLD }}>SmartScore</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-[#1a3a2a]">{displayScore(supplier.smart_score, verifiedSupplier, provisionallyVerified)}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <VerificationPill label="CSD" active={supplier.verification_state.csd.approved} />
                <VerificationPill label="BBBEE" active={supplier.verification_state.bbbee.approved} />
                <VerificationPill label="Tax" active={supplier.verification_state.tax.approved} />
                <VerificationPill label="Banking" active={bankVerified} />
                <VerificationPill label="Director" active={Boolean(supplier.director_verified)} />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] lg:px-8">
        <section className="space-y-6">
          <div className="rounded-lg border border-stone-200 bg-white p-5 sm:p-6">
            <h2 className="font-display text-xl font-medium text-[#1a3a2a]">Overview</h2>
            <p className="mt-4 text-sm leading-7 text-stone-700">
              {supplier.description?.trim() || "No description provided."}
            </p>
          </div>

          <div className="rounded-lg border border-stone-200 bg-white p-5 sm:p-6">
            <h2 className="font-display text-xl font-medium text-[#1a3a2a]">Supplier details</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <DetailItem label="Industry" value={valueOrDash(supplier.industry)} />
              <DetailItem label="Province" value={primaryProvince(supplier)} />
              <DetailItem label="Founded year" value={valueOrDash(supplier.founded_year)} />
              <DetailItem label="Employee count" value={valueOrDash(supplier.employee_count)} />
            </div>
          </div>

          {(websiteHref || linkedinHref) && (
            <div className="rounded-lg border border-stone-200 bg-white p-5 sm:p-6">
              <h2 className="font-display text-xl font-medium text-[#1a3a2a]">Links</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                {websiteHref && (
                  <a
                    href={websiteHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-[#c8a060]/50 bg-[#f8f4ec] px-4 py-2 text-sm font-semibold text-[#1a3a2a] transition hover:border-[#c8a060] hover:bg-[#fffaf0]"
                  >
                    Website
                    <ExternalLinkIcon />
                  </a>
                )}
                {linkedinHref && (
                  <a
                    href={linkedinHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-[#c8a060]/50 bg-[#f8f4ec] px-4 py-2 text-sm font-semibold text-[#1a3a2a] transition hover:border-[#c8a060] hover:bg-[#fffaf0]"
                  >
                    LinkedIn
                    <ExternalLinkIcon />
                  </a>
                )}
              </div>
            </div>
          )}

          <PassportSummarySection passport={supplier.passport} />
        </section>

        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-lg border bg-white p-5 text-center" style={{ borderColor: GOLD }}>
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em]" style={{ color: GOLD }}>
              SmartScore
            </p>
            <p className="mt-3 font-display text-5xl font-medium leading-none text-[#1a3a2a]">{displayScore(supplier.smart_score, verifiedSupplier, provisionallyVerified)}</p>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              {provisionallyVerified
                ? "Provisionally approved — one verification category remains in review"
                : verifiedSupplier
                  ? "Independently verified by AiForm Procure"
                  : `Supplier status: ${supplierStatus}`}
            </p>
          </div>

          <div className="rounded-lg border border-stone-200 bg-white p-5">
            <h2 className="font-display text-xl font-medium text-[#1a3a2a]">Verification steps</h2>
            <div className="mt-3">
              <VerificationRow label="CSD" active={supplier.verification_state.csd.approved} />
              <VerificationRow label="BBBEE" active={supplier.verification_state.bbbee.approved} />
              <VerificationRow label="TAX" active={supplier.verification_state.tax.approved} />
              <VerificationRow label="BANKING" active={bankVerified} />
              <VerificationRow label="DIRECTOR" active={Boolean(supplier.director_verified)} />
            </div>
          </div>

          {(supplier.bbbee_level || supplier.cidb_grade) && (
            <div className="rounded-lg border border-stone-200 bg-white p-5">
              <h2 className="font-display text-xl font-medium text-[#1a3a2a]">Credentials</h2>
              <div className="mt-4 space-y-3">
                {supplier.bbbee_level && <DetailItem label="BBBEE Level" value={supplier.bbbee_level} />}
                {supplier.cidb_grade && <DetailItem label="CIDB Grade" value={supplier.cidb_grade} />}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-stone-200 bg-white p-5">
            <Link
              href="/auth/login"
              className="block rounded-lg px-4 py-3 text-center text-sm font-bold transition hover:brightness-105"
              style={{ backgroundColor: GOLD, color: FOREST }}
            >
              Send RFQ
            </Link>
            <p className="mt-3 text-center text-xs leading-5 text-stone-500">Login as a buyer to send this supplier an RFQ</p>
          </div>
        </aside>
      </div>
    </main>
  )
}
