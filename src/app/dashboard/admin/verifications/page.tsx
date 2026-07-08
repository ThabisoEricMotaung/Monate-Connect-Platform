"use client"

import { useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { useRouter } from "next/navigation"
import SignedDocumentLink from "@/components/SignedDocumentLink"
import type { SmartScoreResult } from "@/lib/smartScore"
import {
  getCanonicalSupplierSmartScoreBatch,
} from "@/lib/supplierScoring"
import { supabase } from "@/lib/supabase"
import {
  activeSupplierDocuments,
  applySupplierDocumentsToProfiles,
  fetchSupplierDocumentsByProfileIds,
  latestSupplierDocuments,
  supplierDocumentLabels,
  type SupplierDocument,
  type SupplierDocumentStatus,
  type SupplierDocumentType,
} from "@/lib/supplierDocuments"

type FilterMode = "all" | "pending" | "verified"
type VerificationStep = "csd" | "bbbee" | "tax" | "banking" | "director"
type BulkAction = "verify" | "reject" | "pending"
type PendingAction = { supplierId: string; key: string }
type InlineFeedback = { message: string; type: "success" | "error" }

type SupplierProfile = {
  id: string
  business_name: string | null
  full_name: string | null
  email: string | null
  phone: string | null
  description: string | null
  industry: string | null
  province: string | null
  provinces: string[] | string | null
  verification_status: string | null
  csd_number: string | null
  csd_verified: boolean | null
  csd_document_url: string | null
  bbbee_level: string | null
  bbbee_verified: boolean | null
  bbbee_document_url: string | null
  bbbee_expiry_date: string | null
  tax_verified: boolean | null
  tax_status?: string | null
  tax_clearance_url: string | null
  tax_document_url: string | null
  tax_expiry_date: string | null
  bank_verified: boolean | null
  banking_verified: boolean | null
  director_verified: boolean | null
  company_registration: string | null
  company_registration_url: string | null
  cidb_document_url?: string | null
  capability_statement_url: string | null
  supplier_documents?: SupplierDocument[]
  smart_score: number | string | null
  created_at: string | null
  updated_at?: string | null
  verification_notes: string | null
  is_deleted?: boolean | null
  deleted_at?: string | null
}

type BankDetails = {
  supplier_id: string | null
  bank_name: string | null
  account_number: string | null
  verification_status: string | null
}

const PENDING_QUEUE_STATUSES = ["pending review", "pending", "submitted"]
const VERIFICATION_QUEUE_STATUS_FILTER = [
  "verification_status.ilike.Pending Review",
  "verification_status.ilike.pending",
  "verification_status.ilike.Submitted",
  "verification_status.ilike.Verified",
].join(",")

const profileSelect = [
  "id",
  "business_name",
  "full_name",
  "email",
  "phone",
  "description",
  "industry",
  "province",
  "provinces",
  "verification_status",
  "csd_number",
  "csd_verified",
  "csd_document_url",
  "bbbee_level",
  "bbbee_verified",
  "bbbee_document_url",
  "bbbee_expiry_date",
  "tax_verified",
  "tax_status",
  "tax_clearance_url",
  "tax_document_url",
  "tax_expiry_date",
  "bank_verified",
  "banking_verified",
  "director_verified",
  "company_registration",
  "company_registration_url",
  "cidb_document_url",
  "capability_statement_url",
  "smart_score",
  "created_at",
  "updated_at",
  "verification_notes",
  "is_deleted",
  "deleted_at",
].join(", ")

const STEP_LABELS: Record<VerificationStep, string> = {
  csd: "CSD",
  bbbee: "BBBEE",
  tax: "Tax",
  banking: "Banking",
  director: "Director",
}

type ChecklistItem = {
  key: string
  label: string
  shortLabel: string
  verifyLink?: { label: string; href: string }
}

// Document category each step's checklist result should be recorded against.
const STEP_DOCUMENT_TYPE: Record<VerificationStep, SupplierDocumentType> = {
  csd: "csd",
  bbbee: "bbbee",
  tax: "tax_clearance",
  banking: "bank_letter",
  director: "cipc",
}

// Review-aid checklists shown per document category. These are a lightweight
// UI nudge only — not a persisted data model. On Approve, whichever items are
// checked are summarised into the matching supplier_documents.review_notes row.
const CHECKLIST_ITEMS: Record<VerificationStep, ChecklistItem[]> = {
  csd: [
    { key: "number-matches", label: "CSD/MAAA number present and matches profile", shortLabel: "number matches" },
    {
      key: "name-matches",
      label: "Company name on document matches registered business name",
      shortLabel: "name matches",
    },
    { key: "status-active", label: "Status shown as Active", shortLabel: "status active" },
  ],
  bbbee: [
    { key: "cert-number", label: "Certificate/tracking number present", shortLabel: "cert number present" },
    {
      key: "name-matches",
      label: "Company name matches registered business name",
      shortLabel: "name matches",
    },
    { key: "level-matches", label: "BBBEE level stated matches profile", shortLabel: "level matches" },
    { key: "not-expired", label: "Expiry date has not passed", shortLabel: "not expired" },
    {
      key: "legit-issuer",
      label:
        "Issued by legitimate accredited body (SANAS-accredited agency for full ratings, or correct DTIC EME/QSE self-affidavit template for smaller entities)",
      shortLabel: "legitimate issuer",
    },
  ],
  tax: [
    {
      key: "ref-number",
      label: "Tax reference number present and matches profile",
      shortLabel: "ref number matches",
    },
    { key: "name-matches", label: "Company name matches", shortLabel: "name matches" },
    {
      key: "sars-verified",
      label:
        "Verified via SARS TCS PIN — not just a static PDF, since SARS compliance status is live, not static",
      shortLabel: "verified via SARS TCS",
      verifyLink: {
        label: "Verify externally ->",
        href: "https://tools.sars.gov.za/sarsonlinequery/tcsverify",
      },
    },
    { key: "green-status", label: "Not expired / result is Green (compliant)", shortLabel: "not expired / green" },
  ],
  banking: [
    {
      key: "real-letter",
      label: "Real bank confirmation letter present (not just typed account details)",
      shortLabel: "real bank letter",
    },
    {
      key: "holder-matches",
      label: "Account holder name matches registered business name exactly",
      shortLabel: "holder name matches",
    },
  ],
  director: [
    { key: "reg-number", label: "Registration number matches profile", shortLabel: "reg number matches" },
    { key: "name-matches", label: "Company name matches", shortLabel: "name matches" },
    { key: "director-names", label: "Director names legible/present", shortLabel: "director names present" },
    {
      key: "cipc-verified",
      label: 'Verified via CIPC BizPortal BizProfile — status shows "In Business"',
      shortLabel: "verified via CIPC BizProfile",
      verifyLink: {
        label: "Verify externally ->",
        href: "https://www.bizportal.gov.za/bizprofile.aspx",
      },
    },
  ],
}

function normalizeBool(value: boolean | null | undefined): boolean {
  return value === true
}

function isFullyVerified(profile: SupplierProfile): boolean {
  return Boolean(
    profile.csd_verified &&
      profile.bbbee_verified &&
      profile.tax_verified &&
      profile.bank_verified,
  )
}

function normalizedVerificationStatus(profile: SupplierProfile): string {
  return profile.verification_status?.trim().toLowerCase() ?? ""
}

function isPendingQueueProfile(profile: SupplierProfile): boolean {
  return PENDING_QUEUE_STATUSES.includes(normalizedVerificationStatus(profile))
}

function isVerifiedQueueProfile(profile: SupplierProfile): boolean {
  return normalizedVerificationStatus(profile) === "verified"
}

function hasValue(value: string | null | undefined): boolean {
  return Boolean(value?.trim())
}

function isExpired(dateValue: string | null): boolean {
  if (!dateValue) return false
  const expiry = new Date(dateValue)
  if (Number.isNaN(expiry.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  expiry.setHours(0, 0, 0, 0)
  return expiry < today
}

function formatDate(dateValue: string | null): string {
  if (!dateValue) return "-"
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function maskAccountNumber(accountNumber: string | null): string {
  if (!accountNumber) return "-"
  const normalized = accountNumber.replace(/\s/g, "")
  if (normalized.length <= 4) return normalized
  return `${"*".repeat(Math.max(0, normalized.length - 4))}${normalized.slice(-4)}`
}

function normalizeProvinces(value: SupplierProfile["provinces"]): string[] | null {
  if (Array.isArray(value)) return value
  if (typeof value === "string") {
    return value.split(/[,;|/]+/).map((item) => item.trim()).filter(Boolean)
  }
  return null
}

function documentLink(url: string | null) {
  if (!url) return null

  return (
    <SignedDocumentLink value={url} bucket="supplier-documents" className="text-xs font-semibold text-accent underline-offset-4 transition hover:text-accent-strong hover:underline">
      Open document
    </SignedDocumentLink>
  )
}

function chipClass(verified: boolean, submitted: boolean): string {
  if (verified) return "border-success bg-success-soft text-success"
  if (submitted) return "border-warning bg-warning-soft text-warning"
  return "border-panel bg-panel text-muted"
}

function stepSubmitted(step: VerificationStep, profile: SupplierProfile, bank?: BankDetails): boolean {
  if (step === "csd") return hasValue(profile.csd_number) || hasValue(profile.csd_document_url)
  if (step === "bbbee") return hasValue(profile.bbbee_level) || hasValue(profile.bbbee_document_url)
  if (step === "tax") return hasValue(profile.tax_clearance_url ?? profile.tax_document_url)
  if (step === "banking") return hasValue(bank?.bank_name) || hasValue(bank?.account_number)
  return hasValue(profile.company_registration) || hasValue(profile.company_registration_url)
}

function stepVerified(step: VerificationStep, profile: SupplierProfile): boolean {
  if (step === "csd") return normalizeBool(profile.csd_verified)
  if (step === "bbbee") return normalizeBool(profile.bbbee_verified)
  if (step === "tax") return normalizeBool(profile.tax_verified)
  if (step === "banking") return normalizeBool(profile.bank_verified)
  return normalizeBool(profile.director_verified)
}

function bankStatusForVerified(verified: boolean): string {
  return verified ? "verified" : "pending"
}

function StatusChip({
  label,
  verified,
  submitted,
}: {
  label: string
  verified: boolean
  submitted: boolean
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.12em] ${chipClass(
        verified,
        submitted,
      )}`}
    >
      {label}
    </span>
  )
}

function ActionButton({
  children,
  disabled,
  loading,
  onClick,
  tone = "default",
  emphasize = false,
}: {
  children: ReactNode
  disabled?: boolean
  loading?: boolean
  onClick: () => void
  tone?: "default" | "danger"
  emphasize?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={onClick}
      className={`${
        tone === "danger"
          ? "rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50"
          : "rounded-md border border-accent bg-accent px-3 py-1.5 text-xs font-semibold text-button transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
      } ${emphasize ? "ring-2 ring-success/70" : ""}`}
    >
      {loading ? (
        <span className="inline-flex items-center gap-1.5">
          <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 22 6.477 22 12h-4z" />
          </svg>
          Saving…
        </span>
      ) : children}
    </button>
  )
}

function InlineFeedbackBadge({ feedback }: { feedback: InlineFeedback | undefined }) {
  if (!feedback) return null
  const isSuccess = feedback.type === "success"
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold ${
        isSuccess ? "text-success" : "text-rose-600"
      }`}
    >
      {isSuccess ? (
        <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      )}
      {feedback.message}
    </span>
  )
}

function DetailLine({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-heading">{value || "-"}</p>
    </div>
  )
}

function ReviewChecklist({
  profileId,
  step,
  items,
  checklistState,
  onToggleItem,
}: {
  profileId: string
  step: VerificationStep
  items: ChecklistItem[]
  checklistState: Record<string, boolean>
  onToggleItem: (itemKey: string) => void
}) {
  return (
    <div className="mt-3 rounded-lg border border-panel bg-card p-3">
      <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-muted">Review checklist</p>
      <ul className="mt-2 space-y-2">
        {items.map((item) => {
          const itemKey = `${profileId}:${step}:${item.key}`
          const checked = Boolean(checklistState[itemKey])
          const inputId = `checklist-${itemKey}`
          return (
            <li key={item.key} className="flex items-start gap-2.5">
              <input
                type="checkbox"
                id={inputId}
                checked={checked}
                onChange={() => onToggleItem(itemKey)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-panel accent-[var(--accent)]"
              />
              <label htmlFor={inputId} className="text-sm leading-5 text-secondary">
                {item.label}
                {item.verifyLink && (
                  <>
                    {" "}
                    <a
                      href={item.verifyLink.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-accent underline-offset-4 hover:underline"
                    >
                      {item.verifyLink.label}
                    </a>
                  </>
                )}
              </label>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function supplierDisplayName(profile: SupplierProfile): string {
  if (profile.is_deleted) return "Deleted User"
  return profile.business_name || profile.full_name || "Unnamed supplier"
}

function SkeletonQueue() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-xl border border-panel bg-card p-5 shadow-panel">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div className="h-4 w-48 animate-pulse rounded bg-panel" />
              <div className="h-3 w-64 max-w-full animate-pulse rounded bg-panel" />
            </div>
            <div className="h-8 w-20 animate-pulse rounded-md bg-panel" />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((__, chipIndex) => (
              <div key={chipIndex} className="h-7 w-20 animate-pulse rounded-full bg-panel" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AdminVerificationQueuePage() {
  const router = useRouter()
  const [profiles, setProfiles] = useState<SupplierProfile[]>([])
  const [documentsBySupplier, setDocumentsBySupplier] = useState<Record<string, SupplierDocument[]>>({})
  const [banksBySupplier, setBanksBySupplier] = useState<Record<string, BankDetails>>({})
  const [notesBySupplier, setNotesBySupplier] = useState<Record<string, string>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterMode>("all")
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [inlineFeedback, setInlineFeedback] = useState<Record<string, InlineFeedback>>({})
  const [scoreHighlight, setScoreHighlight] = useState<Record<string, boolean>>({})
  const [scoreResults, setScoreResults] = useState<Record<string, SmartScoreResult | null>>({})
  const [refreshKey, setRefreshKey] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<SupplierProfile | null>(null)
  const [deletePending, setDeletePending] = useState(false)
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({})
  const [checklistOpen, setChecklistOpen] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let cancelled = false

    async function loadQueue() {
      if (!supabase) {
        setErrorMessage("Supabase environment variables are not configured.")
        setLoading(false)
        return
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        router.replace("/dashboard")
        return
      }

      const { data: currentProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", user.id)
        .maybeSingle()

      if (profileError || String(currentProfile?.role ?? "").toLowerCase() !== "admin") {
        router.replace("/dashboard")
        return
      }

      const { data, error } = await supabase
        .from("profiles")
        .select(profileSelect)
        .eq("role", "supplier")
        .or(VERIFICATION_QUEUE_STATUS_FILTER)
        .order("created_at", { ascending: false })

      if (error) {
        if (!cancelled) {
          setErrorMessage(error.message)
          setLoading(false)
        }
        return
      }

      const supplierProfiles = (((data ?? []) as unknown) as SupplierProfile[]).filter(
        (profile) => isPendingQueueProfile(profile) || isVerifiedQueueProfile(profile),
      )
      const supplierIds = supplierProfiles.map((profile) => profile.id)
      let bankMap: Record<string, BankDetails> = {}
      let documentMap: Record<string, SupplierDocument[]> = {}

      if (supplierIds.length > 0) {
        const [bankResult, documentResult] = await Promise.all([
          supabase
            .from("supplier_bank_details")
            .select("bank_name, account_number, verification_status, supplier_id")
            .in("supplier_id", supplierIds),
          fetchSupplierDocumentsByProfileIds(supplierIds),
        ])

        if (bankResult.error) {
          if (!cancelled) {
            setErrorMessage(bankResult.error.message)
            setLoading(false)
          }
          return
        }
        if (documentResult.error) {
          if (!cancelled) {
            setErrorMessage(documentResult.error)
            setLoading(false)
          }
          return
        }

        documentMap = documentResult.documentsByProfile
        bankMap = (((bankResult.data ?? []) as unknown) as BankDetails[]).reduce<Record<string, BankDetails>>(
          (map, bank) => {
            if (!bank.supplier_id || map[bank.supplier_id]) return map
            map[bank.supplier_id] = bank
            return map
          },
          {},
        )
      }

      const hydratedProfiles = applySupplierDocumentsToProfiles(supplierProfiles, documentMap)
      let canonicalProfiles = hydratedProfiles
      let scoreResultMap: Record<string, SmartScoreResult | null> = {}

      if (supplierIds.length > 0) {
        try {
          const scorerProfiles = hydratedProfiles.map((profile) => ({
            ...profile,
            provinces: normalizeProvinces(profile.provinces),
          }))
          const canonicalScores = await getCanonicalSupplierSmartScoreBatch({
            supplierIds,
            client: supabase,
            profiles: scorerProfiles,
          })
          canonicalProfiles = hydratedProfiles.map((profile) => ({
            ...profile,
            smart_score: canonicalScores[profile.id]?.result.score ?? profile.smart_score,
          }))
          scoreResultMap = Object.fromEntries(
            hydratedProfiles.map((profile) => [
              profile.id,
              canonicalScores[profile.id]?.result ?? null,
            ])
          )
        } catch (scoreError) {
          console.warn("Canonical SmartScore queue load failed:", scoreError)
        }
      }

      if (!cancelled) {
        setProfiles(canonicalProfiles)
        setDocumentsBySupplier(documentMap)
        setBanksBySupplier(bankMap)
        setScoreResults(scoreResultMap)
        setNotesBySupplier(
          supplierProfiles.reduce<Record<string, string>>((notes, profile) => {
            notes[profile.id] = profile.verification_notes ?? ""
            return notes
          }, {}),
        )
        setLoading(false)
      }
    }

    loadQueue()

    return () => {
      cancelled = true
    }
  }, [router, refreshKey])

  const counts = useMemo(() => {
    const verified = profiles.filter(isVerifiedQueueProfile).length
    return {
      pending: profiles.filter(isPendingQueueProfile).length,
      verified,
    }
  }, [profiles])

  const filteredProfiles = useMemo(() => {
    if (filter === "verified") return profiles.filter(isVerifiedQueueProfile)
    if (filter === "pending") return profiles.filter(isPendingQueueProfile)
    return profiles
  }, [filter, profiles])

  function setActionFeedback(supplierId: string, key: string, fb: InlineFeedback) {
    const fbKey = `${supplierId}:${key}`
    setInlineFeedback((current) => ({ ...current, [fbKey]: fb }))
    if (fb.type === "success") {
      setTimeout(() => {
        setInlineFeedback((current) => {
          const next = { ...current }
          delete next[fbKey]
          return next
        })
      }, 3000)
    }
  }

  function setScoreFlash(supplierId: string) {
    setScoreHighlight((current) => ({ ...current, [supplierId]: true }))
    setTimeout(() => {
      setScoreHighlight((current) => ({ ...current, [supplierId]: false }))
    }, 1500)
  }

  async function calculateCanonicalSmartScore(profile: SupplierProfile, bank?: BankDetails) {
    if (!supabase) {
      return 0
    }
    const canonicalScores = await getCanonicalSupplierSmartScoreBatch({
      supplierIds: [profile.id],
      client: supabase,
      profiles: [{ ...profile, provinces: normalizeProvinces(profile.provinces) }],
      banks: bank ? [bank] : undefined,
    })
    const canonical = canonicalScores[profile.id]
    if (canonical) {
      setScoreResults((current) => ({
        ...current,
        [profile.id]: canonical.result,
      }))
      return canonical.result.score
    }

    return profile.smart_score ? Number(profile.smart_score) : 0
  }

  function toggleChecklistOpen(profileId: string, step: VerificationStep) {
    const key = `${profileId}:${step}`
    setChecklistOpen((current) => ({ ...current, [key]: !current[key] }))
  }

  function toggleChecklistItem(itemKey: string) {
    setChecklistState((current) => ({ ...current, [itemKey]: !current[itemKey] }))
  }

  function buildChecklistSummary(profileId: string, step: VerificationStep): string {
    const checked = CHECKLIST_ITEMS[step].filter(
      (item) => checklistState[`${profileId}:${step}:${item.key}`],
    )
    if (checked.length === 0) return ""
    return `Checked: ${checked.map((item) => item.shortLabel).join(", ")}`
  }

  async function saveChecklistSummary(profile: SupplierProfile, step: VerificationStep, summary: string) {
    if (!supabase || !summary) return

    const documentType = STEP_DOCUMENT_TYPE[step]
    const latestDocument = latestSupplierDocuments(documentsBySupplier[profile.id])[documentType]
    if (!latestDocument) return

    const { data, error } = await supabase
      .from("supplier_documents")
      .update({ review_notes: summary })
      .eq("id", latestDocument.id)
      .select(
        "id, profile_id, document_type, file_url, storage_path, original_filename, content_type, file_size, uploaded_at, status, reviewed_at, reviewed_by, review_notes",
      )
      .single()

    if (error || !data) return

    const updatedDocument = data as SupplierDocument
    setDocumentsBySupplier((current) => ({
      ...current,
      [profile.id]: (current[profile.id] ?? []).map((item) =>
        item.id === updatedDocument.id ? updatedDocument : item,
      ),
    }))
  }

  async function updateStep(profile: SupplierProfile, step: VerificationStep, verified: boolean) {
    if (!supabase) return

    const currentProfile = profiles.find((item) => item.id === profile.id) ?? profile
    const bank = banksBySupplier[currentProfile.id]
    const nextProfile: SupplierProfile = {
      ...currentProfile,
      ...(step === "csd" ? { csd_verified: verified } : {}),
      ...(step === "bbbee" ? { bbbee_verified: verified } : {}),
      ...(step === "tax" ? { tax_verified: verified } : {}),
      ...(step === "banking" ? { bank_verified: verified } : {}),
      ...(step === "director" ? { director_verified: verified } : {}),
    }
    const nextVerificationStatus = isFullyVerified(nextProfile) ? "Verified" : "Pending Review"
    const scoreProfile = {
      ...nextProfile,
      verification_status: nextVerificationStatus,
    }
    const nextBank =
      step === "banking" && bank
        ? { ...bank, verification_status: bankStatusForVerified(verified) }
        : bank
    const nextSmartScore = await calculateCanonicalSmartScore(scoreProfile, nextBank)
    const pendingKey = `${step}-${verified ? "approve" : "revoke"}`

    setPendingAction({ supplierId: currentProfile.id, key: pendingKey })
    setErrorMessage("")

    setProfiles((current) =>
      current.map((item) =>
        item.id === currentProfile.id
          ? {
              ...scoreProfile,
              smart_score: nextSmartScore,
            }
          : item,
      ),
    )
    if (step === "banking" && nextBank) {
      setBanksBySupplier((current) => ({ ...current, [currentProfile.id]: nextBank }))
    }

    const profileUpdate = {
      ...(step === "csd" ? { csd_verified: verified } : {}),
      ...(step === "bbbee" ? { bbbee_verified: verified } : {}),
      ...(step === "tax" ? { tax_verified: verified } : {}),
      ...(step === "banking" ? { bank_verified: verified } : {}),
      ...(step === "director" ? { director_verified: verified } : {}),
      verification_status: nextVerificationStatus,
      smart_score: nextSmartScore,
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update(profileUpdate)
      .eq("id", currentProfile.id)

    if (profileError) {
      setErrorMessage(profileError.message)
      setProfiles((current) => current.map((item) => (item.id === currentProfile.id ? currentProfile : item)))
      if (step === "banking" && bank) {
        setBanksBySupplier((current) => ({ ...current, [currentProfile.id]: bank }))
      }
      setPendingAction(null)
      setActionFeedback(currentProfile.id, pendingKey, { message: "Couldn't save — try again", type: "error" })
      return
    }

    if (step === "banking") {
      const { error: bankError } = await supabase
        .from("supplier_bank_details")
        .update({ verification_status: bankStatusForVerified(verified) })
        .eq("supplier_id", currentProfile.id)

      if (bankError) {
        setErrorMessage(bankError.message)
        setPendingAction(null)
        setActionFeedback(currentProfile.id, pendingKey, {
          message: "Profile updated, but banking status update failed.",
          type: "error",
        })
        return
      }
    }

    setPendingAction(null)
    setScoreFlash(currentProfile.id)
    setActionFeedback(currentProfile.id, pendingKey, {
      message: `${STEP_LABELS[step]} ${verified ? "approved" : "revoked"}`,
      type: "success",
    })
  }

  async function updateSupplierStatus(profile: SupplierProfile, action: BulkAction) {
    if (!supabase) return

    const currentProfile = profiles.find((item) => item.id === profile.id) ?? profile
    const flagUpdates =
      action === "verify"
        ? {
            csd_verified: true,
            bbbee_verified: true,
            tax_verified: true,
            director_verified: true,
          }
        : {}
    const nextProfile: SupplierProfile = {
      ...currentProfile,
      ...flagUpdates,
    }
    const nextVerificationStatus =
      action === "reject"
        ? "Rejected"
        : action === "pending"
          ? "Pending Review"
          : isFullyVerified(nextProfile)
            ? "Verified"
            : "Pending Review"
    const scoreProfile = {
      ...nextProfile,
      verification_status: nextVerificationStatus,
    }
    const nextSmartScore = await calculateCanonicalSmartScore(scoreProfile, banksBySupplier[currentProfile.id])
    const pendingKey = `bulk-${action}`

    setPendingAction({ supplierId: currentProfile.id, key: pendingKey })
    setErrorMessage("")

    setProfiles((current) =>
      current.map((item) =>
        item.id === currentProfile.id
          ? {
              ...scoreProfile,
              smart_score: nextSmartScore,
            }
          : item,
      ),
    )
    const profileUpdate = {
      ...flagUpdates,
      verification_status: nextVerificationStatus,
      smart_score: nextSmartScore,
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update(profileUpdate)
      .eq("id", currentProfile.id)

    if (profileError) {
      setErrorMessage(profileError.message)
      setProfiles((current) => current.map((item) => (item.id === currentProfile.id ? currentProfile : item)))
      setPendingAction(null)
      setActionFeedback(currentProfile.id, pendingKey, { message: "Couldn't save — try again", type: "error" })
      return
    }

    setPendingAction(null)
    setScoreFlash(currentProfile.id)
    setActionFeedback(currentProfile.id, pendingKey, {
      message: `Supplier marked ${nextVerificationStatus}. Banking review unchanged. SmartScore updated to ${nextSmartScore}.`,
      type: "success",
    })
  }

  async function saveNote(profile: SupplierProfile) {
    if (!supabase) return

    const nextNote = notesBySupplier[profile.id] ?? ""
    const nextSmartScore = await calculateCanonicalSmartScore(profile, banksBySupplier[profile.id])
    const pendingKey = "notes"

    setPendingAction({ supplierId: profile.id, key: pendingKey })
    setErrorMessage("")

    const { error } = await supabase
      .from("profiles")
      .update({
        verification_notes: nextNote.trim() || null,
        smart_score: nextSmartScore,
      })
      .eq("id", profile.id)

    setPendingAction(null)

    if (error) {
      setErrorMessage(error.message)
      setActionFeedback(profile.id, pendingKey, { message: "Note save failed — try again", type: "error" })
      return
    }

    setProfiles((current) =>
      current.map((item) =>
        item.id === profile.id
          ? { ...item, verification_notes: nextNote.trim() || null, smart_score: nextSmartScore }
          : item,
      ),
    )
    setActionFeedback(profile.id, pendingKey, { message: "Note saved", type: "success" })
  }

  async function updateDocumentStatus(
    profile: SupplierProfile,
    document: SupplierDocument,
    status: Extract<SupplierDocumentStatus, "verified" | "rejected" | "expired" | "under_review">,
  ) {
    if (!supabase) return

    const pendingKey = `document-${document.id}-${status}`
    setPendingAction({ supplierId: profile.id, key: pendingKey })
    setErrorMessage("")

    const { data, error } = await supabase
      .from("supplier_documents")
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        review_notes: notesBySupplier[profile.id]?.trim() || document.review_notes || null,
      })
      .eq("id", document.id)
      .select("id, profile_id, document_type, file_url, storage_path, original_filename, content_type, file_size, uploaded_at, status, reviewed_at, reviewed_by, review_notes")
      .single()

    setPendingAction(null)

    if (error || !data) {
      setErrorMessage(error?.message ?? "Document status could not be updated.")
      setActionFeedback(profile.id, pendingKey, { message: "Document update failed", type: "error" })
      return
    }

    const updatedDocument = data as SupplierDocument
    setDocumentsBySupplier((current) => {
      const nextDocuments = (current[profile.id] ?? []).map((item) =>
        item.id === updatedDocument.id ? updatedDocument : item,
      )
      setProfiles((currentProfiles) =>
        applySupplierDocumentsToProfiles(currentProfiles, {
          ...current,
          [profile.id]: nextDocuments,
        }),
      )
      return { ...current, [profile.id]: nextDocuments }
    })
    setActionFeedback(profile.id, pendingKey, {
      message: `${supplierDocumentLabels[updatedDocument.document_type]} marked ${status.replace("_", " ")}`,
      type: "success",
    })
  }

  function renderDocumentHistory(profile: SupplierProfile) {
    const documents = documentsBySupplier[profile.id] ?? []
    const shownDocuments = activeSupplierDocuments(documents)

    return (
      <div className="rounded-xl border border-panel bg-surface p-4">
        <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-muted">
          Document history
        </p>
        {shownDocuments.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No supplier document rows found.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {shownDocuments.map((document) => {
              const pendingPrefix = `document-${document.id}`
              const actionPending = pendingAction?.supplierId === profile.id && pendingAction.key.startsWith(pendingPrefix)
              return (
                <div key={document.id} className="rounded-lg border border-panel bg-card p-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-heading">{supplierDocumentLabels[document.document_type]}</p>
                      <p className="mt-1 truncate text-xs text-muted">
                        {document.original_filename || document.storage_path || document.file_url}
                      </p>
                      <p className="mt-1 text-xs text-secondary">
                        Uploaded {formatDate(document.uploaded_at)} · Status: {document.status.replace("_", " ")}
                      </p>
                      {document.review_notes ? (
                        <p className="mt-2 text-xs text-secondary">Review notes: {document.review_notes}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <SignedDocumentLink value={document.file_url} bucket="supplier-documents" className="rounded-md border border-panel bg-panel px-3 py-1.5 text-xs font-semibold text-secondary transition hover:border-accent hover:text-accent">
                        Open
                      </SignedDocumentLink>
                      <ActionButton
                        loading={actionPending && pendingAction?.key.endsWith("verified")}
                        disabled={actionPending || document.status === "verified"}
                        onClick={() => updateDocumentStatus(profile, document, "verified")}
                      >
                        Verify
                      </ActionButton>
                      <ActionButton
                        tone="danger"
                        loading={actionPending && pendingAction?.key.endsWith("rejected")}
                        disabled={actionPending || document.status === "rejected"}
                        onClick={() => updateDocumentStatus(profile, document, "rejected")}
                      >
                        Reject
                      </ActionButton>
                      <button
                        type="button"
                        disabled={actionPending || document.status === "under_review"}
                        onClick={() => updateDocumentStatus(profile, document, "under_review")}
                        className="rounded-md border border-panel bg-panel px-3 py-1.5 text-xs font-semibold text-secondary transition hover:bg-card disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Under review
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {profile.cidb_document_url ? (
          <div className="mt-3 rounded-lg border border-warning/30 bg-warning-soft p-3">
            <p className="text-xs font-bold text-warning">Legacy CIDB document retained for manual review.</p>
            <div className="mt-1">{documentLink(profile.cidb_document_url)}</div>
          </div>
        ) : null}
      </div>
    )
  }

  function renderScoreBreakdown(profile: SupplierProfile) {
    const scoreResult = scoreResults[profile.id]
    if (!scoreResult?.breakdown) {
      return (
        <p className="mt-3 rounded-md border border-panel bg-panel px-3 py-2 text-xs text-muted">
          Score breakdown will appear after the canonical scorer refreshes.
        </p>
      )
    }

    return (
      <details className="mt-3 rounded-md border border-panel bg-panel p-3">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.14em] text-secondary">
          SmartScore breakdown
        </summary>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {scoreResult.breakdown.map((item) => (
            <div key={item.key} className="rounded-md bg-card px-3 py-2">
              <p className="text-[0.62rem] uppercase tracking-[0.14em] text-muted">{item.label}</p>
              <p className="mt-1 text-sm font-semibold text-heading">
                {item.earnedPoints}/{item.points}
              </p>
              <p className="mt-1 text-[0.62rem] uppercase tracking-[0.12em] text-muted">{item.status}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-md bg-card px-3 py-2 text-sm font-semibold text-heading">
          Compliance {scoreResult.complianceBase ?? 0} + activity{" "}
          {Math.round((scoreResult.activityBonus ?? 0) * 10) / 10}/{scoreResult.activityBonusCap ?? 8} ={" "}
          {scoreResult.score}
        </div>
      </details>
    )
  }

  async function deleteSupplierAccount(profile: SupplierProfile) {
    if (!supabase) return

    setDeletePending(true)
    setErrorMessage("")

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      setErrorMessage(sessionError?.message ?? "Your session has expired. Please sign in again.")
      setDeletePending(false)
      return
    }

    const response = await fetch("/api/admin/delete-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ userId: profile.id }),
    })
    const result = (await response.json()) as { success?: boolean; error?: string }

    if (!response.ok || !result.success) {
      setErrorMessage(result.error ?? "Account deletion failed.")
      setDeletePending(false)
      return
    }

    setDeleteTarget(null)
    setDeletePending(false)
    setLoading(true)
    setRefreshKey((current) => current + 1)
  }

  function renderStepRow(
    profile: SupplierProfile,
    step: VerificationStep,
    title: string,
    children: ReactNode,
    options?: { expired?: boolean },
  ) {
    const verified = stepVerified(step, profile)
    const isDeleted = profile.is_deleted === true
    const approveKey = `${step}-approve`
    const revokeKey = `${step}-revoke`
    const stepPending =
      pendingAction?.supplierId === profile.id &&
      (pendingAction.key === approveKey || pendingAction.key === revokeKey)
    const approvePending = pendingAction?.supplierId === profile.id && pendingAction.key === approveKey
    const revokePending = pendingAction?.supplierId === profile.id && pendingAction.key === revokeKey
    const stepFeedback =
      inlineFeedback[`${profile.id}:${approveKey}`] ?? inlineFeedback[`${profile.id}:${revokeKey}`]

    const checklistItems = CHECKLIST_ITEMS[step]
    const checklistKey = `${profile.id}:${step}`
    const isChecklistOpen = Boolean(checklistOpen[checklistKey])
    const checkedCount = checklistItems.filter(
      (item) => checklistState[`${profile.id}:${step}:${item.key}`],
    ).length
    const allChecked = checkedCount === checklistItems.length

    return (
      <div className="grid gap-4 rounded-xl border border-panel bg-surface p-4 md:grid-cols-[1fr_auto] md:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-heading">{title}</h3>
            <StatusChip
              label={verified ? "Verified" : stepSubmitted(step, profile, banksBySupplier[profile.id]) ? "Submitted" : "Missing"}
              verified={verified}
              submitted={stepSubmitted(step, profile, banksBySupplier[profile.id])}
            />
            {options?.expired && (
              <span className="inline-flex rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-rose-700">
                Expired
              </span>
            )}
          </div>
          <div className="mt-3 grid gap-3 text-sm text-secondary sm:grid-cols-2">{children}</div>

          <div className="mt-3">
            <button
              type="button"
              onClick={() => toggleChecklistOpen(profile.id, step)}
              className="text-xs font-semibold text-accent underline-offset-4 transition hover:text-accent-strong hover:underline"
            >
              {isChecklistOpen ? "Hide review checklist" : "Review checklist"}
              {" "}
              <span className="text-muted">
                ({checkedCount}/{checklistItems.length})
              </span>
            </button>
            {isChecklistOpen && (
              <ReviewChecklist
                profileId={profile.id}
                step={step}
                items={checklistItems}
                checklistState={checklistState}
                onToggleItem={toggleChecklistItem}
              />
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <ActionButton
            loading={approvePending}
            disabled={isDeleted || Boolean(options?.expired) || stepPending || verified}
            emphasize={allChecked}
            onClick={() => {
              const summary = buildChecklistSummary(profile.id, step)
              updateStep(profile, step, true)
              if (summary) void saveChecklistSummary(profile, step, summary)
            }}
          >
            Approve
          </ActionButton>
          <ActionButton
            tone="danger"
            loading={revokePending}
            disabled={isDeleted || stepPending || !verified}
            onClick={() => updateStep(profile, step, false)}
          >
            Revoke
          </ActionButton>
          <InlineFeedbackBadge feedback={stepFeedback} />
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">Admin / Compliance</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-heading">Verification Queue</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
              Review supplier compliance evidence, approve core checks, and keep SmartScores current.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:min-w-[280px]">
            <div className="rounded-xl border border-panel bg-surface p-4">
              <p className="text-2xl font-bold tabular-nums text-warning">{counts.pending}</p>
              <p className="mt-1 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-muted">
                Pending suppliers
              </p>
            </div>
            <div className="rounded-xl border border-panel bg-surface p-4">
              <p className="text-2xl font-bold tabular-nums text-success">{counts.verified}</p>
              <p className="mt-1 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-muted">
                Fully verified
              </p>
            </div>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-xl border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">Verification action failed</p>
          <p className="mt-1 text-xs text-rose-700">{errorMessage}</p>
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { key: "all", label: "All" },
          { key: "pending", label: "Pending" },
          { key: "verified", label: "Verified" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key as FilterMode)}
            className={`rounded-md border px-4 py-2 text-sm font-semibold transition ${
              filter === tab.key
                ? "border-accent bg-accent text-button"
                : "border-panel bg-surface text-secondary hover:border-accent hover:text-accent"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && <SkeletonQueue />}

      {!loading && filteredProfiles.length === 0 && (
        <div className="rounded-xl border border-dashed border-panel bg-card p-12 text-center shadow-panel">
          <p className="text-sm font-semibold text-heading">No suppliers in this queue.</p>
          <p className="mt-2 text-xs text-muted">Try another filter or wait for new supplier submissions.</p>
        </div>
      )}

      {!loading && filteredProfiles.length > 0 && (
        <div className="space-y-4">
          {filteredProfiles.map((profile) => {
            const bank = banksBySupplier[profile.id]
            const expanded = expandedId === profile.id
            const bbbeeExpired = isExpired(profile.bbbee_expiry_date)
            const taxLink = profile.tax_clearance_url ?? profile.tax_document_url
            const bulkPending =
              pendingAction?.supplierId === profile.id &&
              (pendingAction.key === "bulk-verify" ||
                pendingAction.key === "bulk-reject" ||
                pendingAction.key === "bulk-pending")
            const notesPending =
              pendingAction?.supplierId === profile.id && pendingAction.key === "notes"
            const scoreFlashing = Boolean(scoreHighlight[profile.id])
            const isDeleted = profile.is_deleted === true

            return (
              <article
                key={profile.id}
                className={`rounded-xl border p-5 shadow-panel ${
                  isDeleted ? "border-slate-300 bg-slate-100/60 opacity-75" : "border-panel bg-card"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : profile.id)}
                  className="flex w-full flex-col gap-4 text-left lg:flex-row lg:items-start lg:justify-between"
                  aria-expanded={expanded}
                >
                  <div>
                    <p className="text-[0.64rem] font-bold uppercase tracking-[0.2em] text-muted">
                      Supplier
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-heading">
                      {supplierDisplayName(profile)}
                    </h2>
                    <p className="mt-1 text-sm text-secondary">
                      {isDeleted ? "Deleted account" : profile.email || "No email on profile"}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {[profile.industry, profile.province].filter(Boolean).join(" / ") || "No category details"}
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 lg:items-end">
                    <div
                      className={`rounded-xl border px-4 py-3 transition-colors duration-500 ${
                        scoreFlashing
                          ? "border-accent/40 bg-accent/10"
                          : "border-panel bg-surface"
                      }`}
                    >
                      <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-muted">
                        SmartScore
                      </p>
                      <p
                        className={`mt-1 text-xl font-bold tabular-nums transition-colors duration-500 ${
                          scoreFlashing ? "text-accent" : "text-heading"
                        }`}
                      >
                        {profile.smart_score ?? 0}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-accent">
                      {expanded ? "Collapse" : "Review supplier"}
                    </span>
                  </div>
                </button>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-panel pt-4">
                  {(["csd", "bbbee", "tax", "banking", "director"] as VerificationStep[]).map((step) => (
                    <StatusChip
                      key={step}
                      label={step === "bbbee" ? "BBBEE" : step === "csd" ? "CSD" : step === "tax" ? "Tax" : step === "banking" ? "Banking" : "Director"}
                      verified={stepVerified(step, profile)}
                      submitted={stepSubmitted(step, profile, bank)}
                    />
                  ))}
                </div>

                {expanded && (
                  <div className="mt-5 space-y-3 border-t border-panel pt-5">
                    <div className="rounded-xl border border-panel bg-surface p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-muted">
                            Supplier action
                          </p>
                          <p className="mt-1 text-sm text-secondary">
                            Bulk actions update supplier status; verification keeps all step flags aligned.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <ActionButton
                            loading={pendingAction?.supplierId === profile.id && pendingAction.key === "bulk-verify"}
                            disabled={bulkPending || isDeleted}
                            onClick={() => updateSupplierStatus(profile, "verify")}
                          >
                            Verify Supplier
                          </ActionButton>
                          <ActionButton
                            tone="danger"
                            loading={pendingAction?.supplierId === profile.id && pendingAction.key === "bulk-reject"}
                            disabled={bulkPending || isDeleted}
                            onClick={() => updateSupplierStatus(profile, "reject")}
                          >
                            Reject Supplier
                          </ActionButton>
                          <button
                            type="button"
                            disabled={
                              isDeleted ||
                              bulkPending ||
                              (pendingAction?.supplierId === profile.id && pendingAction.key === "bulk-pending")
                            }
                            onClick={() => updateSupplierStatus(profile, "pending")}
                            className="rounded-md border border-panel bg-panel px-3 py-1.5 text-xs font-semibold text-secondary transition hover:bg-card disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {pendingAction?.supplierId === profile.id && pendingAction.key === "bulk-pending" ? (
                              <span className="inline-flex items-center gap-1.5">
                                <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 22 6.477 22 12h-4z" />
                                </svg>
                                Saving…
                              </span>
                            ) : (
                              "Mark Pending"
                            )}
                          </button>
                          <button
                            type="button"
                            disabled={isDeleted}
                            onClick={() => setDeleteTarget(profile)}
                            aria-label={`Delete ${supplierDisplayName(profile)} account`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-500/30 bg-rose-500/10 text-rose-700 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden>
                              <path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                            </svg>
                          </button>
                          <InlineFeedbackBadge
                            feedback={
                              inlineFeedback[`${profile.id}:bulk-verify`] ??
                              inlineFeedback[`${profile.id}:bulk-reject`] ??
                              inlineFeedback[`${profile.id}:bulk-pending`]
                            }
                          />
                        </div>
                      </div>
                      {renderScoreBreakdown(profile)}
                    </div>

                    <div>
                      <p className="mb-3 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-muted">
                        Verification steps
                      </p>
                    </div>

                    {renderStepRow(profile, "csd", "CSD", (
                      <>
                        <DetailLine label="CSD number" value={profile.csd_number} />
                        <div>
                          <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-muted">
                            Document
                          </p>
                          <div className="mt-1">{documentLink(profile.csd_document_url) ?? <span className="text-sm text-muted">-</span>}</div>
                        </div>
                      </>
                    ))}

                    {renderStepRow(profile, "bbbee", "BBBEE", (
                      <>
                        <DetailLine label="BBBEE level" value={profile.bbbee_level} />
                        <DetailLine label="Expiry date" value={formatDate(profile.bbbee_expiry_date)} />
                        <div className="sm:col-span-2">
                          <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-muted">
                            Document
                          </p>
                          <div className="mt-1">{documentLink(profile.bbbee_document_url) ?? <span className="text-sm text-muted">-</span>}</div>
                        </div>
                      </>
                    ), { expired: bbbeeExpired })}

                    {renderStepRow(profile, "tax", "Tax", (
                      <>
                        <DetailLine label="Expiry date" value={formatDate(profile.tax_expiry_date)} />
                        <div>
                          <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-muted">
                            Document
                          </p>
                          <div className="mt-1">{documentLink(taxLink) ?? <span className="text-sm text-muted">-</span>}</div>
                        </div>
                      </>
                    ))}

                    {renderStepRow(profile, "banking", "Banking", (
                      <>
                        <DetailLine label="Bank" value={bank?.bank_name} />
                        <DetailLine label="Account number" value={maskAccountNumber(bank?.account_number ?? null)} />
                        <DetailLine label="Bank record status" value={bank?.verification_status} />
                      </>
                    ))}

                    {renderStepRow(profile, "director", "Director", (
                      <>
                        <DetailLine label="Status" value={profile.director_verified ? "Verified" : "Pending"} />
                        <DetailLine label="Company registration" value={profile.company_registration} />
                        <div className="sm:col-span-2">
                          <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-muted">
                            Registration document
                          </p>
                          <div className="mt-1">{documentLink(profile.company_registration_url) ?? <span className="text-sm text-muted">-</span>}</div>
                        </div>
                      </>
                    ))}

                    {renderDocumentHistory(profile)}

                    <div className="rounded-xl border border-panel bg-surface p-4">
                      <label
                        htmlFor={`notes-${profile.id}`}
                        className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-muted"
                      >
                        Verification notes
                      </label>
                      <textarea
                        id={`notes-${profile.id}`}
                        rows={4}
                        value={notesBySupplier[profile.id] ?? ""}
                        onChange={(event) =>
                          setNotesBySupplier((current) => ({
                            ...current,
                            [profile.id]: event.target.value,
                          }))
                        }
                        className="mt-2 w-full resize-none rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"
                        placeholder="Add internal verification notes..."
                      />
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          disabled={notesPending}
                          onClick={() => saveNote(profile)}
                          className="rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {notesPending ? (
                            <span className="inline-flex items-center gap-1.5">
                              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 22 6.477 22 12h-4z" />
                              </svg>
                              Saving…
                            </span>
                          ) : (
                            "Save note"
                          )}
                        </button>
                        <InlineFeedbackBadge feedback={inlineFeedback[`${profile.id}:notes`]} />
                      </div>
                    </div>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-md rounded-xl border border-panel bg-card p-6 shadow-panel">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-rose-700">Delete account</p>
            <h2 className="mt-2 text-xl font-semibold text-heading">
              Delete {supplierDisplayName(deleteTarget)}&apos;s account?
            </h2>
            <p className="mt-3 text-sm leading-6 text-secondary">
              Their data will be anonymised immediately and permanently deleted after 30 days.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                disabled={deletePending}
                onClick={() => setDeleteTarget(null)}
                className="rounded-md border border-panel bg-panel px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-card disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletePending}
                onClick={() => deleteSupplierAccount(deleteTarget)}
                className="rounded-md border border-rose-600 bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletePending ? "Deleting..." : "Delete account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
