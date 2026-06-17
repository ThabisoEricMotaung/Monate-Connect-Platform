"use client"

import { useEffect, useState, type MouseEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { calculateSmartScore } from "@/lib/smartScore"
import { supabase } from "@/lib/supabase"

type LoginProfile = {
  id: string
  business_name?: string | null
  province: string | null
  industry: string | null
  phone: string | null
  description?: string | null
  smart_score?: number | string | null
  role?: string | null
}

function isMissingRoleColumnError(error: { message?: string } | null): boolean {
  return Boolean(
    error?.message?.includes("'role' column") ||
      error?.message?.includes("schema cache") ||
      error?.message?.includes("profiles' in the schema")
  )
}

function getPostLoginPath(role?: string | null): string {
  const normalizedRole = role?.trim().toLowerCase()
  if (!normalizedRole) return "/dashboard/onboarding"
  if (normalizedRole === "admin") return "/dashboard/admin"
  if (normalizedRole === "buyer") return "/dashboard/buyer"
  if (normalizedRole === "supplier") return "/dashboard"
  return "/dashboard/onboarding"
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

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [verifiedNotice, setVerifiedNotice] = useState(false)
  const [signedOutNotice, setSignedOutNotice] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("verified") === "1") setVerifiedNotice(true)
    if (params.get("signedout") === "1") setSignedOutNotice(true)
  }, [])

  const handleLogin = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setLoading(true)
    setLoadingMessage("Signing in...")
    setErrorMessage("")

    if (!supabase) {
      setErrorMessage("Supabase environment variables are not configured.")
      setLoading(false)
      setLoadingMessage("")
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setErrorMessage(error.message)
      setLoading(false)
      setLoadingMessage("")
      return
    }

    setLoadingMessage("Checking your access...")

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      setErrorMessage(userError.message)
      setLoading(false)
      setLoadingMessage("")
      return
    }

    let postLoginPath = "/dashboard/onboarding"

    if (user) {
      const { data: profileWithRole, error: profileSelectError } = await supabase
        .from("profiles")
        .select("id, business_name, province, industry, phone, description, smart_score, role")
        .eq("id", user.id)
        .maybeSingle()
      let profile = profileWithRole as LoginProfile | null
      let roleColumnAvailable = true

      if (profileSelectError) {
        if (!isMissingRoleColumnError(profileSelectError)) {
          console.error(profileSelectError)
          setErrorMessage(profileSelectError.message)
          setLoading(false)
          setLoadingMessage("")
          return
        }

        roleColumnAvailable = false

        const { data: fallbackProfile, error: fallbackProfileError } = await supabase
          .from("profiles")
          .select("id, business_name, province, industry, phone, description, smart_score")
          .eq("id", user.id)
          .maybeSingle()

        if (fallbackProfileError) {
          console.error(fallbackProfileError)
          setErrorMessage(fallbackProfileError.message)
          setLoading(false)
          setLoadingMessage("")
          return
        }

        profile = fallbackProfile as LoginProfile | null
      }

      postLoginPath = getPostLoginPath(profile?.role)

      if (!profile) {
        const profilePayload = {
          id: user.id,
          business_name: user.user_metadata?.business_name || "Supplier",
          email: user.email,
          province: user.user_metadata?.province || "",
          industry: user.user_metadata?.industry || "",
          phone: user.user_metadata?.phone || "",
          verification_status: "Pending Review",
          ...(roleColumnAvailable ? { role: "supplier" } : {}),
        }
        const profileScore = calculateSmartScore(profilePayload)

        const { error: profileInsertError } = await supabase
          .from("profiles")
          .insert([{ ...profilePayload, smart_score: profileScore }])

        if (profileInsertError) {
          console.error(profileInsertError)
          setErrorMessage(profileInsertError.message)
          setLoading(false)
          setLoadingMessage("")
          return
        }

        postLoginPath = getPostLoginPath(roleColumnAvailable ? "supplier" : null)
      } else if (
        !profile.province ||
        !profile.industry ||
        !profile.phone
      ) {
        const profileUpdatePayload = {
          province: profile.province || user.user_metadata?.province || "",
          industry: profile.industry || user.user_metadata?.industry || "",
          phone: profile.phone || user.user_metadata?.phone || "",
        }
        const profileScore = calculateSmartScore({ ...profile, ...profileUpdatePayload })

        const { error: profileUpdateError } = await supabase
          .from("profiles")
          .update({ ...profileUpdatePayload, smart_score: profileScore })
          .eq("id", user.id)

        if (profileUpdateError) {
          console.error(profileUpdateError)
          setErrorMessage(profileUpdateError.message)
          setLoading(false)
          setLoadingMessage("")
          return
        }
      }
    }

    setLoadingMessage("Opening your workspace...")
    router.push(postLoginPath)
  }

  const handleGoogleSignIn = async () => {
    setErrorMessage("")

    if (!supabase) {
      setErrorMessage("Supabase environment variables are not configured.")
      return
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/post-oauth`,
      },
    })

    if (error) {
      setErrorMessage(error.message)
    }
  }

  const handleMicrosoftSignIn = async () => {
    setErrorMessage("")

    if (!supabase) {
      setErrorMessage("Supabase environment variables are not configured.")
      return
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        redirectTo: `${window.location.origin}/auth/post-oauth`,
        scopes: "email profile",
      },
    })

    if (error) {
      setErrorMessage(error.message)
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-panel bg-panel p-8 shadow-panel">
          <Link
            href="/"
            className="mb-5 inline-block text-[13px] font-semibold text-[#5DCAA5] no-underline transition hover:underline"
          >
            ← Back to home
          </Link>

          <div className="mb-7 text-center">
            <h1 className="text-3xl font-semibold text-heading">Log in to AiForm Procure</h1>
            <p className="mt-3 text-sm leading-6 text-secondary">Sign in to your account.</p>
          </div>

          {verifiedNotice && (
            <div className="mb-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4">
              <p className="text-sm font-semibold text-emerald-700">
                ✓ Email verified — please log in to continue.
              </p>
            </div>
          )}

          {signedOutNotice && (
            <div className="mb-5 rounded-2xl border border-panel bg-surface px-5 py-4">
              <p className="text-sm font-semibold text-secondary">
                You&apos;ve been signed out
              </p>
            </div>
          )}

          <div className="space-y-5">
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
              <span>Continue with Microsoft</span>
            </button>

            <AuthDivider />

            <p className="text-xs text-secondary">
              <span className="font-semibold text-accent">*</span> Required fields
            </p>

            <div>
              <label className="block text-sm font-medium text-secondary">
                Email address <span className="font-semibold text-accent">*</span>
              </label>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrorMessage("") }}
                className="mt-2 w-full rounded-2xl border border-panel bg-surface px-5 py-4 text-primary outline-none transition focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary">
                Password <span className="font-semibold text-accent">*</span>
              </label>
              <input
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrorMessage("") }}
                className="mt-2 w-full rounded-2xl border border-panel bg-surface px-5 py-4 text-primary outline-none transition focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
              />
              <div className="mt-2 text-right">
                <a
                  href="/forgot-password"
                  className="text-sm font-semibold text-accent-soft transition hover:text-accent hover:underline"
                >
                  Forgot password?
                </a>
              </div>
            </div>

            {errorMessage && (
              <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-5 py-4">
                <p className="text-sm font-semibold text-rose-700">{errorMessage}</p>
              </div>
            )}

            <button
              type="button"
              onClick={handleLogin}
              disabled={loading}
              className="w-full rounded-2xl bg-accent py-4 font-semibold text-button transition duration-200 hover:bg-accent-strong disabled:opacity-50"
            >
              {loading ? loadingMessage : "Log in"}
            </button>

            {loading && (
              <p className="text-center text-sm font-semibold text-secondary" role="status" aria-live="polite">
                {loadingMessage}
              </p>
            )}

            <p className="text-center text-sm text-secondary">
              No account?{" "}
              <Link href="/auth/signup" className="font-semibold text-accent transition hover:text-accent-strong">
                Register free →
              </Link>
            </p>
          </div>
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
