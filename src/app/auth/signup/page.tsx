"use client"

import { useMemo, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAutosave } from "@/hooks/useAutosave"
import { supabase } from "@/lib/supabase"

const provinceIndustryMap: Record<string, string[]> = {
  "Eastern Cape": [
    "Construction",
    "Agriculture",
    "Transport",
    "Manufacturing",
    "Water Services",
    "Cleaning Services",
  ],
  "Free State": [
    "Agriculture",
    "Construction",
    "Transport",
    "Mining Services",
    "PPE",
    "Electrical",
  ],
  Gauteng: [
    "Electrical",
    "Construction",
    "ICT",
    "Logistics",
    "PPE",
    "Cleaning Services",
    "Engineering",
    "Manufacturing",
  ],
  "KwaZulu-Natal": [
    "Logistics",
    "Construction",
    "Manufacturing",
    "Security Services",
    "Cleaning Services",
    "PPE",
    "Agriculture",
  ],
  Limpopo: [
    "Mining Services",
    "Agriculture",
    "Construction",
    "Transport",
    "PPE",
    "Electrical",
    "Water Services",
  ],
  Mpumalanga: [
    "Mining Services",
    "Electrical",
    "Construction",
    "Plant Hire",
    "PPE",
    "Transport",
    "Industrial Maintenance",
    "Security Services",
  ],
  "Northern Cape": [
    "Mining Services",
    "Renewable Energy",
    "Construction",
    "Transport",
    "PPE",
    "Electrical",
  ],
  "North West": [
    "Mining Services",
    "Agriculture",
    "Construction",
    "Transport",
    "PPE",
    "Electrical",
  ],
  "Western Cape": [
    "ICT",
    "Construction",
    "Renewable Energy",
    "Logistics",
    "Cleaning Services",
    "Food Supply",
  ],
}

const provinces = Object.keys(provinceIndustryMap)

type SignupDraft = {
  businessName: string
  email: string
  industry: string
  phone: string
  province: string
}

export default function SignupPage() {

  const router = useRouter()

  const [businessName, setBusinessName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [province, setProvince] = useState("")
  const [industry, setIndustry] = useState("")
  const [phone, setPhone] = useState("")
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const industryOptions = province ? provinceIndustryMap[province] : []
  const signupDraft = useMemo<SignupDraft>(
    () => ({
      businessName,
      email,
      industry,
      phone,
      province,
    }),
    [businessName, email, industry, phone, province]
  )
  const autosave = useAutosave<SignupDraft>({
    key: "monate-draft-supplier-registration",
    value: signupDraft,
    enabled: !successMessage,
    onRestore: (draft) => {
      setBusinessName(draft.businessName)
      setEmail(draft.email)
      setProvince(draft.province)
      setIndustry(draft.industry)
      setPhone(draft.phone)
    },
  })

  const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setLoading(true)
    setSuccessMessage("")
    setErrorMessage("")

    if (!supabase) {
      setErrorMessage("Supabase environment variables are not configured.")
      setLoading(false)
      return
    }

    const normalizedEmail = email.trim()

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          business_name: businessName,
          province: province,
          industry: industry,
          phone: phone,
          role: "supplier",
        },
      },
    })

    if (error) {

      setLoading(false)

      setErrorMessage(error.message)

      return
    }

    if (!data.user) {
      setLoading(false)
      setErrorMessage("Account authentication was created, but no user record was returned.")
      return
    }

    setLoading(false)

    setSuccessMessage("Account created. Please check your email to verify your account, then login.")
    autosave.clearDraft()
    setBusinessName("")
    setEmail("")
    setPassword("")
    setProvince("")
    setIndustry("")
    setPhone("")
    setTimeout(() => router.push("/auth/login"), 3000)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-page px-6 text-primary">

      <div className="w-full max-w-md rounded-3xl border border-panel bg-panel p-8 shadow-panel">

        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.24em] text-accent">
            Supplier onboarding
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-primary">
            Create your account
          </h1>
          <p className="mt-3 text-sm leading-6 text-secondary">
            Register your business to access RFQs, submit quotes, and connect with procurement teams.
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-5">
          {autosave.showRecoveryDialog && (
            <div className="rounded-2xl border border-accent bg-surface px-5 py-4 shadow-sm">
              <p className="text-sm font-semibold text-heading">
                Restore previous draft?
              </p>
              <p className="mt-1 text-xs leading-5 text-secondary">
                We found saved supplier registration progress. Passwords are never saved.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={autosave.restoreDraft}
                  className="rounded-2xl border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button transition hover:bg-accent-strong"
                >
                  Restore Draft
                </button>
                <button
                  type="button"
                  onClick={autosave.discardDraft}
                  className="rounded-2xl border border-panel bg-panel px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-surface"
                >
                  Discard Draft
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-panel bg-surface px-5 py-3">
            <p className="text-xs font-semibold text-success">
              {autosave.status === "saved" ? "✓ Draft saved" : "Draft autosaves every 5 seconds"}
            </p>
            <button
              type="button"
              onClick={autosave.discardDraft}
              className="rounded-xl border border-panel bg-panel px-3 py-1.5 text-xs font-semibold text-secondary transition hover:bg-surface"
            >
              Discard Draft
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary">Business name</label>
            <input
              type="text"
              placeholder="Business Name"
              value={businessName}
              onChange={(e) => {
                setBusinessName(e.target.value)
                setErrorMessage("")
                setSuccessMessage("")
              }}
              required
              className="mt-2 w-full rounded-2xl border border-panel bg-surface px-5 py-4 text-primary outline-none transition focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary">Email address</label>
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setErrorMessage("")
                setSuccessMessage("")
              }}
              required
              className="mt-2 w-full rounded-2xl border border-panel bg-surface px-5 py-4 text-primary outline-none transition focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary">Password</label>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setErrorMessage("")
                setSuccessMessage("")
              }}
              required
              className="mt-2 w-full rounded-2xl border border-panel bg-surface px-5 py-4 text-primary outline-none transition focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary">Province</label>
            <select
              value={province}
              onChange={(e) => {
                setProvince(e.target.value)
                setIndustry("")
                setErrorMessage("")
                setSuccessMessage("")
              }}
              required
              className="mt-2 w-full rounded-2xl border border-panel bg-surface px-5 py-4 text-primary outline-none transition focus:border-accent"
            >
              <option value="">Select province</option>
              {provinces.map((provinceOption) => (
                <option key={provinceOption} value={provinceOption}>
                  {provinceOption}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary">Industry</label>
            <select
              value={industry}
              onChange={(e) => {
                setIndustry(e.target.value)
                setErrorMessage("")
                setSuccessMessage("")
              }}
              required
              disabled={!province}
              className="mt-2 w-full rounded-2xl border border-panel bg-surface px-5 py-4 text-primary outline-none transition focus:border-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">
                {province ? "Select industry" : "Select province first"}
              </option>
              {industryOptions.map((industryOption) => (
                <option key={industryOption} value={industryOption}>
                  {industryOption}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary">Phone</label>
            <input
              type="tel"
              placeholder="Phone"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value)
                setErrorMessage("")
                setSuccessMessage("")
              }}
              required
              className="mt-2 w-full rounded-2xl border border-panel bg-surface px-5 py-4 text-primary outline-none transition focus:border-accent"
            />
          </div>

          {errorMessage && (
            <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-5 py-4">
              <p className="text-sm font-semibold text-rose-700">{errorMessage}</p>
            </div>
          )}

          {successMessage && (
            <div className="space-y-4 rounded-2xl border border-success bg-success-soft px-5 py-4">
              <p className="text-sm font-semibold text-success">{successMessage}</p>
              <Link
                href="/auth/login"
                className="block w-full rounded-2xl bg-accent py-3 text-center text-sm font-semibold text-button transition hover:bg-accent-strong"
              >
                Go to Login
              </Link>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-accent py-4 font-semibold text-button transition hover:bg-accent-strong disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>

        </form>

      </div>

    </main>
  )
}
