"use client"

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { IconArrowLeft } from "@tabler/icons-react"
import { OFFICIAL_INDUSTRY_OPTIONS } from "@/lib/industries"
import { calculateSmartScore } from "@/lib/smartScore"
import { supabase } from "@/lib/supabase"
import {
  NATIONAL_PROVINCE_VALUE,
  SA_PHONE_ERROR,
  displayProvinceList,
  formatSAPhoneInput,
  phoneBlurValue,
  phoneFocusValue,
  isNationalSelection,
  validateCsdNumber,
  validateSAPhone,
  validateTaxNumber,
  validateVatNumber,
} from "@/lib/formValidation"

const steps = ["Account", "Business details", "Compliance", "Review", "Submitted"]

const provinces = [
  "Gauteng",
  "Western Cape",
  "KwaZulu-Natal",
  "Mpumalanga",
  "Limpopo",
  "Eastern Cape",
  "Free State",
  "North West",
  "Northern Cape",
]

const bbeeLevels = [
  "Level 1 (135+ points)",
  "Level 2 (125-134 points)",
  "Level 3 (110-124 points)",
  "Level 4 (100-109 points)",
  "Level 5 (80-99 points)",
  "Level 6 (60-79 points)",
  "Level 7 (50-59 points)",
  "Level 8 (40-49 points)",
  "Non-compliant",
  "Exempt micro enterprise",
  "Not yet assessed",
]

type SignupForm = {
  role: "supplier" | "buyer"
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
  businessName: string
  registrationNumber: string
  phone: string
  industry: string
  provinces: string[]
  csdNumber: string
  csdDocumentFile: File | null
  csdDocumentPath: string
  taxReference: string
  bbeeLevel: string
  vatNumber: string
  csdConfirmed: boolean
  termsAccepted: boolean
}

type SignupErrors = Partial<Record<keyof SignupForm | "submit", string>>

type PasswordRule = {
  label: string
  met: boolean
}

type MissingComplianceItem = "csdCertificate" | "taxReference" | "vatNumber" | "bbbeeCertificate"

const complianceWarningCopy: Record<MissingComplianceItem, { documentName: string; fieldLabel: string }> = {
  csdCertificate: { documentName: "CSD Certificate", fieldLabel: "CSD Certificate" },
  taxReference: { documentName: "Tax Reference Number", fieldLabel: "Tax Reference Number" },
  vatNumber: { documentName: "VAT Registration Number", fieldLabel: "VAT Registration Number" },
  bbbeeCertificate: { documentName: "BBBEE Certificate", fieldLabel: "BBBEE level" },
}

const inputClass =
  "mt-2 w-full rounded-2xl border border-panel bg-surface px-5 py-4 text-primary outline-none transition focus:border-accent"

const selectClass =
  "mt-2 w-full rounded-2xl border border-panel bg-surface px-5 py-4 text-primary outline-none transition focus:border-accent"

const initialForm: SignupForm = {
  role: "supplier",
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
  businessName: "",
  registrationNumber: "",
  phone: "",
  industry: "",
  provinces: [],
  csdNumber: "",
  csdDocumentFile: null,
  csdDocumentPath: "",
  taxReference: "",
  bbeeLevel: "",
  vatNumber: "",
  csdConfirmed: false,
  termsAccepted: false,
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function cleanFileName(name: string) {
  return name.trim().replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-")
}

function preferredFirstName(value: string) {
  return value.trim().split(/\s+/)[0] || "there"
}

function fullNameFromParts(firstName: string, lastName: string) {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ")
}

function splitNameParts(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean)
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  }
}

function getPasswordRules(password: string): PasswordRule[] {
  return [
    { label: "Add at least 8 characters", met: password.length >= 8 },
    { label: "Add uppercase", met: /[A-Z]/.test(password) },
    { label: "Add lowercase", met: /[a-z]/.test(password) },
    { label: "Add a number", met: /\d/.test(password) },
  ]
}

function isStrongPassword(password: string) {
  return getPasswordRules(password).every((rule) => rule.met)
}

function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null

  const rules = getPasswordRules(password)
  const metCount = rules.filter((rule) => rule.met).length
  const unmetRules = rules.filter((rule) => !rule.met)
  const barColor =
    metCount === 4 ? "bg-emerald-600" : metCount >= 2 ? "bg-amber-500" : "bg-rose-600"

  return (
    <div className="mt-3" aria-live="polite">
      <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
        {rules.map((rule, index) => (
          <span
            key={rule.label}
            className={`h-1.5 rounded-full ${index < metCount ? barColor : "bg-panel"}`}
          />
        ))}
      </div>
      {metCount === 4 ? (
        <p className="mt-2 text-xs font-semibold text-emerald-700">Strong password ?</p>
      ) : (
        <p className="mt-2 text-xs leading-5 text-muted">
          {unmetRules.map((rule) => rule.label).join(" — ")}
        </p>
      )}
    </div>
  )
}

function GoogleLogo() {
  return (
    <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 18 18">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.33-1.58-5.04-3.72H.94v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.96 10.7A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.16.28-1.7V4.97H.94A9 9 0 0 0 0 9c0 1.45.34 2.82.94 4.03l3.02-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .94 4.97L3.96 7.3C4.67 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  )
}

function MicrosoftLogo() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      width="20"
      height="20"
      viewBox="0 0 21 21"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  )
}

function AuthDivider() {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-panel" />
      <span className="text-xs text-muted">or</span>
      <span className="h-px flex-1 bg-panel" />
    </div>
  )
}

function VisibilityIcon({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
        <path
          d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M7.2 7.6C5.2 8.8 3.8 10.6 3 12c1.8 3.1 5.1 6 9 6 1.3 0 2.5-.3 3.6-.8M10 5.2A8.5 8.5 0 0 1 12 5c3.9 0 7.2 2.9 9 7-.5.9-1.2 1.8-2 2.6"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    )
  }

  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M3 12c1.8-3.1 5.1-6 9-6s7.2 2.9 9 6c-1.8 3.1-5.1 6-9 6s-7.2-2.9-9-6Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function PasswordVisibilityButton({
  visible,
  onClick,
  label,
}: {
  visible: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted transition hover:text-accent"
    >
      <VisibilityIcon visible={visible} />
    </button>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-2 text-xs font-semibold text-rose-700">{message}</p>
}

function Stepper({
  currentStep,
  onStepClick,
}: {
  currentStep: number
  onStepClick: (step: number) => void
}) {
  return (
    <div className="mb-8">
      <div className="grid grid-cols-5 gap-2">
        {steps.map((label, index) => {
          const stepNumber = index + 1
          const isCompleted = stepNumber < currentStep
          const isCurrent = stepNumber === currentStep

          return (
            <button
              key={label}
              type="button"
              onClick={() => { if (isCompleted) onStepClick(stepNumber) }}
              disabled={!isCompleted}
              className="group text-left disabled:cursor-default"
            >
              <div className="flex items-center">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-bold transition ${
                    isCompleted
                      ? "border-accent bg-accent text-button"
                      : isCurrent
                        ? "border-accent bg-accent text-button"
                        : "border-panel bg-surface text-muted"
                  }`}
                >
                  {isCompleted ? "?" : stepNumber}
                </span>
                {index < steps.length - 1 && (
                  <span className={`ml-2 h-px flex-1 ${stepNumber < currentStep ? "bg-accent" : "bg-panel"}`} />
                )}
              </div>
              <span
                className={`mt-2 block text-[0.66rem] font-bold uppercase tracking-[0.16em] ${
                  isCurrent ? "text-accent" : isCompleted ? "text-heading" : "text-muted"
                }`}
              >
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TrustIcon({ type }: { type: "lock" | "shield" | "clock" }) {
  if (type === "shield") {
    return (
      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
        <path d="M12 3 5.5 5.5v5.8c0 4 2.6 7.6 6.5 9.1 3.9-1.5 6.5-5.1 6.5-9.1V5.5L12 3Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    )
  }
  if (type === "clock") {
    return (
      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
        <path d="M12 7v5l3 2M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    )
  }
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="M7 10V8a5 5 0 0 1 10 0v2M6 10h12v10H6V10Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  )
}
export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<SignupForm>(initialForm)
  const [errors, setErrors] = useState<SignupErrors>({})
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isOauthSignup, setIsOauthSignup] = useState(false)
  const [showOauthRegistrationNotice, setShowOauthRegistrationNotice] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [complianceWarnings, setComplianceWarnings] = useState<MissingComplianceItem[]>([])
  const [acknowledgedComplianceWarnings, setAcknowledgedComplianceWarnings] = useState(false)
  const csdUploadRef = useRef<HTMLInputElement>(null)
  const taxReferenceRef = useRef<HTMLInputElement>(null)
  const vatNumberRef = useRef<HTMLInputElement>(null)
  const bbbeeLevelRef = useRef<HTMLSelectElement>(null)
  const passwordsDoNotMatch =
    !isOauthSignup &&
    form.confirmPassword.length > 0 &&
    form.password !== form.confirmPassword

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("role") === "buyer") {
      setForm((current) => ({ ...current, role: "buyer" }))
    }
    const isOAuthSource = params.get("source") === "oauth"
    if (params.get("oauth") === "true" || isOAuthSource) {
      const oauthEmail = params.get("email") ?? ""
      setIsOauthSignup(true)
      setShowOauthRegistrationNotice(isOAuthSource)
      setForm((current) => ({
        ...current,
        email: oauthEmail,
        password: "",
        confirmPassword: "",
      }))

      if (supabase) {
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (!user) return

          setUserId(user.id)
          const metadataName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            ""
          const metadataFirstName =
            user.user_metadata?.first_name ||
            user.user_metadata?.given_name ||
            splitNameParts(metadataName).firstName
          const metadataLastName =
            user.user_metadata?.last_name ||
            user.user_metadata?.family_name ||
            splitNameParts(metadataName).lastName
          setForm((current) => ({
            ...current,
            email: current.email || user.email || "",
            firstName: current.firstName || metadataFirstName || "",
            lastName: current.lastName || metadataLastName || "",
          }))
        })
      }
    }
  }, [])


  const updateField = <K extends keyof SignupForm>(field: K, value: SignupForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined, submit: undefined }))
    if (field === "csdDocumentFile" || field === "taxReference" || field === "vatNumber" || field === "bbeeLevel") {
      setAcknowledgedComplianceWarnings(false)
      setComplianceWarnings((current) => current.filter((item) => {
        if (field === "csdDocumentFile") return item !== "csdCertificate"
        if (field === "taxReference") return item !== "taxReference"
        if (field === "vatNumber") return item !== "vatNumber"
        if (field === "bbeeLevel") return item !== "bbbeeCertificate"
        return true
      }))
    }
  }

  const updatePhoneField = (value: string) => {
    updateField("phone", formatSAPhoneInput(value))
  }

  const handlePhoneFocus = () => {
    updateField("phone", phoneFocusValue(form.phone))
  }

  const handlePhoneBlur = () => {
    updateField("phone", phoneBlurValue(form.phone))
  }

  const toggleProvince = (province: string) => {
    if (isNationalSelection(form.provinces)) return
    const nextProvinces = form.provinces.includes(province)
      ? form.provinces.filter((item) => item !== province)
      : [...form.provinces, province]
    updateField("provinces", nextProvinces)
  }

  const toggleNationalProvinces = (checked: boolean) => {
    updateField("provinces", checked ? [NATIONAL_PROVINCE_VALUE] : [])
  }

  const handleCsdDocumentChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setForm((current) => ({ ...current, csdDocumentFile: file, csdDocumentPath: file ? "" : current.csdDocumentPath }))
    setErrors((current) => ({ ...current, csdDocumentFile: undefined, submit: undefined }))
    setAcknowledgedComplianceWarnings(false)
    if (file) setComplianceWarnings((current) => current.filter((item) => item !== "csdCertificate"))
  }

  function missingComplianceItems(): MissingComplianceItem[] {
    const missing: MissingComplianceItem[] = []
    if (!form.csdDocumentFile && !form.csdDocumentPath) missing.push("csdCertificate")
    if (!form.taxReference.trim()) missing.push("taxReference")
    if (!form.vatNumber.trim()) missing.push("vatNumber")
    missing.push("bbbeeCertificate")
    return missing
  }

  function focusComplianceField(item: MissingComplianceItem) {
    if (item === "csdCertificate") csdUploadRef.current?.focus()
    if (item === "taxReference") taxReferenceRef.current?.focus()
    if (item === "vatNumber") vatNumberRef.current?.focus()
    if (item === "bbbeeCertificate") bbbeeLevelRef.current?.focus()
  }

  function dismissComplianceWarning(item: MissingComplianceItem) {
    setComplianceWarnings((current) => current.filter((warning) => warning !== item))
  }

  const uploadCsdDocumentIfNeeded = async () => {
    if (!form.csdDocumentFile || form.csdDocumentPath) return form.csdDocumentPath || null
    if (!supabase || !userId) throw new Error("Session expired — please reload and start over.")

    const file = form.csdDocumentFile
    const path = `${userId}/csd-certificate/${Date.now()}-${cleanFileName(file.name)}`
    const { error } = await supabase.storage
      .from("supplier-documents")
      .upload(path, file, { upsert: true })

    if (error) throw new Error(error.message)

    const { data: document, error: documentError } = await supabase
      .from("supplier_documents")
      .insert({
        profile_id: userId,
        document_type: "csd",
        file_url: path,
        storage_path: path,
        original_filename: file.name,
        content_type: file.type || null,
        file_size: file.size,
        status: "under_review",
      })
      .select("id")
      .single()

    if (documentError) throw new Error(documentError.message)

    const { error: supersedeError } = await supabase.rpc("supersede_supplier_documents", {
      p_profile_id: userId,
      p_document_type: "csd",
      p_keep_document_id: document.id,
    })

    if (supersedeError) throw new Error(supersedeError.message)

    setForm((current) => ({ ...current, csdDocumentPath: path, csdDocumentFile: null }))
    return path
  }

  const validateStep = (targetStep: number) => {
    const nextErrors: SignupErrors = {}

    if (targetStep === 1) {
      if (!form.firstName.trim()) nextErrors.firstName = "First name is required."
      if (!form.lastName.trim()) nextErrors.lastName = "Surname is required."
      if (!form.email.trim()) nextErrors.email = "Work email address is required."
      else if (!isValidEmail(form.email)) nextErrors.email = "Enter a valid email address."
      if (!isOauthSignup && !form.password) nextErrors.password = "Password is required."
      else if (!isOauthSignup && !isStrongPassword(form.password)) {
        nextErrors.password = "Password does not meet the minimum requirements."
      }
      if (!isOauthSignup && form.password !== form.confirmPassword) {
        nextErrors.confirmPassword = "Passwords do not match"
      }
    }

    if (targetStep === 2) {
      if (!form.businessName.trim()) nextErrors.businessName = "Registered business name is required."
      if (!form.registrationNumber.trim()) nextErrors.registrationNumber = "Company registration number is required."
      if (!form.phone.trim()) nextErrors.phone = "Phone number is required."
      else if (!validateSAPhone(form.phone)) nextErrors.phone = SA_PHONE_ERROR
      if (!form.industry) nextErrors.industry = "Industry is required."
      if (form.provinces.length === 0) nextErrors.provinces = "Select at least one province."
    }

    if (targetStep === 3) {
      if (!form.csdNumber.trim()) nextErrors.csdNumber = "CSD supplier number is required."
      else if (!validateCsdNumber(form.csdNumber)) nextErrors.csdNumber = "Enter a valid CSD number in MAAA-XXXXXXXX format."
      if (form.taxReference.trim() && !validateTaxNumber(form.taxReference)) nextErrors.taxReference = "Tax number must be exactly 10 digits."
      if (form.vatNumber.trim() && !validateVatNumber(form.vatNumber)) {
        nextErrors.vatNumber = "VAT number must be exactly 10 digits and start with 4."
      }
      if (!form.bbeeLevel) nextErrors.bbeeLevel = "BBBEE level is required."
      if (!form.csdConfirmed) nextErrors.csdConfirmed = "Confirm that your CSD profile is active."
    }

    if (targetStep === 4) {
      if (!form.termsAccepted) nextErrors.termsAccepted = "You must agree before submitting."
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const goBack = () => {
    setErrors({})
    setStep((current) => Math.max(current - 1, 1))
  }

  // STEP 1: create auth user and advance
  const handleStep1 = async () => {
    if (!validateStep(1)) return
    setLoading(true)
    setErrors({})

    if (!supabase) {
      setErrors({ submit: "Supabase environment variables are not configured." })
      setLoading(false)
      return
    }

    const normalizedEmail = form.email.trim().toLowerCase()
    const fullName = fullNameFromParts(form.firstName, form.lastName)

    if (isOauthSignup) {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setErrors({ submit: userError?.message ?? "Google sign-in session expired. Please try again." })
        setLoading(false)
        return
      }

      setUserId(user.id)
      setForm((current) => ({
        ...current,
        email: user.email ?? normalizedEmail,
        firstName:
          current.firstName ||
          user.user_metadata?.first_name ||
          user.user_metadata?.given_name ||
          splitNameParts(user.user_metadata?.full_name || user.user_metadata?.name || "").firstName ||
          "",
        lastName:
          current.lastName ||
          user.user_metadata?.last_name ||
          user.user_metadata?.family_name ||
          splitNameParts(user.user_metadata?.full_name || user.user_metadata?.name || "").lastName ||
          "",
      }))
      setLoading(false)
      setStep(2)
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: form.password,
      options: {
        data: {
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          full_name: fullName,
          preferred_name: form.firstName.trim(),
          role: form.role,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setErrors({ submit: error.message })
      setLoading(false)
      return
    }

    if (!data.user) {
      setErrors({ submit: "Account creation failed — no user record was returned." })
      setLoading(false)
      return
    }

    setUserId(data.user.id)
    router.replace(`/auth/verify-email?email=${encodeURIComponent(normalizedEmail)}`)
  }

  // STEP 2: save business details (non-fatal if RLS blocks before email verify)
  const handleStep2Save = async () => {
    if (!validateStep(2)) return
    setLoading(true)

    if (supabase && userId) {
      const smartScore = calculateSmartScore({
        business_name: form.businessName,
        industry: form.industry,
        provinces: form.provinces,
        phone: form.phone,
      })
      await supabase.from("profiles").upsert({
        id: userId,
        business_name: form.businessName,
        company_registration: form.registrationNumber,
        phone: form.phone,
        industry: form.industry,
        provinces: form.provinces,
        province: displayProvinceList(form.provinces),
        smart_score: smartScore,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" })
    }

    setLoading(false)
    setStep(3)
  }

  // STEP 3: save compliance info (non-fatal)
  const handleStep3Save = async ({ skipWarnings = false }: { skipWarnings?: boolean } = {}) => {
    if (!validateStep(3)) return
    const missing = missingComplianceItems()
    if (missing.length > 0 && !skipWarnings && !acknowledgedComplianceWarnings) {
      setComplianceWarnings(missing)
      return
    }

    setComplianceWarnings([])
    setAcknowledgedComplianceWarnings(false)
    setLoading(true)
    setErrors({})

    if (supabase && userId) {
      try {
        await uploadCsdDocumentIfNeeded()
      } catch (error) {
        setErrors({ csdDocumentFile: error instanceof Error ? error.message : "CSD certificate upload failed." })
        setLoading(false)
        return
      }
      const smartScore = calculateSmartScore({
        business_name: form.businessName,
        industry: form.industry,
        provinces: form.provinces,
        phone: form.phone,
        csd_number: form.csdNumber,
        bbbee_level: form.bbeeLevel,
      })
      await supabase.from("profiles").upsert({
        id: userId,
        csd_number: form.csdNumber,
        tax_reference: form.taxReference,
        bbbee_level: form.bbeeLevel,
        vat_number: form.vatNumber || null,
        smart_score: smartScore,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" })
    }

    setLoading(false)
    setStep(4)
  }

  const handleResendVerification = async () => {
    setResending(true)
    setResendMessage(null)

    if (!supabase) {
      setResendMessage("Supabase environment variables are not configured.")
      setResending(false)
      return
    }

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: form.email.trim().toLowerCase(),
    })

    setResendMessage(error ? error.message : "Verification email sent. Please check your inbox.")
    setResending(false)
  }

  // STEP 4: final upsert with all fields + confirmation
  const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!validateStep(4)) return
    setLoading(true)
    setErrors({})

    if (!supabase || !userId) {
      setErrors({ submit: "Session expired — please reload and start over." })
      setLoading(false)
      return
    }

    const normalizedEmail = form.email.trim().toLowerCase()
    const fullName = fullNameFromParts(form.firstName, form.lastName)

    const smartScore = calculateSmartScore({
      business_name: form.businessName,
      industry: form.industry,
      provinces: form.provinces,
      phone: form.phone,
      csd_number: form.csdNumber,
      bbbee_level: form.bbeeLevel,
    })

    try {
      await uploadCsdDocumentIfNeeded()
    } catch (error) {
      setErrors({ csdDocumentFile: error instanceof Error ? error.message : "CSD certificate upload failed." })
      setLoading(false)
      return
    }

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      email: normalizedEmail,
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim(),
      full_name: fullName,
      preferred_name: form.firstName.trim(),
      business_name: form.businessName,
      company_registration: form.registrationNumber,
      phone: form.phone,
      industry: form.industry,
      provinces: form.provinces,
      province: displayProvinceList(form.provinces),
      csd_number: form.csdNumber,
      tax_reference: form.taxReference,
      bbbee_level: form.bbeeLevel,
      vat_number: form.vatNumber || null,
      verification_status: "Pending Review",
      registration_complete: true,
      role: form.role,
      smart_score: smartScore,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" })

    if (profileError) {
      console.error("Profile save:", profileError.message)
    }

    setLoading(false)
    router.replace(`/auth/verify-phone?phone=${encodeURIComponent(form.phone)}`)
  }

  const handleGoogleSignIn = async () => {
    setErrors({})

    if (!supabase) {
      setErrors({ submit: "Supabase environment variables are not configured." })
      return
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setErrors({ submit: error.message })
    }
  }

  const handleMicrosoftSignIn = async () => {
    setErrors({})

    if (!supabase) {
      setErrors({ submit: "Supabase environment variables are not configured." })
      return
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "email profile",
      },
    })

    if (error) {
      setErrors({ submit: error.message })
    }
  }
  return (
    <div className="relative min-h-screen bg-[#f8f4ec]">
      <div className="relative z-10 px-8 py-6">
        <Link href="/" className="absolute left-6 top-1/2 inline-flex -translate-y-1/2 items-center gap-1.5 text-sm font-medium text-[#1a3a2a] transition-colors hover:text-[#c8a060]">
          <IconArrowLeft className="h-4 w-4" stroke={2} aria-hidden />
          <span>Back to home</span>
        </Link>
        <div className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#888]">Procurement Suite</p>
          <p className="font-display text-xl font-semibold text-[#1a3a2a]">AiForm Procure</p>
        </div>
      </div>

      {/* Rock art background */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        {/* Decorative circles */}
        <div className="absolute bottom-[-60px] right-[-60px] h-72 w-72 rounded-full border-[60px] border-[#1a3a2a]/5" />
        <div className="absolute top-[-40px] right-[80px] h-40 w-40 rounded-full border-[35px] border-[#1a3a2a]/4" />
        <div className="absolute bottom-[40px] left-[-40px] h-32 w-32 rounded-full border-[25px] border-[#c8a060]/5" />
        {/* San rock art silhouettes */}
        <svg viewBox="0 0 800 300" className="absolute bottom-0 h-[55%] w-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMax meet">
          {/* Cattle */}
          <ellipse cx="100" cy="200" rx="30" ry="18" fill="#3a2a1a"/>
          <ellipse cx="160" cy="190" rx="35" ry="20" fill="#3a2a1a"/>
          <ellipse cx="230" cy="195" rx="28" ry="16" fill="#3a2a1a"/>
          <line x1="100" y1="218" x2="95" y2="250" stroke="#3a2a1a" strokeWidth="4"/>
          <line x1="107" y1="218" x2="112" y2="248" stroke="#3a2a1a" strokeWidth="4"/>
          <line x1="160" y1="210" x2="155" y2="245" stroke="#3a2a1a" strokeWidth="4"/>
          <line x1="167" y1="210" x2="172" y2="244" stroke="#3a2a1a" strokeWidth="4"/>
          <line x1="230" y1="211" x2="225" y2="242" stroke="#3a2a1a" strokeWidth="4"/>
          <line x1="237" y1="211" x2="242" y2="242" stroke="#3a2a1a" strokeWidth="4"/>
          {/* Human figures */}
          <circle cx="320" cy="170" r="10" fill="#3a2a1a"/>
          <line x1="320" y1="180" x2="320" y2="220" stroke="#3a2a1a" strokeWidth="3"/>
          <line x1="320" y1="195" x2="300" y2="210" stroke="#3a2a1a" strokeWidth="3"/>
          <line x1="320" y1="195" x2="340" y2="208" stroke="#3a2a1a" strokeWidth="3"/>
          <line x1="320" y1="220" x2="308" y2="245" stroke="#3a2a1a" strokeWidth="3"/>
          <line x1="320" y1="220" x2="332" y2="245" stroke="#3a2a1a" strokeWidth="3"/>
          <circle cx="380" cy="175" r="9" fill="#3a2a1a"/>
          <line x1="380" y1="184" x2="380" y2="222" stroke="#3a2a1a" strokeWidth="3"/>
          <line x1="380" y1="198" x2="362" y2="212" stroke="#3a2a1a" strokeWidth="3"/>
          <line x1="380" y1="198" x2="398" y2="210" stroke="#3a2a1a" strokeWidth="3"/>
          <line x1="380" y1="222" x2="370" y2="248" stroke="#3a2a1a" strokeWidth="3"/>
          <line x1="380" y1="222" x2="390" y2="248" stroke="#3a2a1a" strokeWidth="3"/>
          <circle cx="430" cy="168" r="10" fill="#3a2a1a"/>
          <line x1="430" y1="178" x2="430" y2="218" stroke="#3a2a1a" strokeWidth="3"/>
          <line x1="430" y1="193" x2="412" y2="205" stroke="#3a2a1a" strokeWidth="3"/>
          <line x1="430" y1="193" x2="448" y2="205" stroke="#3a2a1a" strokeWidth="3"/>
          <line x1="430" y1="218" x2="420" y2="244" stroke="#3a2a1a" strokeWidth="3"/>
          <line x1="430" y1="218" x2="440" y2="244" stroke="#3a2a1a" strokeWidth="3"/>
          {/* More cattle */}
          <ellipse cx="500" cy="195" rx="32" ry="17" fill="#3a2a1a"/>
          <ellipse cx="575" cy="188" rx="36" ry="19" fill="#3a2a1a"/>
          <ellipse cx="650" cy="200" rx="28" ry="15" fill="#3a2a1a"/>
          <ellipse cx="720" cy="192" rx="30" ry="17" fill="#3a2a1a"/>
          <line x1="490" y1="212" x2="485" y2="240" stroke="#3a2a1a" strokeWidth="3"/>
          <line x1="510" y1="212" x2="515" y2="240" stroke="#3a2a1a" strokeWidth="3"/>
          <line x1="562" y1="207" x2="557" y2="238" stroke="#3a2a1a" strokeWidth="3"/>
          <line x1="582" y1="207" x2="587" y2="238" stroke="#3a2a1a" strokeWidth="3"/>
          <line x1="640" y1="215" x2="635" y2="242" stroke="#3a2a1a" strokeWidth="3"/>
          <line x1="658" y1="215" x2="663" y2="242" stroke="#3a2a1a" strokeWidth="3"/>
          <line x1="710" y1="209" x2="705" y2="238" stroke="#3a2a1a" strokeWidth="3"/>
          <line x1="728" y1="209" x2="733" y2="238" stroke="#3a2a1a" strokeWidth="3"/>
        </svg>
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 min-h-[calc(100vh-120px)]">
      <div className="flex flex-col justify-center bg-white px-8 py-12">
    <main className="mx-auto w-full max-w-3xl">
      <div className="w-full max-w-3xl">
        <div className="rounded-2xl border border-[#ebebeb] bg-white p-8">
        <Stepper currentStep={step} onStepClick={setStep} />

        <form onSubmit={handleSignup} className="space-y-6">
          {step === 1 && (
            <section>
              <div className="mb-8 text-center">
                <p className="text-xs uppercase tracking-[0.24em] text-accent">{form.role === "buyer" ? "Buyer registration" : "Supplier onboarding"}</p>
                <h1 className="mt-3 text-4xl font-semibold text-primary">Create your account</h1>
                <p className="mt-3 text-sm leading-6 text-secondary">
                  Start with your login details. You&apos;ll add your business information next.
                </p>
              </div>

              {showOauthRegistrationNotice && (
                <div className="mb-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4">
                  <p className="text-sm font-semibold text-emerald-800">
                    You signed in with Google/Microsoft — please complete your profile to continue.
                  </p>
                </div>
              )}

              {errors.submit && (
                <div className="mb-5 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-5 py-4">
                  <p className="text-sm font-semibold text-rose-700">{errors.submit}</p>
                </div>
              )}

              <div className="space-y-5">
                {!isOauthSignup && (
                  <>
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      className="flex w-full items-center justify-center gap-3 rounded-lg border border-[#dadce0] bg-white px-4 py-2.5 text-[14px] font-medium text-[#3c4043] transition hover:bg-[#f8f9fa]"
                    >
                      <GoogleLogo />
                      <span>Continue with Google</span>
                    </button>

                    <div className="h-px bg-panel" />
                    <button
                      type="button"
                      onClick={handleMicrosoftSignIn}
                      className="flex w-full items-center justify-center gap-3 rounded-lg border border-[#dadce0] bg-white px-4 py-2.5 text-[14px] font-medium text-[#3c4043] transition hover:bg-[#f8f9fa]"
                    >
                      <MicrosoftLogo />
                      <span>Microsoft</span>
                    </button>

                    <AuthDivider />
                  </>
                )}

                <p className="text-xs text-secondary">
                  <span className="text-rose-500">*</span> Required fields
                </p>

                <div className="grid grid-cols-2 gap-3">
                  {(["supplier", "buyer"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => updateField("role", r)}
                      className={`flex flex-col items-start rounded-2xl border p-4 text-left transition ${
                        form.role === r
                          ? "border-accent bg-accent/5 ring-2 ring-accent/20"
                          : "border-panel bg-surface hover:border-accent/50"
                      }`}
                    >
                      <span className={`text-sm font-bold ${form.role === r ? "text-accent" : "text-primary"}`}>
                        {r === "supplier" ? "I'm a Supplier" : "I'm a Buyer"}
                      </span>
                      <span className="mt-1 text-xs text-secondary">
                        {r === "supplier" ? "Sell to government & corporates" : "Post RFQs & procure"}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-secondary">
                      First name <span className="font-semibold text-accent">*</span>
                    </label>
                    <input type="text" value={form.firstName} onChange={(e) => updateField("firstName", e.target.value)} className={inputClass} />
                    <FieldError message={errors.firstName} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary">
                      Surname <span className="font-semibold text-accent">*</span>
                    </label>
                    <input type="text" value={form.lastName} onChange={(e) => updateField("lastName", e.target.value)} className={inputClass} />
                    <FieldError message={errors.lastName} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary">Work email address <span className="font-semibold text-accent">*</span></label>
                  <input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} className={inputClass} />
                  <p className="mt-2 text-xs leading-5 text-muted">Use your business email — it helps with verification.</p>
                  <FieldError message={errors.email} />
                </div>
                {!isOauthSignup && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-secondary">Password <span className="font-semibold text-accent">*</span></label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={form.password}
                          onChange={(e) => updateField("password", e.target.value)}
                          className={`${inputClass} pr-12`}
                        />
                        <PasswordVisibilityButton
                          visible={showPassword}
                          onClick={() => setShowPassword((current) => !current)}
                          label={showPassword ? "Hide password" : "Show password"}
                        />
                      </div>
                      <PasswordStrengthMeter password={form.password} />
                      <FieldError message={errors.password} />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-secondary">Confirm password <span className="font-semibold text-accent">*</span></label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={form.confirmPassword}
                          onChange={(e) => updateField("confirmPassword", e.target.value)}
                          className={`${inputClass} pr-12`}
                        />
                        <PasswordVisibilityButton
                          visible={showConfirmPassword}
                          onClick={() => setShowConfirmPassword((current) => !current)}
                          label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                        />
                      </div>
                      <FieldError message={errors.confirmPassword || (passwordsDoNotMatch ? "Passwords do not match" : undefined)} />
                    </div>
                  </>
                )}

                <button
                  type="button"
                  onClick={handleStep1}
                  disabled={loading || passwordsDoNotMatch}
                  className="w-full rounded-2xl bg-accent py-4 font-semibold text-button transition duration-200 hover:bg-accent-strong disabled:opacity-50"
                >
                  {loading ? "Creating account—" : "Continue?"}
                </button>

                <div className="grid gap-2 text-xs font-semibold text-secondary sm:grid-cols-3">
                  {[
                    { icon: "lock" as const, label: "Secure sign-up" },
                    { icon: "shield" as const, label: "No credit card needed" },
                    { icon: "clock" as const, label: "Takes 3 minutes" },
                  ].map((signal) => (
                    <div key={signal.label} className="flex items-center justify-center gap-2 rounded-2xl border border-panel bg-surface px-3 py-3">
                      <TrustIcon type={signal.icon} />
                      <span>{signal.label}</span>
                    </div>
                  ))}
                </div>

                <p className="text-center text-sm text-secondary">
                  Already registered?{" "}
                  <Link href="/auth/login" className="font-semibold text-accent transition hover:text-accent-strong">Log in</Link>
                </p>
              </div>
            </section>
          )}

          {step === 2 && (
            <section>
              <div className="mb-8 text-center">
                <p className="text-xs uppercase tracking-[0.24em] text-accent">Supplier onboarding</p>
                <h1 className="mt-3 text-4xl font-semibold text-primary">Tell us about your business</h1>
                <p className="mt-3 text-sm leading-6 text-secondary">This is what procurement teams will see when they find your profile.</p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-secondary">Registered business name <span className="text-rose-500">*</span></label>
                  <input type="text" placeholder="As registered with CIPC" value={form.businessName} onChange={(e) => updateField("businessName", e.target.value)} className={inputClass} />
                  <FieldError message={errors.businessName} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary">Company registration number <span className="text-rose-500">*</span></label>
                  <input type="text" placeholder="e.g. 2019/123456/07" value={form.registrationNumber} onChange={(e) => updateField("registrationNumber", e.target.value)} className={inputClass} />
                  <FieldError message={errors.registrationNumber} />
                </div>
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-secondary">Phone number <span className="text-rose-500">*</span></label>
                  <input
                    type="tel"
                    placeholder="+27821234567"
                    value={form.phone}
                    onChange={(e) => updatePhoneField(e.target.value)}
                    onFocus={handlePhoneFocus}
                    onBlur={handlePhoneBlur}
                    className={inputClass}
                  />
                  <FieldError message={errors.phone} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary">Industry <span className="text-rose-500">*</span></label>
                  <select value={form.industry} onChange={(e) => updateField("industry", e.target.value)} className={selectClass}>
                    <option value="">Select industry</option>
                    {OFFICIAL_INDUSTRY_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                  <FieldError message={errors.industry} />
                </div>
              </div>

              <div className="mt-5">
                <label className="block text-sm font-medium text-secondary">Province(s) you operate in <span className="text-rose-500">*</span></label>
                <p className="mt-2 text-xs leading-5 text-muted">Select all provinces where you can fulfil contracts.</p>
                <label className="mt-3 flex items-center gap-3 rounded-2xl border border-panel bg-surface px-4 py-3 text-sm font-semibold text-secondary">
                  <input
                    type="checkbox"
                    checked={isNationalSelection(form.provinces)}
                    onChange={(e) => toggleNationalProvinces(e.target.checked)}
                    className="h-4 w-4 rounded border-panel accent-[var(--accent)]"
                  />
                  <span>I operate nationally</span>
                </label>
                <div className="mt-3 flex flex-wrap gap-2">
                  {provinces.map((province) => {
                    const selected = form.provinces.includes(province)
                    const nationallySelected = isNationalSelection(form.provinces)
                    return (
                      <button key={province} type="button" onClick={() => toggleProvince(province)} disabled={nationallySelected}
                        className={`rounded-full border px-4 py-2 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-45 ${selected ? "border-accent bg-accent text-button" : "border-panel bg-surface text-secondary hover:border-accent hover:bg-accent/10 hover:text-accent"}`}
                      >
                        {province}
                      </button>
                    )
                  })}
                </div>
                <FieldError message={errors.provinces} />
              </div>

              <div className="mt-7 space-y-3">
                <button type="button" onClick={handleStep2Save} disabled={loading}
                  className="w-full rounded-2xl bg-accent py-4 font-semibold text-button transition duration-200 hover:bg-accent-strong disabled:opacity-50">
                  {loading ? "Saving—" : "Continue?"}
                </button>
                <button type="button" onClick={goBack} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-panel bg-panel py-4 font-semibold text-secondary transition duration-200 hover:border-accent hover:bg-accent/10 hover:text-accent">
                  <IconArrowLeft className="h-4 w-4" stroke={2} aria-hidden />
                  <span>Back</span>
                </button>
              </div>
            </section>
          )}
          {step === 3 && (
            <section>
              <div className="mb-8 text-center">
                <p className="text-xs uppercase tracking-[0.24em] text-accent">Supplier onboarding</p>
                <h1 className="mt-3 text-4xl font-semibold text-primary">Compliance information</h1>
                <p className="mt-3 text-sm leading-6 text-secondary">
                  Procurement teams need these details to verify and shortlist suppliers. You can update them later from your profile.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                {complianceWarnings.length > 0 && (
                  <div className="space-y-3 md:col-span-2">
                    {complianceWarnings.map((item) => {
                      const warning = complianceWarningCopy[item]
                      return (
                        <div key={item} className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-left">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm leading-6 text-amber-900">
                              You haven&apos;t uploaded your {warning.documentName} — your SmartScore will be lower and verification may take longer. You can upload this later from your profile.
                            </p>
                            <button
                              type="button"
                              onClick={() => dismissComplianceWarning(item)}
                              className="shrink-0 text-sm font-bold text-amber-900 transition hover:text-amber-700"
                              aria-label={`Dismiss ${warning.documentName} warning`}
                            >
                              —
                            </button>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() => focusComplianceField(item)}
                              className="text-sm font-semibold text-accent transition hover:text-accent-strong"
                            >
                              Upload now
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAcknowledgedComplianceWarnings(true)
                                void handleStep3Save({ skipWarnings: true })
                              }}
                              className="text-sm font-semibold text-secondary transition hover:text-primary"
                            >
                              Continue anyway
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-secondary">CSD Number <span className="text-rose-500">*</span></label>
                  <input type="text" placeholder="MAAA-12345678" value={form.csdNumber} onChange={(e) => updateField("csdNumber", e.target.value)} className={inputClass} />
                  <p className="mt-2 text-xs leading-5 text-muted">Central Supplier Database</p>
                  <FieldError message={errors.csdNumber} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary">CSD Certificate</label>
                  <label className="mt-2 flex min-h-[58px] cursor-pointer items-center justify-between gap-3 rounded-2xl border border-panel bg-surface px-5 py-4 text-sm text-secondary transition hover:border-accent hover:text-accent">
                    <span className="min-w-0 flex-1 truncate">
                      {form.csdDocumentFile?.name || (form.csdDocumentPath ? "CSD certificate uploaded" : "Upload PDF, JPG or PNG")}
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-accent">Browse</span>
                    <input
                      ref={csdUploadRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="sr-only"
                      onChange={handleCsdDocumentChange}
                    />
                  </label>
                  <p className="mt-2 text-xs leading-5 text-muted">Upload your latest CSD registration document.</p>
                  <FieldError message={errors.csdDocumentFile} />
                </div>
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-secondary">Tax reference number</label>
                  <input ref={taxReferenceRef} type="text" placeholder="e.g. 1234567890" value={form.taxReference} onChange={(e) => updateField("taxReference", e.target.value)} className={inputClass} />
                  <FieldError message={errors.taxReference} />
                </div>
              </div>

              <div className="mt-5">
                <label className="block text-sm font-medium text-secondary">BBBEE level <span className="text-rose-500">*</span></label>
                <select ref={bbbeeLevelRef} value={form.bbeeLevel} onChange={(e) => updateField("bbeeLevel", e.target.value)} className={selectClass}>
                  <option value="">Select BBBEE level</option>
                  {bbeeLevels.map((level) => <option key={level} value={level}>{level}</option>)}
                </select>
                <FieldError message={errors.bbeeLevel} />
              </div>

              <div className="mt-5">
                <label className="block text-sm font-medium text-secondary">
                  VAT registration number <span className="text-muted">(optional)</span>
                </label>
                <input ref={vatNumberRef} type="text" value={form.vatNumber} onChange={(e) => updateField("vatNumber", e.target.value)} className={inputClass} />
                <FieldError message={errors.vatNumber} />
              </div>

              <div className="mt-5 rounded-2xl border border-panel bg-surface px-5 py-4">
                <label className="flex gap-3 text-sm font-semibold text-secondary">
                  <input type="checkbox" checked={form.csdConfirmed} onChange={(e) => updateField("csdConfirmed", e.target.checked)} className="mt-1 h-4 w-4 rounded border-panel accent-[var(--accent)]" />
                  <span>I confirm that my CSD profile is active and up to date. <span className="text-rose-500">*</span></span>
                </label>
                <FieldError message={errors.csdConfirmed} />
              </div>

              <div className="mt-7 space-y-3">
                <button type="button" onClick={() => void handleStep3Save()} disabled={loading}
                  className="w-full rounded-2xl bg-accent py-4 font-semibold text-button transition duration-200 hover:bg-accent-strong disabled:opacity-50">
                  {loading ? "Saving—" : "Continue?"}
                </button>
                <button type="button" onClick={goBack} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-panel bg-panel py-4 font-semibold text-secondary transition duration-200 hover:border-accent hover:bg-accent/10 hover:text-accent">
                  <IconArrowLeft className="h-4 w-4" stroke={2} aria-hidden />
                  <span>Back</span>
                </button>
              </div>
            </section>
          )}

          {step === 4 && (
            <section>
              <div className="mb-8 text-center">
                <p className="text-xs uppercase tracking-[0.24em] text-accent">Supplier onboarding</p>
                <h1 className="mt-3 text-4xl font-semibold text-primary">You&apos;re almost there</h1>
                <p className="mt-3 text-sm leading-6 text-secondary">Review your details before submitting. You can edit any section.</p>
              </div>

              <div className="overflow-hidden rounded-2xl border border-panel bg-surface">
                {[
                  { title: "Account", detail: form.email, editStep: 1 },
                  {
                    title: "Business details",
                    detail: `${form.businessName} — ${form.industry} — ${displayProvinceList(form.provinces)}`,
                    editStep: 2,
                  },
                  {
                    title: "Compliance",
                    detail: `${form.csdNumber} — ${form.bbeeLevel}${form.vatNumber ? ` — VAT ${form.vatNumber}` : ""}`,
                    editStep: 3,
                  },
                ].map((row) => (
                  <details key={row.title} className="border-b border-panel last:border-b-0" open>
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
                      <span className="text-sm font-bold text-heading">{row.title}</span>
                      <button type="button" onClick={(e) => { e.preventDefault(); setStep(row.editStep) }}
                        className="text-xs font-bold text-accent transition hover:text-accent-strong">
                        Edit
                      </button>
                    </summary>
                    <p className="px-5 pb-4 text-sm leading-6 text-secondary">{row.detail}</p>
                  </details>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-panel bg-surface px-5 py-4">
                <label className="flex gap-3 text-sm font-semibold text-secondary">
                  <input type="checkbox" checked={form.termsAccepted} onChange={(e) => updateField("termsAccepted", e.target.checked)} className="mt-1 h-4 w-4 rounded border-panel accent-[var(--accent)]" />
                  <span>
                    I agree to the{" "}
                    <Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-accent transition hover:text-accent-strong">Terms of Service</Link>
                    {" "}and{" "}
                    <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-accent transition hover:text-accent-strong">Privacy Policy</Link>.
                  </span>
                </label>
                <FieldError message={errors.termsAccepted} />
              </div>

              {errors.submit && (
                <div className="mt-5 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-5 py-4">
                  <p className="text-sm font-semibold text-rose-700">{errors.submit}</p>
                </div>
              )}

              <div className="mt-7 space-y-3">
                <button type="submit" disabled={loading}
                  className="w-full rounded-2xl bg-accent py-4 font-semibold text-button transition duration-200 hover:bg-accent-strong disabled:opacity-50">
                  {loading ? "Submitting registration—" : "Submit registration"}
                </button>
                <button type="button" onClick={goBack} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-panel bg-panel py-4 font-semibold text-secondary transition duration-200 hover:border-accent hover:bg-accent/10 hover:text-accent">
                  <IconArrowLeft className="h-4 w-4" stroke={2} aria-hidden />
                  <span>Back</span>
                </button>
              </div>
            </section>
          )}

          {step === 5 && (
            <section>
              <div className="text-center">
                <p className="text-xs uppercase tracking-[0.24em] text-accent">{form.role === "buyer" ? "Buyer registration" : "Supplier onboarding"}</p>
                <h1 className="mt-3 text-4xl font-semibold text-primary">
                  Welcome to AiForm Procure, {preferredFirstName(form.firstName)}!
                </h1>
                <p className="mt-4 text-sm leading-6 text-secondary">
                  We&apos;ve sent a verification email to{" "}
                  <span className="font-semibold text-heading">{form.email.trim().toLowerCase()}</span>.
                  {" "}Please check your inbox and click the link to activate your account.
                </p>
              </div>

              {resendMessage && (
                <div className="mt-6 rounded-2xl border border-panel bg-surface px-5 py-4">
                  <p className="text-sm font-semibold text-secondary">{resendMessage}</p>
                </div>
              )}

              <div className="mt-7 space-y-3">
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resending}
                  className="w-full rounded-2xl bg-accent py-4 font-semibold text-button transition duration-200 hover:bg-accent-strong disabled:opacity-50"
                >
                  {resending ? "Resending—" : "Resend verification email"}
                </button>
                <Link
                  href="/auth/login"
                  className="block text-center text-sm font-semibold text-accent transition hover:text-accent-strong"
                >
                  Verified in another tab? Continue ?
                </Link>
              </div>
            </section>
          )}
        </form>
        </div>

      </div>
    </main>
      </div>

      <div className="hidden lg:flex flex-col justify-center bg-white px-10 py-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute bottom-[-40px] right-[-40px] w-64 h-64 rounded-full border-[50px] border-[#1a3a2a]/5" />
        <div className="absolute top-[-30px] right-[60px] w-40 h-40 rounded-full border-[30px] border-[#1a3a2a]/4" />

        {/* Badge */}
        <span className="inline-block w-fit mb-5 text-[10px] font-semibold tracking-[0.12em] uppercase text-[#c8a060] bg-[#c8a060]/10 border border-[#c8a060]/30 rounded-full px-3 py-1">
          South Africa&apos;s Verified Procurement Network
        </span>

        {/* Headline */}
        <h2 className="font-display text-3xl font-semibold text-[#1a3a2a] leading-snug mb-3">
          Where SA Suppliers Meet<br/>
          <em className="text-[#c8a060] not-italic">Real Procurement.</em>
        </h2>

        {/* Subtext */}
        <p className="text-sm text-[#555555] leading-relaxed mb-8 max-w-sm">
          The only platform built specifically for South African compliance - B-BBEE, CSD, CIPC, and SARS verification built in from the ground up.
        </p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-2">
          {[
            { num: "9", label: "SA provinces\nmapped" },
            { num: "23", label: "Secured database\ntables" },
            { num: "11", label: "SA languages\n(roadmap)" },
          ].map((stat) => (
            <div key={stat.num} className="border border-[#ebebeb] rounded-lg p-3 text-center">
              <div className="text-2xl font-semibold text-[#1a3a2a] mb-1">{stat.num}</div>
              <div className="text-[10px] text-[#888888] leading-tight whitespace-pre-line">{stat.label}</div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-[#aaa] mt-1 mb-8">11 SA languages · UI & help guide translated</p>

        {/* Feature bullets */}
        <div className="space-y-3 mb-8">
          {[
            "Verified supplier profiles visible to government and corporate buyers",
            "SmartScore - know your procurement readiness instantly",
            "Regional Insights - see where procurement activity is happening across SA",
            "Free during the pilot period until October 2026",
          ].map((feature) => (
            <div key={feature} className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[#5DCAA5] mt-1.5 shrink-0" />
              <p className="text-sm text-[#555555] leading-relaxed">{feature}</p>
            </div>
          ))}
        </div>

        {/* Founder quote */}
        <div className="border-l-2 border-[#c8a060]/40 pl-4 mt-auto">
          <p className="text-xs text-[#888888] italic leading-relaxed mb-2">
            &quot;Built because South African suppliers were losing procurement opportunities not because of poor capability, but because of compliance gaps and lack of visibility.&quot;
          </p>
          <p className="text-[10px] text-[#c8a060] font-semibold">Founder, AiForm Studio</p>
        </div>
      </div>
      </div>
    </div>
  )
}


