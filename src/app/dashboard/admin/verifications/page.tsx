"use client"

import { useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { useRouter } from "next/navigation"
import { calculateSmartScore } from "@/lib/smartScore"
import { supabase } from "@/lib/supabase"

type FilterMode = "all" | "pending" | "verified"
type VerificationStep = "csd" | "bbbee" | "tax" | "banking" | "director"

type SupplierProfile = {
  id: string
  business_name: string | null
  full_name: string | null
  email: string | null
  phone: string | null
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

const profileSelect = [
  "id",
  "business_name",
  "full_name",
  "email",
  "phone",
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
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs font-semibold text-accent underline-offset-4 transition hover:text-accent-strong hover:underline"
    >
      Open document
    </a>
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
  onClick,
  tone = "default",
}: {
  children: string
  disabled?: boolean
  onClick: () => void
  tone?: "default" | "danger"
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={
        tone === "danger"
          ? "rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50"
          : "rounded-md border border-accent bg-accent px-3 py-1.5 text-xs font-semibold text-button transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
      }
    >
      {children}
    </button>
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
  const [feedback, setFeedback] = useState<Record<string, string>>({})
  const [savingKey, setSavingKey] = useState("")

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
        .order("created_at", { ascending: false })

      if (error) {
        if (!cancelled) {
          setErrorMessage(error.message)
          setLoading(false)
        }
        return
      }

      const supplierProfiles = ((data ?? []) as unknown) as SupplierProfile[]
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
    const verified = profiles.filter(isFullyVerified).length
    return {
      pending: profiles.length - verified,
      verified,
    }
  }, [profiles])

  const filteredProfiles = useMemo(() => {
    if (filter === "verified") return profiles.filter(isFullyVerified)
    if (filter === "pending") return profiles.filter((profile) => !isFullyVerified(profile))
    return profiles
  }, [filter, profiles])

  function setSupplierFeedback(supplierId: string, message: string) {
    setFeedback((current) => ({ ...current, [supplierId]: message }))
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

    const bank = banksBySupplier[profile.id]
    const nextProfile: SupplierProfile = {
      ...profile,
      ...(step === "csd" ? { csd_verified: verified } : {}),
      ...(step === "bbbee" ? { bbbee_verified: verified } : {}),
      ...(step === "tax" ? { tax_verified: verified } : {}),
      ...(step === "banking" ? { bank_verified: verified } : {}),
      ...(step === "director" ? { director_verified: verified } : {}),
    }
    const nextVerificationStatus = isFullyVerified(nextProfile) ? "Verified" : "Pending Review"
    const nextBank =
      step === "banking" && bank
        ? { ...bank, verification_status: verified ? "verified" : "unverified" }
        : bank
    const nextSmartScore = calculateSmartScore(mergeBankFields(nextProfile, nextBank))
    const savingId = `${profile.id}-${step}`

    setSavingKey(savingId)
    setErrorMessage("")
    setSupplierFeedback(profile.id, `${verified ? "Approving" : "Revoking"} ${step}...`)

    setProfiles((current) =>
      current.map((item) =>
        item.id === profile.id
          ? {
              ...nextProfile,
              verification_status: nextVerificationStatus,
              smart_score: nextSmartScore,
            }
          : item,
      ),
    )
    if (step === "banking" && nextBank) {
      setBanksBySupplier((current) => ({ ...current, [profile.id]: nextBank }))
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
      .eq("id", profile.id)

    if (profileError) {
      setErrorMessage(profileError.message)
      setProfiles((current) => current.map((item) => (item.id === profile.id ? profile : item)))
      if (step === "banking" && bank) {
        setBanksBySupplier((current) => ({ ...current, [profile.id]: bank }))
      }
      setSavingKey("")
      setSupplierFeedback(profile.id, "Update failed.")
      return
    }

    if (step === "banking") {
      const { error: bankError } = await supabase
        .from("supplier_bank_details")
        .update({ verification_status: verified ? "verified" : "unverified" })
        .eq("supplier_id", profile.id)

      if (bankError) {
        setErrorMessage(bankError.message)
        setSupplierFeedback(profile.id, "Profile updated, but banking status update failed.")
        setSavingKey("")
        return
      }
    }

    setSavingKey("")
    setSupplierFeedback(
      profile.id,
      `${step.toUpperCase()} ${verified ? "approved" : "revoked"}. SmartScore updated to ${nextSmartScore}.`,
    )
  }

  async function saveNote(profile: SupplierProfile) {
    if (!supabase) return

    const nextNote = notesBySupplier[profile.id] ?? ""
    const nextSmartScore = calculateSmartScore(mergeBankFields(profile, banksBySupplier[profile.id]))
    const savingId = `${profile.id}-notes`

    setSavingKey(savingId)
    setErrorMessage("")
    setSupplierFeedback(profile.id, "Saving note...")

    const { error } = await supabase
      .from("profiles")
      .update({
        verification_notes: nextNote.trim() || null,
        smart_score: nextSmartScore,
      })
      .eq("id", profile.id)

    setSavingKey("")

    if (error) {
      setErrorMessage(error.message)
      setSupplierFeedback(profile.id, "Note save failed.")
      return
    }

    setProfiles((current) =>
      current.map((item) =>
        item.id === profile.id
          ? { ...item, verification_notes: nextNote.trim() || null, smart_score: nextSmartScore }
          : item,
      ),
    )
    setSupplierFeedback(profile.id, "Verification note saved.")
  }

  function renderStepRow(
    profile: SupplierProfile,
    step: VerificationStep,
    title: string,
    children: ReactNode,
    options?: { expired?: boolean },
  ) {
    const verified = stepVerified(step, profile)
    const approveDisabled = Boolean(options?.expired) || savingKey === `${profile.id}-${step}`

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
        <div className="flex flex-wrap gap-2 md:justify-end">
          <ActionButton
            disabled={approveDisabled || verified}
            onClick={() => updateStep(profile, step, true)}
          >
            Approve
          </ActionButton>
          <ActionButton
            tone="danger"
            disabled={savingKey === `${profile.id}-${step}` || !verified}
            onClick={() => updateStep(profile, step, false)}
          >
            Revoke
          </ActionButton>
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
                    <div className="rounded-xl border border-panel bg-surface px-4 py-3">
                      <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-muted">
                        SmartScore
                      </p>
                      <p className="mt-1 text-xl font-bold text-heading">{profile.smart_score ?? 0}</p>
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

                {feedback[profile.id] && (
                  <div className="mt-4 rounded-xl border border-panel bg-surface px-4 py-3">
                    <p className="text-xs font-semibold text-secondary">{feedback[profile.id]}</p>
                  </div>
                )}

                {expanded && (
                  <div className="mt-5 space-y-3 border-t border-panel pt-5">
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
                        <DetailLine label="Company registration" value={profile.company_registration} />
                        <div>
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
                      <button
                        type="button"
                        disabled={savingKey === `${profile.id}-notes`}
                        onClick={() => saveNote(profile)}
                        className="mt-3 rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Save note
                      </button>
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
