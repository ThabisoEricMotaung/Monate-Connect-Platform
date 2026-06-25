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
        scopes: "openid email profile User.Read",
      },
    })

    if (error) {
      setErrorMessage(error.message)
    }
  }

  return (
    <div className="relative min-h-screen bg-[#f8f4ec]">
      <div className="relative z-10 px-8 py-6">
        <Link href="/" className="absolute left-6 top-1/2 -translate-y-1/2 text-sm font-medium text-[#1a3a2a] hover:text-[#c8a060] transition-colors">
          ← Back to home
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
        <div className="mx-auto w-full max-w-md">
        <div className="rounded-2xl border border-[#ebebeb] p-8">
          <div className="mb-7 text-center">
            <h1 className="font-display text-3xl font-semibold text-heading">Log in to AiForm Procure</h1>
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
            <p className="text-center text-xs text-[#888] mt-1">
              New users: please register with Google or email first
            </p>

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

        </div>
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
        <p className="text-[10px] text-[#aaa] mt-1 mb-8">EN & ZU live · 9 more on the roadmap</p>

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
          <p className="text-[10px] text-[#c8a060] font-semibold">Thabiso Motaung - Founder, AiForm Studio</p>
        </div>
      </div>
      </div>
    </div>
  )
}
