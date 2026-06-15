"use client"

export const dynamic = "force-dynamic"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

function VerifyEmailLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-page px-6 text-primary">
      <p className="text-sm text-secondary">Checking your account status…</p>
    </main>
  )
}

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email") ?? ""

  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState("")
  const [resendError, setResendError] = useState("")
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function checkVerified() {
      if (!supabase) { setChecking(false); return }
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email_confirmed_at) {
        router.replace("/dashboard")
      } else {
        setChecking(false)
      }
    }
    checkVerified()
  }, [router])

  const handleResend = async () => {
    if (!supabase || !email) {
      setResendError("Email address not found. Please return to the registration page.")
      return
    }
    setResending(true)
    setResendMessage("")
    setResendError("")
    const { error } = await supabase.auth.resend({ type: "signup", email })
    if (error) {
      setResendError(error.message)
    } else {
      setResendMessage("Verification email sent. Check your inbox and spam folder.")
    }
    setResending(false)
  }

  if (checking) {
    return <VerifyEmailLoading />
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-page px-6 py-10 text-primary">
      <div className="w-full max-w-lg rounded-3xl border border-panel bg-panel p-8 shadow-panel text-center">
        <Link
          href="/"
          className="mb-5 inline-block text-[13px] font-semibold text-[#5DCAA5] no-underline transition hover:underline"
        >
          ← Back to home
        </Link>

        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-accent bg-surface text-accent">
          <svg aria-hidden="true" className="h-7 w-7" fill="none" viewBox="0 0 24 24">
            <path d="M4 4h16v16H4V4Zm0 4 8 5 8-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
          </svg>
        </div>

        <p className="text-xs uppercase tracking-[0.24em] text-accent">Supplier onboarding</p>
        <h1 className="mt-3 text-4xl font-semibold text-primary">Check your email</h1>

        <p className="mx-auto mt-4 max-w-sm text-sm leading-7 text-secondary">
          We&apos;ve sent a verification email to{" "}
          {email ? (
            <strong className="text-primary">{email}</strong>
          ) : (
            "your email address"
          )}
          .
        </p>

        <p className="mt-3 text-xs leading-6 text-muted">
          Please check your inbox and click the link.
        </p>

        {resendMessage && (
          <div className="mt-5 rounded-2xl border border-success bg-success/10 px-5 py-3">
            <p className="text-sm font-semibold text-success">{resendMessage}</p>
          </div>
        )}

        {resendError && (
          <div className="mt-5 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-5 py-3">
            <p className="text-sm font-semibold text-rose-700">{resendError}</p>
          </div>
        )}

        <div className="mt-8 space-y-3">
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="w-full rounded-2xl border border-panel bg-surface py-4 text-sm font-semibold text-secondary transition duration-200 hover:border-accent hover:bg-accent/10 hover:text-accent disabled:opacity-50"
          >
            {resending ? "Sending…" : "Resend verification email"}
          </button>

          <Link
            href="/auth/login"
            className="block text-sm font-semibold text-accent transition hover:text-accent-strong"
          >
            Verified in another tab? Continue →
          </Link>
        </div>

      </div>
    </main>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailLoading />}>
      <VerifyEmailContent />
    </Suspense>
  )
}
