"use client"

import { useState, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

type PageStatus = "waiting" | "ready" | "invalid" | "success"

type PasswordRule = {
  label: string
  met: boolean
}

function BackHomeLink() {
  return null
}

function RockArtBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="absolute bottom-[-60px] right-[-60px] h-72 w-72 rounded-full border-[60px] border-[#1a3a2a]/5" />
      <div className="absolute top-[-40px] right-[80px] h-40 w-40 rounded-full border-[35px] border-[#1a3a2a]/4" />
      <div className="absolute bottom-[40px] left-[-40px] h-32 w-32 rounded-full border-[25px] border-[#c8a060]/5" />
      <svg viewBox="0 0 800 300" className="absolute bottom-0 h-[55%] w-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMax meet">
        <ellipse cx="100" cy="200" rx="30" ry="18" fill="#3a2a1a"/>
        <ellipse cx="160" cy="190" rx="35" ry="20" fill="#3a2a1a"/>
        <ellipse cx="230" cy="195" rx="28" ry="16" fill="#3a2a1a"/>
        <line x1="100" y1="218" x2="95" y2="250" stroke="#3a2a1a" strokeWidth="4"/>
        <line x1="107" y1="218" x2="112" y2="248" stroke="#3a2a1a" strokeWidth="4"/>
        <line x1="160" y1="210" x2="155" y2="245" stroke="#3a2a1a" strokeWidth="4"/>
        <line x1="167" y1="210" x2="172" y2="244" stroke="#3a2a1a" strokeWidth="4"/>
        <line x1="230" y1="211" x2="225" y2="242" stroke="#3a2a1a" strokeWidth="4"/>
        <line x1="237" y1="211" x2="242" y2="242" stroke="#3a2a1a" strokeWidth="4"/>
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
  )
}

function PasswordTrustPanel() {
  return (
    <div className="hidden lg:flex flex-col justify-center bg-white px-10 py-12 relative overflow-hidden">
      <div className="absolute bottom-[-40px] right-[-40px] w-64 h-64 rounded-full border-[50px] border-[#1a3a2a]/5" />
      <div className="absolute top-[-30px] right-[60px] w-40 h-40 rounded-full border-[30px] border-[#1a3a2a]/4" />
      <span className="inline-block w-fit mb-5 text-[10px] font-semibold tracking-[0.12em] uppercase text-[#c8a060] bg-[#c8a060]/10 border border-[#c8a060]/30 rounded-full px-3 py-1">
        Secure account recovery
      </span>
      <h2 className="font-display text-3xl font-semibold text-[#1a3a2a] leading-snug mb-3">
        Reset access with<br/>
        <em className="text-[#c8a060] not-italic">confidence.</em>
      </h2>
      <p className="text-sm text-[#555555] leading-relaxed mb-8 max-w-sm">
        Password recovery is handled through Supabase Auth with short-lived reset links, protected sessions, and secure redirect handling.
      </p>
      <div className="space-y-3 mb-8">
        {[
          "Reset links are validated before password changes are accepted",
          "Strong-password checks help protect supplier and buyer accounts",
          "Successful resets return users to the verified login flow",
          "No procurement data is exposed during account recovery",
        ].map((feature) => (
          <div key={feature} className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#5DCAA5] mt-1.5 shrink-0" />
            <p className="text-sm text-[#555555] leading-relaxed">{feature}</p>
          </div>
        ))}
      </div>
      <div className="border-l-2 border-[#c8a060]/40 pl-4 mt-auto">
        <p className="text-xs text-[#888888] italic leading-relaxed mb-2">
          Security-first recovery keeps legitimate users moving while protecting procurement profiles and compliance records.
        </p>
        <p className="text-[10px] text-[#c8a060] font-semibold">AiForm Procure Security</p>
      </div>
    </div>
  )
}

function SplitAuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#f8f4ec] text-primary">
      <div className="relative z-10 px-8 py-6">
        <Link href="/" className="absolute left-6 top-1/2 -translate-y-1/2 text-sm font-medium text-[#1a3a2a] hover:text-[#c8a060] transition-colors">
          ← Back to home
        </Link>
        <div className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#888]">Procurement Suite</p>
          <p className="font-display text-xl font-semibold text-[#1a3a2a]">AiForm Procure</p>
        </div>
      </div>
      <RockArtBackground />
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 min-h-[calc(100vh-120px)]">
        <div className="flex flex-col justify-center bg-white px-8 py-12">
          <div className="mx-auto w-full max-w-md">{children}</div>
        </div>
        <PasswordTrustPanel />
      </div>
    </div>
  )
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

export default function ResetPasswordPage() {
  const router = useRouter()
  const [status, setStatus] = useState<PageStatus>("waiting")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) { setStatus("invalid"); return }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setStatus("ready")
    })

    const timeout = setTimeout(() => {
      setStatus((prev) => (prev === "waiting" ? "invalid" : prev))
    }, 4000)

    return () => { subscription.unsubscribe(); clearTimeout(timeout) }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!isStrongPassword(password)) {
      setError("Password does not meet the minimum requirements.")
      return
    }
    if (!isStrongPassword(confirm)) {
      setError("Password does not meet the minimum requirements.")
      return
    }
    if (password !== confirm) { setError("Passwords do not match."); return }
    if (!supabase) { setError("Supabase is not configured."); return }
    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (updateError) { setError(updateError.message); return }
    setStatus("success")
    setTimeout(() => router.push("/auth/login"), 3000)
  }
  if (status === "waiting") {
    return (
      <SplitAuthShell>
        <div className="w-full max-w-md rounded-2xl border border-[#ebebeb] bg-white p-8 text-center">
          <BackHomeLink />
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-panel bg-surface">
            <svg className="h-5 w-5 animate-spin text-accent" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
          <p className="text-xs uppercase tracking-[0.24em] text-accent">Procurement portal</p>
          <h1 className="mt-3 text-2xl font-semibold text-primary">Verifying reset link</h1>
          <p className="mt-3 text-sm leading-6 text-secondary">
            Validating your password reset token. Please wait a moment.
          </p>
        </div>
      </SplitAuthShell>
    )
  }

  if (status === "invalid") {
    return (
      <SplitAuthShell>
        <div className="w-full max-w-md rounded-2xl border border-[#ebebeb] bg-white p-8">
          <BackHomeLink />
          <div className="mb-6 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-rose-500/25 bg-rose-500/10">
              <svg className="h-6 w-6 text-rose-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
          </div>
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.24em] text-accent">Procurement portal</p>
            <h1 className="mt-3 text-3xl font-semibold text-primary">Link invalid or expired</h1>
            <p className="mt-3 text-sm leading-7 text-secondary">
              This password reset link is no longer valid. Reset links expire after a short period for security reasons.
            </p>
          </div>
          <div className="mt-8 space-y-3 border-t border-panel pt-6">
            <Link href="/auth/forgot-password" className="block w-full rounded-2xl bg-accent py-4 text-center font-semibold text-button transition hover:bg-accent-strong">
              Request a new link
            </Link>
            <Link href="/auth/login" className="block w-full rounded-2xl border border-panel py-4 text-center text-sm font-semibold text-secondary transition hover:bg-surface">
              Back to login
            </Link>
          </div>
        </div>
      </SplitAuthShell>
    )
  }
  if (status === "success") {
    return (
      <SplitAuthShell>
        <div className="w-full max-w-md rounded-2xl border border-[#ebebeb] bg-white p-8">
          <BackHomeLink />
          <div className="mb-6 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-success/30 bg-success-soft">
              <svg className="h-6 w-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.24em] text-accent">Procurement portal</p>
            <h1 className="mt-3 text-3xl font-semibold text-primary">Password updated</h1>
            <p className="mt-3 text-sm leading-7 text-secondary">
              Your password has been changed successfully. You will be redirected to the login page in a few seconds.
            </p>
          </div>
          <div className="mt-8 border-t border-panel pt-6 text-center">
            <Link href="/auth/login" className="text-sm font-semibold text-accent transition hover:text-accent-strong">
              Go to login now
            </Link>
          </div>
        </div>
      </SplitAuthShell>
    )
  }

  return (
    <SplitAuthShell>
      <div className="w-full max-w-md rounded-2xl border border-[#ebebeb] bg-white p-8">
        <BackHomeLink />
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.24em] text-accent">Procurement portal</p>
          <h1 className="mt-3 text-4xl font-semibold text-primary">New password</h1>
          <p className="mt-3 text-sm leading-6 text-secondary">
            Choose a strong password for your supplier account. Minimum 8 characters required.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-secondary">New password</label>
            <input
              type="password"
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null) }}
              required
              className="mt-2 w-full rounded-2xl border border-panel bg-surface px-5 py-4 text-primary outline-none transition focus:border-accent"
            />
            <PasswordStrengthMeter password={password} />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary">Confirm password</label>
            <input
              type="password"
              placeholder="Repeat new password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setError(null) }}
              required
              className="mt-2 w-full rounded-2xl border border-panel bg-surface px-5 py-4 text-primary outline-none transition focus:border-accent"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <p className="text-xs leading-5 text-rose-200">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-accent py-4 font-semibold text-button transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Updating password..." : "Set New Password"}
          </button>
        </form>

        <div className="mt-6 border-t border-panel pt-5 text-center">
          <p className="text-sm text-secondary">
            Remembered your password?{" "}
            <Link href="/auth/login" className="font-semibold text-accent transition hover:text-accent-strong">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </SplitAuthShell>
  )
}
