"use client"

import { useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { useRouter } from "next/navigation"
import SignedDocumentLink from "@/components/SignedDocumentLink"
import { calculateSmartScore } from "@/lib/smartScore"
import { supabase } from "@/lib/supabase"

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
  tax_clearance_url: string | null
  tax_document_url: string | null
  tax_expiry_date: string | null
  bank_verified: boolean | null
  banking_verified: boolean | null
  director_verified: boolean | null
  company_registration: string | null
  company_registration_url: string | null
  capability_statement_url: string | null
  smart_score: number | string | null
  created_at: string | null
  verification_notes: string | null
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
  "tax_clearance_url",
  "tax_document_url",
  "tax_expiry_date",
  "bank_verified",
  "banking_verified",
  "director_verified",
  "company_registration",
  "company_registration_url",
  "capability_statement_url",
  "smart_score",
  "created_at",
  "verification_notes",
].join(", ")

const STEP_LABELS: Record<VerificationStep, string> = {
  csd: "CSD",
  bbbee: "BBBEE",
  tax: "Tax",
  banking: "Banking",
  director: "Director",
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
}: {
  children: ReactNode
  disabled?: boolean
  loading?: boolean
  onClick: () => void
  tone?: "default" | "danger"
}) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={onClick}
      className={
        tone === "danger"
          ? "rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50"
          : "rounded-md border border-accent bg-accent px-3 py-1.5 text-xs font-semibold text-button transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
      }
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
  const [banksBySupplier, setBanksBySupplier] = useState<Record<string, BankDetails>>({})
  const [notesBySupplier, setNotesBySupplier] = useState<Record<string, string>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterMode>("all")
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [inlineFeedback, setInlineFeedback] = useState<Record<string, InlineFeedback>>({})
  const [scoreHighlight, setScoreHighlight] = useState<Record<string, boolean>>({})

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

      if (supplierIds.length > 0) {
        const { data: bankData, error: bankError } = await supabase
          .from("supplier_bank_details")
          .select("bank_name, account_number, verification_status, supplier_id")
          .in("supplier_id", supplierIds)

        if (bankError) {
          if (!cancelled) {
            setErrorMessage(bankError.message)
            setLoading(false)
          }
          return
        }

        bankMap = (((bankData ?? []) as unknown) as BankDetails[]).reduce<Record<string, BankDetails>>(
          (map, bank) => {
            if (!bank.supplier_id || map[bank.supplier_id]) return map
            map[bank.supplier_id] = bank
            return map
          },
          {},
        )
      }

      if (!cancelled) {
        setProfiles(supplierProfiles)
        setBanksBySupplier(bankMap)
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
  }, [router])

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

  function mergeBankFields(profile: SupplierProfile, bank?: BankDetails) {
    return {
      ...profile,
      provinces: normalizeProvinces(profile.provinces),
      bank_name: bank?.bank_name ?? null,
      bank_account_number: bank?.account_number ?? null,
      account_number: bank?.account_number ?? null,
      bank_verification_status: bank?.verification_status ?? null,
    }
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
    const nextSmartScore = calculateSmartScore(mergeBankFields(scoreProfile, nextBank))
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
    const bank = banksBySupplier[currentProfile.id]
    const flagUpdates =
      action === "verify"
        ? {
            csd_verified: true,
            bbbee_verified: true,
            tax_verified: true,
            bank_verified: true,
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
    const nextBank =
      action === "verify" && bank
        ? { ...bank, verification_status: bankStatusForVerified(true) }
        : bank
    const nextSmartScore = calculateSmartScore(mergeBankFields(scoreProfile, nextBank))
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
    if (action === "verify" && nextBank) {
      setBanksBySupplier((current) => ({ ...current, [currentProfile.id]: nextBank }))
    }

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
      if (action === "verify" && bank) {
        setBanksBySupplier((current) => ({ ...current, [currentProfile.id]: bank }))
      }
      setPendingAction(null)
      setActionFeedback(currentProfile.id, pendingKey, { message: "Couldn't save — try again", type: "error" })
      return
    }

    if (action === "verify") {
      const { error: bankError } = await supabase
        .from("supplier_bank_details")
        .update({ verification_status: bankStatusForVerified(true) })
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
      message: `Supplier marked ${nextVerificationStatus}. SmartScore updated to ${nextSmartScore}.`,
      type: "success",
    })
  }

  async function saveNote(profile: SupplierProfile) {
    if (!supabase) return

    const nextNote = notesBySupplier[profile.id] ?? ""
    const nextSmartScore = calculateSmartScore(mergeBankFields(profile, banksBySupplier[profile.id]))
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

  function renderStepRow(
    profile: SupplierProfile,
    step: VerificationStep,
    title: string,
    children: ReactNode,
    options?: { expired?: boolean },
  ) {
    const verified = stepVerified(step, profile)
    const approveKey = `${step}-approve`
    const revokeKey = `${step}-revoke`
    const stepPending =
      pendingAction?.supplierId === profile.id &&
      (pendingAction.key === approveKey || pendingAction.key === revokeKey)
    const approvePending = pendingAction?.supplierId === profile.id && pendingAction.key === approveKey
    const revokePending = pendingAction?.supplierId === profile.id && pendingAction.key === revokeKey
    const stepFeedback =
      inlineFeedback[`${profile.id}:${approveKey}`] ?? inlineFeedback[`${profile.id}:${revokeKey}`]

    return (
      <div className="grid gap-4 rounded-xl border border-panel bg-surface p-4 md:grid-cols-[1fr_auto] md:items-center">
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
        </div>
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <ActionButton
            loading={approvePending}
            disabled={Boolean(options?.expired) || stepPending || verified}
            onClick={() => updateStep(profile, step, true)}
          >
            Approve
          </ActionButton>
          <ActionButton
            tone="danger"
            loading={revokePending}
            disabled={stepPending || !verified}
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

            return (
              <article key={profile.id} className="rounded-xl border border-panel bg-card p-5 shadow-panel">
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
                      {profile.business_name || profile.full_name || "Unnamed supplier"}
                    </h2>
                    <p className="mt-1 text-sm text-secondary">{profile.email || "No email on profile"}</p>
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
                            disabled={bulkPending}
                            onClick={() => updateSupplierStatus(profile, "verify")}
                          >
                            Verify Supplier
                          </ActionButton>
                          <ActionButton
                            tone="danger"
                            loading={pendingAction?.supplierId === profile.id && pendingAction.key === "bulk-reject"}
                            disabled={bulkPending}
                            onClick={() => updateSupplierStatus(profile, "reject")}
                          >
                            Reject Supplier
                          </ActionButton>
                          <button
                            type="button"
                            disabled={
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
                          <InlineFeedbackBadge
                            feedback={
                              inlineFeedback[`${profile.id}:bulk-verify`] ??
                              inlineFeedback[`${profile.id}:bulk-reject`] ??
                              inlineFeedback[`${profile.id}:bulk-pending`]
                            }
                          />
                        </div>
                      </div>
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
    </div>
  )
}
