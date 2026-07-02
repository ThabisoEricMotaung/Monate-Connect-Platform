"use client"

/*
 * --- buyer_profiles SQL migration ---------------------------------------------
 *
 * Run this in your Supabase SQL Editor before using this page.
 *
 * CREATE TABLE IF NOT EXISTS public.buyer_profiles (
 *   id                               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id                          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 *   organisation_name                text,
 *   province                         text,
 *   sector                           text,
 *   contact_person                   text,
 *   contact_email                    text,
 *   phone                            text,
 *   preferred_categories             jsonb NOT NULL DEFAULT '[]'::jsonb,
 *   preferred_provinces              jsonb NOT NULL DEFAULT '[]'::jsonb,
 *   minimum_verification_level       text  NOT NULL DEFAULT 'Any',
 *   document_requirements            jsonb NOT NULL DEFAULT '[]'::jsonb,
 *   rfq_title_pattern                text,
 *   standard_compliance_requirements jsonb NOT NULL DEFAULT '[]'::jsonb,
 *   standard_evaluation_criteria     jsonb NOT NULL DEFAULT '[]'::jsonb,
 *   default_deadline_window_days     integer NOT NULL DEFAULT 14,
 *   setup_completed                  boolean NOT NULL DEFAULT false,
 *   created_at                       timestamptz NOT NULL DEFAULT now(),
 *   updated_at                       timestamptz NOT NULL DEFAULT now(),
 *   CONSTRAINT buyer_profiles_user_id_key UNIQUE (user_id)
 * );
 *
 * ALTER TABLE public.buyer_profiles ENABLE ROW LEVEL SECURITY;
 *
 * CREATE POLICY "buyer_profiles_own_access" ON public.buyer_profiles
 *   FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
 *
 * CREATE OR REPLACE FUNCTION public.handle_buyer_profile_updated_at()
 * RETURNS TRIGGER LANGUAGE plpgsql AS $$
 * BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
 *
 * CREATE TRIGGER buyer_profiles_updated_at
 *   BEFORE UPDATE ON public.buyer_profiles
 *   FOR EACH ROW EXECUTE FUNCTION public.handle_buyer_profile_updated_at();
 */

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useAutosave } from "@/hooks/useAutosave"
import { logActivity } from "@/lib/activity"
import { getCurrentProfile, hasAdminOrBuyerAccess } from "@/lib/auth"
import {
  NATIONAL_PROVINCE_VALUE,
  SA_PHONE_ERROR,
  displayProvinceList,
  formatSAPhoneInput,
  isNationalSelection,
  phoneBlurValue,
  phoneFocusValue,
  validateSAPhone,
} from "@/lib/formValidation"
import { supabase } from "@/lib/supabase"

// --- Constants ----------------------------------------------------------------

const SA_PROVINCES = [
  "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal",
  "Limpopo", "Mpumalanga", "North West", "Northern Cape", "Western Cape",
]

const SECTORS = [
  "National Government Department",
  "Provincial Government Department",
  "Local Municipality",
  "State-Owned Entity (SOE / Parastatal)",
  "Private Sector Corporation",
  "Non-Governmental Organisation (NGO)",
  "Higher Education Institution",
  "Healthcare Institution",
  "Development Finance Institution",
  "Other",
]

const SUPPLIER_CATEGORIES = [
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
]

const DOCUMENT_REQUIREMENTS = [
  "CSD Registration Report",
  "B-BBEE Compliance Certificate",
  "SARS Tax Clearance / TCS PIN",
  "CIPC Company Registration Certificate",
  "Proof of Banking Details",
  "CIDB Grading Certificate",
  "Professional Indemnity Insurance",
  "Public Liability Insurance",
  "Health and Safety File",
  "OHS Management Plan",
  "Capability Statement / Company Profile",
  "Professional Body Registration Certificate",
  "COIDA Letter of Good Standing",
  "Proof of VAT Registration",
]

const VERIFICATION_LEVELS = [
  { value: "Any", label: "Any — no minimum verification required" },
  { value: "Pending Review", label: "Pending Review or higher" },
  { value: "Under Review", label: "Under Review or higher" },
  { value: "Verified", label: "Verified only" },
]

const DEFAULT_COMPLIANCE_ITEMS = [
  "Valid CSD registration report — current and matching trading name on quotation",
  "SARS tax compliance status PIN, verifiable at www.sars.gov.za",
  "B-BBEE compliance certificate (original or certified copy) or sworn affidavit for EME/QSE",
  "CIPC company registration certificate",
  "Original bank-stamped account confirmation letter (not a statement)",
  "Declaration of interests and confirmation of no conflict of interest",
]

const DEFAULT_EVALUATION_ITEMS = [
  "Price / cost competitiveness (40%)",
  "B-BBEE status and transformation contribution (20%)",
  "Technical compliance and full scope understanding (25%)",
  "Relevant experience and verifiable reference projects (10%)",
  "Delivery timeline and operational readiness (5%)",
]

const BUYER_ONBOARDING_SQL = `-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.buyer_profiles (
  id                               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organisation_name                text,
  province                         text,
  sector                           text,
  contact_person                   text,
  contact_email                    text,
  phone                            text,
  preferred_categories             jsonb NOT NULL DEFAULT '[]'::jsonb,
  preferred_provinces              jsonb NOT NULL DEFAULT '[]'::jsonb,
  minimum_verification_level       text  NOT NULL DEFAULT 'Any',
  document_requirements            jsonb NOT NULL DEFAULT '[]'::jsonb,
  rfq_title_pattern                text,
  standard_compliance_requirements jsonb NOT NULL DEFAULT '[]'::jsonb,
  standard_evaluation_criteria     jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_deadline_window_days     integer NOT NULL DEFAULT 14,
  setup_completed                  boolean NOT NULL DEFAULT false,
  created_at                       timestamptz NOT NULL DEFAULT now(),
  updated_at                       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT buyer_profiles_user_id_key UNIQUE (user_id)
);

ALTER TABLE public.buyer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "buyer_profiles_own_access" ON public.buyer_profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_buyer_profile_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER buyer_profiles_updated_at
  BEFORE UPDATE ON public.buyer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_buyer_profile_updated_at();`

// --- Types --------------------------------------------------------------------

type Step1Data = {
  organisation_name: string
  province: string
  sector: string
  contact_person: string
  contact_email: string
  phone: string
}

type Step2Data = {
  preferred_categories: string[]
  preferred_provinces: string[]
  minimum_verification_level: string
  document_requirements: string[]
}

type Step3Data = {
  rfq_title_pattern: string
  standard_compliance_requirements: string[]
  standard_evaluation_criteria: string[]
  default_deadline_window_days: number
}

type WizardDraft = {
  step: number
  step1: Step1Data
  step2: Step2Data
  step3: Step3Data
}

// --- Initial state ------------------------------------------------------------

const EMPTY_STEP1: Step1Data = {
  organisation_name: "",
  province: "",
  sector: "",
  contact_person: "",
  contact_email: "",
  phone: "",
}

const EMPTY_STEP2: Step2Data = {
  preferred_categories: [],
  preferred_provinces: [],
  minimum_verification_level: "Any",
  document_requirements: [],
}

const EMPTY_STEP3: Step3Data = {
  rfq_title_pattern: "Supply of [DESCRIPTION] – [PROVINCE] – [YEAR]",
  standard_compliance_requirements: [...DEFAULT_COMPLIANCE_ITEMS],
  standard_evaluation_criteria: [...DEFAULT_EVALUATION_ITEMS],
  default_deadline_window_days: 14,
}

// --- Shared styles ------------------------------------------------------------

const inputCls =
  "w-full rounded-md border border-panel bg-panel px-4 py-3 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"

const labelCls =
  "mb-1.5 block text-[0.68rem] font-bold uppercase tracking-[0.22em] text-secondary"

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-2 text-xs font-semibold text-rose-700">{message}</p>
}

// --- Wizard constants ---------------------------------------------------------

const STEPS = [
  { n: 1, label: "Organisation" },
  { n: 2, label: "Preferences" },
  { n: 3, label: "RFQ Template" },
  { n: 4, label: "Review" },
]

// --- Step indicator -----------------------------------------------------------

function StepIndicator({ current, completed }: { current: number; completed: Set<number> }) {
  return (
    <nav aria-label="Setup progress" className="mb-8">
      <ol className="flex items-center gap-0">
        {STEPS.map((step, idx) => {
          const isDone = completed.has(step.n)
          const isCurrent = current === step.n

          return (
            <li key={step.n} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1.5">
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
                  ) : step.n}
                </div>
                <span className={[
                  "hidden text-[0.62rem] font-bold uppercase tracking-[0.18em] sm:block",
                  isDone ? "text-success" : isCurrent ? "text-accent" : "text-muted",
                ].join(" ")}>
                  {step.label}
                </span>
              </div>
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

// --- Multi-select checkbox grid -----------------------------------------------

function CheckGrid({
  options,
  selected,
  onChange,
  columns = 2,
  disabled = false,
}: {
  options: string[]
  selected: string[]
  onChange: (next: string[]) => void
  columns?: 2 | 3
  disabled?: boolean
}) {
  function toggle(opt: string) {
    if (disabled) return
    onChange(
      selected.includes(opt)
        ? selected.filter((s) => s !== opt)
        : [...selected, opt]
    )
  }

  return (
    <div className={`grid gap-2 ${columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
      {options.map((opt) => {
        const checked = selected.includes(opt)
        return (
          <label
            key={opt}
            className={[
              "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 transition",
              disabled ? "cursor-not-allowed opacity-45" : "",
              checked
                ? "border-accent/40 bg-accent/10 text-heading"
                : "border-panel bg-surface text-secondary hover:border-accent/25 hover:bg-accent/5",
            ].join(" ")}
          >
            <span
              className={[
                "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition",
                checked ? "border-accent bg-accent" : "border-panel bg-card",
              ].join(" ")}
              aria-hidden="true"
            >
              {checked && (
                <svg className="h-2.5 w-2.5 text-button" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </span>
            <input
              type="checkbox"
              className="sr-only"
              checked={checked}
              onChange={() => toggle(opt)}
              value={opt}
              disabled={disabled}
            />
            <span className="text-xs font-semibold leading-snug">{opt}</span>
          </label>
        )
      })}
    </div>
  )
}

// --- Editable list ------------------------------------------------------------

function EditableList({
  items,
  onChange,
  placeholder,
  addLabel,
}: {
  items: string[]
  onChange: (next: string[]) => void
  placeholder: string
  addLabel: string
}) {
  const [draft, setDraft] = useState("")

  function add() {
    const trimmed = draft.trim()
    if (!trimmed || items.includes(trimmed)) return
    onChange([...items, trimmed])
    setDraft("")
  }

  function remove(idx: number) {
    onChange(items.filter((_, i) => i !== idx))
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); add() }
  }

  return (
    <div className="space-y-2">
      {/* Item list */}
      <div className="space-y-1.5">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="flex items-start gap-2 rounded-md border border-panel bg-surface px-3 py-2.5"
          >
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent text-[0.5rem] font-bold text-button" aria-hidden="true">
              {idx + 1}
            </span>
            <span className="flex-1 text-xs leading-relaxed text-heading">{item}</span>
            <button
              type="button"
              onClick={() => remove(idx)}
              className="ml-1 shrink-0 text-muted transition hover:text-rose-600"
              aria-label={`Remove item ${idx + 1}`}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="rounded-md border border-panel bg-surface px-3 py-3 text-xs text-muted">
            No items yet — add one below.
          </p>
        )}
      </div>

      {/* Add row */}
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          className={`${inputCls} flex-1`}
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-accent bg-accent px-4 py-2.5 text-xs font-bold text-button transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {addLabel}
        </button>
      </div>
    </div>
  )
}

// --- SQL display --------------------------------------------------------------

function SQLBlock({ sql }: { sql: string }) {
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)

  function copy() {
    navigator.clipboard.writeText(sql).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="mb-6 rounded-md border border-accent/25 bg-accent/5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <svg className="h-4 w-4 shrink-0 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" />
          </svg>
          <div>
            <p className="text-sm font-bold text-accent">Database Setup Required</p>
            <p className="mt-0.5 text-xs text-secondary">
              Create the <code className="rounded bg-accent/10 px-1.5 py-0.5 font-mono text-[0.7rem] text-accent">buyer_profiles</code> table in Supabase before using this wizard.
            </p>
          </div>
        </div>
        <svg className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-accent/20">
          <div className="flex items-center justify-between gap-3 px-5 py-3">
            <p className="text-xs text-secondary">
              Run this SQL in your Supabase dashboard → SQL Editor.
            </p>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1.5 rounded-md border border-panel bg-surface px-3 py-1.5 text-xs font-semibold text-secondary transition hover:border-accent hover:text-accent"
            >
              {copied ? (
                <>
                  <svg className="h-3.5 w-3.5 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                  Copy SQL
                </>
              )}
            </button>
          </div>
          <pre className="overflow-x-auto rounded-b-md bg-heading/5 px-5 py-4 font-mono text-[0.68rem] leading-relaxed text-secondary">
            {sql}
          </pre>
        </div>
      )}
    </div>
  )
}

// --- Review summary card ------------------------------------------------------

function SummaryCard({
  title,
  eyebrow,
  rows,
}: {
  title: string
  eyebrow: string
  rows: Array<{ label: string; value: string | string[] | number }>
}) {
  return (
    <div className="rounded-md border border-panel bg-card p-5 shadow-panel">
      <p className="text-[0.63rem] font-bold uppercase tracking-[0.22em] text-accent">{eyebrow}</p>
      <h3 className="mt-1 text-sm font-bold text-heading">{title}</h3>
      <div className="mt-4 divide-y divide-panel">
        {rows.map((row) => (
          <div key={row.label} className="py-2.5">
            <p className="text-[0.63rem] font-bold uppercase tracking-[0.18em] text-muted">{row.label}</p>
            {Array.isArray(row.value) ? (
              row.value.length > 0 ? (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {row.value.map((v) => (
                    <span key={v} className="inline-flex rounded-full border border-panel bg-surface px-2.5 py-0.5 text-xs font-semibold text-heading">
                      {v}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-xs text-muted italic">Not specified</p>
              )
            ) : (
              <p className="mt-1 text-sm font-semibold text-heading">
                {row.value || <span className="text-muted italic">Not specified</span>}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// --- Page ---------------------------------------------------------------------

export default function BuyerOnboardingPage() {
  const router = useRouter()

  const [userId, setUserId] = useState("")
  const [step, setStep] = useState(1)
  const [completed, setCompleted] = useState<Set<number>>(new Set())
  const [step1, setStep1] = useState<Step1Data>(EMPTY_STEP1)
  const [step2, setStep2] = useState<Step2Data>(EMPTY_STEP2)
  const [step3, setStep3] = useState<Step3Data>(EMPTY_STEP3)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [setupComplete, setSetupComplete] = useState(false)
  const [accessDenied, setAccessDenied] = useState(false)
  const [error, setError] = useState("")
  const [stepSuccess, setStepSuccess] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({})
  const [tableError, setTableError] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)

  // Autosave — all text + array state
  const wizardDraft = useMemo<WizardDraft>(
    () => ({ step, step1, step2, step3 }),
    [step, step1, step2, step3]
  )
  const autosave = useAutosave<WizardDraft>({
    key: "monate-draft-buyer-onboarding",
    value: wizardDraft,
    enabled: !loading && !setupComplete,
    onRestore: (draft) => {
      setStep(draft.step)
      setStep1({ ...draft.step1, phone: formatSAPhoneInput(draft.step1.phone) })
      setStep2(draft.step2)
      setStep3(draft.step3)
    },
  })

  // --- Load profile -----------------------------------------------------------

  useEffect(() => {
    async function load() {
      const profile = await getCurrentProfile()

      if (!profile || !hasAdminOrBuyerAccess(profile)) {
        setAccessDenied(true)
        setLoading(false)
        return
      }

      setUserId(profile.id)

      if (!supabase) {
        setError("Supabase is not configured.")
        setLoading(false)
        return
      }

      const { data, error: fetchErr } = await supabase
        .from("buyer_profiles")
        .select("*")
        .eq("user_id", profile.id)
        .maybeSingle()

      if (fetchErr) {
        if (fetchErr.message.includes("does not exist") || fetchErr.message.includes("relation")) {
          setTableError(true)
        } else {
          setError(fetchErr.message)
        }
        setLoading(false)
        return
      }

      if (data) {
        type Row = typeof data & Record<string, unknown>
        const row = data as Row

        setStep1({
          organisation_name: String(row.organisation_name ?? ""),
          province: String(row.province ?? ""),
          sector: String(row.sector ?? ""),
          contact_person: String(row.contact_person ?? ""),
          contact_email: String(row.contact_email ?? ""),
          phone: formatSAPhoneInput(String(row.phone ?? "")),
        })
        setStep2({
          preferred_categories: Array.isArray(row.preferred_categories) ? row.preferred_categories as string[] : [],
          preferred_provinces: Array.isArray(row.preferred_provinces) ? row.preferred_provinces as string[] : [],
          minimum_verification_level: String(row.minimum_verification_level ?? "Any"),
          document_requirements: Array.isArray(row.document_requirements) ? row.document_requirements as string[] : [],
        })
        setStep3({
          rfq_title_pattern: String(row.rfq_title_pattern ?? EMPTY_STEP3.rfq_title_pattern),
          standard_compliance_requirements: Array.isArray(row.standard_compliance_requirements)
            ? row.standard_compliance_requirements as string[]
            : [...DEFAULT_COMPLIANCE_ITEMS],
          standard_evaluation_criteria: Array.isArray(row.standard_evaluation_criteria)
            ? row.standard_evaluation_criteria as string[]
            : [...DEFAULT_EVALUATION_ITEMS],
          default_deadline_window_days: Number(row.default_deadline_window_days ?? 14),
        })
        if (row.setup_completed) setSetupComplete(true)

        // Infer completed steps
        const done = new Set<number>()
        if (row.organisation_name) done.add(1)
        if (
          Array.isArray(row.preferred_categories) ||
          row.minimum_verification_level !== undefined
        ) done.add(2)
        if (row.rfq_title_pattern) done.add(3)
        setCompleted(done)
      }

      setLoading(false)
    }

    load()
  }, [])

  // --- Supabase upsert helper -------------------------------------------------

  async function upsert(patch: Record<string, unknown>) {
    if (!supabase || !userId) return false
    setSaving(true)
    setError("")
    const { error: err } = await supabase
      .from("buyer_profiles")
      .upsert({ user_id: userId, ...patch }, { onConflict: "user_id" })
    setSaving(false)
    if (err) {
      if (err.message.includes("does not exist") || err.message.includes("relation")) {
        setTableError(true)
      } else {
        setError(err.message)
      }
      return false
    }
    return true
  }

  // --- Step handlers ----------------------------------------------------------

  function advance() {
    setStepSuccess("")
    setStep((s) => Math.min(s + 1, 4))
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60)
  }

  function back() {
    setError("")
    setStepSuccess("")
    setStep((s) => Math.max(s - 1, 1))
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60)
  }

  async function handleNext() {
    setError("")
    setStepSuccess("")
    setFieldErrors({})

    if (step === 1) {
      const nextFieldErrors: Record<string, string> = {}
      if (!step1.organisation_name.trim()) {
        nextFieldErrors.organisation_name = "Organisation name is required before continuing."
      }
      if (step1.phone.trim() && !validateSAPhone(step1.phone)) {
        nextFieldErrors.phone = SA_PHONE_ERROR
      }
      if (Object.keys(nextFieldErrors).length > 0) {
        setFieldErrors(nextFieldErrors)
        setError(nextFieldErrors.organisation_name ?? "")
        return
      }
      const ok = await upsert({ ...step1 })
      if (!ok) return
      setCompleted((p) => new Set(p).add(1))
      setStepSuccess("Organisation details saved.")
      try {
        await logActivity({
          action: "buyer_onboarding.step1_saved",
          entity_type: "buyer_profile",
          entity_id: userId,
          metadata: { step: 1, organisation_name: step1.organisation_name },
        })
      } catch { /* swallow */ }
      advance()
    } else if (step === 2) {
      if (step2.preferred_provinces.length === 0) {
        setFieldErrors({ preferred_provinces: "Select at least one province or choose national." })
        return
      }
      const ok = await upsert({
        preferred_categories: step2.preferred_categories,
        preferred_provinces: step2.preferred_provinces,
        minimum_verification_level: step2.minimum_verification_level,
        document_requirements: step2.document_requirements,
      })
      if (!ok) return
      setCompleted((p) => new Set(p).add(2))
      setStepSuccess("Procurement preferences saved.")
      try {
        await logActivity({
          action: "buyer_onboarding.step2_saved",
          entity_type: "buyer_profile",
          entity_id: userId,
          metadata: { step: 2 },
        })
      } catch { /* swallow */ }
      advance()
    } else if (step === 3) {
      const ok = await upsert({
        rfq_title_pattern: step3.rfq_title_pattern.trim(),
        standard_compliance_requirements: step3.standard_compliance_requirements,
        standard_evaluation_criteria: step3.standard_evaluation_criteria,
        default_deadline_window_days: step3.default_deadline_window_days,
      })
      if (!ok) return
      setCompleted((p) => new Set(p).add(3))
      setStepSuccess("RFQ template saved.")
      try {
        await logActivity({
          action: "buyer_onboarding.step3_saved",
          entity_type: "buyer_profile",
          entity_id: userId,
          metadata: { step: 3 },
        })
      } catch { /* swallow */ }
      advance()
    }
  }

  async function handleCompleteSetup() {
    const ok = await upsert({ setup_completed: true })
    if (!ok) return
    autosave.clearDraft()
    try {
      await logActivity({
        action: "buyer_onboarding.completed",
        entity_type: "buyer_profile",
        entity_id: userId,
        metadata: {
          organisation_name: step1.organisation_name,
          sector: step1.sector,
          province: step1.province,
        },
      })
    } catch { /* swallow */ }
    setSetupComplete(true)
  }

  // --- Guard states ------------------------------------------------------------

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 h-8 w-64 animate-pulse rounded bg-panel" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="mb-4 h-20 animate-pulse rounded-md bg-panel" />
        ))}
      </div>
    )
  }

  if (accessDenied) {
    return (
      <div className="mx-auto max-w-2xl rounded-md border border-rose-500/25 bg-rose-500/10 p-8 shadow-panel">
        <p className="text-sm font-bold text-rose-700">Access restricted</p>
        <p className="mt-2 text-sm leading-6 text-rose-700">
          Buyer Onboarding is only available to admin and buyer users.
        </p>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="mt-5 inline-flex rounded-md border border-panel bg-panel px-5 py-2.5 text-sm font-semibold text-secondary transition hover:bg-surface"
        >
          Back to Dashboard
        </button>
      </div>
    )
  }

  // --- Render -----------------------------------------------------------------

  return (
    <div className="mx-auto max-w-3xl">
      {/* Page header */}
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">
          Admin / Procurement Setup
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">
          Buyer Onboarding Wizard
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-secondary">
          Configure your procurement workspace — organisation details, supplier
          preferences, and reusable RFQ templates. Progress is saved at each
          step.
        </p>
      </div>

      {/* SQL setup block */}
      {(tableError || step === 1) && <SQLBlock sql={BUYER_ONBOARDING_SQL} />}

      {/* Table error banner */}
      {tableError && (
        <div className="mb-6 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-bold text-rose-700">
            buyer_profiles table not found
          </p>
          <p className="mt-1 text-xs text-rose-700">
            Run the SQL above in your Supabase SQL Editor, then refresh this page.
          </p>
        </div>
      )}

      {/* Global error */}
      {error && (
        <div className="mb-5 flex items-start gap-3 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-sm font-semibold text-rose-700">{error}</p>
        </div>
      )}

      {/* -- Setup complete --------------------------------------------------- */}
      {setupComplete && (
        <div className="rounded-md border border-success bg-success-soft p-8 text-center shadow-panel">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success text-button">
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="mt-5 text-xl font-bold text-success">
            Procurement workspace configured
          </h2>
          <p className="mt-2 text-sm leading-6 text-success/80">
            Your organisation profile, supplier preferences, and RFQ template
            have been saved. You can update them at any time by returning to this
            page.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/dashboard/admin/rfqs/new")}
              className="rounded-md border border-success bg-success px-5 py-2.5 text-sm font-semibold text-button transition hover:bg-success/90"
            >
              Create First RFQ
            </button>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="rounded-md border border-panel bg-surface px-5 py-2.5 text-sm font-semibold text-secondary transition hover:bg-panel"
            >
              Go to Dashboard
            </button>
            <button
              type="button"
              onClick={() => setSetupComplete(false)}
              className="rounded-md border border-panel bg-surface px-5 py-2.5 text-sm font-semibold text-secondary transition hover:bg-panel"
            >
              Edit Setup
            </button>
          </div>
        </div>
      )}

      {!setupComplete && (
        <>
          <StepIndicator current={step} completed={completed} />

          {/* Draft recovery */}
          {autosave.showRecoveryDialog && (
            <div className="mb-5 rounded-md border border-accent bg-surface p-5 shadow-panel">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-heading">
                    Restore previous progress?
                  </p>
                  <p className="mt-1 text-xs text-secondary">
                    We found a saved buyer onboarding draft from your last session.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={autosave.restoreDraft} className="rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button transition hover:bg-accent-strong">
                    Restore
                  </button>
                  <button type="button" onClick={autosave.discardDraft} className="rounded-md border border-panel bg-panel px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-surface">
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
            <button type="button" onClick={autosave.discardDraft} className="text-[0.68rem] font-semibold text-muted transition hover:text-secondary">
              Discard draft
            </button>
          </div>

          {/* -- Step card ----------------------------------------------------- */}
          <div ref={formRef} className="rounded-md border border-panel bg-card shadow-panel">

            {/* -- Step 1: Organisation Details ------------------------------- */}
            {step === 1 && (
              <div>
                <div className="border-b border-panel px-6 py-5">
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-accent">
                    Step 1 of 4
                  </p>
                  <h2 className="mt-1.5 text-lg font-bold text-heading">
                    Organisation Details
                  </h2>
                  <p className="mt-1 text-sm text-secondary">
                    Enter your organisation&apos;s information. This populates buyer
                    context across RFQs and procurement communications.
                  </p>
                </div>

                <div className="space-y-5 p-6">
                  <div>
                    <label htmlFor="organisation_name" className={labelCls}>
                      Organisation Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="organisation_name"
                      name="organisation_name"
                      type="text"
                      placeholder="e.g. Limpopo Department of Public Works"
                      value={step1.organisation_name}
                      onChange={(e) => setStep1((p) => ({ ...p, organisation_name: e.target.value }))}
                      className={inputCls}
                      required
                    />
                    <FieldError message={fieldErrors.organisation_name} />
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="province" className={labelCls}>Province</label>
                      <select
                        id="province"
                        value={step1.province}
                        onChange={(e) => setStep1((p) => ({ ...p, province: e.target.value }))}
                        className={inputCls}
                      >
                        <option value="">Select province</option>
                        {SA_PROVINCES.map((prov) => (
                          <option key={prov} value={prov}>{prov}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="sector" className={labelCls}>Organisation Sector</label>
                      <select
                        id="sector"
                        value={step1.sector}
                        onChange={(e) => setStep1((p) => ({ ...p, sector: e.target.value }))}
                        className={inputCls}
                      >
                        <option value="">Select sector</option>
                        {SECTORS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="contact_person" className={labelCls}>Contact Person</label>
                    <input
                      id="contact_person"
                      type="text"
                      placeholder="Full name of the procurement contact"
                      value={step1.contact_person}
                      onChange={(e) => setStep1((p) => ({ ...p, contact_person: e.target.value }))}
                      className={inputCls}
                    />
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="contact_email" className={labelCls}>Contact Email</label>
                      <input
                        id="contact_email"
                        type="email"
                        placeholder="procurement@organisation.gov.za"
                        value={step1.contact_email}
                        onChange={(e) => setStep1((p) => ({ ...p, contact_email: e.target.value }))}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label htmlFor="phone" className={labelCls}>Phone Number</label>
                      <input
                        id="phone"
                        type="tel"
                        placeholder="+27821234567"
                        value={step1.phone}
                        onChange={(e) => {
                          setStep1((p) => ({ ...p, phone: formatSAPhoneInput(e.target.value) }))
                          setFieldErrors((p) => ({ ...p, phone: undefined }))
                        }}
                        onFocus={() => setStep1((p) => ({ ...p, phone: phoneFocusValue(p.phone) }))}
                        onBlur={() => setStep1((p) => ({ ...p, phone: phoneBlurValue(p.phone) }))}
                        className={inputCls}
                      />
                      <FieldError message={fieldErrors.phone} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* -- Step 2: Procurement Preferences --------------------------- */}
            {step === 2 && (
              <div>
                <div className="border-b border-panel px-6 py-5">
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-accent">
                    Step 2 of 4
                  </p>
                  <h2 className="mt-1.5 text-lg font-bold text-heading">
                    Procurement Preferences
                  </h2>
                  <p className="mt-1 text-sm text-secondary">
                    Configure your supplier sourcing preferences. These inform
                    AI matching recommendations and compliance filters.
                  </p>
                </div>

                <div className="space-y-7 p-6">
                  {/* Preferred categories */}
                  <div>
                    <label className={labelCls}>Preferred Supplier Categories</label>
                    <p className="mb-3 text-xs text-muted">
                      Select the procurement categories most relevant to your organisation. Leave blank to accept all categories.
                    </p>
                    <CheckGrid
                      options={SUPPLIER_CATEGORIES}
                      selected={step2.preferred_categories}
                      onChange={(next) => setStep2((p) => ({ ...p, preferred_categories: next }))}
                    />
                    {step2.preferred_categories.length > 0 && (
                      <p className="mt-2 text-xs text-accent">
                        {step2.preferred_categories.length} categor{step2.preferred_categories.length > 1 ? "ies" : "y"} selected
                      </p>
                    )}
                  </div>

                  {/* Preferred provinces */}
                  <div>
                    <label className={labelCls}>Preferred Supplier Provinces</label>
                    <p className="mb-3 text-xs text-muted">
                      Filter supplier sourcing to specific provinces, or choose national coverage.
                    </p>
                    <label className="mb-3 flex items-center gap-3 rounded-md border border-panel bg-surface px-4 py-3 text-sm font-semibold text-secondary">
                      <input
                        type="checkbox"
                        checked={isNationalSelection(step2.preferred_provinces)}
                        onChange={(e) => {
                          setStep2((p) => ({
                            ...p,
                            preferred_provinces: e.target.checked ? [NATIONAL_PROVINCE_VALUE] : [],
                          }))
                          setFieldErrors((p) => ({ ...p, preferred_provinces: undefined }))
                        }}
                        className="h-4 w-4 rounded border-panel accent-[var(--accent)]"
                      />
                      <span>I operate nationally</span>
                    </label>
                    <CheckGrid
                      options={SA_PROVINCES}
                      selected={step2.preferred_provinces}
                      onChange={(next) => {
                        setStep2((p) => ({ ...p, preferred_provinces: next }))
                        setFieldErrors((p) => ({ ...p, preferred_provinces: undefined }))
                      }}
                      columns={3}
                      disabled={isNationalSelection(step2.preferred_provinces)}
                    />
                    <FieldError message={fieldErrors.preferred_provinces} />
                    {step2.preferred_provinces.length > 0 && (
                      <p className="mt-2 text-xs text-accent">
                        {isNationalSelection(step2.preferred_provinces)
                          ? "National selected"
                          : `${step2.preferred_provinces.length} province${step2.preferred_provinces.length > 1 ? "s" : ""} selected`}
                      </p>
                    )}
                  </div>

                  {/* Minimum verification level */}
                  <div>
                    <label className={labelCls}>Minimum Supplier Verification Level</label>
                    <p className="mb-3 text-xs text-muted">
                      Set the minimum profile verification status a supplier must have to be recommended for your RFQs.
                    </p>
                    <div className="space-y-2">
                      {VERIFICATION_LEVELS.map((lvl) => (
                        <label
                          key={lvl.value}
                          className={[
                            "flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 transition",
                            step2.minimum_verification_level === lvl.value
                              ? "border-accent/40 bg-accent/10"
                              : "border-panel bg-surface hover:border-accent/25",
                          ].join(" ")}
                        >
                          <span
                            className={[
                              "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition",
                              step2.minimum_verification_level === lvl.value
                                ? "border-accent bg-accent"
                                : "border-panel bg-card",
                            ].join(" ")}
                            aria-hidden="true"
                          >
                            {step2.minimum_verification_level === lvl.value && (
                              <span className="h-1.5 w-1.5 rounded-full bg-button" />
                            )}
                          </span>
                          <input
                            type="radio"
                            className="sr-only"
                            name="minimum_verification_level"
                            value={lvl.value}
                            checked={step2.minimum_verification_level === lvl.value}
                            onChange={() => setStep2((p) => ({ ...p, minimum_verification_level: lvl.value }))}
                          />
                          <span className="text-sm font-semibold text-heading">{lvl.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Document requirements */}
                  <div>
                    <label className={labelCls}>Required Supplier Documents</label>
                    <p className="mb-3 text-xs text-muted">
                      Select the compliance documents you require from all suppliers responding to your RFQs.
                    </p>
                    <CheckGrid
                      options={DOCUMENT_REQUIREMENTS}
                      selected={step2.document_requirements}
                      onChange={(next) => setStep2((p) => ({ ...p, document_requirements: next }))}
                    />
                    {step2.document_requirements.length > 0 && (
                      <p className="mt-2 text-xs text-accent">
                        {step2.document_requirements.length} document{step2.document_requirements.length > 1 ? "s" : ""} required
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* -- Step 3: RFQ Templates --------------------------------------- */}
            {step === 3 && (
              <div>
                <div className="border-b border-panel px-6 py-5">
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-accent">
                    Step 3 of 4
                  </p>
                  <h2 className="mt-1.5 text-lg font-bold text-heading">
                    RFQ Template Configuration
                  </h2>
                  <p className="mt-1 text-sm text-secondary">
                    Set default values that pre-populate new RFQs. These are your
                    organisation&apos;s standard procurement starting point.
                  </p>
                </div>

                <div className="space-y-7 p-6">
                  {/* Title pattern */}
                  <div>
                    <label htmlFor="rfq_title_pattern" className={labelCls}>Default RFQ Title Pattern</label>
                    <input
                      id="rfq_title_pattern"
                      type="text"
                      placeholder="Supply of [DESCRIPTION] – [PROVINCE] – [YEAR]"
                      value={step3.rfq_title_pattern}
                      onChange={(e) => setStep3((p) => ({ ...p, rfq_title_pattern: e.target.value }))}
                      className={inputCls}
                    />
                    <p className="mt-1.5 text-xs text-muted">
                      Use placeholders like <code className="rounded bg-panel px-1 font-mono">[DESCRIPTION]</code>, <code className="rounded bg-panel px-1 font-mono">[PROVINCE]</code>, <code className="rounded bg-panel px-1 font-mono">[YEAR]</code> as reminders when drafting new RFQs.
                    </p>
                  </div>

                  {/* Default deadline */}
                  <div className="max-w-xs">
                    <label htmlFor="deadline_days" className={labelCls}>Default Deadline Window (days)</label>
                    <div className="flex items-center gap-3">
                      <input
                        id="deadline_days"
                        type="number"
                        min={7}
                        max={90}
                        value={step3.default_deadline_window_days}
                        onChange={(e) => setStep3((p) => ({ ...p, default_deadline_window_days: Math.max(7, Math.min(90, Number(e.target.value))) }))}
                        className={`${inputCls} w-28`}
                      />
                      <p className="text-sm text-secondary">
                        calendar days from publication
                      </p>
                    </div>
                    <p className="mt-1.5 text-xs text-muted">
                      Standard practice: 14–21 days for standard procurement; 21–30 days for technical or high-value requests.
                    </p>
                  </div>

                  {/* Standard compliance requirements */}
                  <div>
                    <label className={labelCls}>Standard Compliance Requirements</label>
                    <p className="mb-3 text-xs text-muted">
                      These appear in every new RFQ&apos;s compliance section. Edit or remove items to match your organisation&apos;s standard.
                    </p>
                    <EditableList
                      items={step3.standard_compliance_requirements}
                      onChange={(next) => setStep3((p) => ({ ...p, standard_compliance_requirements: next }))}
                      placeholder="Add a compliance requirement…"
                      addLabel="Add"
                    />
                  </div>

                  {/* Standard evaluation criteria */}
                  <div>
                    <label className={labelCls}>Standard Evaluation Criteria</label>
                    <p className="mb-3 text-xs text-muted">
                      These define how your organisation evaluates supplier quotes. Include weighting percentages where applicable.
                    </p>
                    <EditableList
                      items={step3.standard_evaluation_criteria}
                      onChange={(next) => setStep3((p) => ({ ...p, standard_evaluation_criteria: next }))}
                      placeholder="Add an evaluation criterion e.g. Price competitiveness (40%)"
                      addLabel="Add"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* -- Step 4: Review Setup ---------------------------------------- */}
            {step === 4 && (
              <div>
                <div className="border-b border-panel px-6 py-5">
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-accent">
                    Step 4 of 4
                  </p>
                  <h2 className="mt-1.5 text-lg font-bold text-heading">
                    Review Your Setup
                  </h2>
                  <p className="mt-1 text-sm text-secondary">
                    Review your procurement workspace configuration before
                    completing setup. Go back to edit any step.
                  </p>
                </div>

                <div className="space-y-5 p-6">
                  {/* Organisation summary */}
                  <SummaryCard
                    eyebrow="Step 1"
                    title="Organisation Details"
                    rows={[
                      { label: "Organisation Name", value: step1.organisation_name },
                      { label: "Province", value: step1.province },
                      { label: "Sector", value: step1.sector },
                      { label: "Contact Person", value: step1.contact_person },
                      { label: "Contact Email", value: step1.contact_email },
                      { label: "Phone", value: step1.phone },
                    ]}
                  />

                  {/* Preferences summary */}
                  <SummaryCard
                    eyebrow="Step 2"
                    title="Procurement Preferences"
                    rows={[
                      {
                        label: "Preferred Categories",
                        value: step2.preferred_categories.length > 0 ? step2.preferred_categories : ["All categories"],
                      },
                      {
                        label: "Preferred Provinces",
                        value: step2.preferred_provinces.length > 0
                          ? [displayProvinceList(step2.preferred_provinces)]
                          : ["All provinces"],
                      },
                      { label: "Minimum Verification Level", value: step2.minimum_verification_level },
                      {
                        label: "Required Documents",
                        value: step2.document_requirements.length > 0 ? step2.document_requirements : ["None specified"],
                      },
                    ]}
                  />

                  {/* RFQ template summary */}
                  <SummaryCard
                    eyebrow="Step 3"
                    title="RFQ Template"
                    rows={[
                      { label: "Title Pattern", value: step3.rfq_title_pattern },
                      { label: "Default Deadline", value: `${step3.default_deadline_window_days} calendar days` },
                      {
                        label: `Compliance Requirements (${step3.standard_compliance_requirements.length})`,
                        value: step3.standard_compliance_requirements,
                      },
                      {
                        label: `Evaluation Criteria (${step3.standard_evaluation_criteria.length})`,
                        value: step3.standard_evaluation_criteria,
                      },
                    ]}
                  />

                  {/* Complete CTA */}
                  <div className="rounded-md border border-accent bg-surface px-5 py-5">
                    <p className="text-sm font-bold text-heading">
                      Complete your procurement workspace
                    </p>
                    <p className="mt-1 text-xs leading-5 text-secondary">
                      Your settings will be saved to the <code className="rounded bg-panel px-1.5 py-0.5 font-mono text-[0.7rem] text-accent">buyer_profiles</code> table. You can return to this wizard at any time to update your configuration.
                    </p>
                    <button
                      type="button"
                      onClick={handleCompleteSetup}
                      disabled={saving}
                      className="mt-4 inline-flex items-center gap-2 rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          Saving setup…
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Complete Procurement Setup
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* -- Action bar -------------------------------------------------- */}
            <div className="flex items-center justify-between gap-4 border-t border-panel px-6 py-4">
              <button
                type="button"
                onClick={back}
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
                    disabled={saving || tableError}
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
