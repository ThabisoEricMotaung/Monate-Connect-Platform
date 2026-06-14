"use client"

import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { calculateSmartScore } from "@/lib/smartScore"
import { supabase } from "@/lib/supabase"

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

const industryOptions = [
  "Mining & Resources",
  "Construction & Infrastructure",
  "IT & Technology",
  "Facilities & Cleaning",
  "Logistics & Transport",
  "Professional Services",
  "Manufacturing",
  "Other",
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
  fullName: string
  email: string
  password: string
  confirmPassword: string
  businessName: string
  registrationNumber: string
  phone: string
  industry: string
  provinces: string[]
  csdNumber: string
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

const inputClass =
  "mt-2 w-full rounded-2xl border border-panel bg-surface px-5 py-4 text-primary outline-none transition focus:border-accent"

const selectClass =
  "mt-2 w-full rounded-2xl border border-panel bg-surface px-5 py-4 text-primary outline-none transition focus:border-accent"

const initialForm: SignupForm = {
  role: "supplier",
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
  businessName: "",
  registrationNumber: "",
  phone: "",
  industry: "",
  provinces: [],
  csdNumber: "",
  taxReference: "",
  bbeeLevel: "",
  vatNumber: "",
  csdConfirmed: false,
  termsAccepted: false,
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function preferredFirstName(value: string) {
  return value.trim().split(/\s+/)[0] || "there"
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
        <p className="mt-2 text-xs font-semibold text-emerald-700">Strong password ✓</p>
      ) : (
        <p className="mt-2 text-xs leading-5 text-muted">
          {unmetRules.map((rule) => rule.label).join(" · ")}
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
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<SignupForm>(initialForm)
  const [errors, setErrors] = useState<SignupErrors>({})
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isOauthSignup, setIsOauthSignup] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const passwordsDoNotMatch =
    !isOauthSignup &&
    form.confirmPassword.length > 0 &&
    form.password !== form.confirmPassword

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("role") === "buyer") {
      setForm((current) => ({ ...current, role: "buyer" }))
    }
    if (params.get("oauth") === "true") {
      const oauthEmail = params.get("email") ?? ""
      setIsOauthSignup(true)
      setForm((current) => ({
        ...current,
        email: oauthEmail,
        password: "",
        confirmPassword: "",
      }))
    }
  }, [])


  const updateField = <K extends keyof SignupForm>(field: K, value: SignupForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined, submit: undefined }))
  }

  const toggleProvince = (province: string) => {
    const nextProvinces = form.provinces.includes(province)
      ? form.provinces.filter((item) => item !== province)
      : [...form.provinces, province]
    updateField("provinces", nextProvinces)
  }

  const validateStep = (targetStep: number) => {
    const nextErrors: SignupErrors = {}

    if (targetStep === 1) {
      if (!form.fullName.trim()) nextErrors.fullName = "Full name is required."
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
      if (!form.industry) nextErrors.industry = "Industry is required."
      if (form.provinces.length === 0) nextErrors.provinces = "Select at least one province."
    }

    if (targetStep === 3) {
      if (!form.csdNumber.trim()) nextErrors.csdNumber = "CSD supplier number is required."
      if (!form.taxReference.trim()) nextErrors.taxReference = "Tax reference number is required."
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
        fullName: current.fullName || user.user_metadata?.full_name || user.user_metadata?.name || "",
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
          full_name: form.fullName,
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
    setLoading(false)
    setStep(2)
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
        province: form.provinces.join(", "),
        smart_score: smartScore,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" })
    }

    setLoading(false)
    setStep(3)
  }

  // STEP 3: save compliance info (non-fatal)
  const handleStep3Save = async () => {
    if (!validateStep(3)) return
    setLoading(true)

    if (supabase && userId) {
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

    const smartScore = calculateSmartScore({
      business_name: form.businessName,
      industry: form.industry,
      provinces: form.provinces,
      phone: form.phone,
      csd_number: form.csdNumber,
      bbbee_level: form.bbeeLevel,
    })

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      email: normalizedEmail,
      full_name: form.fullName,
      business_name: form.businessName,
      company_registration: form.registrationNumber,
      phone: form.phone,
      industry: form.industry,
      provinces: form.provinces,
      province: form.provinces.join(", "),
      csd_number: form.csdNumber,
      tax_reference: form.taxReference,
      bbbee_level: form.bbeeLevel,
      vat_number: form.vatNumber || null,
      verification_status: "pending",
      registration_complete: true,
      role: form.role,
      smart_score: smartScore,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" })

    if (profileError) {
      console.error("Profile save:", profileError.message)
    }

    setLoading(false)
    setStep(5)
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
        redirectTo: `${window.location.origin}/auth/post-oauth`,
      },
    })

    if (error) {
      setErrors({ submit: error.message })
    }
  }
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-10">
      <div className="w-full max-w-3xl">
        <div className="rounded-3xl border border-panel bg-panel p-8 shadow-panel">
        <Link
          href="/"
          className="mb-5 inline-block text-[13px] font-semibold text-[#5DCAA5] no-underline transition hover:underline"
        >
          ← Back to home
        </Link>

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

                    <AuthDivider />
                  </>
                )}

                <p className="text-xs text-secondary">
                  <span className="font-semibold text-accent">*</span> Required fields
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
                        {r === "supplier" ? "I’m a Supplier" : "I’m a Buyer"}
                      </span>
                      <span className="mt-1 text-xs text-secondary">
                        {r === "supplier" ? "Sell to government & corporates" : "Post RFQs & procure"}
                      </span>
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary">
                    Full name <span className="font-semibold text-accent">*</span>
                  </label>
                  <input type="text" value={form.fullName} onChange={(e) => updateField("fullName", e.target.value)} className={inputClass} />
                  <FieldError message={errors.fullName} />
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
                  {loading ? "Creating account…" : "Continue?"}
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
                  <label className="block text-sm font-medium text-secondary">Registered business name</label>
                  <input type="text" placeholder="As registered with CIPC" value={form.businessName} onChange={(e) => updateField("businessName", e.target.value)} className={inputClass} />
                  <FieldError message={errors.businessName} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary">Company registration number</label>
                  <input type="text" placeholder="e.g. 2019/123456/07" value={form.registrationNumber} onChange={(e) => updateField("registrationNumber", e.target.value)} className={inputClass} />
                  <FieldError message={errors.registrationNumber} />
                </div>
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-secondary">Phone number</label>
                  <input type="tel" placeholder="+27 XX XXX XXXX" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} className={inputClass} />
                  <FieldError message={errors.phone} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary">Industry</label>
                  <select value={form.industry} onChange={(e) => updateField("industry", e.target.value)} className={selectClass}>
                    <option value="">Select industry</option>
                    {industryOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                  <FieldError message={errors.industry} />
                </div>
              </div>

              <div className="mt-5">
                <label className="block text-sm font-medium text-secondary">Province(s) you operate in</label>
                <p className="mt-2 text-xs leading-5 text-muted">Select all provinces where you can fulfil contracts.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {provinces.map((province) => {
                    const selected = form.provinces.includes(province)
                    return (
                      <button key={province} type="button" onClick={() => toggleProvince(province)}
                        className={`rounded-full border px-4 py-2 text-sm font-semibold transition duration-200 ${selected ? "border-accent bg-accent text-button" : "border-panel bg-surface text-secondary hover:border-accent hover:bg-accent/10 hover:text-accent"}`}
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
                  {loading ? "Saving…" : "Continue?"}
                </button>
                <button type="button" onClick={goBack} className="w-full rounded-2xl border border-panel bg-panel py-4 font-semibold text-secondary transition duration-200 hover:border-accent hover:bg-accent/10 hover:text-accent">
                  ? Back
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
                <div>
                  <label className="block text-sm font-medium text-secondary">CSD supplier number</label>
                  <input type="text" placeholder="MAAA000000000" value={form.csdNumber} onChange={(e) => updateField("csdNumber", e.target.value)} className={inputClass} />
                  <p className="mt-2 text-xs leading-5 text-muted">Central Supplier Database</p>
                  <FieldError message={errors.csdNumber} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary">Tax reference number</label>
                  <input type="text" placeholder="e.g. 1234567890" value={form.taxReference} onChange={(e) => updateField("taxReference", e.target.value)} className={inputClass} />
                  <FieldError message={errors.taxReference} />
                </div>
              </div>

              <div className="mt-5">
                <label className="block text-sm font-medium text-secondary">BBBEE level</label>
                <select value={form.bbeeLevel} onChange={(e) => updateField("bbeeLevel", e.target.value)} className={selectClass}>
                  <option value="">Select BBBEE level</option>
                  {bbeeLevels.map((level) => <option key={level} value={level}>{level}</option>)}
                </select>
                <FieldError message={errors.bbeeLevel} />
              </div>

              <div className="mt-5">
                <label className="block text-sm font-medium text-secondary">
                  VAT registration number <span className="text-muted">(optional)</span>
                </label>
                <input type="text" value={form.vatNumber} onChange={(e) => updateField("vatNumber", e.target.value)} className={inputClass} />
              </div>

              <div className="mt-5 rounded-2xl border border-panel bg-surface px-5 py-4">
                <label className="flex gap-3 text-sm font-semibold text-secondary">
                  <input type="checkbox" checked={form.csdConfirmed} onChange={(e) => updateField("csdConfirmed", e.target.checked)} className="mt-1 h-4 w-4 rounded border-panel accent-[var(--accent)]" />
                  <span>I confirm that my CSD profile is active and up to date.</span>
                </label>
                <FieldError message={errors.csdConfirmed} />
              </div>

              <div className="mt-7 space-y-3">
                <button type="button" onClick={handleStep3Save} disabled={loading}
                  className="w-full rounded-2xl bg-accent py-4 font-semibold text-button transition duration-200 hover:bg-accent-strong disabled:opacity-50">
                  {loading ? "Saving…" : "Continue?"}
                </button>
                <button type="button" onClick={goBack} className="w-full rounded-2xl border border-panel bg-panel py-4 font-semibold text-secondary transition duration-200 hover:border-accent hover:bg-accent/10 hover:text-accent">
                  ? Back
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
                    detail: `${form.businessName} · ${form.industry} · ${form.provinces.join(", ")}`,
                    editStep: 2,
                  },
                  {
                    title: "Compliance",
                    detail: `${form.csdNumber} · ${form.bbeeLevel}${form.vatNumber ? ` · VAT ${form.vatNumber}` : ""}`,
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
                  {loading ? "Submitting registration…" : "Submit registration"}
                </button>
                <button type="button" onClick={goBack} className="w-full rounded-2xl border border-panel bg-panel py-4 font-semibold text-secondary transition duration-200 hover:border-accent hover:bg-accent/10 hover:text-accent">
                  ? Back
                </button>
              </div>
            </section>
          )}

          {step === 5 && (
            <section>
              <div className="text-center">
                <p className="text-xs uppercase tracking-[0.24em] text-accent">{form.role === "buyer" ? "Buyer registration" : "Supplier onboarding"}</p>
                <h1 className="mt-3 text-4xl font-semibold text-primary">
                  Welcome to AiForm Procure, {preferredFirstName(form.fullName)}!
                </h1>
                <p className="mt-4 text-sm leading-6 text-secondary">
                  We&apos;ve sent a verification email to{" "}
                  <span className="font-semibold text-heading">{form.email.trim().toLowerCase()}</span>.
                  {" "}Please check your inbox and click the link to activate your account.
                </p>
                <p className="mt-3 text-sm leading-6 text-muted">
                  Once verified, you&apos;ll be able to log in and access your supplier dashboard.
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
                  {resending ? "Resending…" : "Resend verification email"}
                </button>
                <p className="pt-1 text-center text-xs text-muted">
                  Confirmed your email in another tab?
                </p>
                <Link
                  href="/auth/login"
                  className="block w-full rounded-2xl border py-4 text-center font-semibold transition"
                  style={{
                    borderColor: "rgba(201,168,76,0.5)",
                    color: "#A8893B",
                    background: "transparent",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(201,168,76,0.08)"
                    e.currentTarget.style.borderColor = "rgba(201,168,76,0.75)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent"
                    e.currentTarget.style.borderColor = "rgba(201,168,76,0.5)"
                  }}
                >
                  Already verified? Log in ?
                </Link>
              </div>
            </section>
          )}
        </form>
        </div>

        <div className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-muted">
          <svg width="12" height="16" viewBox="0 0 12 16" fill="none" aria-hidden>
            <path d="M6 1L1 4v4c0 3.3 2.1 6.4 5 7.4 2.9-1 5-4.1 5-7.4V4L6 1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M4 8l1.5 1.5L8 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Secured by AiForm Procure</span>
        </div>

      </div>
    </main>
  )
}
