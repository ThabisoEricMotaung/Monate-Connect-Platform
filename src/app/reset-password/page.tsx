"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

type PageStatus = "waiting" | "ready" | "invalid" | "success"

type PasswordRule = {
  label: string
  met: boolean
}

function BackHomeLink() {
  return (
    <Link
      href="/"
      className="mb-5 inline-block text-[13px] font-semibold text-[#5DCAA5] no-underline transition hover:underline"
    >
      ← Back to home
    </Link>
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
      <main className="flex min-h-screen items-center justify-center bg-page px-6 text-primary">
        <div className="w-full max-w-md rounded-3xl border border-panel bg-panel p-8 shadow-panel text-center">
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
      </main>
    )
  }

  if (status === "invalid") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-page px-6 text-primary">
        <div className="w-full max-w-md rounded-3xl border border-panel bg-panel p-8 shadow-panel">
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
            <Link href="/forgot-password" className="block w-full rounded-2xl bg-accent py-4 text-center font-semibold text-button transition hover:bg-accent-strong">
              Request a new link
            </Link>
            <Link href="/auth/login" className="block w-full rounded-2xl border border-panel py-4 text-center text-sm font-semibold text-secondary transition hover:bg-surface">
              Back to login
            </Link>
          </div>
        </div>
      </main>
    )
  }
  if (status === "success") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-page px-6 text-primary">
        <div className="w-full max-w-md rounded-3xl border border-panel bg-panel p-8 shadow-panel">
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
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-page px-6 text-primary">
      <div className="w-full max-w-md rounded-3xl border border-panel bg-panel p-8 shadow-panel">
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
    </main>
  )
}
