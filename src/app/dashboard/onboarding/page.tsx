"use client"

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import { useRouter } from "next/navigation"
import { useAutosave } from "@/hooks/useAutosave"
import { logActivity } from "@/lib/activity"
import { createNotification } from "@/lib/notifications"
import { supabase } from "@/lib/supabase"
import { calculateSupplierScore } from "@/lib/supplierScore"

// ─── Constants ────────────────────────────────────────────────────────────────

const SA_PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
  "Western Cape",
]

const INDUSTRIES = [
  "Construction & Infrastructure",
  "Electrical & Engineering",
  "IT & Technology",
  "Mining & Resources",
  "Municipal Services",
  "Professional Services",
  "Supply & Logistics",
  "Water & Sanitation",
  "Agriculture & Food",
  "Healthcare & Pharmaceuticals",
  "Security & Safety",
  "Cleaning & Facilities",
  "Transport & Logistics",
  "Education & Training",
  "Other",
]

const BBBEE_LEVELS = [
  "Level 1",
  "Level 2",
  "Level 3",
  "Level 4",
  "Level 5",
  "Level 6",
  "Level 7",
  "Level 8",
  "Non-compliant",
  "Exempt Micro Enterprise (EME)",
  "Qualifying Small Enterprise (QSE)",
]

const TAX_STATUSES = ["Compliant", "Pending", "Non-compliant"]

// ─── Types ────────────────────────────────────────────────────────────────────

type Step1Data = {
  business_name: string
  province: string
  industry: string
  phone: string
  email: string
}

type Step2Data = {
  csd_number: string
  bbbee_level: string
  tax_status: string
  company_registration: string
  cidb_grade: string
  verification_notes: string
}

type DocumentUrls = {
  csd_document_url: string
  bbbee_document_url: string
  tax_document_url: string
  company_registration_url: string
  cidb_document_url: string
  capability_statement_url: string
}

type DocumentField = keyof DocumentUrls

type WizardDraft = {
  step: number
  step1: Step1Data
  step2: Step2Data
}

type FullProfile = Step1Data &
  Step2Data &
  DocumentUrls & {
    id: string
    verification_status: string | null
  }

// ─── Document config ──────────────────────────────────────────────────────────

const DOCUMENT_CONFIGS: Array<{
  field: DocumentField
  label: string
  description: string
  required: boolean
  documentType: string
}> = [
  {
    field: "csd_document_url",
    label: "CSD Registration Document",
    description: "CSD registration summary report — must be current and valid.",
    required: true,
    documentType: "csd-document",
  },
  {
    field: "bbbee_document_url",
    label: "B-BBEE Certificate or Sworn Affidavit",
    description: "Valid B-BBEE certificate from an accredited verification agency, or sworn affidavit for EME/QSE.",
    required: true,
    documentType: "bbbee-certificate",
  },
  {
    field: "tax_document_url",
    label: "Tax Clearance / SARS Compliance PIN",
    description: "SARS tax clearance certificate or Tax Compliance Status (TCS) PIN confirmation.",
    required: true,
    documentType: "tax-clearance-document",
  },
  {
    field: "company_registration_url",
    label: "Company Registration Certificate (CIPC)",
    description: "CIPC certificate of incorporation or founding statement for close corporations.",
    required: true,
    documentType: "company-registration-document",
  },
  {
    field: "cidb_document_url",
    label: "CIDB Grading Certificate",
    description: "Construction Industry Development Board certificate where applicable.",
    required: false,
    documentType: "cidb-certificate",
  },
  {
    field: "capability_statement_url",
    label: "Capability Statement / Company Profile",
    description: "One-to-three page company profile summarising services, key clients, and past projects.",
    required: false,
    documentType: "capability-statement",
  },
]

// ─── Readiness scoring breakdown ──────────────────────────────────────────────

type ScoreCriterion = {
  label: string
  value?: string | null | undefined
  docUrls?: (string | null | undefined)[]
  points: number
  hint: string
}

function buildCriteria(
  step1: Step1Data,
  step2: Step2Data,
  docs: DocumentUrls,
  verificationStatus: string | null
): ScoreCriterion[] {
  return [
    {
      label: "Business Name",
      value: step1.business_name,
      points: 10,
      hint: "Required for all procurement submissions.",
    },
    {
      label: "Province",
      value: step1.province,
      points: 10,
      hint: "Enables regional supplier matching.",
    },
    {
      label: "Industry / Sector",
      value: step1.industry,
      points: 10,
      hint: "Used for category-based RFQ matching.",
    },
    {
      label: "Contact Phone Number",
      value: step1.phone,
      points: 10,
      hint: "Required for buyer outreach and WhatsApp contact.",
    },
    {
      label: "CSD Registration Number",
      value: step2.csd_number,
      points: 10,
      hint: "Central Supplier Database — mandatory for government procurement.",
    },
    {
      label: "B-BBEE Level",
      value: step2.bbbee_level,
      points: 10,
      hint: "B-BBEE status affects procurement scoring under PPPFA.",
    },
    {
      label: "Tax Compliance Status",
      value: step2.tax_status,
      points: 10,
      hint: "SARS tax compliance is required for all public procurement.",
    },
    {
      label: "Company Registration Number",
      value: step2.company_registration,
      points: 10,
      hint: "CIPC registration confirms legal entity status.",
    },
    {
      label: "At Least One Document Uploaded",
      docUrls: Object.values(docs),
      points: 10,
      hint: "Upload compliance documents to reach Procurement Ready status.",
    },
    {
      label: "Verification Status",
      value: verificationStatus === "Verified" ? "Verified" : null,
      points: 10,
      hint: "Awarded by a procurement admin after document review.",
    },
  ]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cleanFileName(fileName: string): string {
  return fileName
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
}

function criterionComplete(c: ScoreCriterion): boolean {
  if (c.docUrls) return c.docUrls.some((u) => Boolean(u?.trim()))
  return Boolean(c.value?.trim())
}

const EMPTY_STEP1: Step1Data = {
  business_name: "",
  province: "",
  industry: "",
  phone: "",
  email: "",
}

const EMPTY_STEP2: Step2Data = {
  csd_number: "",
  bbbee_level: "",
  tax_status: "",
  company_registration: "",
  cidb_grade: "",
  verification_notes: "",
}

const EMPTY_DOCS: DocumentUrls = {
  csd_document_url: "",
  bbbee_document_url: "",
  tax_document_url: "",
  company_registration_url: "",
  cidb_document_url: "",
  capability_statement_url: "",
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-md border border-panel bg-panel px-4 py-3 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"

const labelCls =
  "mb-1.5 block text-[0.68rem] font-bold uppercase tracking-[0.22em] text-secondary"

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS = [
  { n: 1, label: "Business Info" },
  { n: 2, label: "Compliance" },
  { n: 3, label: "Documents" },
  { n: 4, label: "Review" },
]

function StepIndicator({
  current,
  completed,
}: {
  current: number
  completed: Set<number>
}) {
  return (
    <nav aria-label="Wizard progress" className="mb-8">
      <ol className="flex items-center gap-0">
        {STEPS.map((step, idx) => {
          const isDone = completed.has(step.n)
          const isCurrent = current === step.n
          const isUpcoming = !isDone && !isCurrent

          return (
            <li key={step.n} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1.5">
                {/* Circle */}
                <div
                  className={[
                    "flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold transition-all",
                    isDone
                      ? "border-success bg-success text-button"
                      : isCurrent
                        ? "border-accent bg-accent text-button shadow-[0_0_0_4px_rgba(var(--accent-rgb),0.15)]"
                        : "border-panel bg-surface text-muted",
                  ].join(" ")}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isDone ? (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    step.n
                  )}
                </div>
                {/* Label */}
                <span
                  className={[
                    "hidden text-[0.62rem] font-bold uppercase tracking-[0.18em] sm:block",
                    isDone ? "text-success" : isCurrent ? "text-accent" : "text-muted",
                  ].join(" ")}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line (not after last) */}
              {idx < STEPS.length - 1 && (
                <div
                  className={[
                    "mx-2 h-0.5 flex-1 rounded-full transition-all",
                    completed.has(step.n) ? "bg-success" : "bg-panel",
                  ].join(" ")}
                  aria-hidden="true"
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// ─── Score ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score, label }: { score: number; label: string }) {
  const radius = 42
  const circ = 2 * Math.PI * radius
  const offset = circ - (score / 100) * circ
  const color =
    score >= 90 ? "var(--success)"
      : score >= 70 ? "#315A78"
        : score >= 40 ? "var(--warning)"
          : "#ef4444"

  return (
    <div className="flex flex-col items-center sm:flex-row sm:items-center sm:gap-6">
      <div className="relative shrink-0" style={{ width: 108, height: 108 }}>
        <svg width="108" height="108" viewBox="0 0 108 108" aria-hidden="true">
          <circle cx="54" cy="54" r={radius} fill="none" stroke="var(--border)" strokeWidth="10" />
          <circle
            cx="54" cy="54" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            transform="rotate(-90 54 54)"
            style={{ transition: "stroke-dashoffset 0.9s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tabular-nums leading-none text-heading">{score}</span>
          <span className="text-[0.58rem] font-bold uppercase tracking-wider text-muted">/ 100</span>
        </div>
      </div>
      <div>
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">
          Readiness Score
        </p>
        <p className="mt-1 text-xl font-bold text-heading">{label}</p>
        <p className="mt-1 text-xs text-secondary">
          {score >= 90
            ? "Your profile is fully configured and procurement-ready."
            : score >= 70
              ? "Strong profile — fill in the remaining items to maximise your score."
              : score >= 40
                ? "Good start. Complete the missing items to become procurement-ready."
                : "Your profile needs more information before buyers can evaluate it."}
        </p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()

  // State
  const [userId, setUserId] = useState("")
  const [step, setStep] = useState(1)
  const [completed, setCompleted] = useState<Set<number>>(new Set())
  const [step1, setStep1] = useState<Step1Data>(EMPTY_STEP1)
  const [step2, setStep2] = useState<Step2Data>(EMPTY_STEP2)
  const [docs, setDocs] = useState<DocumentUrls>(EMPTY_DOCS)
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingField, setUploadingField] = useState<DocumentField | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")
  const [stepSuccess, setStepSuccess] = useState("")
  const formRef = useRef<HTMLDivElement>(null)

  // Autosave — only text fields (step1 + step2), not document URLs
  const wizardDraft = useMemo<WizardDraft>(
    () => ({ step, step1, step2 }),
    [step, step1, step2]
  )
  const autosave = useAutosave<WizardDraft>({
    key: "monate-draft-onboarding",
    value: wizardDraft,
    enabled: !loading && !submitted,
    onRestore: (draft) => {
      setStep(draft.step)
      setStep1(draft.step1)
      setStep2(draft.step2)
    },
  })

  // Load profile on mount
  useEffect(() => {
    async function loadProfile() {
      if (!supabase) {
        setError("Supabase is not configured.")
        setLoading(false)
        return
      }

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser()

      if (userErr || !user) {
        setError("You must be signed in to complete onboarding.")
        setLoading(false)
        return
      }

      setUserId(user.id)

      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select(
          "id, business_name, province, industry, phone, email, csd_number, bbbee_level, tax_status, company_registration, cidb_grade, verification_notes, verification_status, csd_document_url, bbbee_document_url, tax_document_url, company_registration_url, cidb_document_url, capability_statement_url"
        )
        .eq("id", user.id)
        .maybeSingle()

      if (profileErr) {
        setError(profileErr.message)
        setLoading(false)
        return
      }

      if (profile) {
        const p = profile as FullProfile
        setStep1({
          business_name: p.business_name || "",
          province: p.province || "",
          industry: p.industry || "",
          phone: p.phone || "",
          email: p.email || user.email || "",
        })
        setStep2({
          csd_number: p.csd_number || "",
          bbbee_level: p.bbbee_level || "",
          tax_status: p.tax_status || "",
          company_registration: p.company_registration || "",
          cidb_grade: p.cidb_grade || "",
          verification_notes: p.verification_notes || "",
        })
        setDocs({
          csd_document_url: p.csd_document_url || "",
          bbbee_document_url: p.bbbee_document_url || "",
          tax_document_url: p.tax_document_url || "",
          company_registration_url: p.company_registration_url || "",
          cidb_document_url: p.cidb_document_url || "",
          capability_statement_url: p.capability_statement_url || "",
        })
        setVerificationStatus(p.verification_status || null)

        // Infer completed steps from existing data
        const existingCompleted = new Set<number>()
        if (p.business_name && p.province) existingCompleted.add(1)
        if (p.csd_number || p.bbbee_level || p.company_registration) existingCompleted.add(2)
        if (Object.values({
          csd_document_url: p.csd_document_url,
          bbbee_document_url: p.bbbee_document_url,
          tax_document_url: p.tax_document_url,
          company_registration_url: p.company_registration_url,
          cidb_document_url: p.cidb_document_url,
          capability_statement_url: p.capability_statement_url,
        }).some(Boolean)) existingCompleted.add(3)
        setCompleted(existingCompleted)
      }

      setLoading(false)
    }

    loadProfile()
  }, [])

  // ─── Handlers ──────────────────────────────────────────────────────────────

  function changeStep1(e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setStep1((p) => ({ ...p, [e.target.name]: e.target.value }))
    setStepSuccess("")
    setError("")
  }

  function changeStep2(e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setStep2((p) => ({ ...p, [e.target.name]: e.target.value }))
    setStepSuccess("")
    setError("")
  }

  async function saveStep1() {
    if (!supabase || !userId) return false
    setSaving(true)
    setError("")
    const { error: err } = await supabase
      .from("profiles")
      .update({
        business_name: step1.business_name.trim(),
        province: step1.province,
        industry: step1.industry,
        phone: step1.phone.trim(),
        email: step1.email.trim(),
      })
      .eq("id", userId)
    setSaving(false)
    if (err) { setError(err.message); return false }
    try {
      await logActivity({
        action: "onboarding.step1_saved",
        entity_type: "supplier_profile",
        entity_id: userId,
        metadata: { step: 1, business_name: step1.business_name },
      })
    } catch { /* swallow */ }
    return true
  }

  async function saveStep2() {
    if (!supabase || !userId) return false
    setSaving(true)
    setError("")
    const { error: err } = await supabase
      .from("profiles")
      .update({
        csd_number: step2.csd_number.trim(),
        bbbee_level: step2.bbbee_level,
        tax_status: step2.tax_status,
        company_registration: step2.company_registration.trim(),
        cidb_grade: step2.cidb_grade.trim(),
        verification_notes: step2.verification_notes.trim(),
      })
      .eq("id", userId)
    setSaving(false)
    if (err) { setError(err.message); return false }
    try {
      await logActivity({
        action: "onboarding.step2_saved",
        entity_type: "supplier_profile",
        entity_id: userId,
        metadata: { step: 2 },
      })
    } catch { /* swallow */ }
    return true
  }

  async function handleDocumentUpload(
    e: ChangeEvent<HTMLInputElement>,
    field: DocumentField,
    documentType: string,
    label: string
  ) {
    const file = e.target.files?.[0]
    if (!file || !supabase || !userId) return
    setError("")
    setStepSuccess("")
    setUploadingField(field)

    const fileName = cleanFileName(file.name)
    const filePath = `${userId}/${documentType}/${fileName}`

    const { error: uploadErr } = await supabase.storage
      .from("supplier-documents")
      .upload(filePath, file, { upsert: true })

    if (uploadErr) {
      setError(uploadErr.message)
      setUploadingField(null)
      e.target.value = ""
      return
    }

    const { data: urlData } = supabase.storage
      .from("supplier-documents")
      .getPublicUrl(filePath)

    const url = urlData.publicUrl

    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ [field]: url })
      .eq("id", userId)

    setUploadingField(null)

    if (updateErr) {
      setError(updateErr.message)
      e.target.value = ""
      return
    }

    setDocs((prev) => ({ ...prev, [field]: url }))
    setStepSuccess(`${label} uploaded successfully.`)
    e.target.value = ""

    try {
      await logActivity({
        action: "document.uploaded",
        entity_type: "supplier_document",
        entity_id: userId,
        metadata: { label, document_type: documentType, file_name: file.name },
      })
    } catch { /* swallow */ }
  }

  async function handleNext() {
    setError("")
    setStepSuccess("")

    if (step === 1) {
      if (!step1.business_name.trim()) {
        setError("Business name is required before continuing.")
        return
      }
      const ok = await saveStep1()
      if (!ok) return
      setCompleted((prev) => new Set(prev).add(1))
      setStepSuccess("Business information saved.")
      advanceStep()
    } else if (step === 2) {
      const ok = await saveStep2()
      if (!ok) return
      setCompleted((prev) => new Set(prev).add(2))
      setStepSuccess("Compliance information saved.")
      advanceStep()
    } else if (step === 3) {
      setCompleted((prev) => new Set(prev).add(3))
      advanceStep()
    }
  }

  function advanceStep() {
    setStep((s) => Math.min(s + 1, 4))
    setStepSuccess("")
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60)
  }

  function handleBack() {
    setError("")
    setStepSuccess("")
    setStep((s) => Math.max(s - 1, 1))
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60)
  }

  async function handleSubmitForReview() {
    if (!supabase || !userId) return
    setSaving(true)
    setError("")

    const { error: err } = await supabase
      .from("profiles")
      .update({ verification_status: "Under Review" })
      .eq("id", userId)

    setSaving(false)

    if (err) {
      setError(err.message)
      return
    }

    setVerificationStatus("Under Review")

    try {
      await logActivity({
        action: "supplier.verification_submitted",
        entity_type: "supplier_profile",
        entity_id: userId,
        metadata: {
          previous_status: verificationStatus,
          new_status: "Under Review",
          business_name: step1.business_name,
        },
      })
      await createNotification({
        recipientId: userId,
        type: "Verification Approved",
        title: "Profile submitted for review",
        message:
          "Your supplier profile has been submitted for procurement review. We will notify you once verification is complete.",
        link: "/dashboard/onboarding",
        metadata: { step: 4 },
      })
    } catch { /* swallow */ }

    autosave.clearDraft()
    setSubmitted(true)
  }

  // ─── Derived data ───────────────────────────────────────────────────────────

  const scoreProfile = {
    business_name: step1.business_name,
    province: step1.province,
    industry: step1.industry,
    phone: step1.phone,
    csd_number: step2.csd_number,
    bbbee_level: step2.bbbee_level,
    tax_status: step2.tax_status,
    company_registration: step2.company_registration,
    verification_status: verificationStatus,
    ...docs,
  }

  const { score, label: scoreLabel } = calculateSupplierScore(scoreProfile)

  const criteria = buildCriteria(step1, step2, docs, verificationStatus)

  const alreadyUnderReview =
    verificationStatus === "Under Review" || verificationStatus === "Verified"

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 h-8 w-64 animate-pulse rounded bg-panel" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-md bg-panel" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">
          Supplier Setup
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">
          Supplier Onboarding Wizard
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-secondary">
          Complete each step to build your supplier profile, upload compliance
          documents, and submit for procurement review. Your progress is saved
          automatically.
        </p>
      </div>

      {/* Global error */}
      {error && (
        <div className="mb-5 flex items-start gap-3 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-sm font-semibold text-rose-700">{error}</p>
        </div>
      )}

      {/* Success: submitted */}
      {submitted && (
        <div className="rounded-md border border-success bg-success-soft p-8 text-center shadow-panel">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success text-button">
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="mt-5 text-xl font-bold text-success">
            Profile submitted for review
          </h2>
          <p className="mt-2 text-sm leading-6 text-success/80">
            Your supplier profile has been submitted for procurement review. You
            will receive a notification once your verification is complete.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="rounded-md border border-success bg-success px-5 py-2.5 text-sm font-semibold text-button transition hover:bg-success/90"
            >
              Go to Dashboard
            </button>
            <button
              type="button"
              onClick={() => router.push("/dashboard/rfqs")}
              className="rounded-md border border-panel bg-surface px-5 py-2.5 text-sm font-semibold text-secondary transition hover:bg-panel"
            >
              Browse RFQs
            </button>
          </div>
        </div>
      )}

      {!submitted && (
        <>
          {/* Step indicator */}
          <StepIndicator current={step} completed={completed} />

          {/* Draft recovery */}
          {autosave.showRecoveryDialog && (
            <div className="mb-5 rounded-md border border-accent bg-surface p-5 shadow-panel">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-heading">
                    Restore previous progress?
                  </p>
                  <p className="mt-1 text-xs leading-5 text-secondary">
                    We found a saved onboarding draft from your last session.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={autosave.restoreDraft}
                    className="rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button transition hover:bg-accent-strong"
                  >
                    Restore
                  </button>
                  <button
                    type="button"
                    onClick={autosave.discardDraft}
                    className="rounded-md border border-panel bg-panel px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-surface"
                  >
                    Discard
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Autosave indicator */}
          <div className="mb-5 flex items-center justify-between gap-3 rounded-md border border-panel bg-card px-5 py-2.5 shadow-sm">
            <p className="text-xs font-semibold text-success">
              {autosave.status === "saved" ? "✓ Progress saved" : "Progress autosaves every 5 seconds"}
            </p>
            <button
              type="button"
              onClick={autosave.discardDraft}
              className="text-[0.68rem] font-semibold text-muted transition hover:text-secondary"
            >
              Discard draft
            </button>
          </div>

          {/* Step card */}
          <div ref={formRef} className="rounded-md border border-panel bg-card shadow-panel">
            {/* ── Step 1: Business Information ─────────────────────────────── */}
            {step === 1 && (
              <div>
                <div className="border-b border-panel px-6 py-5">
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-accent">
                    Step 1 of 4
                  </p>
                  <h2 className="mt-1.5 text-lg font-bold text-heading">
                    Business Information
                  </h2>
                  <p className="mt-1 text-sm text-secondary">
                    Enter your company's core details. This information appears
                    on your supplier profile and is used for RFQ matching.
                  </p>
                </div>

                <div className="space-y-5 p-6">
                  <div>
                    <label htmlFor="business_name" className={labelCls}>
                      Business / Trading Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="business_name"
                      name="business_name"
                      type="text"
                      placeholder="e.g. Monate Electrical Services (Pty) Ltd"
                      value={step1.business_name}
                      onChange={changeStep1}
                      className={inputCls}
                      required
                    />
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="province" className={labelCls}>Province</label>
                      <select
                        id="province"
                        name="province"
                        value={step1.province}
                        onChange={changeStep1}
                        className={inputCls}
                      >
                        <option value="">Select province</option>
                        {SA_PROVINCES.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="industry" className={labelCls}>Industry / Sector</label>
                      <select
                        id="industry"
                        name="industry"
                        value={step1.industry}
                        onChange={changeStep1}
                        className={inputCls}
                      >
                        <option value="">Select industry</option>
                        {INDUSTRIES.map((i) => (
                          <option key={i} value={i}>{i}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="phone" className={labelCls}>Contact Phone Number</label>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="+27 83 000 0000"
                        value={step1.phone}
                        onChange={changeStep1}
                        className={inputCls}
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className={labelCls}>Business Email Address</label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="info@yourcompany.co.za"
                        value={step1.email}
                        onChange={changeStep1}
                        className={inputCls}
                      />
                      <p className="mt-1.5 text-xs text-muted">
                        Your login email is used if this field is left blank.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2: Compliance Information ──────────────────────────── */}
            {step === 2 && (
              <div>
                <div className="border-b border-panel px-6 py-5">
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-accent">
                    Step 2 of 4
                  </p>
                  <h2 className="mt-1.5 text-lg font-bold text-heading">
                    Compliance Information
                  </h2>
                  <p className="mt-1 text-sm text-secondary">
                    Enter your procurement compliance credentials. These are
                    checked against documents in Step 3.
                  </p>
                </div>

                <div className="space-y-5 p-6">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="csd_number" className={labelCls}>CSD Registration Number</label>
                      <input
                        id="csd_number"
                        name="csd_number"
                        type="text"
                        placeholder="MAAA0000000"
                        value={step2.csd_number}
                        onChange={changeStep2}
                        className={inputCls}
                      />
                      <p className="mt-1.5 text-xs text-muted">
                        Central Supplier Database — required for government procurement.
                      </p>
                    </div>

                    <div>
                      <label htmlFor="company_registration" className={labelCls}>Company Registration Number</label>
                      <input
                        id="company_registration"
                        name="company_registration"
                        type="text"
                        placeholder="2024/000000/07"
                        value={step2.company_registration}
                        onChange={changeStep2}
                        className={inputCls}
                      />
                      <p className="mt-1.5 text-xs text-muted">
                        CIPC registration or founding statement number.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="bbbee_level" className={labelCls}>B-BBEE Level</label>
                      <select
                        id="bbbee_level"
                        name="bbbee_level"
                        value={step2.bbbee_level}
                        onChange={changeStep2}
                        className={inputCls}
                      >
                        <option value="">Select B-BBEE level</option>
                        {BBBEE_LEVELS.map((l) => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="tax_status" className={labelCls}>SARS Tax Compliance Status</label>
                      <select
                        id="tax_status"
                        name="tax_status"
                        value={step2.tax_status}
                        onChange={changeStep2}
                        className={inputCls}
                      >
                        <option value="">Select tax status</option>
                        {TAX_STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="cidb_grade" className={labelCls}>CIDB Grading</label>
                    <input
                      id="cidb_grade"
                      name="cidb_grade"
                      type="text"
                      placeholder="e.g. 3GB, 5CE (leave blank if not applicable)"
                      value={step2.cidb_grade}
                      onChange={changeStep2}
                      className={inputCls}
                    />
                    <p className="mt-1.5 text-xs text-muted">
                      Construction Industry Development Board — required for construction and electrical contracts.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="verification_notes" className={labelCls}>Additional Compliance Notes</label>
                    <textarea
                      id="verification_notes"
                      name="verification_notes"
                      rows={3}
                      placeholder="Add any notes about compliance documents, pending renewals, or context for the reviewer..."
                      value={step2.verification_notes}
                      onChange={changeStep2}
                      className={`${inputCls} resize-y`}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 3: Document Uploads ─────────────────────────────────── */}
            {step === 3 && (
              <div>
                <div className="border-b border-panel px-6 py-5">
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-accent">
                    Step 3 of 4
                  </p>
                  <h2 className="mt-1.5 text-lg font-bold text-heading">
                    Document Uploads
                  </h2>
                  <p className="mt-1 text-sm text-secondary">
                    Upload your compliance documents. Required documents must be
                    uploaded before submitting for review. Files are stored
                    securely in your supplier profile.
                  </p>
                </div>

                {stepSuccess && (
                  <div className="mx-6 mt-5 rounded-md border border-success bg-success-soft px-4 py-3">
                    <p className="text-sm font-semibold text-success">{stepSuccess}</p>
                  </div>
                )}

                <div className="grid gap-4 p-6 lg:grid-cols-2">
                  {DOCUMENT_CONFIGS.map((doc) => {
                    const url = docs[doc.field]
                    const isUploading = uploadingField === doc.field

                    return (
                      <div
                        key={doc.field}
                        className={[
                          "rounded-md border p-5 transition",
                          url
                            ? "border-success/25 bg-success/5"
                            : doc.required
                              ? "border-panel bg-panel"
                              : "border-panel bg-surface",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-heading">
                                {doc.label}
                              </p>
                              <span
                                className={[
                                  "inline-flex rounded-full border px-1.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider",
                                  doc.required
                                    ? "border-rose-500/30 bg-rose-500/10 text-rose-700"
                                    : "border-panel bg-surface text-muted",
                                ].join(" ")}
                              >
                                {doc.required ? "Required" : "Optional"}
                              </span>
                            </div>
                            <p className="mt-1 text-xs leading-5 text-muted">
                              {doc.description}
                            </p>
                          </div>

                          {url && (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-success bg-success-soft px-2.5 py-1 text-xs font-semibold text-success transition hover:bg-success/20"
                            >
                              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                              </svg>
                              View
                            </a>
                          )}
                        </div>

                        <input
                          type="file"
                          onChange={(e) =>
                            handleDocumentUpload(e, doc.field, doc.documentType, doc.label)
                          }
                          disabled={isUploading}
                          className="mt-4 block w-full rounded-md border border-panel bg-card px-3 py-2 text-sm text-secondary file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-button hover:file:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <p className="mt-2 text-[0.67rem] text-muted">
                          {isUploading
                            ? "Uploading…"
                            : url
                              ? "Uploaded. Upload again to replace."
                              : "No file uploaded yet."}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Step 4: Procurement Readiness Review ─────────────────────── */}
            {step === 4 && (
              <div>
                <div className="border-b border-panel px-6 py-5">
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-accent">
                    Step 4 of 4
                  </p>
                  <h2 className="mt-1.5 text-lg font-bold text-heading">
                    Procurement Readiness Review
                  </h2>
                  <p className="mt-1 text-sm text-secondary">
                    Review your profile readiness score, fill any gaps, then
                    submit for procurement team review.
                  </p>
                </div>

                <div className="space-y-6 p-6">
                  {/* Score ring */}
                  <div className="rounded-md border border-panel bg-panel p-5">
                    <ScoreRing score={score} label={scoreLabel} />
                  </div>

                  {/* Verification status */}
                  <div className="flex items-center justify-between gap-3 rounded-md border border-panel bg-panel px-5 py-4">
                    <div>
                      <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-secondary">
                        Verification Status
                      </p>
                      <p className="mt-1.5 text-base font-bold text-heading">
                        {verificationStatus || "Not submitted"}
                      </p>
                    </div>
                    <span
                      className={[
                        "inline-flex rounded-full border px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider",
                        verificationStatus === "Verified"
                          ? "border-success/30 bg-success/10 text-success"
                          : verificationStatus === "Under Review"
                            ? "border-sky-500/30 bg-sky-500/10 text-sky-700"
                            : "border-panel bg-surface text-muted",
                      ].join(" ")}
                    >
                      {verificationStatus ?? "Pending"}
                    </span>
                  </div>

                  {/* Criteria checklist */}
                  <div>
                    <p className="mb-3 text-[0.68rem] font-bold uppercase tracking-[0.22em] text-secondary">
                      Profile Completeness
                    </p>
                    <div className="divide-y divide-panel overflow-hidden rounded-md border border-panel">
                      {criteria.map((c) => {
                        const done = criterionComplete(c)
                        return (
                          <div
                            key={c.label}
                            className={[
                              "flex items-start gap-3 px-4 py-3 transition",
                              done ? "bg-success/5" : "bg-rose-500/5",
                            ].join(" ")}
                          >
                            {/* Status icon */}
                            <div
                              className={[
                                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                                done ? "bg-success" : "bg-rose-500/20",
                              ].join(" ")}
                              aria-hidden="true"
                            >
                              {done ? (
                                <svg className="h-3 w-3 text-button" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              ) : (
                                <svg className="h-3 w-3 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                              )}
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-heading">
                                  {c.label}
                                </p>
                                <span
                                  className={[
                                    "shrink-0 text-[0.62rem] font-bold tabular-nums",
                                    done ? "text-success" : "text-rose-600",
                                  ].join(" ")}
                                >
                                  {done ? `+${c.points}` : `+0 / ${c.points}`}
                                </span>
                              </div>
                              <p className="mt-0.5 text-xs leading-relaxed text-muted">
                                {c.hint}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Already submitted message */}
                  {alreadyUnderReview && (
                    <div className="rounded-md border border-sky-500/25 bg-sky-500/10 px-5 py-4">
                      <p className="text-sm font-semibold text-sky-700">
                        {verificationStatus === "Verified"
                          ? "Your profile has been verified. No further action is required."
                          : "Your profile is currently under review. You will be notified when the review is complete."}
                      </p>
                    </div>
                  )}

                  {/* Submit CTA */}
                  {!alreadyUnderReview && (
                    <div className="rounded-md border border-accent bg-surface px-5 py-5">
                      <p className="text-sm font-bold text-heading">
                        Ready to submit?
                      </p>
                      <p className="mt-1 text-xs leading-5 text-secondary">
                        Submitting will set your profile status to "Under Review". A
                        procurement team member will review your documents and verify
                        your profile.
                        {score < 70 && (
                          <span className="ml-1 text-warning">
                            Your score is below 70 — consider completing the missing items first for a stronger submission.
                          </span>
                        )}
                      </p>
                      <button
                        type="button"
                        onClick={handleSubmitForReview}
                        disabled={saving}
                        className="mt-4 inline-flex items-center gap-2 rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {saving ? (
                          <>
                            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                            Submitting…
                          </>
                        ) : (
                          <>
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M22 2L11 13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                            </svg>
                            Submit for Procurement Review
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Action bar ───────────────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-4 border-t border-panel px-6 py-4">
              <button
                type="button"
                onClick={handleBack}
                disabled={step === 1 || saving}
                className="inline-flex items-center gap-2 rounded-md border border-panel bg-panel px-4 py-2.5 text-sm font-semibold text-secondary transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Back
              </button>

              <div className="flex items-center gap-3">
                {stepSuccess && (
                  <p className="text-xs font-semibold text-success">{stepSuccess}</p>
                )}
                {step < 4 && (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Saving…
                      </>
                    ) : (
                      <>
                        {step === 3 ? "Continue to Review" : "Save & Continue"}
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
